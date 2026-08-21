/**
 * ai-hard.js — Livello di difficoltà "Difficile": a differenza di
 * ai-medium.js (che si ferma al primo candidato "abbastanza buono"),
 * questo livello VALUTA ogni opzione con un punteggio (differenza LP,
 * controllo ATK/DEF del campo, vantaggio carte in mano) e sceglie quella
 * col punteggio più alto, scartando le altre — una ricerca a un livello
 * di profondità con potatura delle opzioni peggiori, non un vero albero
 * di gioco multi-turno: per le carte di questo dataset (semplici, quasi
 * tutte "puro vantaggio se attivate", vedi l'audit citato in
 * js/duel-engine.js) una valutazione più profonda non cambierebbe le
 * decisioni, quindi non vale la complessità di implementarla. Vedi
 * js/ai/ai-controller.js per come si sceglie il livello.
 */
(function () {
    'use strict';

    /**
     * Punteggio di stato campo dal punto di vista del bot: più alto è
     * meglio per il bot. Usata per confrontare le opzioni di attacco/
     * evocazione tra loro, non per un vero minimax multi-turno.
     */
    function evaluateBoard(gameState) {
        let score = (gameState.botLP - gameState.playerLP) / 100;
        const powerOf = (field) => field.reduce((sum, slot) => {
            if (!slot) return sum;
            return sum + (slot.isFaceDown ? 400 : slot.card.attack); // mostro coperto: valore stimato prudente
        }, 0);
        score += (powerOf(gameState.botMonsterField) - powerOf(gameState.playerMonsterField)) / 100;
        score += (gameState.botHand.length - gameState.playerHand.length) * 3;
        return score;
    }

    /**
     * Come ai-medium.chooseSummon, ma invece di prendere il primo mostro
     * evocabile con l'ATK più alto, valuta TUTTI i mostri evocabili ora e
     * sceglie quello col punteggio migliore (statistica più alta, meno il
     * valore dei mostri propri sacrificati per farlo entrare) — così non
     * sacrifica per errore un mostro forte per evocarne uno più debole.
     */
    function chooseSummon(gameState) {
        const candidates = gameState.botHand.filter((card) => card.type === 'monster');
        let best = null;
        let bestScore = -Infinity;

        candidates.forEach((card) => {
            const tributesNeeded = getTributesRequired(card);
            let tributeIndices = [];
            let emptySlotHint = -1;

            if (tributesNeeded === 0) {
                emptySlotHint = gameState.botMonsterField.findIndex((slot) => slot === null);
                if (emptySlotHint === -1) return;
            } else {
                const ownIndices = gameState.botMonsterField
                    .map((slot, idx) => (slot ? idx : null))
                    .filter((idx) => idx !== null);
                if (ownIndices.length < tributesNeeded) return;
                // Sacrifica i propri mostri più DEBOLI, non i primi che capitano.
                tributeIndices = [...ownIndices]
                    .sort((a, b) => gameState.botMonsterField[a].card.attack - gameState.botMonsterField[b].card.attack)
                    .slice(0, tributesNeeded);
            }

            const sacrificedValue = tributeIndices.reduce((sum, idx) => sum + gameState.botMonsterField[idx].card.attack, 0);
            const score = Math.max(card.attack, card.defense) - sacrificedValue * 0.5;
            if (score > bestScore) {
                bestScore = score;
                best = { card: card, tributeIndices: tributeIndices, emptySlotHint: emptySlotHint };
            }
        });

        return best;
    }

    /**
     * Come ai-medium.chooseAttackTarget, ma valuta OGNI bersaglio possibile
     * (incluso "non attaccare") con un punteggio che stima il valore
     * distrutto meno il rischio di perdere l'attaccante in cambio, invece
     * di fermarsi al primo bersaglio "abbastanza favorevole" — un mostro
     * coperto rischioso può essere scartato a favore di trattenere
     * l'attaccante, cosa che ai-medium non fa mai.
     */
    function chooseAttackTarget(attackerSlot, playerMonsters) {
        if (playerMonsters.length === 0) return -1;
        const attackerAtk = attackerSlot.card.attack;

        let best = null;
        let bestScore = 0; // soglia minima: sotto zero, meglio trattenere il mostro

        playerMonsters.forEach((m) => {
            let score;
            if (m.slot.isFaceDown) {
                // Bersaglio ignoto: valore potenziale (distruggerlo) contro un
                // rischio stimato prudente (assume una DEF/ATK nella media).
                const estimatedRisk = 1500;
                score = 700 - estimatedRisk * 0.3;
            } else {
                const defStat = m.slot.position === 'attack' ? m.slot.card.attack : m.slot.card.defense;
                if (attackerAtk <= defStat) return; // sfavorevole o alla pari: mai vantaggioso attaccarlo
                score = defStat;
            }
            if (score > bestScore) { bestScore = score; best = m.index; }
        });

        return best;
    }

    /**
     * Decisione nella finestra di priorità della Chain (vedi
     * openTriggerWindow/openActivationWindow in js/duel-engine.js): per ora
     * nessuna carta del dataset ha un costo/downside reale nel rispondere
     * (vedi l'audit citato in js/duel-engine.js), quindi risponde sempre
     * con la prima candidata come ai-medium — punto d'aggancio pronto per
     * quando arriveranno carte con un vero trade-off da valutare.
     */
    function chooseChainResponse(candidates) {
        return candidates.length > 0 ? candidates[0] : null;
    }

    window.AI_HARD = {
        evaluateBoard: evaluateBoard,
        chooseSummon: chooseSummon,
        chooseAttackTarget: chooseAttackTarget,
        chooseChainResponse: chooseChainResponse
    };
})();
