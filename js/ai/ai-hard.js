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
            // "Bara" quanto basta a non farsi paralizzare dall'indecisione:
            // preferisce SEMPRE la minaccia più forte che può permettersi
            // ora, invece di trattenere mostri potenti per un turno
            // migliore che potrebbe non arrivare mai (vedi la richiesta
            // esplicita dell'utente di privilegiare le sue possibilità di
            // Evocare mostri forti). Un piccolo bonus ulteriore per i
            // mostri di Tributo (Livello 5+): a parità di punteggio
            // preferisce impegnare i Tributi su qualcosa di davvero forte
            // piuttosto che no.
            const tributeBonus = tributesNeeded > 0 ? 150 : 0;
            const score = Math.max(card.attack, card.defense) - sacrificedValue * 0.5 + tributeBonus;
            if (score > bestScore) {
                bestScore = score;
                best = { card: card, tributeIndices: tributeIndices, emptySlotHint: emptySlotHint };
            }
        });

        if (!best) return null;
        // Posizione: stessa euristica condivisa di IA_MEDIA (AI_SHARED),
        // ma qui la scelta è già la carta OGGETTIVAMENTE migliore
        // disponibile, non solo "la prima con ATK alto" — quindi la
        // decisione Attacco/Difesa risultante è più affidabile.
        best.position = (window.AI_SHARED && AI_SHARED.shouldSetFaceDown(best.card, gameState, 'bot')) ? 'defense' : 'attack';
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
     * openTriggerWindow/openActivationWindow in js/duel-engine.js): a
     * differenza di IA_MEDIA (che risponde sempre con la prima candidata),
     * qui si valuta l'impatto stimato di OGNI candidata con
     * AI_SHARED.scoreCardImpact (parole chiave nel testo effetto) e si
     * sceglie la più forte — es. preferisce una Trappola che distrugge un
     * mostro a una che si limita a infliggere danno, quando entrambe sono
     * disponibili come risposta.
     */
    function chooseChainResponse(candidates) {
        if (candidates.length === 0) return null;
        if (!window.AI_SHARED) return candidates[0];
        let best = candidates[0];
        let bestScore = -Infinity;
        candidates.forEach((c) => {
            const score = AI_SHARED.scoreCardImpact(c.card);
            if (score > bestScore) { bestScore = score; best = c; }
        });
        return best;
    }

    /**
     * Decide la PROSSIMA azione da fare con una Magia/Trappola in mano
     * durante la propria Main Phase (js/bot.js la richiama ripetutamente,
     * una carta alla volta, finché ritorna null) — { handIndex, card,
     * action } con action 'activate' o 'set'. A differenza di IA_MEDIA
     * (che si ferma a 1 Trappola + 1 Magia), IA_DIFFICILE:
     *   - Setta TUTTE le Trappole che ha spazio per piazzare, partendo
     *     dalla più forte stimata (AI_SHARED.scoreCardImpact) — riempie
     *     il proprio retrocampo invece di trattenerle senza motivo;
     *   - attiva OGNI Magia in mano che può attivare subito con un
     *     impatto stimato utile (soglia bassa: quasi tutte, coerente col
     *     principio "le carte di questo dataset sono quasi tutte puro
     *     vantaggio se attivate", già documentato in js/duel-engine.js).
     */
    function chooseNextSpellTrapAction(gameState) {
        const hand = gameState.botHand;
        const emptySlot = gameState.botSTField.some((s) => s === null);
        const impact = (card) => (window.AI_SHARED ? AI_SHARED.scoreCardImpact(card) : 1);

        // Prima le Magie (soprattutto le Continue: il loro vantaggio è
        // averle SUBITO scoperte in campo, mentre una Trappola guadagna
        // valore proprio dall'essere nascosta), così non finiscono escluse
        // da canActivate per mancanza di slot liberi se le Trappole
        // avessero già riempito tutto il retrocampo per prime.
        const spells = hand
            .map((card, handIndex) => ({ card, handIndex }))
            .filter((e) => e.card.type === 'spell' && window.DuelEngine && DuelEngine.canActivate('bot', 'hand', e.handIndex))
            .sort((a, b) => impact(b.card) - impact(a.card));
        if (spells.length > 0) return { handIndex: spells[0].handIndex, card: spells[0].card, action: 'activate' };

        if (emptySlot) {
            const traps = hand
                .map((card, handIndex) => ({ card, handIndex }))
                .filter((e) => e.card.type === 'trap')
                .sort((a, b) => impact(b.card) - impact(a.card));
            if (traps.length > 0) return { handIndex: traps[0].handIndex, card: traps[0].card, action: 'set' };
        }

        return null;
    }

    /**
     * Vero se conviene attivare ORA una propria carta già Set (Magia
     * Continua, Trappola normale, ecc.) durante la propria Main Phase —
     * non solo in risposta a un trigger avversario. IA_DIFFICILE è
     * l'UNICO livello che lo fa: attiva proattivamente il proprio
     * retrocampo quando è utile, invece di aspettare passivamente che
     * l'avversario dia lo spunto — è questa la differenza di
     * comportamento più visibile rispetto a IA_MEDIA.
     */
    function chooseSetCardActivation(gameState) {
        if (!window.DuelEngine) return null;
        const stField = gameState.botSTField;
        const candidates = [];
        stField.forEach((slot, index) => {
            if (!slot || !slot.isFaceDown) return;
            if (!DuelEngine.canActivate('bot', 'st', index)) return;
            candidates.push({ index: index, card: slot.card });
        });
        if (candidates.length === 0) return null;
        candidates.sort((a, b) => (window.AI_SHARED ? AI_SHARED.scoreCardImpact(b.card) - AI_SHARED.scoreCardImpact(a.card) : 0));
        return candidates[0];
    }

    window.AI_HARD = {
        evaluateBoard: evaluateBoard,
        chooseSummon: chooseSummon,
        chooseAttackTarget: chooseAttackTarget,
        chooseChainResponse: chooseChainResponse,
        chooseNextSpellTrapAction: chooseNextSpellTrapAction,
        chooseSetCardActivation: chooseSetCardActivation
    };
})();
