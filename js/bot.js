function botTurn() {
    clearPhaseTransitionTimeout();
    enterDrawPhase(false, () => {
        enterStandbyPhase(false);
        phaseTransitionTimeout = setTimeout(() => {
            enterMainPhase1();
            if (!gameState.hasNormalSummoned && gameState.botHand.length > 0) {
                const monster = gameState.botHand.find(card => card.type === 'monster');
                if (monster) {
                    const emptySlot = gameState.botMonsterField.findIndex(slot => slot === null);
                    if (emptySlot !== -1) {
                        gameState.botHand = gameState.botHand.filter(card => card.uid !== monster.uid);
                        gameState.botMonsterField[emptySlot] = { card: monster, position: 'attack', isFaceDown: false, hasAttacked: false, canChangePosition: false };
                        gameState.hasNormalSummoned = true;
                        addToLog(`🤖 Il bot ha evocato ${monster.name}.`);
                        updateUI();
                    }
                }
            }
            phaseTransitionTimeout = setTimeout(() => {
                if (gameState.turn === 1) {
                    addToLog('❌ Il bot non può entrare in Battle Phase nel primo turno.');
                    enterEndPhase();
                    return;
                }
                addToLog('🤖 Il bot entra in Battle Phase.');
                enterBattlePhase();
                botPerformAttacks().then(() => {
                    phaseTransitionTimeout = setTimeout(() => enterEndPhase(), 1000);
                });
            }, 1500);
        }, 500);
    });
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
    if (attackerCardEl) {
        attackerCardEl.classList.add('is-attacking');
    }

    setTimeout(() => {
        if (targetIndex === -1) {
            const damage = attackerSlot.card.attack;
            gameState.playerLP -= damage;
            document.getElementById('playerInfo').classList.add('damage-shake');
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
