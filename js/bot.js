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
                // Attende che l'annuncio epico "BATTLE PHASE" (3s) finisca
                // prima di far partire gli attacchi del bot.
                phaseTransitionTimeout = setTimeout(() => {
                    botPerformAttacks().then(() => {
                        phaseTransitionTimeout = setTimeout(() => enterEndPhase(), 1000);
                    });
                }, 3000);
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
    const attackers = gameState.botMonsterField.map((slot, index) => ({ slot, index })).filter(item => item.slot && !item.slot.hasAttacked);
    for (const attackerItem of attackers) {
        const playerMonsters = gameState.playerMonsterField.map((slot, index) => ({ slot, index })).filter(item => item.slot);
        if (playerMonsters.length > 0) {
            const targetIndex = playerMonsters[0].index;
            await new Promise(resolve => setTimeout(() => {
                botExecuteAttack(attackerItem.index, targetIndex);
                resolve();
            }, 1200));
        } else {
            await new Promise(resolve => setTimeout(() => {
                botExecuteAttack(attackerItem.index, -1);
                resolve();
            }, 1200));
        }
    }
}

function botExecuteAttack(attackerIndex, targetIndex) {
    const attackerSlot = gameState.botMonsterField[attackerIndex];
    if (!attackerSlot || attackerSlot.hasAttacked) return;
    const attackerCardEl = document.querySelector(`#botFieldBoard .field-slot[data-index="${attackerIndex}"] .card`);
    const targetAnchor = targetIndex === -1 ? document.getElementById('playerInfo') : document.querySelector(`#playerFieldBoard .field-slot[data-index="${targetIndex}"] .card`);
    if (attackerCardEl) {
        attackerCardEl.classList.add('is-attacking');
    }
    showBattleEffect(attackerCardEl, targetAnchor);
    if (targetIndex !== -1 && window.FX) {
        FX.playBattleClashEpic(attackerCardEl, targetAnchor);
    }

    setTimeout(() => {
        if (targetIndex === -1) {
            const damage = attackerSlot.card.attack;
            gameState.playerLP -= damage;
            document.getElementById('playerInfo').classList.add('damage-shake');
            showFloatingDamage(damage, document.getElementById('playerInfo'));
            addToLog(`🔥 Attacco diretto del bot con ${attackerSlot.card.name}! Perdi ${damage} LP!`);
        } else {
            const targetSlot = gameState.playerMonsterField[targetIndex];
            if (!targetSlot) return;
            const attacker = attackerSlot.card;
            const target = targetSlot.card;
            addToLog(`🤖 ${attacker.name} attacca ${target.name}!`);
            if (targetSlot.position === 'attack') {
                if (attacker.attack > target.attack) {
                    const damage = attacker.attack - target.attack;
                    gameState.playerLP -= damage;
                    gameState.playerMonsterField[targetIndex] = null;
                    document.getElementById('playerInfo').classList.add('damage-shake');
                    showFloatingDamage(damage, document.getElementById('playerInfo'));
                    addToLog(`💥 Il tuo ${target.name} è stato distrutto! Perdi ${damage} LP.`);
                } else if (attacker.attack < target.attack) {
                    const damage = target.attack - attacker.attack;
                    gameState.botLP -= damage;
                    gameState.botMonsterField[attackerIndex] = null;
                    document.getElementById('botInfo').classList.add('damage-shake');
                    addToLog(`💀 Il ${attacker.name} del bot è stato distrutto!`);
                } else {
                    gameState.playerMonsterField[targetIndex] = null;
                    gameState.botMonsterField[attackerIndex] = null;
                    addToLog('💫 Entrambe le carte sono distrutte!');
                }
            } else {
                if (targetSlot.isFaceDown) {
                    targetSlot.isFaceDown = false;
                    addToLog(`🔎 Il tuo mostro coperto era ${target.name}!`);
                }
                if (attacker.attack > target.defense) {
                    gameState.playerMonsterField[targetIndex] = null;
                    addToLog(`🛡️ Il tuo ${target.name} è stato distrutto in difesa!`);
                } else if (attacker.attack < target.defense) {
                    const damage = target.defense - attacker.attack;
                    gameState.botLP -= damage;
                    document.getElementById('botInfo').classList.add('damage-shake');
                    showFloatingDamage(damage, document.getElementById('botInfo'));
                    addToLog(`🧱 L'attacco del bot rimbalza! Il bot perde ${damage} LP.`);
                } else {
                    addToLog('🛡️ L\'attacco del bot non ha effetto.');
                }
            }
        }
        attackerSlot.hasAttacked = true;
        setTimeout(() => {
            if (attackerCardEl) {
                attackerCardEl.classList.remove('is-attacking');
            }
            document.querySelectorAll('.damage-shake').forEach(el => el.classList.remove('damage-shake'));
            updateUI();
            setTimeout(() => {
                if (targetIndex !== -1) {
                    const destroyedSlots = [];
                    if (gameState.playerMonsterField[targetIndex] === null) destroyedSlots.push({ owner: 'player', index: targetIndex });
                    if (gameState.botMonsterField[attackerIndex] === null) destroyedSlots.push({ owner: 'bot', index: attackerIndex });
                    destroyedSlots.forEach(item => triggerDestroyEffect(item.owner, item.index, 'monster'));
                }
            }, 0);
        }, 500);
    }, 500);
}
