/**
 * js/cloud/server-date.js — LA DATA VIENE DAL SERVER, NON DALL'OROLOGIO
 * =====================================================================
 * Il Negozio ruota le sue offerte ogni giorno e ogni settimana. Se la
 * data la leggesse dall'orologio del dispositivo, basterebbe spostare
 * l'ora del telefono avanti di un giorno per far ruotare le carte a
 * piacere e comprare tutto il catalogo in un pomeriggio — richiesta
 * esplicita dell'utente di evitarlo.
 *
 * TRE LIVELLI, dal più preciso al più onesto. Il risultato di qualunque
 * livello riuscito viene messo in cache per la sessione insieme allo
 * SCARTO rispetto all'orologio locale, così le chiamate successive
 * costano zero: si somma lo scarto all'ora locale.
 *
 *   1. RPC `public.server_now()` (supabase/schema.sql) — l'ora esatta del
 *      server, nel CORPO della risposta.
 *   2. L'ora firmata dentro il TOKEN di accesso (`iat` del JWT). Non
 *      costa una richiesta e non si può falsificare spostando l'orologio
 *      del telefono, ma può essere vecchia quanto il token (fino a un'ora).
 *   3. L'orologio locale, DICHIARANDOLO — `isTrusted` torna false e il
 *      Negozio lo mostra invece di fingere che sia tutto a posto.
 *
 * VICOLO CIECO GIÀ PERCORSO, per non riprovarci: il primo approccio
 * leggeva l'header `Date` della risposta HTTP, e sembrava elegante perché
 * non chiedeva NIENTE al database. Non può funzionare: `Date` non è fra
 * gli header che il CORS espone al JavaScript, e Supabase non manda un
 * `Access-Control-Expose-Headers` che lo aggiunga. Misurato con una
 * richiesta vera dal browser: degli header della risposta arrivano solo
 * `content-length` e `content-type`, anche su un 200 — quindi
 * `res.headers.get('date')` tornava sempre null e il Negozio mostrava
 * SEMPRE l'avviso "non riesco a leggere la data dal server". Non era una
 * configurazione sbagliata, era l'approccio a non essere praticabile da
 * un browser.
 */
