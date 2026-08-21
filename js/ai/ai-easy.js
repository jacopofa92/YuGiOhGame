/**
 * ai-easy.js — Livello di difficoltà "Facile": scelte valide ma casuali,
 * priorità minima. Non valuta MAI la convenienza di una mossa (a
 * differenza di ai-medium.js/ai-hard.js) — l'unico vincolo è che la mossa
 * sia LEGALE (rispetta i Tributi richiesti, non attacca a vuoto, ecc.),
 * mai che sia furba. Vedi js/ai/ai-controller.js per come si sceglie il
 * livello.
 */
(function () {
    'use strict';

    function shuffled(array) {
        return [...array].sort(() => Math.random() - 0.5);
    }

    /** Come ai-medium.chooseSummon, ma il mostro E i Tributi da sacrificare sono scelti a caso tra quelli legali, non per convenienza. */
    function chooseSummon(gameState) {
        const candidates = shuffled(gameState.botHand.filter((card) => card.type === 'monster'));

        for (const card of candidates) {
            const tributesNeeded = getTributesRequired(card);
            if (tributesNeeded === 0) {
                const emptySlot = gameState.botMonsterField.findIndex((slot) => slot === null);
                if (emptySlot !== -1) return { card: card, tributeIndices: [], emptySlotHint: emptySlot };
            } else {
                const ownIndices = gameState.botMonsterField
                    .map((slot, idx) => (slot ? idx : null))
                    .filter((idx) => idx !== null);
                if (ownIndices.length >= tributesNeeded) {
                    return { card: card, tributeIndices: shuffled(ownIndices).slice(0, tributesNeeded), emptySlotHint: -1 };
                }
            }
        }
        return null;
    }

    /** Attacca un bersaglio a caso (anche sfavorevole), o a volte non attacca affatto: nessuna valutazione di convenienza. */
    function chooseAttackTarget(attackerSlot, playerMonsters) {
        if (playerMonsters.length === 0) return -1;
        if (Math.random() < 0.35) return null; // trattiene il mostro senza motivo, "poco furbo" ma legale
        const pick = playerMonsters[Math.floor(Math.random() * playerMonsters.length)];
        return pick.index;
    }

    /** Risponde a caso nella finestra di Chain, anche quando non conviene, o a volte passa senza motivo. */
    function chooseChainResponse(candidates) {
        if (candidates.length === 0) return null;
        if (Math.random() < 0.35) return null;
        return candidates[Math.floor(Math.random() * candidates.length)];
    }

    window.AI_EASY = {
        chooseSummon: chooseSummon,
        chooseAttackTarget: chooseAttackTarget,
        chooseChainResponse: chooseChainResponse
    };
})();
