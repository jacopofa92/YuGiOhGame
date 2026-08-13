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
        }, 40);

        // Finestra per un'eventuale risposta del giocatore (es. Buco
        // Trappola messo dal giocatore contro il bot) — vedi js/duel-engine.js.
        const summonCtx = DuelEngine.makeContext('bot', { summonedCard: card, summonedSlotIndex: slotIndex, summonedPosition: 'attack' });
        DuelEngine.fireTrigger(DuelEngine.TRIGGER.ON_NORMAL_SUMMON, summonCtx, () => updateUI());
    };

    if (tributeIndices.length > 0) {
        addToLog(`🤖 Il bot sacrifica ${tributeIndices.length} mostr${tributeIndices.length > 1 ? 'i' : 'o'} per evocare ${card.name}.`);
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
        const targetIndex = playerMonsters.length > 0 ? playerMonsters[0].index : -1;
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
