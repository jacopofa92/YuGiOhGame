let dragState = null;

function handleCardClick(card, sourceType, sourceIndex, sourceOwner, isFaceDown = false) {
    if (gameState.currentPlayer !== 'player' || isDraggingAttack) return;
    const isMainPhase = gameState.phase === 'main1' || gameState.phase === 'main2';

    // Se è in corso una selezione di Tributi, i click sui mostri del
    // giocatore servono a selezionare i sacrifici, non ad altro.
    if (gameState.pendingTributeSummon) {
        if (sourceType === 'monster' && sourceOwner === 'player') {
            handleTributeSelectClick(sourceIndex);
        }
        return;
    }

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
    if (gameState.pendingTributeSummon) return;
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
        moved: false,
        sourceEl: event.currentTarget
    };

    if (dragState.sourceEl) {
        dragState.sourceEl.classList.add('dragging-source');
    }

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
    preview.innerHTML = `<div class="card-frame">${card.type === 'monster' && card.level ? `<div class="card-level">⭐${card.level}</div>` : ''}<div class="card-name">${card.name}</div>${card.type === 'monster' ? `<div class="card-stats"><span>⚔️${card.attack}</span><span>🛡️${card.defense}</span></div>` : ''}</div>`;
    preview.style.left = `${x - 45}px`;
    preview.style.top = `${y - 66}px`;

    const img = document.createElement('img');
    img.className = 'card-image';
    img.alt = card.name;
    img.draggable = false;
    img.onload = () => preview.classList.add('has-image');
    img.onerror = () => img.remove();
    img.src = getCardImagePath(card);
    preview.insertBefore(img, preview.firstChild);

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
        attemptMonsterSummon(card, sourceIndex, index);
    } else if ((card.type === 'spell' || card.type === 'trap') && type === 'st') {
        setSpellTrap(card, index, sourceIndex);
    }
}

function handleSlotClick(owner, type, index) {
    if (gameState.pendingTributeSummon) return;
    updateCardInfoPanel(null, { sourceType: 'deck' });
    const { card: selectedCard, type: selectedType, index: selectedIndex } = gameState.selectedCard;
    if (!selectedCard || selectedType !== 'hand') return;
    const isMainPhase = gameState.phase === 'main1' || gameState.phase === 'main2';
    if (!isMainPhase || owner !== 'player') return;

    if (selectedCard.type === 'monster' && type === 'monster') {
        attemptMonsterSummon(selectedCard, selectedIndex, index);
    } else if ((selectedCard.type === 'spell' || selectedCard.type === 'trap') && type === 'st') {
        setSpellTrap(selectedCard, index, selectedIndex);
    }
}

/**
 * Punto d'ingresso unico per l'Evocazione di un mostro dalla mano, sia via
 * click sia via drag & drop. Decide se serve un'Evocazione Tributo in base
 * al Livello della carta e avvia il flusso corretto.
 */
function attemptMonsterSummon(card, handIndex, slotIndex) {
    if (gameState.hasNormalSummoned) {
        addToLog('❌ Hai già effettuato un\'Evocazione Normale in questo turno.');
        clearSelection();
        return;
    }

    const tributesNeeded = getTributesRequired(card);

    if (tributesNeeded === 0) {
        openSummonModal(card, slotIndex, handIndex);
        return;
    }

    const available = gameState.playerMonsterField.filter(slot => slot !== null).length;
    if (available < tributesNeeded) {
        addToLog(`❌ ${card.name} (Lv. ${card.level}) richiede ${tributesNeeded} Tribut${tributesNeeded > 1 ? 'i' : 'o'}: non hai abbastanza mostri sul Terreno.`);
        clearSelection();
        return;
    }

    startTributeSelection(card, slotIndex, handIndex, tributesNeeded);
}

/**
 * Avvia la modalità di selezione dei Tributi: evidenzia i mostri del
 * giocatore che possono essere sacrificati e attende i click.
 */
function startTributeSelection(card, slotIndex, handIndex, tributesNeeded) {
    document.querySelectorAll('.action-highlight, .selected').forEach(el => el.classList.remove('action-highlight', 'selected'));
    gameState.selectedCard = { type: null, card: null, index: -1 };
    gameState.pendingTributeSummon = { card, slotIndex, handIndex, tributesNeeded, selected: [] };
    addToLog(`🔺 ${card.name} richiede ${tributesNeeded} Tribut${tributesNeeded > 1 ? 'i' : 'o'}. Seleziona i mostri da Sacrificare sul tuo Terreno.`);
    updateCardInfoPanel(card, { sourceType: 'hand', sourceOwner: 'player', isFaceDown: false });
    updateUI();
}

function handleTributeSelectClick(index) {
    const pending = gameState.pendingTributeSummon;
    if (!pending) return;
    const slot = gameState.playerMonsterField[index];
    if (!slot) return;

    const el = document.querySelector(`#playerFieldBoard .field-slot[data-owner="player"][data-type="monster"][data-index="${index}"]`);

    if (pending.selected.includes(index)) {
        pending.selected = pending.selected.filter(i => i !== index);
        if (el) el.classList.remove('tribute-selected');
        return;
    }

    if (pending.selected.length >= pending.tributesNeeded) return;
    pending.selected.push(index);
    if (el) el.classList.add('tribute-selected');

    if (pending.selected.length === pending.tributesNeeded) {
        performTributeSacrifice();
    }
}

/**
 * Esegue il sacrificio: gioca l'animazione su ogni mostro selezionato,
 * poi li rimuove dal Terreno (spostandoli nel Cimitero) e apre il modale
 * per scegliere la posizione del mostro da Evocare.
 */
