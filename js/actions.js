let dragState = null;

function handleCardClick(card, sourceType, sourceIndex, sourceOwner, isFaceDown = false) {
    if (gameState.currentPlayer !== 'player' || isDraggingAttack) return;
    const isMainPhase = gameState.phase === 'main1' || gameState.phase === 'main2';

    updateCardInfoPanel(card, { sourceType, sourceOwner, isFaceDown });

    if (sourceType === 'hand' && isMainPhase) {
        document.querySelectorAll('.action-highlight, .selected').forEach(el => el.classList.remove('action-highlight', 'selected'));
        gameState.selectedCard = { type: sourceType, card: card, index: sourceIndex, owner: sourceOwner };
        highlightEmptySlots(card.type);
        updateCardInfoPanel(card, { sourceType, sourceOwner, isFaceDown: false });
        updateUI();
    } else if (sourceType === 'monster' && sourceOwner === 'player' && isMainPhase) {
        const monsterSlot = gameState.playerMonsterField[sourceIndex];
        if (monsterSlot.canChangePosition) {
            changeMonsterPosition(sourceIndex);
        }
    }
}

function startHandCardDrag(event, card, sourceIndex, sourceOwner) {
    if (gameState.currentPlayer !== 'player' || isDraggingAttack) return;
    const isMainPhase = gameState.phase === 'main1' || gameState.phase === 'main2';
    if (!isMainPhase) return;

    event.preventDefault();
    event.stopPropagation();

    dragState = {
        type: 'hand',
        card,
        sourceIndex,
        sourceOwner,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        moved: false
    };

    const preview = createDragPreview(card, event.clientX, event.clientY);
    dragState.previewEl = preview;
    document.body.appendChild(preview);
    document.addEventListener('pointermove', handleDragMove);
    document.addEventListener('pointerup', handleDragEnd);
    document.addEventListener('pointercancel', handleDragEnd);
}

function createDragPreview(card, x, y) {
    const preview = document.createElement('div');
    preview.className = 'card drag-preview';
    preview.dataset.type = card.type;
    preview.innerHTML = `<div class="card-name">${card.name}</div>${card.type === 'monster' ? `<div class="card-stats"><span>⚔️${card.attack}</span><span>🛡️${card.defense}</span></div>` : ''}`;
    preview.style.left = `${x - 45}px`;
    preview.style.top = `${y - 65}px`;
    return preview;
}

function handleDragMove(event) {
    if (!dragState) return;
    if (dragState.type !== 'hand') return;

    const dx = event.clientX - dragState.startX;
    const dy = event.clientY - dragState.startY;
    if (!dragState.moved && Math.hypot(dx, dy) > 8) {
        dragState.moved = true;
    }

    if (dragState.previewEl) {
        dragState.previewEl.style.left = `${event.clientX - 45}px`;
        dragState.previewEl.style.top = `${event.clientY - 65}px`;
    }
}

function handleDragEnd(event) {
    if (!dragState) return;
    const isHandDrag = dragState.type === 'hand';

    if (isHandDrag) {
        document.removeEventListener('pointermove', handleDragMove);
        document.removeEventListener('pointerup', handleDragEnd);
        document.removeEventListener('pointercancel', handleDragEnd);

        const moved = dragState.moved;
        const dropTarget = document.elementFromPoint(event.clientX, event.clientY)?.closest('.field-slot');
        if (dragState.previewEl) {
            dragState.previewEl.remove();
        }

        if (moved && dropTarget) {
            const owner = dropTarget.dataset.owner;
            const type = dropTarget.dataset.type;
            const index = parseInt(dropTarget.dataset.index, 10);
            if (owner === 'player' && ((dragState.card.type === 'monster' && type === 'monster') || ((dragState.card.type === 'spell' || dragState.card.type === 'trap') && type === 'st'))) {
                placeDraggedCard(dragState.card, dragState.sourceIndex, owner, type, index);
            } else {
                handleCardClick(dragState.card, 'hand', dragState.sourceIndex, dragState.sourceOwner);
            }
        } else {
            handleCardClick(dragState.card, 'hand', dragState.sourceIndex, dragState.sourceOwner);
        }
    }

    dragState = null;
}

function placeDraggedCard(card, sourceIndex, owner, type, index) {
    if (card.type === 'monster' && type === 'monster') {
        openSummonModal(card, index, sourceIndex);
    } else if ((card.type === 'spell' || card.type === 'trap') && type === 'st') {
        setSpellTrap(card, index, sourceIndex);
    }
}

