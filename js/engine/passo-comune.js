/**
 * passo-comune.js — il Multiplayer "a passo comune".
 * =====================================================================
 * Priorità 3 del piano, passo D. Il Multiplayer di prima RACCONTAVA le
 * mosse ("ho Evocato questo mostro in questa casella") e chi riceveva le
 * ricostruiva a modo suo; dove il racconto era incompleto, arrivava una
 * fotografia di stato a rimettere le cose a posto. Ogni carta con un
 * effetto un po' particolare era un'occasione per i due schermi di
 * raccontare due partite diverse.
 *
 * A passo comune i due client eseguono TUTTA la partita, con lo stesso
 * motore e gli stessi dati (entrambi i mazzi, lo stesso seme per la
 * casualità di gioco: js/engine/casuale.js). Fra loro viaggiano solo due
 * cose:
 *   - i COMANDI di chi è di turno (js/engine/comandi.js): la mossa con
 *     tutte le scelte dentro;
 *   - le DECISIONI (js/engine/decisioni.js): ogni volta che il motore
 *     chiede qualcosa a un posto, la risposta di quel posto.
 * Il resto (fasi che avanzano da sole, effetti, battaglie, pescate) lo
 * calcola ciascuno per conto proprio, e viene uguale perché il codice e i
 * dati sono gli stessi.
 *
 * Ogni client chiama "player" sé stesso, quindi lo stato è SPECCHIATO: il
 * mio 'player' è il suo 'bot'. Un comando non porta il posto (lo sa chi lo
 * riceve: è quello remoto) e una decisione porta solo la POSIZIONE della
 * scelta nell'elenco dei candidati, che i due client calcolano uguale.
 *
 * L'ORDINE è tutto. Ciò che arriva si consuma rigorosamente nell'ordine di
 * arrivo:
 *   - una decisione aspetta che il motore di qua la chieda (finché non la
 *     chiede, resta in testa alla coda e blocca il resto);
 *   - un comando aspetta che il duello sia FERMO (niente Catena, niente
 *     finestra di priorità, nessuna scelta in sospeso, nessun comando a
 *     metà) e nella stessa fase dello stesso turno in cui è partito. Chi lo
 *     manda lo esegue anche lui solo a duello fermo: così i due client
 *     applicano ogni mossa nello stesso punto della partita.
 * Ogni comando porta anche un'IMPRONTA dello stato di chi lo manda: chi lo
 * riceve la confronta con la propria prima di eseguirlo. Se diverge, la
 * partita si è già separata — lo si dice subito (console.error), invece
 * di accorgersene dieci mosse dopo.
 *
 * Costo dichiarato: ogni client conosce mazzo e mano dell'avversario (non
 * mostrati, ma in memoria).
 *
 * Il trasporto non è affar suo: `avvia({ invia })` riceve la funzione che
 * consegna un messaggio all'altro client, e chi trasporta chiama
 * `PassoComune.ricevi(messaggio)` quando ne arriva uno. Nel duello gemello
 * (tools/duello-gemello.js) l'altro client è un secondo motore nello
 * stesso processo; nella pagina sarà la rete.
 */
