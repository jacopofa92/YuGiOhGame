// @ts-check
/**
 * decisioni.js — ogni scelta del duello passa da qui.
 * =====================================================================
 * Nucleo senza testa (piano di attacco, Priorità 2). Le scelte (quale
 * carta, quale bersaglio, Attacco o Difesa, quale delle due azioni) erano
 * scritte carta per carta, e ognuna ripeteva da sé la stessa decisione:
 * "se sceglie il giocatore e c'è l'interfaccia, apri la lista; altrimenti
 * prendi il primo"; alcune anche "se sceglie l'avversario remoto, aspetta
 * la sua scelta". Dove una carta se ne dimenticava un pezzo, quella scelta
 * si comportava in modo diverso dalle altre.
 *
 * Ora una carta descrive la scelta (una RICHIESTA) e dice cosa fare col
 * risultato. Qui si decide CHI risponde, sempre allo stesso modo:
 *  1. l'avversario remoto, in Multiplayer, se la richiesta lo prevede
 *     (`viaggia`): si aspetta la sua scelta, che arriva dalla rete;
 *  2. la persona davanti allo schermo, se a scegliere è 'player' e
 *     un'interfaccia ascolta l'evento 'decisione' (actions.js apre la
 *     lista, il popover, le opzioni);
 *  3. altrimenti la scelta automatica della richiesta (`automatica`, o il
 *     primo candidato): il bot, o qualunque duello senza interfaccia — il
 *     duello senza testa, le simulazioni.
 * Mentre si aspetta, la decisione è "in sospeso" (Decisioni.inSospeso) e
 * chiunque può risponderle (Decisioni.rispondi): un test, un'altra
 * interfaccia, un domani un secondo bot al posto del giocatore.
 *
 * LA RICHIESTA
 *   chi        'player' | 'bot' — chi sceglie (di solito ctx.owner)
 *   tipo       'carte'       una carta da un elenco (candidati qualsiasi,
 *                            `mostra(c)` dà la carta da disegnare)
 *              'opzioni'     un'etichetta: candidati [{ value, label, icon? }]
 *              'posizione'   Attacco o Difesa: candidati ['attack','defense']
 *              'coppia'      una di due azioni: candidati [{ label, icon }, { label, icon }]
 *              'presa-visione' un elenco da guardare, non da scegliere: si
 *                            risolve con null quando lo si chiude
 *              'risposta'    rispondere in Catena con una delle carte
 *                            candidate, o passare (null); porta anche
 *                            cartaInnesco, momento, innescoProprio per il
 *                            prompt (vedi offerChoice in duel-engine.js)
 *   candidati  l'elenco fra cui scegliere
 *   titolo, testo, vuota (testo per un elenco vuoto), ancora (elemento a
 *              cui agganciare un popover, da PortaUI; null = centro)
 *   automatica (candidati) => candidato | null: cosa sceglie il bot, o un
 *              duello senza interfaccia. Default: il primo candidato.
 *   annullabile la persona può chiudere senza scegliere: si risolve con null
 *   automaticaSeUnica  con un solo candidato non si chiede nulla
 *   viaggia    (candidato) => uid: in Multiplayer la scelta viaggia fra i due
 *              client. SOLO per le scelte che il protocollo racconta (un
 *              bersaglio, un'opzione): una scelta sul proprio lato la
 *              copre già la fotografia di stato che segue ogni attivazione,
 *              e farla viaggiare sbilancerebbe le code (l'altro client non
 *              aspetta nulla).
 *
 * Il risultato arriva a `onDeciso(candidato | null)`. Asincrono quando
 * risponde una persona: tutto ciò che dipende dalla scelta va dentro
 * onDeciso, mai dopo la chiamata.
 */
