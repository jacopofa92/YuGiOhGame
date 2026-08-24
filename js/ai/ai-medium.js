/**
 * ai-medium.js — Livello di difficoltà "Media": è l'euristica ORIGINALE
 * del bot (quella che questo gioco ha sempre avuto prima dell'IA
 * multilivello), spostata qui parola per parola — nessuna riscrittura —
 * così resta il comportamento di DEFAULT, identico a prima per chi non
 * sceglie esplicitamente Facile/Difficile. Vedi js/ai/ai-controller.js
 * per come si sceglie il livello, e js/ai/bot.js per chi esegue davvero la
 * decisione (animazioni, timer, stato).
 */
(function () {
    'use strict';

    /**
     * Sceglie il miglior mostro evocabile dalla mano del bot, rispettando la
     * regola dei Tributi: preferisce il mostro con l'ATK più alto tra quelli
     * che il bot può effettivamente Evocare in questo momento. Ritorna
     * { card, tributeIndices, emptySlotHint, position, faceDown } o null se
     * non può evocare nulla ora. Postura (Attacco/Difesa coperta/Difesa
     * scoperta): AI_SHARED.decideMonsterPosture (js/ai/ai-shared.js) — un
     * piccolo passo di intelligenza posizionale anche per questo livello,
     * non solo per Difficile.
     *
     * Per un'Evocazione Tributo, sacrifica i mostri più DEBOLI del campo
     * (non i primi che capitano), e SALTA del tutto il candidato se il
     * risultato sarebbe una mossa in perdita netta — es. sacrificare due
     * mostri da 2500 ATK per evocarne uno da 2500 ATK non è mai
     * accettabile, anche se è l'unico Tributo disponibile in mano: meglio
     * non evocare nulla questo turno che indebolirsi da soli.
     */
    function chooseSummon(gameState) {
        const candidates = [...gameState.botHand]
            .filter((card) => card.type === 'monster' && (!window.AI_SHARED || AI_SHARED.canNormalSummonNow(card, gameState, 'bot')))
            .sort((a, b) => b.attack - a.attack);

        for (const card of candidates) {
            const tributesNeeded = getTributesRequired(card);
            const posture = (window.AI_SHARED && AI_SHARED.decideMonsterPosture(card, gameState, 'bot')) || { position: 'attack', faceDown: false };
            if (tributesNeeded === 0) {
                const emptySlot = gameState.botMonsterField.findIndex((slot) => slot === null);
                if (emptySlot !== -1) return { card: card, tributeIndices: [], emptySlotHint: emptySlot, position: posture.position, faceDown: posture.faceDown };
            } else {
                const ownIndices = gameState.botMonsterField
                    .map((slot, idx) => (slot ? idx : null))
                    .filter((idx) => idx !== null);
                if (ownIndices.length < tributesNeeded) continue;
                const tributeIndices = [...ownIndices]
                    .sort((a, b) => gameState.botMonsterField[a].card.attack - gameState.botMonsterField[b].card.attack)
                    .slice(0, tributesNeeded);
                const sacrificedValue = tributeIndices.reduce((sum, idx) => sum + gameState.botMonsterField[idx].card.attack, 0);
                if (Math.max(card.attack, card.defense) <= sacrificedValue) continue; // mossa in perdita netta: scartata
                return { card: card, tributeIndices: tributeIndices, emptySlotHint: -1, position: posture.position, faceDown: posture.faceDown };
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
        if (playerMonsters.length === 0) {
            // "Non può attaccare direttamente" (es. Zombyra l'Oscuro, id
            // 625): niente bersaglio-mostro disponibile E l'attacco
            // diretto è comunque vietato per questa carta -> trattiene.
            const attackerDef = window.DuelEngine && DuelEngine.getDefinition(attackerSlot.card.id);
            if (attackerDef && attackerDef.cannotAttackDirectly) return null;
            return -1;
        }

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
        // Permesso di attaccare direttamente anche con mostri avversari in
        // campo (es. Sparatore Sonico id 773, Folletto della Fiamma
        // Furente id 681) — usato solo come ultima risorsa, quando nessun
        // bersaglio-mostro sembrava già vantaggioso qui sopra, per non
        // alterare l'euristica esistente quando un buon bersaglio c'è.
        if (gameState.directAttackAllowedUids && gameState.directAttackAllowedUids[attackerSlot.card.uid]) return -1;
        return null;
    }

    /**
     * Decisione nella finestra di priorità della Chain (vedi
     * openTriggerWindow/openActivationWindow in js/engine/duel-engine.js): le
     * carte di risposta di questo gioco sono tutte "puro vantaggio se
     * attivate", quindi risponde sempre con la prima candidata disponibile
     * — stessa euristica che il motore usava prima dell'IA multilivello.
     */
    function chooseChainResponse(candidates) {
        return candidates.length > 0 ? candidates[0] : null;
    }

    /**
     * Decide la PROSSIMA azione da fare con una Magia/Trappola in mano
     * durante la propria Main Phase (js/ai/bot.js la richiama ripetutamente,
     * una carta alla volta, finché ritorna null) — { handIndex, action }
     * con action 'activate' (Magia, subito) o 'set' (Trappola o Magia,
     * coperta sul Terreno). A differenza di IA_DIFFICILE, questo livello
     * resta "modesto": al massimo 1 Trappola Settata e 1 Magia attivata
     * per turno (usedSetThisCall/usedActivateThisCall in gameState,
     * azzerati ad ogni Main Phase — vedi bot.js), e non attiva mai da solo
     * le proprie carte già Set (resta puramente reattivo a quelle, come
     * sempre) — è proprio questa differenza di "quanto usa il proprio
     * retrocampo" a rendere Difficile percepibilmente più aggressivo.
     */
    function chooseNextSpellTrapAction(gameState, usedThisTurn) {
        const hand = gameState.botHand;
        const emptySlot = gameState.botSTField.some((s) => s === null);

        if (!usedThisTurn.activateDone) {
            const spellIndex = hand.findIndex((c, idx) => c.type === 'spell' && window.DuelEngine && DuelEngine.canActivate('bot', 'hand', idx));
            if (spellIndex !== -1) {
                usedThisTurn.activateDone = true;
                return { handIndex: spellIndex, card: hand[spellIndex], action: 'activate' };
            }
        }
        if (!usedThisTurn.setDone && emptySlot) {
            const trapIndex = hand.findIndex((c) => c.type === 'trap');
            if (trapIndex !== -1) {
                usedThisTurn.setDone = true;
                return { handIndex: trapIndex, card: hand[trapIndex], action: 'set' };
            }
        }
        return null;
    }

    /**
     * Vero se conviene attivare ORA una propria carta già Set durante la
     * propria Main Phase (non in risposta a un trigger). IA_MEDIA non lo
     * fa mai: resta puramente reattiva sul proprio retrocampo, per
     * differenziarsi davvero da IA_DIFFICILE (vedi ai-hard.js).
     */
    function chooseSetCardActivation() {
        return null;
    }

    window.AI_MEDIUM = {
        chooseSummon: chooseSummon,
        chooseAttackTarget: chooseAttackTarget,
        chooseChainResponse: chooseChainResponse,
        chooseNextSpellTrapAction: chooseNextSpellTrapAction,
        chooseSetCardActivation: chooseSetCardActivation
    };
})();