function performTributeSacrifice() {
    const pending = gameState.pendingTributeSummon;
    if (!pending) return;

    const indices = [...pending.selected];
    if (window.MP_broadcast && !window.MP_applyingRemote) {
        window.MP_broadcast({ kind: 'tribute', indices });
    }
    document.querySelectorAll('#playerFieldBoard .field-slot.tribute-highlight').forEach(el => {
        el.classList.remove('tribute-highlight', 'tribute-selected');
    });

    addToLog('🔻 Sacrificio in corso...');
    indices.forEach(idx => {
        const cardEl = document.querySelector(`#playerFieldBoard .field-slot[data-owner="player"][data-type="monster"][data-index="${idx}"] .card`);
        if (cardEl && window.FX) FX.playTributeSacrifice(cardEl);
    });

    setTimeout(() => {
        indices.forEach(idx => {
            const slot = gameState.playerMonsterField[idx];
            if (slot) {
                gameState.playerGraveyard.push(slot.card);
                gameState.playerMonsterField[idx] = null;
            }
        });
        updateUI();

        const { card, slotIndex, handIndex } = pending;
        gameState.pendingTributeSummon = null;
        openSummonModal(card, slotIndex, handIndex);
    }, 700);
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

    const modalDesc = modal.querySelector('.modal-card p');
    if (modalDesc) {
        const tributesNeeded = getTributesRequired(card);
        modalDesc.textContent = tributesNeeded > 0
            ? `Tributo completato (${tributesNeeded}). Scegli se posizionarla coperta in difesa o scoperta in attacco.`
            : 'Scegli se posizionarla coperta in difesa o scoperta in attacco.';
    }

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
            clearSelection();
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
    gameState.pendingTributeSummon = null;
    document.querySelectorAll('.action-highlight, .selected, .tribute-highlight, .tribute-selected').forEach(el => el.classList.remove('action-highlight', 'selected', 'tribute-highlight', 'tribute-selected'));
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
    const usedTribute = getTributesRequired(card) > 0;
    gameState.playerHand.splice(handIndex, 1);
    gameState.playerMonsterField[slotIndex] = { card: card, position: position, isFaceDown: position === 'defense', hasAttacked: false, canChangePosition: false };
    gameState.hasNormalSummoned = true;
    if (window.MP_broadcast && !window.MP_applyingRemote) {
        window.MP_broadcast({ kind: 'summon', card, slotIndex, position });
    }
    addToLog(position === 'attack'
        ? `${usedTribute ? '🔺 Evocazione Tributo: ' : ''}Hai Evocato ${card.name}!`
        : `${usedTribute ? '🔺 Evocazione Tributo: ' : ''}Hai Posizionato un mostro.`);
    clearSelection();
    setTimeout(() => {
        triggerFieldImpact('player', slotIndex, 'monster');
        showPositionEffect('player', slotIndex, position);
        if (window.FX) {
            const cardEl = document.querySelector(`#playerFieldBoard .field-slot[data-index="${slotIndex}"] .card`);
            FX.playSummonCircle(cardEl);
        }
    }, 30);
}

function changeMonsterPosition(slotIndex) {
    const monsterSlot = gameState.playerMonsterField[slotIndex];
    if (!monsterSlot || !monsterSlot.canChangePosition) return;
    monsterSlot.position = monsterSlot.position === 'attack' ? 'defense' : 'attack';
    if (monsterSlot.position === 'attack') monsterSlot.isFaceDown = false;
    monsterSlot.canChangePosition = false;
    if (window.MP_broadcast && !window.MP_applyingRemote) {
        window.MP_broadcast({ kind: 'position', slotIndex, position: monsterSlot.position });
    }
    addToLog(`Hai cambiato ${monsterSlot.card.name} in Posizione di ${monsterSlot.position}.`);
    clearSelection();
    setTimeout(() => showPositionEffect('player', slotIndex, monsterSlot.position), 60);
}

function executeAttack(attackerIndex, targetIndex) {
    const attackerSlot = gameState.playerMonsterField[attackerIndex];
    if (!attackerSlot || attackerSlot.hasAttacked) return;
    if (window.MP_broadcast && !window.MP_applyingRemote) {
        window.MP_broadcast({ kind: 'attack', attackerIndex, targetIndex });
    }
    const attackerCardEl = document.querySelector(`#playerFieldBoard .field-slot[data-index="${attackerIndex}"] .card`);
    const targetAnchor = targetIndex === -1 ? document.getElementById('botInfo') : document.querySelector(`#botFieldBoard .field-slot[data-index="${targetIndex}"] .card`);
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
    const boardId = owner === 'player' ? 'playerFieldBoard' : 'botFieldBoard';
    const slotEl = document.querySelector(`#${boardId} .field-slot[data-owner="${owner}"][data-type="${type}"][data-index="${index}"]`);
    if (!slotEl) return;
    const cardEl = slotEl.querySelector('.card');
    if (cardEl) {
        if (window.FX) FX.playBattleDestroyEffect(cardEl);
        cardEl.classList.add('destroying');
        setTimeout(() => cardEl.remove(), 600);
    }
}

function triggerFieldImpact(owner, index, type) {
    const boardId = owner === 'player' ? 'playerFieldBoard' : 'botFieldBoard';
    const applyImpact = () => {
        const slotEl = document.querySelector(`#${boardId} .field-slot[data-owner="${owner}"][data-type="${type}"][data-index="${index}"]`);
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
    if (window.MP_broadcast && !window.MP_applyingRemote) {
        window.MP_broadcast({ kind: 'spelltrap', card, slotIndex });
    }
    clearSelection();
}