(function () {
    'use strict';

    /** Scarto in millisecondi fra l'orologio del server e quello locale (server - locale). */
    let offsetMs = 0;
    let trusted = false;
    let inFlight = null;

    // Lo scarto sopravvive al cambio di pagina. Questo gioco è fatto di
    // documenti separati (menu, duello, sfide, tornei) e ogni navigazione
    // azzererebbe tutto: senza, ogni pagina ripartirebbe da zero e, finché
    // la sua richiesta non risponde, userebbe l'orologio locale — cioè
    // proprio la cosa da evitare, e per giunta in modo intermittente.
    //
    // sessionStorage e non localStorage: uno scarto vecchio di giorni non
    // vale niente, e riaprire il browser è il momento giusto per
    // ricalcolarlo. Insieme allo scarto si salva QUANDO è stato misurato,
    // così uno rimasto lì da ore non viene creduto per sempre.
    const CHIAVE = 'ygoServerClock';
    const VALIDITA_MS = 6 * 60 * 60 * 1000;

    function leggiCache() {
        try {
            const raw = sessionStorage.getItem(CHIAVE);
            if (!raw) return null;
            const c = JSON.parse(raw);
            if (typeof c.offset !== 'number' || typeof c.misuratoIl !== 'number') return null;
            if (Date.now() - c.misuratoIl > VALIDITA_MS) return null;
            return c;
        } catch (e) { return null; }
    }
    function scriviCache() {
        try {
            sessionStorage.setItem(CHIAVE, JSON.stringify({ offset: offsetMs, misuratoIl: Date.now() }));
        } catch (e) { /* la cache si perde, la sincronizzazione no */ }
    }

    (function riprendiDallaCache() {
        const c = leggiCache();
        if (!c) return;
        offsetMs = c.offset;
        trusted = true;
    })();

    function config() {
        return window.SUPABASE_CONFIG || {};
    }

    /** Accetta lo scarto misurato e lo mette in cache. Torna sempre true, per incatenarla. */
    function accetta(serverMs) {
        offsetMs = serverMs - Date.now();
        trusted = true;
        scriviCache();
        return true;
    }

    /**
     * LIVELLO 1 — l'ora esatta, dalla funzione SQL `public.server_now()`.
     * `POST /rest/v1/rpc/...` è come si chiama una funzione via PostgREST;
     * la risposta è il valore, nel corpo. `no-store` perché una data
     * servita dalla cache HTTP non sarebbe più l'ora corrente.
     */
    function daRpc(cfg) {
        return fetch(cfg.url.replace(/\/$/, '') + '/rest/v1/rpc/server_now', {
            method: 'POST',
            cache: 'no-store',
            headers: {
                apikey: cfg.anonKey,
                // Entrambi: PostgREST vuole `apikey` per riconoscere il
                // progetto e `Authorization` per il ruolo. Col solo primo
                // risponde 401 — misurato.
                Authorization: 'Bearer ' + cfg.anonKey,
                'Content-Type': 'application/json',
                Accept: 'application/json'
            },
            body: '{}'
        }).then((res) => {
            if (!res.ok) return false;
            return res.json().then((valore) => {
                // La funzione torna un timestamptz, che PostgREST serializza
                // come stringa ISO. Un oggetto o un array qui vorrebbe dire
                // che qualcuno ha cambiato la firma della funzione.
                const ms = Date.parse(typeof valore === 'string' ? valore : '');
                if (!ms || isNaN(ms)) return false;
                return accetta(ms);
            });
        }).catch(() => false);
    }

    /**
     * LIVELLO 2 — l'ora firmata dentro il token di accesso.
     *
     * Non costa una richiesta e, soprattutto, NON si può falsificare
     * spostando l'orologio del dispositivo: `iat` lo scrive il server
     * quando emette il token. Il prezzo è che può essere vecchia quanto il
     * token stesso (Supabase li emette con un'ora di validità), quindi
     * vicino alla mezzanotte UTC la rotazione può arrivare in ritardo — ma
     * è comunque un ordine di grandezza meglio dell'orologio locale, che
     * è manipolabile a piacere ed è esattamente ciò da cui ci si difende.
     *
     * Non si segna `trusted` a caso: lo scarto c'è, ed è quello giusto per
     * il momento in cui il token è stato emesso.
     */
    function daToken() {
        try {
            const sessione = window.CloudSync && typeof CloudSync.getAccessToken === 'function'
                ? CloudSync.getAccessToken() : null;
            if (!sessione) return false;
            const pezzi = sessione.split('.');
            if (pezzi.length !== 3) return false;
            // base64url -> base64: il JWT usa '-' e '_' al posto di '+' e '/'.
            const payload = JSON.parse(atob(pezzi[1].replace(/-/g, '+').replace(/_/g, '/')));
            if (typeof payload.iat !== 'number') return false;
            return accetta(payload.iat * 1000);
        } catch (e) { return false; }
    }

    /**
     * UN FALLIMENTO NON È DEFINITIVO. Prima la promessa veniva tenuta da
     * parte comunque, quindi bastava una richiesta andata storta al primo
     * caricamento — rete lenta, telefono appena uscito dalla galleria —
     * perché per tutto il resto della sessione si usasse l'orologio locale
     * senza mai più riprovare. Ora si ricorda solo il SUCCESSO: dopo un
     * errore la prossima chiamata riprova davvero.
     */
    function sync() {
        if (trusted) return Promise.resolve(true);
        if (inFlight) return inFlight;
        const cfg = config();
        if (!cfg.url || !cfg.anonKey) return Promise.resolve(daToken());

        inFlight = daRpc(cfg).then((esito) => {
            // Il ripiego sul token si prova solo se la rete non ha dato
            // l'ora esatta: è meno preciso, e non ha senso preferirlo.
            if (esito) return true;
            return daToken();
        }).then((esito) => {
            // La promessa si tiene da parte solo se è andata bene: così un
            // fallimento non blocca ogni tentativo successivo.
            if (!esito) inFlight = null;
            return esito;
        });
        return inFlight;
    }

    /** La data corrente secondo il SERVER (o quella locale, se la sincronizzazione non è riuscita). */
    function now() {
        return new Date(Date.now() + offsetMs);
    }

    /**
     * Chiave del giorno, in UTC: 'AAAA-MM-GG'. UTC e non ora locale
     * apposta — così la rotazione scatta nello stesso istante per
     * chiunque, indipendentemente dal fuso del dispositivo, e due
     * giocatori non vedono cataloghi diversi alla stessa ora.
     */
    function dayKey(date) {
        const d = date || now();
        return d.toISOString().slice(0, 10);
    }

    /**
     * Chiave della settimana ISO: 'AAAA-Www'. Serve alla rotazione
     * settimanale delle buste. Il calcolo è quello standard ISO-8601
     * (settimana che contiene il giovedì), così la settimana comincia
     * sempre di lunedì e non "scivola" di anno in anno.
     */
    function weekKey(date) {
        const d = new Date(date || now());
        d.setUTCHours(0, 0, 0, 0);
        // Porta la data al giovedì della propria settimana.
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        const anno = d.getUTCFullYear();
        const primoGennaio = new Date(Date.UTC(anno, 0, 1));
        const settimana = Math.ceil((((d - primoGennaio) / 86400000) + 1) / 7);
        return `${anno}-W${String(settimana).padStart(2, '0')}`;
    }

    /** Millisecondi che mancano al prossimo cambio di giorno (UTC) — per il conto alla rovescia del Negozio. */
    function msToNextDay() {
        const d = now();
        const domani = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1));
        return domani.getTime() - d.getTime();
    }

    /** Millisecondi che mancano al prossimo lunedì (UTC). */
    function msToNextWeek() {
        const d = now();
        const giorniAlLunedi = (8 - (d.getUTCDay() || 7)) % 7 || 7;
        const prossimo = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + giorniAlLunedi));
        return prossimo.getTime() - d.getTime();
    }

    window.ServerDate = {
        sync: sync,
        now: now,
        dayKey: dayKey,
        weekKey: weekKey,
        msToNextDay: msToNextDay,
        msToNextWeek: msToNextWeek,
        /** false = la data viene dall'orologio del dispositivo, non dal server. Il Negozio lo dice al giocatore. */
        isTrusted: () => trusted
    };
})();