function handleSlotClick(owner, type, index) {
    updateCardInfoPanel(null, { sourceType: 'deck' });
    const { card: selectedCard, type: selectedType, index: selectedIndex } = gameState.selectedCard;
    if (!selectedCard || selectedType !== 'hand') return;
    const isMainPhase = gameState.phase === 'main1' || gameState.phase === 'main2';
    if (!isMainPhase || owner !== 'player') return;

    if (selectedCard.type === 'monster' && type === 'monster') {
        if (gameState.hasNormalSummoned) {
            addToLog('❌ Hai già effettuato un\'Evocazione Normale in questo turno.');
            return;
        }
        openSummonModal(selectedCard, index, selectedIndex);
    } else if ((selectedCard.type === 'spell' || selectedCard.type === 'trap') && type === 'st') {
        setSpellTrap(selectedCard, index, selectedIndex);
    }
}

function openSummonModal(card, slotIndex, handIndex) {
    if (card.type === 'monster' && gameState.hasNormalSummoned) {
        addToLog('❌ Hai già effettuato un\'Evocazione Normale in questo turno.');
        return;
    }

    gameState.pendingSummon = { card, slotIndex, handIndex };
    const modal = document.getElementById('summonModal');
    const preview = document.getElementById('summonPreview');
    preview.innerHTML = '';
    const previewCard = createCardElement(card);
    previewCard.classList.add('modal-preview-card');
    preview.appendChild(previewCard);

    modal.classList.add('open');

    document.getElementById('summonAttackBtn').onclick = () => {
        closeSummonModal();
        summonMonster(card, slotIndex, 'attack', handIndex);
    };

    document.getElementById('summonDefenseBtn').onclick = () => {
        closeSummonModal();
        summonMonster(card, slotIndex, 'defense', handIndex);
    };

    document.getElementById('summonCancelBtn').onclick = () => {
        closeSummonModal();
        clearSelection();
    };

    modal.onclick = (event) => {
        if (event.target === modal) {
            closeSummonModal();
        }
    };
}

function closeSummonModal() {
    const modal = document.getElementById('summonModal');
    modal.classList.remove('open');
    gameState.pendingSummon = null;
    modal.onclick = null;
}

function clearSelection() {
    gameState.selectedCard = { type: null, card: null, index: -1 };
    document.querySelectorAll('.action-highlight, .selected').forEach(el => el.classList.remove('action-highlight', 'selected'));
    updateCardInfoPanel(null);
    updateUI();
}

function highlightEmptySlots(cardType) {
    const targetField = cardType === 'monster' ? gameState.playerMonsterField : gameState.playerSTField;
    const targetType = cardType === 'monster' ? 'monster' : 'st';
    targetField.forEach((slot, index) => {
        if (!slot) {
            document.querySelector(`.field-slot[data-owner="player"][data-type="${targetType}"][data-index="${index}"]`).classList.add('action-highlight');
        }
    });
}

function summonMonster(card, slotIndex, position, handIndex = gameState.selectedCard.index) {
    if (gameState.hasNormalSummoned) {
        addToLog('❌ Hai già effettuato un\'Evocazione Normale in questo turno.');
        return;
    }
    gameState.playerHand.splice(handIndex, 1);
    gameState.playerMonsterField[slotIndex] = { card: card, position: position, isFaceDown: position === 'defense', hasAttacked: false, canChangePosition: false };
    gameState.hasNormalSummoned = true;
    addToLog(position === 'attack' ? `Hai Evocato ${card.name}!` : 'Hai Posizionato un mostro.');
    clearSelection();
    setTimeout(() => {
        triggerFieldImpact('player', slotIndex, 'monster');
        showPositionEffect('player', slotIndex, position);
    }, 30);
}

function changeMonsterPosition(slotIndex) {
    const monsterSlot = gameState.playerMonsterField[slotIndex];
    if (!monsterSlot || !monsterSlot.canChangePosition) return;
    monsterSlot.position = monsterSlot.position === 'attack' ? 'defense' : 'attack';
    if (monsterSlot.position === 'attack') monsterSlot.isFaceDown = false;
    monsterSlot.canChangePosition = false;
    addToLog(`Hai cambiato ${monsterSlot.card.name} in Posizione di ${monsterSlot.position}.`);
    clearSelection();
    setTimeout(() => showPositionEffect('player', slotIndex, monsterSlot.position), 60);
}

