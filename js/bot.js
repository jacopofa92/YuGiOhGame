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
            summonPromise
                // Dopo l'Evocazione (o il Set) del mostro, il bot valuta se
                // Settare Trappole e/o attivare Magie dalla mano — una vera
                // novità: prima il bot non toccava MAI le proprie Magie/
                // Trappole se non in risposta a un'azione del giocatore,
                // lasciandole morte in mano per l'intera partita. Vedi
                // attemptBotSpellTrap più sotto e js/ai/ai-medium.js /
                // js/ai/ai-hard.js per quanto ogni livello ne approfitta.
                .then(() => attemptBotSpellTrap())
                // Poi valuta se attivare PROATTIVAMENTE una propria carta
                // già Set in un turno precedente (solo IA_DIFFICILE lo fa,
                // vedi ai-hard.js) — anche questa una novità: prima il
                // retrocampo del bot restava sempre e solo reattivo.
                .then(() => attemptBotActivateSetCards())
                .then(() => {
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
    return botSummonMonster(decision.card, decision.tributeIndices, decision.emptySlotHint, decision.position);
}

/**
 * Evoca (o Setta coperto, se `position === 'defense'` — vedi
 * js/ai/ai-shared.js#shouldSetFaceDown, usata da entrambi i livelli per
 * decidere quando conviene) un mostro per il bot. Se tributeIndices non è
 * vuoto, sacrifica prima quei mostri (con animazione) e poi occupa lo
 * slot liberato. Ritorna una Promise che si risolve solo dopo che
 * l'eventuale finestra di risposta del giocatore (es. Buco Trappola) si è
 * chiusa per davvero.
 */
function botSummonMonster(card, tributeIndices, emptySlotHint, position) {
    position = position === 'defense' ? 'defense' : 'attack';
    const isFaceDown = position === 'defense';
    gameState.botHand = gameState.botHand.filter(c => c.uid !== card.uid);
    gameState.hasNormalSummoned = true;

    return new Promise((resolve) => {
        const finishSummon = (slotIndex) => {
            if (slotIndex === -1) { resolve(); return; }
            gameState.botMonsterField[slotIndex] = { card, position, isFaceDown, hasAttacked: false, canChangePosition: false, summonedOnTurn: gameState.turn };
            // Un Set coperto non rivela MAI il nome della carta nel log —
            // il giocatore non deve poter dedurre cosa il bot ha appena
            // piazzato, esattamente come vale per un Set del giocatore
            // stesso (vedi summonMonster() in actions.js).
            addToLog(isFaceDown ? '🤖 Il bot ha Set un mostro coperto in Posizione di Difesa.' : `🤖 Il bot ha evocato ${card.name}.`);
            updateUI();
            setTimeout(() => {
                showPositionEffect('bot', slotIndex, position);
                if (window.FX) {
                    const cardEl = document.querySelector(`#botFieldBoard .field-slot[data-index="${slotIndex}"] .card`);
                    FX.playSummonCircle(cardEl);
                }
                if (isFaceDown) {
                    if (window.SFX) SFX.place();
                } else if (!(window.AudioLibrary && AudioLibrary.tryPlayCardSound(card, 'evocazioni'))) {
                    // Effetto audio DEDICATO per questa carta (audio/evocazioni/<id>.mp3
                    // — vedi js/audio-library.js), se esiste; altrimenti il
                    // suono di Evocazione standard di sempre.
                    if (window.SFX) SFX.summon('attack');
                }
            }, 40);

            // Finestra per un'eventuale risposta del giocatore (es. Buco
            // Trappola messo dal giocatore contro il bot) — vedi
            // js/duel-engine.js. Scatta anche per un Set coperto (stesso
            // comportamento di summonMonster() in actions.js per il
            // giocatore): è ogni singola carta di risposta a decidere da
            // sola, tramite ctx.summonedPosition, se un Set le basta o le
            // serve un'Evocazione scoperta (es. Buco Trappola la esclude).
            const summonCtx = DuelEngine.makeContext('bot', { summonedCard: card, summonedSlotIndex: slotIndex, summonedPosition: position });
            DuelEngine.fireTrigger(DuelEngine.TRIGGER.ON_NORMAL_SUMMON, summonCtx, () => { updateUI(); resolve(); });
        };

        if (tributeIndices.length > 0) {
            const tributeMsg = isFaceDown
                ? `🤖 Il bot sacrifica ${tributeIndices.length} mostr${tributeIndices.length > 1 ? 'i' : 'o'} per Settare un mostro coperto.`
                : `🤖 Il bot sacrifica ${tributeIndices.length} mostr${tributeIndices.length > 1 ? 'i' : 'o'} per evocare ${card.name}.`;
            addToLog(tributeMsg);
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

/**
 * Sposta una Trappola dalla mano del bot al primo slot Magia/Trappola
 * libero, coperta — SENZA rivelarne il nome nel log: il giocatore umano
 * non deve poter sapere cosa il bot ha appena Settato, esattamente come
 * vale per un Set del giocatore stesso (mai annunciato via nome finché
 * non si scopre/attiva). Ritorna una Promise risolta dopo la breve
 * animazione.
 */
function botSetTrapCard(card, handIndex) {
    return new Promise((resolve) => {
        const slotIndex = gameState.botSTField.findIndex((s) => s === null);
        if (slotIndex === -1) { resolve(); return; }
        gameState.botHand.splice(handIndex, 1);
        gameState.botSTField[slotIndex] = { card: card, isFaceDown: true, setOnTurn: gameState.turn };
        addToLog('🤖 Il bot piazza una carta coperta sul Terreno.');
        if (window.SFX) SFX.place();
        updateUI();
        setTimeout(resolve, 400);
    });
}

/**
 * Attende che un'eventuale Chain aperta da un'attivazione manuale del bot
 * (Magia dalla mano, carta già Set) si chiuda per davvero — comprese le
 * eventuali risposte del giocatore — prima di procedere alla prossima
 * decisione. DuelEngine.activateCard() non espone un callback di
 * completamento come fireTrigger(): qui si sonda DuelEngine.isChainActive()
 * finché non torna false, con un tetto massimo di sicurezza (non dovrebbe
 * mai scattare davvero, ma evita un blocco totale se qualcosa va storto).
 */
function waitForBotChainToClear(callback) {
    const start = Date.now();
    const poll = () => {
        if (!window.DuelEngine || !DuelEngine.isChainActive() || Date.now() - start > 15000) {
            callback();
            return;
        }
        setTimeout(poll, 200);
    };
    setTimeout(poll, 200);
}

/**
 * Durante la propria Main Phase, il bot decide ripetutamente — una carta
 * alla volta, vedi BotAI.chooseNextSpellTrapAction — se Settare una
 * Trappola o attivare direttamente una Magia dalla mano, finché l'IA del
 * livello attivo non ha più nulla da fare. Prima di questa aggiunta il
 * bot non toccava MAI le proprie Magie/Trappole se non in risposta a
 * un'azione del giocatore, lasciandole morte in mano per l'intera
 * partita — vedi js/ai/ai-medium.js (si ferma presto) e js/ai/ai-hard.js
 * (usa tutto quello che può) per quanto ogni livello ne approfitta
 * davvero.
 */
function attemptBotSpellTrap() {
    return new Promise((resolve) => {
        const usedThisTurn = {};
        let iterations = 0;
        const MAX_ITERATIONS = 10; // sicurezza: mai un loop infinito
        const step = () => {
            iterations++;
            if (iterations > MAX_ITERATIONS || gameState.gameOver) { resolve(); return; }
            const decision = window.BotAI ? BotAI.chooseNextSpellTrapAction(gameState, usedThisTurn) : null;
            if (!decision) { resolve(); return; }
            if (decision.action === 'set') {
                botSetTrapCard(decision.card, decision.handIndex).then(() => setTimeout(step, 300));
            } else {
                const started = DuelEngine.activateCard('bot', 'hand', decision.handIndex);
                if (!started) { resolve(); return; } // difensivo: canActivate era già stato controllato da chi ha deciso
                waitForBotChainToClear(() => { updateUI(); setTimeout(step, 300); });
            }
        };
        step();
    });
}

/**
 * Durante la propria Main Phase, il bot valuta ripetutamente se conviene
 * attivare ORA una propria carta già Set in un turno precedente (non in
 * risposta a un trigger avversario) — vedi BotAI.chooseSetCardActivation.
 * Solo IA_DIFFICILE lo fa mai (IA_MEDIA resta puramente reattiva sul
 * proprio retrocampo): è questa la differenza di comportamento più
 * visibile tra i due livelli, oltre a quanto ciascuno usa la mano.
 */
function attemptBotActivateSetCards() {
    return new Promise((resolve) => {
        let iterations = 0;
        const MAX_ITERATIONS = 5;
        const step = () => {
            iterations++;
            if (iterations > MAX_ITERATIONS || gameState.gameOver) { resolve(); return; }
            const decision = window.BotAI ? BotAI.chooseSetCardActivation(gameState) : null;
            if (!decision) { resolve(); return; }
            const started = DuelEngine.activateCard('bot', 'st', decision.index);
            if (!started) { resolve(); return; }
            waitForBotChainToClear(() => { updateUI(); setTimeout(step, 300); });
        };
        step();
    });
}
