function botTurn() {
    clearPhaseTransitionTimeout();
    enterDrawPhase(false, () => {
        enterStandbyPhase(false);
        phaseTransitionTimeout = setTimeout(() => {
            enterMainPhase1();
            // Come per botPerformAttacks() più sotto: aspetta la
            // RISOLUZIONE PIENA dell'Evocazione (compresa un'eventuale
            // finestra "vuoi attivare Buco Trappola?" del giocatore, che può
            // richiedere un tempo arbitrario) prima di procedere alla Battle
            // Phase — altrimenti il bot entrerebbe in battaglia dopo un
            // timer fisso anche se quel modale è ancora aperto in attesa di
            // una decisione, lasciando l'avversario "scavalcato".
            const summonPromise = (!gameState.hasNormalSummoned && gameState.botHand.length > 0) ? attemptBotSummon() : Promise.resolve();
            summonPromise.then(() => {
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
            });
        }, 500);
    });
}

/**
 * Chiede a BotAI (js/ai/ai-controller.js — il livello di difficoltà
 * attivo in gameState.botDifficulty) quale mostro evocare, poi esegue
 * DAVVERO quella decisione (animazioni, stato). Ritorna una Promise che
 * si risolve quando l'Evocazione (compresa un'eventuale finestra di
 * risposta del giocatore) è DAVVERO finita — vedi botTurn(), che aspetta
 * questa Promise prima di passare alla Battle Phase.
 */
function attemptBotSummon() {
    const decision = window.BotAI ? BotAI.chooseSummon(gameState) : null;
    if (!decision) return Promise.resolve();
    return botSummonMonster(decision.card, decision.tributeIndices, decision.emptySlotHint);
}

/**
 * Evoca un mostro per il bot. Se tributeIndices non è vuoto, sacrifica
 * prima quei mostri (con animazione) e poi occupa lo slot liberato.
 * Ritorna una Promise che si risolve solo dopo che l'eventuale finestra di
 * risposta del giocatore (es. Buco Trappola) si è chiusa per davvero.
 */
function botSummonMonster(card, tributeIndices, emptySlotHint) {
    gameState.botHand = gameState.botHand.filter(c => c.uid !== card.uid);
    gameState.hasNormalSummoned = true;

    return new Promise((resolve) => {
        const finishSummon = (slotIndex) => {
            if (slotIndex === -1) { resolve(); return; }
            gameState.botMonsterField[slotIndex] = { card, position: 'attack', isFaceDown: false, hasAttacked: false, canChangePosition: false, summonedOnTurn: gameState.turn };
            addToLog(`🤖 Il bot ha evocato ${card.name}.`);
            updateUI();
            setTimeout(() => {
                showPositionEffect('bot', slotIndex, 'attack');
                if (window.FX) {
                    const cardEl = document.querySelector(`#botFieldBoard .field-slot[data-index="${slotIndex}"] .card`);
                    FX.playSummonCircle(cardEl);
                }
                // Effetto audio DEDICATO per questa carta (audio/evocazioni/<id>.mp3
                // — vedi js/audio-library.js), se esiste; altrimenti il
                // suono di Evocazione standard di sempre.
                if (!(window.AudioLibrary && AudioLibrary.tryPlayCardSound(card, 'evocazioni'))) {
                    if (window.SFX) SFX.summon('attack');
                }
            }, 40);

            // Finestra per un'eventuale risposta del giocatore (es. Buco
            // Trappola messo dal giocatore contro il bot) — vedi js/duel-engine.js.
            const summonCtx = DuelEngine.makeContext('bot', { summonedCard: card, summonedSlotIndex: slotIndex, summonedPosition: 'attack' });
            DuelEngine.fireTrigger(DuelEngine.TRIGGER.ON_NORMAL_SUMMON, summonCtx, () => { updateUI(); resolve(); });
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
    });
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
        const targetIndex = window.BotAI ? BotAI.chooseAttackTarget(attackerItem.slot, playerMonsters) : null;
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
