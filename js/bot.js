function botTurn() {
    clearPhaseTransitionTimeout();
    enterDrawPhase(false, () => {
        enterStandbyPhase(false);
        phaseTransitionTimeout = setTimeout(() => {
            enterMainPhase1();
            if (!gameState.hasNormalSummoned && gameState.botHand.length > 0) {
                attemptBotSummon();
            }
            phaseTransitionTimeout = setTimeout(() => {
                if (gameState.turn === 1) {
                    addToLog('❌ Il bot non può entrare in Battle Phase nel primo turno.');
                    enterEndPhase();
                    return;
                }
                addToLog('🤖 Il bot entra in Battle Phase.');
                enterBattlePhase();
                // Attende che il banner "Battaglia" (stesso stile e stessa
                // durata delle altre fasi, ~1.3s) finisca prima di far
                // partire gli attacchi del bot.
                phaseTransitionTimeout = setTimeout(() => {
                    botPerformAttacks().then(() => {
                        phaseTransitionTimeout = setTimeout(() => enterEndPhase(), 1000);
                    });
                }, 1400);
            }, 1500);
        }, 500);
    });
}

/**
 * Sceglie il miglior mostro evocabile dalla mano del bot, rispettando la
 * regola dei Tributi: preferisce il mostro con l'ATK più alto tra quelli
 * che il bot può effettivamente Evocare in questo momento.
 */
function attemptBotSummon() {
    const candidates = [...gameState.botHand]
        .filter(card => card.type === 'monster')
        .sort((a, b) => b.attack - a.attack);

    for (const card of candidates) {
        const tributesNeeded = getTributesRequired(card);

        if (tributesNeeded === 0) {
            const emptySlot = gameState.botMonsterField.findIndex(slot => slot === null);
            if (emptySlot !== -1) {
                botSummonMonster(card, [], emptySlot);
                return;
            }
        } else {
            const ownIndices = gameState.botMonsterField
                .map((slot, idx) => (slot ? idx : null))
                .filter(idx => idx !== null);
            if (ownIndices.length >= tributesNeeded) {
                botSummonMonster(card, ownIndices.slice(0, tributesNeeded), -1);
                return;
            }
        }
    }
}

/**
 * Evoca un mostro per il bot. Se tributeIndices non è vuoto, sacrifica
 * prima quei mostri (con animazione) e poi occupa lo slot liberato.
 */
function botSummonMonster(card, tributeIndices, emptySlotHint) {
    gameState.botHand = gameState.botHand.filter(c => c.uid !== card.uid);
    gameState.hasNormalSummoned = true;

    const finishSummon = (slotIndex) => {
        if (slotIndex === -1) return;
        gameState.botMonsterField[slotIndex] = { card, position: 'attack', isFaceDown: false, hasAttacked: false, canChangePosition: false };
        addToLog(`🤖 Il bot ha evocato ${card.name}.`);
        updateUI();
        setTimeout(() => {
            showPositionEffect('bot', slotIndex, 'attack');
            if (window.FX) {
                const cardEl = document.querySelector(`#botFieldBoard .field-slot[data-index="${slotIndex}"] .card`);
                FX.playSummonCircle(cardEl);
            }
            if (window.SFX) SFX.summon('attack');
        }, 40);

        // Finestra per un'eventuale risposta del giocatore (es. Buco
        // Trappola messo dal giocatore contro il bot) — vedi js/duel-engine.js.
        const summonCtx = DuelEngine.makeContext('bot', { summonedCard: card, summonedSlotIndex: slotIndex, summonedPosition: 'attack' });
        DuelEngine.fireTrigger(DuelEngine.TRIGGER.ON_NORMAL_SUMMON, summonCtx, () => updateUI());
    };

    if (tributeIndices.length > 0) {
        addToLog(`🤖 Il bot sacrifica ${tributeIndices.length} mostr${tributeIndices.length > 1 ? 'i' : 'o'} per evocare ${card.name}.`);
        if (window.SFX) SFX.tribute();
        tributeIndices.forEach(idx => {
            const cardEl = document.querySelector(`#botFieldBoard .field-slot[data-owner="bot"][data-type="monster"][data-index="${idx}"] .card`);
            if (cardEl && window.FX) FX.playTributeSacrifice(cardEl);
        });
        setTimeout(() => {
            let freedSlot = -1;
            tributeIndices.forEach(idx => {
                const slot = gameState.botMonsterField[idx];
                if (slot) {
                    gameState.botGraveyard.push(slot.card);
                    gameState.botMonsterField[idx] = null;
                    if (freedSlot === -1) freedSlot = idx;
                }
            });
            updateUI();
            finishSummon(freedSlot);
        }, 700);
    } else {
        finishSummon(emptySlotHint);
    }
}