(function () {
    'use strict';

    /** uid con cui viaggia un "annulla" (vedi `viaggia`). */
    const UID_ANNULLA = 'decisione:annulla';

    /** @type {null | { id: number, richiesta: any, fine: (valore: any) => void }} */
    let aperta = null;
    let progressivo = 0;

    const g = /** @type {any} */ (globalThis);

    /** @param {any} r */
    function sceltaAutomatica(r) {
        if (r.tipo === 'presa-visione') return null;
        const c = r.candidati || [];
        // Con una `automatica` vale la sua risposta, anche "nessuna" (null o
        // undefined): per una risposta in Catena o un effetto facoltativo
        // "non scelgo niente" è una scelta, non un invito a prendere il primo.
        if (typeof r.automatica === 'function') {
            const scelta = r.automatica(c.slice());
            return scelta === undefined ? null : scelta;
        }
        return c[0] === undefined ? null : c[0];
    }

    /**
     * Vero se una scelta di `chi` la farà una persona davanti a QUESTO
     * schermo: è il giocatore locale e un'interfaccia ascolta. Serve a chi
     * prepara una scelta in più passi (una carta alla volta) e vuole far
     * decidere al bot l'insieme intero in un colpo solo.
     * @param {string} chi
     * @param {string} [tipo] il tipo di decisione; senza, basta che
     *        un'interfaccia per le scelte ci sia
     */
    function rispondeUnaPersona(chi, tipo) {
        // Chi controlla il posto lo dice js/engine/tavolo.js: di default
        // 'player' è la persona, ma in un IA contro IA nessuno dei due lo è.
        if (!g.Tavolo || !g.Tavolo.ePersona(chi)) return false;
        if (!g.EventiDuello || !g.EventiDuello.ascoltato('decisione')) return false;
        // L'interfaccia può esserci ma non saper mostrare questa scelta
        // adesso (un modale assente): allora decide la scelta automatica.
        // Senza tipo si chiede solo se un'interfaccia per le scelte c'è.
        return g.EventiDuello.chiedi('decisioni-a-schermo', true, tipo) !== false;
    }

    /**
     * @param {any} richiesta
     * @param {(scelta: any) => void} onDeciso
     */
    function chiedi(richiesta, onDeciso) {
        const r = Object.assign({ tipo: 'carte', candidati: [] }, richiesta);
        if (r.tipo === 'posizione' && (!r.candidati || r.candidati.length === 0)) r.candidati = ['attack', 'defense'];
        const viaggia = typeof r.viaggia === 'function';
        const DuelEngine = g.DuelEngine;

        // 1. L'avversario remoto: la sua scelta arriva dalla rete, per uid.
        // awaitRemoteCardChoice (duel-engine.js) accoppia in ordine le
        // scelte attese con quelle arrivate, e ricade sul primo candidato
        // se non arriva nulla entro il tempo limite.
        if (viaggia && DuelEngine && DuelEngine.isRemoteChooser && DuelEngine.isRemoteChooser(r.chi)) {
            const attesi = r.candidati.map((/** @type {any} */ c) => ({ card: { uid: r.viaggia(c) }, valore: c }));
            if (r.annullabile) attesi.push({ card: { uid: UID_ANNULLA }, valore: null });
            DuelEngine.awaitRemoteCardChoice(attesi, (/** @type {any} */ s) => onDeciso(s ? s.valore : (r.candidati[0] === undefined ? null : r.candidati[0])));
            return;
        }

        const id = ++progressivo;
        let chiusa = false;
        const fine = (/** @type {any} */ valore) => {
            if (chiusa) return;
            chiusa = true;
            if (aperta && aperta.id === id) aperta = null;
            // In Multiplayer la mia scelta si comunica SEMPRE, anche quando
            // era obbligata o automatica: dall'altra parte qualcuno la sta
            // aspettando, e le due code si accoppiano in ordine — un
            // messaggio mancante lascerebbe l'altro lato ad aspettare.
            if (viaggia && g.MULTIPLAYER_MODE && r.chi === 'player' && DuelEngine && DuelEngine.broadcastCardChoice) {
                DuelEngine.broadcastCardChoice(valore === null || valore === undefined ? UID_ANNULLA : r.viaggia(valore));
            }
            onDeciso(valore === undefined ? null : valore);
        };

        // Un solo candidato e niente da chiedere: si prende quello, per
        // chiunque — NON la scelta automatica, che per un effetto
        // facoltativo può essere "rinuncio" (giusta per il bot, sbagliata
        // per chi aveva scelto di usare l'effetto).
        if (r.automaticaSeUnica && r.candidati.length === 1) {
            fine(r.candidati[0]);
            return;
        }
        // 2. La persona davanti allo schermo, se c'è chi gliela mostra.
        if (!rispondeUnaPersona(r.chi, r.tipo)) {
            // 3. La scelta automatica.
            fine(sceltaAutomatica(r));
            return;
        }
        aperta = { id, richiesta: r, fine };
        g.EventiDuello.emetti('decisione', r, fine);
    }

    const Decisioni = {
        chiedi,
        rispondeUnaPersona,

        /**
         * La decisione che aspetta una persona, senza le funzioni: tipo, chi,
         * titolo, testo e candidati. null se non c'è nulla in sospeso.
         * @returns {null | { id: number, chi: string, tipo: string, titolo?: string, testo?: string, candidati: any[] }}
         */
        inSospeso() {
            if (!aperta) return null;
            const r = aperta.richiesta;
            return { id: aperta.id, chi: r.chi, tipo: r.tipo, titolo: r.titolo, testo: r.testo, candidati: r.candidati.slice() };
        },

        /**
         * Risponde alla decisione in sospeso al posto della persona: col
         * candidato stesso, col suo indice nell'elenco, o null per
         * "chiudi senza scegliere". Torna false se non c'era nulla da
         * rispondere. Chi la mostrava a schermo (un modale aperto) resta
         * da chiudere a parte.
         * @param {any} valore
         */
        rispondi(valore) {
            if (!aperta) return false;
            const { richiesta, fine } = aperta;
            const scelta = typeof valore === 'number' ? richiesta.candidati[valore] : valore;
            fine(scelta === undefined ? null : scelta);
            return true;
        },

        UID_ANNULLA
    };

    g.Decisioni = Decisioni;
})();
