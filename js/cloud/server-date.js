/**
 * js/cloud/server-date.js — LA DATA VIENE DAL SERVER, NON DALL'OROLOGIO
 * =====================================================================
 * Il Negozio ruota le sue offerte ogni giorno e ogni settimana. Se la
 * data la leggesse dall'orologio del dispositivo, basterebbe spostare
 * l'ora del telefono avanti di un giorno per far ruotare le carte a
 * piacere e comprare tutto il catalogo in un pomeriggio — richiesta
 * esplicita dell'utente di evitarlo.
 *
 * COME: NON serve alcuna funzione SQL né modifica allo schema Supabase.
 * Ogni risposta HTTP porta con sé l'header `Date`, scritto dal server:
 * basta una richiesta leggerissima all'endpoint REST già configurato e
 * leggere quell'header. Il risultato viene messo in cache per l'intera
 * sessione insieme allo SCARTO rispetto all'orologio locale, così le
 * chiamate successive costano zero: si somma lo scarto all'ora locale.
 *
 * FALLBACK ONESTO: se la rete non risponde (offline, APK senza
 * connessione, Supabase non configurato) si usa l'orologio locale e lo si
 * DICHIARA — `isTrusted` torna false, e il Negozio lo mostra al giocatore
 * invece di fingere che sia tutto a posto.
 */
(function () {
    'use strict';

    /** Scarto in millisecondi fra l'orologio del server e quello locale (server - locale). */
    let offsetMs = 0;
    let trusted = false;
    let inFlight = null;

    function config() {
        return window.SUPABASE_CONFIG || {};
    }

    /**
     * Una sola richiesta per sessione. HEAD sull'endpoint REST: non
     * scarica nulla, serve solo per l'header `Date` della risposta.
     * `no-store` per non farsi servire una data vecchia dalla cache.
     */
    function sync() {
        if (inFlight) return inFlight;
        const cfg = config();
        if (!cfg.url || !cfg.anonKey) {
            inFlight = Promise.resolve(false);
            return inFlight;
        }
        inFlight = fetch(cfg.url.replace(/\/$/, '') + '/rest/v1/', {
            method: 'HEAD',
            cache: 'no-store',
            headers: { apikey: cfg.anonKey }
        }).then((res) => {
            const header = res.headers.get('date');
            if (!header) return false;
            const serverMs = Date.parse(header);
            if (!serverMs || isNaN(serverMs)) return false;
            offsetMs = serverMs - Date.now();
            trusted = true;
            return true;
        }).catch(() => false);
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