/**
 * Sceglie contro quale mostro del giocatore conviene attaccare, invece di
 * puntare sempre e comunque al primo che capita:
 *   - un mostro SCOPERTO ha le statistiche note, quindi il bot attacca
 *     solo se gli conviene DAVVERO (ATK maggiore dell'ATK avversario se è
 *     in Posizione di Attacco, o della DEF se è in Posizione di Difesa) —
 *     niente scambi alla pari o autolesionisti;
 *   - un mostro COPERTO resta un azzardo lecito (le sue statistiche sono
 *     ignote finché non lo si attacca), quindi il bot può comunque tentarlo;
 *   - se il campo avversario è vuoto, è sempre un attacco diretto (-1);
 *   - se NESSUN bersaglio è conveniente (tutti scoperti e sfavorevoli, e
 *     nessuno coperto da tentare), ritorna null: meglio trattenere questo
 *     mostro in difesa che sacrificarlo in uno scambio in perdita.
 */
function chooseBotAttackTarget(attackerSlot, playerMonsters) {
    if (playerMonsters.length === 0) return -1;

    const attackerAtk = attackerSlot.card.attack;
    const faceDownTargets = playerMonsters.filter((m) => m.slot.isFaceDown);
    const favorableFaceUp = playerMonsters
        .filter((m) => !m.slot.isFaceDown)
        .filter((m) => attackerAtk > (m.slot.position === 'attack' ? m.slot.card.attack : m.slot.card.defense));

    if (favorableFaceUp.length > 0) {
        // Tra i bersagli scoperti convenienti, il più "redditizio": quello
        // con la statistica di riferimento più alta che comunque riesce a
        // battere, per massimizzare il valore distrutto invece che sceglierne uno a caso.
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

async function botPerformAttacks() {
    if (window.DuelEngine && DuelEngine.cannotAttack('bot')) {
        addToLog('🚫 I mostri del bot non possono attaccare in questo momento (es. Spada Rivelatrice).');
        return;
    }
    const attackers = gameState.botMonsterField.map((slot, index) => ({ slot, index })).filter(item => item.slot && !item.slot.hasAttacked);
    for (const attackerItem of attackers) {
        // Se un attacco precedente ha già chiuso il duello, non restiamo
        // ad aspettare gli attacchi rimanenti sotto la schermata finale.
        if (gameState.gameOver) return;
        const playerMonsters = gameState.playerMonsterField.map((slot, index) => ({ slot, index })).filter(item => item.slot);
        const targetIndex = chooseBotAttackTarget(attackerItem.slot, playerMonsters);
        // Nessun bersaglio conveniente: il bot trattiene questo mostro
        // invece di sacrificarlo in uno scambio sfavorevole.
        if (targetIndex === null) continue;
        // Aspetta la RISOLUZIONE PIENA dell'attacco (compresa un'eventuale
        // finestra "vuoi rispondere?" del giocatore, che può richiedere un
        // tempo arbitrario), non solo un timer fisso: altrimenti un secondo
        // attacco potrebbe partire mentre il modale di risposta al primo è
        // ancora aperto, sovrascrivendone i pulsanti di conferma/annulla.
        await new Promise(resolve => {
            setTimeout(() => {
                botExecuteAttack(attackerItem.index, targetIndex, resolve);
            }, 1200);
        });
    }
}

/**
 * Wrapper storico: l'attacco del bot (sia l'IA locale che la replica di
 * un attacco remoto in multiplayer) passa sempre per resolveAttack(),
 * definita in actions.js — vedi il commento lì per il perché di questa
 * unificazione. `onComplete` viene inoltrato così chi dichiara l'attacco
 * (es. botPerformAttacks) può aspettarne la risoluzione piena.
 */
function botExecuteAttack(attackerIndex, targetIndex, onComplete) {
    resolveAttack('bot', attackerIndex, targetIndex, onComplete);
}
