// @ts-check
/**
 * rivincita-mode.js — Modalità Rivincite: un duello dell'anime nei panni di
 * uno dei due duellanti, con il SUO mazzo.
 * =====================================================================
 * duelMonstersCore.html?mode=rivincita&rivincita=<id>&character=<avversario>&difficulty=<livello>
 *
 * Fuori dal motore, come il Tutorial e il Puzzle: il duello è un duello
 * normale contro l'IA, e questo file cambia soltanto due cose intorno.
 *  1. CHI SEI: nome e ritratto del personaggio (giocatore(), letto da
 *     js/duel-session.js nel blocco "EXTRA — MODALITÀ AGGIUNTIVE").
 *  2. IL TUO MAZZO: prima della prima pescata il mazzo costruito dal tuo
 *     salvataggio viene sostituito da quello del personaggio. Lo si fa
 *     avvolgendo preparaManiIniziali() — lo stesso punto usato dal
 *     Tutorial — e richiamando poi l'originale, che pesca come sempre.
 * Tutto il resto (premi di fine duello, record contro l'avversario, Sfide
 * generiche) resta quello di un duello qualunque; in più si segna la
 * Rivincita vinta a quel livello.
 */
(function () {
    'use strict';

    const params = new URLSearchParams(window.location.search);
    if ((params.get('mode') || '').toLowerCase() !== 'rivincita') return;

    /** Il tuo mazzo prestato è sempre quello completo del personaggio. */
    const LIVELLO_MAZZO_PRESTATO = 'hard';
    const ETICHETTE = { Facile: 'Facile', Medio: 'Normale', Difficile: 'Difficile' };

    /** @returns {RivincitaDef | null} la Rivincita chiesta dall'URL (?rivincita=). */
    function trovaRivincita() {
        const elenco = (typeof rivinciteDatabase !== 'undefined') ? rivinciteDatabase : [];
        return elenco.find((r) => r.id === params.get('rivincita')) || null;
    }

    /** @param {string} id @returns {any} il personaggio di characters-db.js, o null. */
    function personaggio(id) {
        return (typeof characterDatabase !== 'undefined' && characterDatabase.find((c) => c.id === id)) || null;
    }

    /** Mette il mazzo (ed Extra Deck) del personaggio al posto del tuo. @param {RivincitaDef} r */
    function prestaMazzo(r) {
        const spec = getCharacterDeck(r.giocatore, LIVELLO_MAZZO_PRESTATO);
        const mazzo = spec ? buildDeckFromSpec(spec) : null;
        if (!mazzo) return;
        gameState[Tavolo.chiave('player', 'Deck')] = mazzo;
        gameState[Tavolo.chiave('player', 'DeckCount')] = mazzo.length;
        gameState[Tavolo.chiave('player', 'ExtraDeck')] = buildExtraDeckFromSpec(spec) || [];
    }

    function avvia() {
        const r = trovaRivincita();
        if (!r) {
            window.location.replace('rivincite.html');
            return;
        }
        const originale = window.preparaManiIniziali;
        window.preparaManiIniziali = function () {
            prestaMazzo(r);
            originale();
        };
        initGame();
    }

    /** @returns {IdentitaDuellante | null} */
    function giocatore() {
        const r = trovaRivincita();
        const c = r && personaggio(r.giocatore);
        return c ? { id: c.id, name: c.name, title: c.title || 'Duellante', image: c.image || null, icon: '🧑‍🎤' } : null;
    }

    /**
     * Fine del duello: segna la Rivincita vinta a questo livello e lo dice.
     * @param {boolean} vinto @param {boolean} abbandono @returns {VoceEsito[]}
     */
    function chiudi(vinto, abbandono) {
        const r = trovaRivincita();
        if (!r || !vinto || abbandono || !window.SaveManager) return [];
        const livello = params.get('difficulty') || 'Medio';
        /** @type {StatoRivincite} */
        const stato = SaveManager.getModeState('rivincite') || {};
        const voce = stato[r.id] || { vinte: {} };
        const primaVolta = !voce.vinte[livello];
        voce.vinte[livello] = true;
        stato[r.id] = voce;
        SaveManager.setModeState('rivincite', stato);
        if (primaVolta && window.ChallengeTracker) {
            ChallengeTracker.recordProgress('rivincitaWon', { rivincitaId: r.id, difficulty: livello });
        }
        return [{
            nota: true,
            icon: '⚔️',
            rule: primaVolta
                ? `Rivincita "${r.titolo}" vinta a livello ${ETICHETTE[livello] || livello}: la medaglia resta nella schermata Rivincite.`
                : `Rivincita "${r.titolo}" vinta di nuovo a livello ${ETICHETTE[livello] || livello}.`
        }];
    }

    window.ModalitaDuello = window.ModalitaDuello || {};
    /** @type {ModalitaDuello} */
    const modalita = {
        urlRitorno: 'rivincite.html',
        giocatore: giocatore,
        avvia: avvia,
        chiudi: chiudi
    };
    window.ModalitaDuello.rivincita = modalita;
})();