function executeAttack(attackerIndex, targetIndex) {
    const attackerSlot = gameState.playerMonsterField[attackerIndex];
    if (!attackerSlot || attackerSlot.hasAttacked) return;
    const attackerCardEl = document.querySelector(`#playerFieldBoard .field-slot[data-index="${attackerIndex}"] .card`);
    const targetAnchor = targetIndex === -1 ? document.getElementById('botInfo') : document.querySelector(`#botFieldBoard .field-slot[data-index="${targetIndex}"] .card`);
    if (attackerCardEl) {
        attackerCardEl.classList.add('is-attacking');
    }
    showBattleEffect(attackerCardEl, targetAnchor);

    setTimeout(() => {
        if (targetIndex === -1) {
            const damage = attackerSlot.card.attack;
            gameState.botLP -= damage;
            document.getElementById('botInfo').classList.add('damage-shake');
            showFloatingDamage(damage, document.getElementById('botInfo'));
            addToLog(`🔥 Attacco diretto! ${attackerSlot.card.name} infligge ${damage} danni!`);
        } else {
            const targetSlot = gameState.botMonsterField[targetIndex];
            const attacker = attackerSlot.card;
            const target = targetSlot.card;
            addToLog(`⚔️ ${attacker.name} attacca ${target.name}!`);

            if (targetSlot.position === 'attack') {
                if (attacker.attack > target.attack) {
                    const damage = attacker.attack - target.attack;
                    gameState.botLP -= damage;
                    gameState.botMonsterField[targetIndex] = null;
                    document.getElementById('botInfo').classList.add('damage-shake');
                    showFloatingDamage(damage, document.getElementById('botInfo'));
                    addToLog(`💥 ${target.name} distrutto! Il bot perde ${damage} LP.`);
                } else if (attacker.attack < target.attack) {
                    const damage = target.attack - attacker.attack;
                    gameState.playerLP -= damage;
                    gameState.playerMonsterField[attackerIndex] = null;
                    document.getElementById('playerInfo').classList.add('damage-shake');
                    showFloatingDamage(damage, document.getElementById('playerInfo'));
                    addToLog(`💀 ${attacker.name} distrutto! Perdi ${damage} LP.`);
                } else {
                    gameState.playerMonsterField[attackerIndex] = null;
                    gameState.botMonsterField[targetIndex] = null;
                    addToLog('💫 Entrambe le carte sono distrutte!');
                }
            } else {
                if (targetSlot.isFaceDown) {
                    targetSlot.isFaceDown = false;
                    addToLog(`🔎 Il mostro coperto era ${target.name}!`);
                }
                if (attacker.attack > target.defense) {
                    gameState.botMonsterField[targetIndex] = null;
                    addToLog(`🛡️ ${target.name} è stato distrutto in posizione di difesa!`);
                } else if (attacker.attack < target.defense) {
                    const damage = target.defense - attacker.attack;
                    gameState.playerLP -= damage;
                    document.getElementById('playerInfo').classList.add('damage-shake');
                    showFloatingDamage(damage, document.getElementById('playerInfo'));
                    addToLog(`🧱 L'attacco rimbalza! Perdi ${damage} LP.`);
                } else {
                    addToLog('🛡️ L\'attacco non ha effetto.');
                }
            }
        }
        attackerSlot.hasAttacked = true;
        setTimeout(() => {
            if (attackerCardEl) {
                attackerCardEl.classList.remove('is-attacking');
            }
            document.querySelectorAll('.damage-shake').forEach(el => el.classList.remove('damage-shake'));
            clearSelection();
            setTimeout(() => {
                if (targetIndex !== -1) {
                    const destroyedSlots = [];
                    if (gameState.playerMonsterField[attackerIndex] === null) destroyedSlots.push({ owner: 'player', index: attackerIndex });
                    if (gameState.botMonsterField[targetIndex] === null) destroyedSlots.push({ owner: 'bot', index: targetIndex });
                    destroyedSlots.forEach(item => triggerDestroyEffect(item.owner, item.index, 'monster'));
                }
            }, 0);
        }, 500);
    }, 500);
}

function triggerDestroyEffect(owner, index, type) {
    const fieldId = owner === 'player' ? 'playerMonsterField' : 'botMonsterField';
    const slotEl = document.querySelector(`#${fieldId} .field-slot[data-index="${index}"]`);
    if (!slotEl) return;
    const cardEl = slotEl.querySelector('.card');
    if (cardEl) {
        cardEl.classList.add('destroying');
        setTimeout(() => cardEl.remove(), 600);
    }
}

function triggerFieldImpact(owner, index, type) {
    const fieldId = owner === 'player' ? 'playerMonsterField' : 'botMonsterField';
    const applyImpact = () => {
        const slotEl = document.querySelector(`#${fieldId} .field-slot[data-index="${index}"]`);
        if (!slotEl) return false;
        slotEl.classList.remove('impact');
        void slotEl.offsetWidth;
        slotEl.classList.add('impact');
        setTimeout(() => slotEl.classList.remove('impact'), 700);
        return true;
    };

    if (!applyImpact()) {
        setTimeout(() => applyImpact(), 20);
    }
}

function setSpellTrap(card, slotIndex, handIndex = gameState.selectedCard.index) {
    addToLog(`🪄 ${card.name} è stata piazzata sul Terreno.`);
    gameState.playerHand.splice(handIndex, 1);
    gameState.playerSTField[slotIndex] = { card: card, isFaceDown: true };
    clearSelection();
}
