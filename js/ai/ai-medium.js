/**
 * ai-medium.js — Livello di difficoltà "Media": è l'euristica ORIGINALE
 * del bot (quella che questo gioco ha sempre avuto prima dell'IA
 * multilivello), spostata qui parola per parola — nessuna riscrittura —
 * così resta il comportamento di DEFAULT, identico a prima per chi non
 * sceglie esplicitamente Facile/Difficile. Vedi js/ai/ai-controller.js
 * per come si sceglie il livello, e js/bot.js per chi esegue davvero la
 * decisione (animazioni, timer, stato).
 */
(function () {
    'use strict';

    /**
     * Sceglie il miglior mostro evocabile dalla mano del bot, rispettando la
     * regola dei Tributi: preferisce il mostro con l'ATK più alto tra quelli
     * che il bot può effettivamente Evocare in questo momento. Ritorna
     * { card, tributeIndices, emptySlotHint } o null se non può evocare
     * nulla ora.
     */
    function chooseSummon(gameState) {
        const candidates = [...gameState.botHand]
            .filter((card) => card.type === 'monster')
            .sort((a, b) => b.attack - a.attack);

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
                    return { card: card, tributeIndices: ownIndices.slice(0, tributesNeeded), emptySlotHint: -1 };
                }
            }
        }
        return null;
    }

    /**
     * Sceglie contro quale mostro del giocatore conviene attaccare, invece di
     * puntare sempre e comunque al primo che capita:
     *   - un mostro SCOPERTO ha le statistiche note, quindi si attacca
     *     solo se conviene DAVVERO (ATK maggiore dell'ATK avversario se è in
     *     Posizione di Attacco, o della DEF se è in Posizione di Difesa);
     *   - un mostro COPERTO resta un azzardo lecito (statistiche ignote);
     *   - campo avversario vuoto -> sempre attacco diretto (-1);
     *   - nessun bersaglio conveniente -> null (trattiene il mostro).
     */
    function chooseAttackTarget(attackerSlot, playerMonsters) {
        if (playerMonsters.length === 0) return -1;

        const attackerAtk = attackerSlot.card.attack;
        const faceDownTargets = playerMonsters.filter((m) => m.slot.isFaceDown);
        const favorableFaceUp = playerMonsters
            .filter((m) => !m.slot.isFaceDown)
            .filter((m) => attackerAtk > (m.slot.position === 'attack' ? m.slot.card.attack : m.slot.card.defense));

        if (favorableFaceUp.length > 0) {
            favorableFaceUp.sort((a, b) => {
                const statA = a.slot.position === 'attack' ? a.slot.card.attack : a.slot.card.defense;
                const statB = b.slot.position === 'attack' ? b.slot.card.attack : b.slot.card.defense;
                return statB - statA;
            });
            return favorableFaceUp[0].index;
        }

        if (faceDownTargets.length > 0) return faceDownTargets[0].index;
        return null;
    }

    /**
     * Decisione nella finestra di priorità della Chain (vedi
     * openTriggerWindow/openActivationWindow in js/duel-engine.js): le
     * carte di risposta di questo gioco sono tutte "puro vantaggio se
     * attivate", quindi risponde sempre con la prima candidata disponibile
     * — stessa euristica che il motore usava prima dell'IA multilivello.
     */
    function chooseChainResponse(candidates) {
        return candidates.length > 0 ? candidates[0] : null;
    }

    window.AI_MEDIUM = {
        chooseSummon: chooseSummon,
        chooseAttackTarget: chooseAttackTarget,
        chooseChainResponse: chooseChainResponse
    };
})();