const PassoComune = (function () {
    'use strict';

    let attivo = false;
    /** @type {null | ((messaggio: any) => void)} */
    let invia = null;
    /** Il posto controllato dall'altro client: di norma 'bot'. */
    let postoRemoto = 'bot';
    /** Messaggi arrivati e non ancora consumati, nell'ordine di arrivo. */
    let inArrivo = [];
    /** Decisioni che il motore di qua aspetta dall'altro client, in ordine. */
    let decisioniAttese = [];
    /** Comandi (miei o suoi) partiti e non ancora conclusi. */
    let inCorso = 0;
    let riprova = null;
    let inviati = 0;
    let ricevuti = 0;
    /** Comandi locali rifiutati perché il duello non era fermo (diagnosi). */
    let rifiutati = 0;
    /**
     * Vero: ogni comando porta l'impronta intera invece del riassunto, e
     * una divergenza dice QUALE pezzo dello stato è diverso. Costa banda,
     * quindi solo per il duello gemello e la diagnosi.
     */
    let improntaCompleta = false;

    /**
     * Quale callback segna la fine di un comando, per tipo. Un comando che
     * non ne ha una si considera concluso al ritorno dal suo esecutore: ciò
     * che continua dopo (una Catena, una finestra di priorità) lo vede già
     * fermo().
     */
    const FINE_DEL_COMANDO = {
        evoca: 'alTermine',
        settaMT: 'alTermine',
        attacca: 'alTermine',
        tributa: 'dopo',
        scartaFineTurno: 'dopo'
    };

    /**
     * Avvisa la presentazione soltanto quando cambia la coda delle scelte
     * remote. Il motore non conosce il DOM e l'interfaccia non deve
     * interrogare `stato()` a intervalli: l'evento mantiene separati i due
     * lati e rende esatto anche lo spegnimento quando arriva la risposta.
     */
    function avvisaAttesaDecisioneRemota(inAttesa, quante) {
        if (globalThis.EventiDuello) {
            EventiDuello.emetti('attesa-decisione-remota', inAttesa, quante);
        }
    }

    function avvia(opzioni) {
        attivo = true;
        invia = opzioni.invia;
        postoRemoto = opzioni.postoRemoto || 'bot';
        improntaCompleta = !!opzioni.improntaCompleta;
        inArrivo = [];
        decisioniAttese = [];
        inCorso = 0;
        inviati = 0;
        ricevuti = 0;
        rifiutati = 0;
        storico = [];
        ultimoRicevuto = 0;
        inAnticipo.clear();
        if (riprova) { clearTimeout(riprova); riprova = null; }
        avvisaAttesaDecisioneRemota(false, 0);
    }

    function ferma() {
        attivo = false;
        invia = null;
        if (riprova) { clearTimeout(riprova); riprova = null; }
        // Una sessione fermata non deve lasciare a schermo un'attesa ormai
        // invalida, anche se la coda verrà ricreata dal prossimo avvia().
        avvisaAttesaDecisioneRemota(false, 0);
    }

    /**
     * Il duello a inizio partita, uguale sui due client. L'host costruisce
     * il proprio mazzo per primo e pesca per primo, e lo stesso fa l'ospite
     * per l'host: la casualità di gioco esce dallo stesso seme nello stesso
     * ordine, quindi i due mazzi escono mescolati allo stesso modo da
     * entrambe le parti. Gli uid hanno un prefisso per giocatore ('h' host,
     * 'o' ospite) e non per posto, che sui due client è opposto.
     * `iniziaHost` (default vero): chi ha il primo turno, deciso prima (la
     * morra cinese della sala d'attesa). Non cambia l'ordine di Tavolo, che
     * resta "prima l'host" su entrambi i client.
     * @param {{ seme: number, sonoHost: boolean, mazzoHost: any, mazzoOspite: any, manoIniziale?: number, iniziaHost?: boolean }} o
     */
    function preparaDuello(o) {
        Casuale.semina(o.seme);
        const host = o.sonoHost ? 'player' : 'bot';
        Tavolo.impostaPrimo(host);
        Tavolo.ordine().forEach((posto) => {
            const delHost = posto === host;
            const spec = delHost ? o.mazzoHost : o.mazzoOspite;
            const prefisso = delHost ? 'h' : 'o';
            const mazzo = buildDeckFromSpec(spec, { prefissoUid: prefisso }) || [];
            gameState[posto + 'Deck'] = mazzo;
            gameState[posto + 'DeckCount'] = mazzo.length;
            gameState[posto + 'ExtraDeck'] = buildExtraDeckFromSpec(spec, { prefissoUid: prefisso + 'x' });
        });
        const mano = o.manoIniziale === undefined ? 5 : o.manoIniziale;
        for (let i = 0; i < mano; i++) {
            Tavolo.ordine().forEach((posto) => drawCardsToHand(posto, 1, { silent: true }));
        }
        gameState.turn = 1;
        gameState.currentPlayer = o.iniziaHost === false ? Tavolo.avversario(host) : host;
    }

    /** Perché il duello non è fermo, o null se lo è. */
    function motivoNonFermo() {
        if (typeof gameState === 'undefined') return 'nessun duello';
        if (gameState.gameOver) return 'duello finito';
        if (window.DuelEngine && DuelEngine.isChainActive()) return 'Catena aperta';
        if (window.DuelEngine && DuelEngine.isPriorityWindowOpen && DuelEngine.isPriorityWindowOpen()) return 'finestra di priorità';
        if (window.Decisioni && Decisioni.inSospeso()) return 'scelta in sospeso';
        if (decisioniAttese.length > 0) return 'attesa di una decisione dell\'altro client';
        if (differite > 0) return 'una scelta presa sta per applicarsi';
        if (inCorso > 0) return 'comando in corso';
        return null;
    }

    function fermo() { return motivoNonFermo() === null; }

    /**
     * Lo stato del duello in una riga, uguale sui due client quando le due
     * partite coincidono: i posti si scorrono nell'ordine di Tavolo.ordine()
     * (prima l'host, su entrambi), quindi lo specchio non conta.
     */
    function impronta() {
        const uid = (c) => (c ? c.uid : '-');
        const slot = (s) => (s ? `${s.card.uid}${s.position === 'defense' ? 'D' : 'A'}${s.isFaceDown ? 'c' : 's'}` : '-');
        const lato = (p) => [
            Tavolo.lp(p),
            Tavolo.mano(p).map(uid).join(','),
            (Tavolo.mazzo(p) || []).map(uid).join(','),
            (Tavolo.extraDeck(p) || []).map(uid).join(','),
            Tavolo.mostri(p).map(slot).join(','),
            Tavolo.magieTrappole(p).map((s) => (s ? `${s.card.uid}${s.isFaceDown ? 'c' : 's'}` : '-')).join(','),
            (() => { const f = Tavolo.magiaTerreno(p); return f ? `${f.card.uid}${f.isFaceDown ? 'c' : 's'}` : '-'; })(),
            Tavolo.cimitero(p).map(uid).join(','),
            (Tavolo.banditi(p) || []).map(uid).join(',')
        ].join('|');
        const [primo, secondo] = Tavolo.ordine();
        return [
            `turno ${gameState.turn}`,
            `fase ${gameState.phase}`,
            `di turno ${gameState.currentPlayer === primo ? 'host' : 'ospite'}`,
            `host ${lato(primo)}`,
            `ospite ${lato(secondo)}`
        ].join(' ## ');
    }

    /** Ciò che viaggia con ogni comando: il riassunto, o l'impronta intera. */
    function improntaDaSpedire() {
        const testo = impronta();
        return improntaCompleta ? testo : riassunto(testo);
    }

    /** Il primo pezzo dell'impronta in cui le due versioni differiscono. */
    function primaDifferenza(mia, sua) {
        const a = mia.split(' ## ');
        const b = sua.split(' ## ');
        for (let i = 0; i < Math.max(a.length, b.length); i++) {
            if (a[i] !== b[i]) return `di qua «${a[i]}» / di là «${b[i]}»`;
        }
        return '';
    }

    /** Un riassunto corto dell'impronta, da far viaggiare con ogni comando. */
    function riassunto(testo) {
        let h = 2166136261;
        for (let i = 0; i < testo.length; i++) {
            h ^= testo.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }
        return (h >>> 0).toString(36);
    }

    // ------------------------------------------------------------------
    // Numerazione e ripresa dopo una caduta di linea.
    //
    // A passo comune un messaggio perso non si ripara con una fotografia di
    // stato: la coda deve arrivare intera e in ordine, o i due client
    // smettono di chiedersi le stesse cose. Ogni messaggio porta quindi un
    // numero (`seq`, dall'1), chi manda li conserva tutti (`storico`) e chi
    // riceve sa fin dove è arrivato (`ultimoRicevuto`). Dopo una caduta di
    // linea chi rientra dice fin dove era arrivato e l'altro gli rimanda il
    // resto (`daRispedire`): un doppione si scarta, un messaggio arrivato
    // in anticipo aspetta il suo turno. Una partita intera sono qualche
    // centinaio di messaggi brevi, quindi lo storico resta piccolo.
    // ------------------------------------------------------------------
    let storico = [];
    let ultimoRicevuto = 0;
    const inAnticipo = new Map();

    function spedisci(messaggio) {
        inviati++;
        messaggio.seq = inviati;
        storico.push(messaggio);
        if (invia) invia(messaggio);
    }

    /** I miei messaggi successivi a `dopoSeq`, da rimandare a chi li ha persi. */
    function daRispedire(dopoSeq) {
        return storico.filter((m) => m.seq > (dopoSeq || 0));
    }

    /**
     * Comandi.esegui passa di qui ogni comando, mio o suo. Il mio parte per
     * l'altro client PRIMA di essere eseguito: eseguendolo, il motore può
     * subito chiedere qualcosa all'altro (rispondere in Catena a
     * un'Evocazione), e l'altro deve già sapere a cosa sta rispondendo.
     * Torna la funzione con cui l'esecutore va chiamato (con la fine del
     * comando sorvegliata).
     */
    function comando(posto, cmd, extra, esegui) {
        if (posto !== postoRemoto) {
            // Un comando mio parte SOLO a duello fermo: l'altro client lo
            // applicherà a duello fermo, e i due punti devono essere lo
            // stesso. Fuori da lì si rifiuta — non parte e non si esegue,
            // come una mossa non permessa: chi l'ha chiesto riprova (l'IA
            // aspetta da sé, vedi aspettaDuelloFermo in bot.js).
            const motivo = motivoNonFermo();
            if (motivo) {
                console.warn(`PassoComune: comando "${cmd.tipo}" rifiutato, il duello non è fermo (${motivo})`);
                rifiutati++;
                // Chi aspetta la fine del comando (l'IA) non resta appeso: per
                // lui la mossa è finita, senza effetto. Il seguito 'dopo' no:
                // è il passo successivo di una mossa che non è avvenuta.
                if (FINE_DEL_COMANDO[cmd.tipo] === 'alTermine' && typeof extra.alTermine === 'function') extra.alTermine();
                return false;
            }
            spedisci({ tipo: 'comando', comando: cmd, turno: gameState.turn, fase: gameState.phase, impronta: improntaDaSpedire() });
        }
        inCorso++;
        let chiuso = false;
        const chiudi = () => {
            if (chiuso) return;
            chiuso = true;
            inCorso--;
            programma();
        };
        const nomeFine = FINE_DEL_COMANDO[cmd.tipo];
        const extraSorvegliato = Object.assign({}, extra);
        if (nomeFine) {
            const originale = extra[nomeFine];
            extraSorvegliato[nomeFine] = function () {
                chiudi();
                if (typeof originale === 'function') return originale.apply(this, arguments);
            };
        }
        try {
            return esegui(extraSorvegliato);
        } finally {
            if (!nomeFine) chiudi();
        }
    }

    // ------------------------------------------------------------------
    // Il TEMPO delle regole.
    //
    // Una scelta che arriva dalla rete arriva quando arriva: il client che
    // la aspetta, nel frattempo, ha già finito il codice in corso e ha dei
    // timer pronti a far avanzare la partita (il prossimo link della Catena,
    // il seguito di un'animazione). Il client che decide, invece, se sceglie
    // all'istante (l'IA, o una scelta obbligata) applicherebbe la scelta nel
    // mezzo di quello stesso codice. Misurato nel duello gemello: Buco Nero
    // distrugge i mostri uno alla volta, a metà Kaiser Glider chiede quale
    // mostro rimandare in mano, e la scelta cadeva PRIMA della distruzione
    // successiva da una parte e DOPO dall'altra.
    //
    // Due regole, insieme, mettono la scelta nello stesso punto sui due
    // client:
    //  1. chi decide all'istante applica la scelta subito DOPO il codice in
    //     corso (`differisci`, un microtask), non in mezzo;
    //  2. finché una scelta è aperta — mia o sua — i timer delle regole
    //     aspettano (`dopo` e `inPausa`, letti anche da isBlockingModalOpen
    //     per le transizioni di fase).
    // Fuori dal passo comune non cambia nulla: `dopo` è un setTimeout.
    // ------------------------------------------------------------------
    let differite = 0;

    /** Vero mentre una scelta è aperta e i timer delle regole devono aspettare. */
    function inPausa() {
        if (!attivo) return false;
        if (decisioniAttese.length > 0 || differite > 0) return true;
        return !!(window.Decisioni && Decisioni.inSospeso());
    }

    /**
     * Un timer delle regole: come setTimeout, ma a passo comune, scaduto il
     * tempo, aspetta che non ci sia nessuna scelta aperta.
     */
    function dopo(fn, ms) {
        if (!attivo) return setTimeout(fn, ms);
        const prova = () => {
            if (attivo && inPausa()) { setTimeout(prova, 30); return; }
            fn();
        };
        return setTimeout(prova, ms);
    }

    /** Decisioni.chiedi: una scelta presa all'istante si applica a codice in corso finito. */
    function differisci(fn) {
        differite++;
        queueMicrotask(() => { differite--; fn(); });
    }

    /** Decisioni.chiedi: la mia scelta (posizione nell'elenco, -1 = nessuna) parte per l'altro client. */
    function decisioneLocale(indice) {
        spedisci({ tipo: 'decisione', indice: indice });
    }

    /** Decisioni.chiedi: a scegliere è l'altro client; `poi(indice)` quando arriva. */
    function attendiDecisione(poi) {
        decisioniAttese.push(poi);
        avvisaAttesaDecisioneRemota(true, decisioniAttese.length);
        pompa();
    }

    /** Un messaggio dall'altro client. */
    function ricevi(messaggio) {
        if (!attivo || !messaggio) return;
        // Senza numero (un mittente che non numera): in coda e basta.
        if (typeof messaggio.seq !== 'number') {
            ricevuti++;
            inArrivo.push(messaggio);
            pompa();
            return;
        }
        if (messaggio.seq <= ultimoRicevuto || inAnticipo.has(messaggio.seq)) return; // doppione di una ripresa
        inAnticipo.set(messaggio.seq, messaggio);
        // Entrano in coda solo in fila: un buco (un messaggio perso) ferma
        // tutto finché la ripresa non lo riempie.
        while (inAnticipo.has(ultimoRicevuto + 1)) {
            ultimoRicevuto++;
            ricevuti++;
            inArrivo.push(inAnticipo.get(ultimoRicevuto));
            inAnticipo.delete(ultimoRicevuto);
        }
        pompa();
    }

    function programma() {
        if (!attivo || riprova || inArrivo.length === 0) return;
        riprova = setTimeout(() => { riprova = null; pompa(); }, 50);
    }

    /** Consuma la coda in arrivo finché si può, nell'ordine. */
    function pompa() {
        if (!attivo) return;
        while (inArrivo.length > 0) {
            const m = inArrivo[0];
            if (m.tipo === 'decisione') {
                if (decisioniAttese.length === 0) return;
                inArrivo.shift();
                // SEMPRE differita, anche quando la decisione era già qui
                // ad aspettare: chi l'ha presa la applica a codice in corso
                // finito (vedi Decisioni.chiedi), e servirla subito, dentro
                // chiedi(), la farebbe cadere in un punto diverso. Preso dal
                // duello gemello con Cerchio Ammaliante: di qua finiva al
                // Cimitero senza bersaglio, di là restava sul Terreno.
                const poi = decisioniAttese.shift();
                avvisaAttesaDecisioneRemota(decisioniAttese.length > 0, decisioniAttese.length);
                const indice = m.indice;
                differisci(() => poi(indice));
                continue;
            }
            if (m.tipo === 'comando') {
                if (!fermo() || gameState.turn !== m.turno || gameState.phase !== m.fase) { programma(); return; }
                inArrivo.shift();
                const mia = improntaDaSpedire();
                if (mia !== m.impronta) {
                    const dove = improntaCompleta ? `: ${primaDifferenza(mia, m.impronta)}` : '';
                    console.error(`PassoComune: lo stato di qua è diverso da quello dell'altro client prima del comando "${m.comando.tipo}" (turno ${gameState.turn}, fase ${gameState.phase})${dove}`);
                }
                Comandi.esegui(postoRemoto, m.comando, {});
                continue;
            }
            console.error(`PassoComune: messaggio sconosciuto "${m.tipo}"`);
            inArrivo.shift();
        }
    }

    return {
        avvia,
        ferma,
        attivo: () => attivo,
        preparaDuello,
        fermo,
        motivoNonFermo,
        impronta,
        comando,
        decisioneLocale,
        attendiDecisione,
        inPausa,
        dopo,
        differisci,
        ricevi,
        daRispedire,
        /** Il numero dell'ultimo messaggio arrivato in fila (vedi la ripresa). */
        ultimoRicevuto: () => ultimoRicevuto,
        /** Per i test e la diagnosi. */
        stato: () => ({ inArrivo: inArrivo.length, decisioniAttese: decisioniAttese.length, inCorso, inviati, ricevuti, rifiutati })
    };
})();

// Un `const` a livello di script è un nome globale "lessicale", NON una
// proprietà di window/globalThis: chi lo cerca come window.PassoComune
// (decisioni.js, tavolo.js, che leggono gli altri moduli da globalThis)
// non lo troverebbe. Preso dal duello gemello: senza questa riga le
// decisioni non viaggiavano affatto.
globalThis.PassoComune = PassoComune;
