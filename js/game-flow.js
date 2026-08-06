let gameState = {};

const attackArrowSVG = document.getElementById('attack-arrow-svg');
const attackArrowLine = document.getElementById('attack-arrow-line');
const logToggleBtn = document.getElementById('logToggleBtn');
const gameLogContainer = document.getElementById('gameLogContainer');
let isDraggingAttack = false;
let attackDragStart = { x: 0, y: 0, attackerIndex: -1 };
let phaseTransitionTimeout = null;

function toggleLog() {
    if (!gameLogContainer) return;
    const isCollapsed = gameLogContainer.classList.toggle('collapsed');
    if (logToggleBtn) {
        logToggleBtn.textContent = isCollapsed ? 'Espandi' : 'Comprimi';
    }
}

function updateCardInfoPanel(card, options = {}) {
    const panel = document.getElementById('cardInfoPanel');
    const content = document.getElementById('cardInfoContent');
    if (!panel || !content) return;

    const shouldHide = !card || options.sourceType === 'deck' || (options.sourceOwner === 'bot' && options.isFaceDown);
    if (shouldHide) {
        content.innerHTML = '';
        panel.classList.remove('visible');
        return;
    }

    const typeLabel = card.type === 'monster' ? 'Mostro' : card.type === 'spell' ? 'Magia' : 'Trappola';
    const effectText = card.effect || (card.type === 'monster' ? 'Mostro normale senza effetto speciale.' : 'Questa carta non presenta un effetto scritto.');
    content.innerHTML = `
        <div class="card-info-name">${card.name}</div>
        <div class="card-info-meta">${typeLabel}</div>
        ${card.type === 'monster' ? `<div class="card-info-stats">ATK ${card.attack} • DEF ${card.defense}</div>` : ''}
        <p>${effectText}</p>
    `;
    panel.classList.add('visible');
}

function drawCardsToHand(owner, amount) {
    const handKey = owner === 'player' ? 'playerHand' : 'botHand';
    const deckKey = owner === 'player' ? 'playerDeckCount' : 'botDeckCount';
    let drawn = 0;

    for (let i = 0; i < amount; i++) {
        if (gameState[deckKey] <= 0) break;
        gameState[deckKey] -= 1;
        gameState[handKey].push(createRandomCard());
        drawn++;
    }

    return drawn;
}

function initGame() {
    if (logToggleBtn) {
        logToggleBtn.onclick = toggleLog;
    }
    if (gameLogContainer) {
        gameLogContainer.classList.add('collapsed');
        if (logToggleBtn) {
            logToggleBtn.textContent = 'Espandi';
        }
    }
    resetGameState();
    drawCardsToHand('player', 5);
    drawCardsToHand('bot', 5);
    if (gameState.currentPlayer === 'player') {
        drawCardsToHand('player', 1);
    }
    updateUI();
    addToLog('🎮 Gioco iniziato! È il tuo turno. Inizia la Draw Phase.');
    setTimeout(enterDrawPhase, 500);
}

function resetGameState() {
    gameState = {
        currentPlayer: 'player',
        phase: 'draw',
        turn: 1,
        playerLP: 8000,
        botLP: 8000,
        playerHand: [],
        botHand: [],
        playerMonsterField: Array(5).fill(null),
        botMonsterField: Array(5).fill(null),
        playerSTField: Array(5).fill(null),
        botSTField: Array(5).fill(null),
        playerDeckCount: 40,
        botDeckCount: 40,
        playerGraveyard: [],
        botGraveyard: [],
        playerFieldSpell: null,
        botFieldSpell: null,
        playerFusion: null,
        botFusion: null,
        selectedCard: { type: null, card: null, index: -1 },
        pendingSummon: null,
        hasNormalSummoned: false,
        gameOver: false
    };
}

function nextPhase() {
    clearSelection();
    switch (gameState.phase) {
        case 'main1':
            enterBattlePhase();
            break;
        case 'battle':
            enterMainPhase2();
            break;
    }
}

function endTurn() {
    if (gameState.currentPlayer !== 'player') return;
    enterEndPhase();
}

function changeTurn() {
    clearPhaseTransitionTimeout();
    addToLog(`🔄 Turno ${gameState.turn} terminato.`);
    gameState.turn++;
    gameState.currentPlayer = gameState.currentPlayer === 'player' ? 'bot' : 'player';
    gameState.hasNormalSummoned = false;
    const field = gameState.currentPlayer === 'player' ? gameState.playerMonsterField : gameState.botMonsterField;
    field.forEach(slot => {
        if (slot) {
            slot.hasAttacked = false;
            slot.canChangePosition = true;
        }
    });
    clearSelection();
    updateUI();
    if (gameState.currentPlayer === 'bot') {
        setTimeout(botTurn, 1000);
    } else {
        setTimeout(() => enterDrawPhase(true), 1000);
    }
}

function clearPhaseTransitionTimeout() {
    if (phaseTransitionTimeout) {
        clearTimeout(phaseTransitionTimeout);
        phaseTransitionTimeout = null;
    }
}

function enterDrawPhase(autoAdvance = true, onComplete = null) {
    clearPhaseTransitionTimeout();
    gameState.phase = 'draw';
    addToLog(`--- ${gameState.currentPlayer === 'player' ? 'Tuo Turno' : 'Turno Bot'} ${gameState.turn} ---`);
    addToLog('🎴 Draw Phase');

    const finishDrawEffect = () => {
        updateUI();
        if (typeof onComplete === 'function') {
            onComplete();
        } else if (autoAdvance) {
            phaseTransitionTimeout = setTimeout(() => enterStandbyPhase(true), 700);
        }
    };

    const boardId = gameState.currentPlayer === 'player' ? 'playerFieldBoard' : 'botFieldBoard';
    const deckSlot = document.querySelector(`#${boardId} .field-slot[data-zone="deck"]`);
    const handEl = document.getElementById('playerHand');
    if (deckSlot) {
        deckSlot.classList.add('draw-effect');
    }

    if (gameState.turn > 1) {
        addToLog(`${gameState.currentPlayer === 'player' ? '🃏 Stai pescando una carta dal deck...' : '🃏 Il bot sta pescando una carta dal deck...'}`);
        phaseTransitionTimeout = setTimeout(() => {
            if (gameState.currentPlayer === 'player') {
                const drawn = drawCardsToHand('player', 1);
                if (drawn > 0) {
                    const drawnCard = gameState.playerHand[gameState.playerHand.length - 1];
                    addToLog(`Hai pescato: ${drawnCard.name}`);
                    if (handEl) {
                        const flyingCard = document.createElement('div');
                        flyingCard.className = 'draw-flying-card card';
                        flyingCard.dataset.type = drawnCard.type;
                        flyingCard.innerHTML = '<div class="card-frame"><div class="card-name">' + drawnCard.name + '</div><div class="card-art">' + (drawnCard.type === 'monster' ? '👑' : drawnCard.type === 'spell' ? '✨' : '🌀') + '</div></div>';
                        const rect = deckSlot ? deckSlot.getBoundingClientRect() : { left: 0, top: 0 };
                        const handRect = handEl.getBoundingClientRect();
                        const targetX = handRect.left + handRect.width * 0.35 - rect.left - 45;
                        const targetY = handRect.top + handRect.height * 0.35 - rect.top - 65;
                        flyingCard.style.left = `${rect.left + 8}px`;
                        flyingCard.style.top = `${rect.top + 8}px`;
                        flyingCard.style.setProperty('--dx', `${targetX}px`);
                        flyingCard.style.setProperty('--dy', `${targetY}px`);
                        document.body.appendChild(flyingCard);
                        setTimeout(() => {
                            flyingCard.remove();
                        }, 950);
                    }
                } else {
                    addToLog('Il tuo mazzo è vuoto.');
                }
            } else {
                const drawn = drawCardsToHand('bot', 1);
                if (drawn > 0) {
                    addToLog('Il bot ha pescato una carta.');
                } else {
                    addToLog('Il mazzo del bot è vuoto.');
                }
            }
            if (deckSlot) {
                deckSlot.classList.remove('draw-effect');
            }
            finishDrawEffect();
        }, 900);
    } else {
        addToLog('Le carte iniziali sono già state distribuite.');
        if (deckSlot) {
            deckSlot.classList.remove('draw-effect');
        }
        finishDrawEffect();
    }
}

function enterStandbyPhase(autoAdvance = true) {
    clearPhaseTransitionTimeout();
    gameState.phase = 'standby';
    addToLog('⏳ Standby Phase');
    updateUI();
    if (autoAdvance) {
        phaseTransitionTimeout = setTimeout(() => enterMainPhase1(), 500);
    }
}

function enterMainPhase1() {
    clearPhaseTransitionTimeout();
    gameState.phase = 'main1';
    addToLog('⚡ Main Phase 1');
    updateUI();
}

function enterBattlePhase() {
    if (gameState.turn === 1) {
        addToLog('❌ Non puoi entrare in Battle Phase nel primo turno. Rimani in Main Phase 1 o vai direttamente a End Phase.');
        return;
    }
    gameState.phase = 'battle';
    addToLog('⚔️ Battle Phase! Clicca e trascina da un tuo mostro per attaccare.');
    updateUI();
}

function enterMainPhase2() {
    clearPhaseTransitionTimeout();
    gameState.phase = 'main2';
    addToLog('⚡ Main Phase 2');
    updateUI();
}

function enterEndPhase() {
    clearPhaseTransitionTimeout();
    gameState.phase = 'end';
    addToLog('🏁 End Phase');
    updateUI();
    phaseTransitionTimeout = setTimeout(changeTurn, 1500);
}

function updateUI() {
    if (gameState.gameOver) return;
    document.getElementById('playerLP').textContent = gameState.playerLP;
    document.getElementById('botLP').textContent = gameState.botLP;
    renderPlayerHand();
    renderFields();
    updatePhaseIndicator();
    checkGameOver();
}

function renderFields() {
    const createRow = (owner, slots, slotType, specialConfig, isMonsterRow, isMirrored = false) => {
        const row = document.createElement('div');
        row.className = 'field-row';

        const firstSpecial = createSlotElement(owner, specialConfig.firstZone.type, -1, {
            special: true,
            zone: specialConfig.firstZone.zone,
            label: specialConfig.firstZone.label,
            count: specialConfig.firstZone.count
        });
        const secondSpecial = createSlotElement(owner, specialConfig.secondZone.type, -1, {
            special: true,
            zone: specialConfig.secondZone.zone,
            label: specialConfig.secondZone.label,
            count: specialConfig.secondZone.count
        });

        if (!isMirrored) {
            row.appendChild(firstSpecial);
        } else {
            row.appendChild(secondSpecial);
        }

        slots.forEach((slot, index) => {
            const slotEl = createSlotElement(owner, slotType, index);
            if (slot) {
                const cardEl = createCardElement(slot.card, slot.isFaceDown, slot.position);
                cardEl.onclick = (event) => {
                    event.stopPropagation();
                    if (!dragState) {
                        handleCardClick(slot.card, slotType, index, owner, slot.isFaceDown);
                    }
                };
                if (isMonsterRow && owner === 'player' && gameState.phase === 'battle' && !slot.hasAttacked && slot.position === 'attack') {
                    cardEl.classList.add('can-attack');
                    cardEl.onpointerdown = (event) => startAttackDrag(event, index);
                }
                slotEl.appendChild(cardEl);
            }
            row.appendChild(slotEl);
        });

        if (!isMirrored) {
            row.appendChild(secondSpecial);
        } else {
            row.appendChild(firstSpecial);
        }
        return row;
    };

    const playerBoard = document.getElementById('playerFieldBoard');
    const botBoard = document.getElementById('botFieldBoard');
    playerBoard.innerHTML = '';
    botBoard.innerHTML = '';

    playerBoard.appendChild(createRow('player', gameState.playerMonsterField, 'monster', {
        firstZone: { type: 'field-spell', zone: 'fieldSpell', label: 'Terreno' },
        secondZone: { type: 'graveyard', zone: 'graveyard', label: 'Cimitero', count: gameState.playerGraveyard.length }
    }, true));

    playerBoard.appendChild(createRow('player', gameState.playerSTField, 'st', {
        firstZone: { type: 'fusion', zone: 'fusion', label: 'Fusion' },
        secondZone: { type: 'deck', zone: 'deck', label: 'Deck', count: gameState.playerDeckCount }
    }, false));

    botBoard.appendChild(createRow('bot', gameState.botSTField, 'st', {
        firstZone: { type: 'fusion', zone: 'fusion', label: 'Fusion' },
        secondZone: { type: 'deck', zone: 'deck', label: 'Deck', count: gameState.botDeckCount }
    }, false, true));

    botBoard.appendChild(createRow('bot', gameState.botMonsterField, 'monster', {
        firstZone: { type: 'field-spell', zone: 'fieldSpell', label: 'Terreno' },
        secondZone: { type: 'graveyard', zone: 'graveyard', label: 'Cimitero', count: gameState.botGraveyard.length }
    }, false, true));
}

function startAttackDrag(event, attackerIndex) {
    event.preventDefault();
    event.stopPropagation();
    const attackerSlot = gameState.playerMonsterField[attackerIndex];
    if (!attackerSlot || attackerSlot.hasAttacked || gameState.phase !== 'battle') return;

    isDraggingAttack = true;
    attackDragStart.attackerIndex = attackerIndex;

    const rect = event.currentTarget.getBoundingClientRect();
    attackDragStart.x = rect.left + rect.width / 2;
    attackDragStart.y = rect.top + rect.height / 2;

    attackArrowLine.setAttribute('x1', attackDragStart.x);
    attackArrowLine.setAttribute('y1', attackDragStart.y);
    attackArrowLine.setAttribute('x2', attackDragStart.x);
    attackArrowLine.setAttribute('y2', attackDragStart.y);
    attackArrowSVG.style.display = 'block';

    document.addEventListener('pointermove', dragAttackArrow);
    document.addEventListener('pointerup', endAttackDrag);
    document.addEventListener('pointercancel', endAttackDrag);
}

function dragAttackArrow(event) {
    if (!isDraggingAttack) return;
    attackArrowLine.setAttribute('x2', event.clientX);
    attackArrowLine.setAttribute('y2', event.clientY);
}

function endAttackDrag(event) {
    if (!isDraggingAttack) return;
    isDraggingAttack = false;
    attackArrowSVG.style.display = 'none';
    document.removeEventListener('pointermove', dragAttackArrow);
    document.removeEventListener('pointerup', endAttackDrag);
    document.removeEventListener('pointercancel', endAttackDrag);

    const targetElement = document.elementFromPoint(event.clientX, event.clientY);
    if (!targetElement) return;

    const targetSlot = targetElement.closest('.field-slot');
    const hasBotMonsters = gameState.botMonsterField.some(monster => monster !== null);
    const isBotInfoTarget = targetElement.closest('#botInfo') || targetElement.id === 'botInfo' || targetElement.closest('.player-info#botInfo');

    if (targetSlot && targetSlot.dataset.owner === 'bot' && targetSlot.dataset.type === 'monster') {
        const targetIndex = parseInt(targetSlot.dataset.index, 10);
        if (gameState.botMonsterField[targetIndex]) {
            executeAttack(attackDragStart.attackerIndex, targetIndex);
        } else if (!hasBotMonsters) {
            executeAttack(attackDragStart.attackerIndex, -1);
        }
    } else if (isBotInfoTarget && !hasBotMonsters) {
        executeAttack(attackDragStart.attackerIndex, -1);
    }
}

function renderPlayerHand() {
    const handEl = document.getElementById('playerHand');
    handEl.innerHTML = '';
    gameState.playerHand.forEach((card, index) => {
        const cardEl = createCardElement(card);
        cardEl.onclick = (event) => {
            event.preventDefault();
            if (!dragState) {
                handleCardClick(card, 'hand', index, 'player', false);
            }
        };
        cardEl.onpointerdown = (event) => {
            if (gameState.currentPlayer !== 'player' || isDraggingAttack) return;
            startHandCardDrag(event, card, index, 'player');
        };
        if (gameState.selectedCard.type === 'hand' && gameState.selectedCard.index === index) {
            cardEl.classList.add('selected');
        }
        handEl.appendChild(cardEl);
    });
}

function createCardElement(card, isFaceDown = false, position = 'attack') {
    const el = document.createElement('div');
    el.className = 'card';
    el.dataset.uid = card.uid;
    el.dataset.type = card.type;
    if (isFaceDown) el.classList.add('face-down');
    if (position === 'defense') el.classList.add('defense-pos');

    let content = '';
    if (isFaceDown) {
        content = '<div class="card-back">⬢</div>';
    } else {
        content = `<div class="card-frame">
            <div class="card-name">${card.name}</div>
            <div class="card-art">${card.type === 'monster' ? '👑' : card.type === 'spell' ? '✨' : '🌀'}</div>
            ${card.type === 'monster' ? `<div class="card-stats"><span>⚔️${card.attack}</span><span>🛡️${card.defense}</span></div>` : ''}
        </div>`;
    }

    el.innerHTML = content;
    return el;
}

function createSlotElement(owner, type, index, options = {}) {
    const slotEl = document.createElement('div');
    slotEl.className = 'field-slot';
    if (options.special) slotEl.classList.add('special-slot');
    if (options.zone === 'deck') slotEl.classList.add('deck-slot');
    if (owner === 'bot' && options.zone === 'deck') slotEl.classList.add('bot-deck-slot');
    slotEl.dataset.owner = owner;
    slotEl.dataset.type = type;
    if (index !== -1) slotEl.dataset.index = index;
    if (options.zone) slotEl.dataset.zone = options.zone;
    slotEl.onclick = () => {
        if (!options.special) {
            handleSlotClick(owner, type, index);
        }
    };

    if (options.zone === 'deck') {
        for (let i = 0; i < 3; i++) {
            const deckPreview = document.createElement('div');
            deckPreview.className = 'card face-down deck-preview';
            deckPreview.innerHTML = '<div class="card-back">⬢</div>';
            slotEl.appendChild(deckPreview);
        }
    }

    if (options.label) {
        const labelEl = document.createElement('div');
        labelEl.className = 'field-slot-label';
        labelEl.textContent = options.label;
        slotEl.appendChild(labelEl);
    }
    if (options.count !== undefined) {
        const countEl = document.createElement('div');
        countEl.className = 'field-slot-count';
        countEl.textContent = options.count;
        slotEl.appendChild(countEl);
    }

    return slotEl;
}

function addToLog(message) {
    const log = document.getElementById('gameLog');
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerHTML = message;
    log.appendChild(entry);
    log.scrollTop = log.scrollHeight;
}

function checkGameOver() {
    if (gameState.gameOver) return;
    if (gameState.playerLP <= 0) {
        gameState.playerLP = 0;
        updateUI();
        showVictoryScreen('🤖 Il Bot Vince!', 'red');
        gameState.gameOver = true;
    } else if (gameState.botLP <= 0) {
        gameState.botLP = 0;
        updateUI();
        showVictoryScreen('🎉 Hai Vinto!', 'gold');
        gameState.gameOver = true;
    }
}

function showVictoryScreen(message, color) {
    const victoryEl = document.createElement('div');
    victoryEl.className = 'victory-screen';
    victoryEl.innerHTML = `<div class="victory-text" style="color: ${color};">${message}</div>
                           <button class="btn" onclick="location.reload()">🔄 Nuova Partita</button>`;
    document.body.appendChild(victoryEl);
}

const phaseOrder = ['draw', 'standby', 'main1', 'battle', 'main2', 'end'];

function setupPhaseStepper() {
    document.querySelectorAll('.phase-step').forEach((step) => {
        step.onclick = () => {
            const targetPhase = step.dataset.phase;
            if (!targetPhase) return;
            handlePhaseStepperClick(targetPhase);
        };
    });
}

function handlePhaseStepperClick(targetPhase) {
    if (gameState.currentPlayer !== 'player') return;
    const currentPhaseIndex = phaseOrder.indexOf(gameState.phase);
    const targetPhaseIndex = phaseOrder.indexOf(targetPhase);
    if (targetPhaseIndex <= currentPhaseIndex) return;

    if (targetPhase === 'battle' && gameState.turn === 1) {
        addToLog('❌ Non puoi entrare in Battle Phase nel primo turno.');
        return;
    }

    if (targetPhase === 'end') {
        if (['main1', 'battle', 'main2'].includes(gameState.phase)) {
            endTurn();
        }
        return;
    }

    if (gameState.phase === 'draw' && targetPhase === 'standby') {
        enterStandbyPhase();
        return;
    }
    if (gameState.phase === 'standby' && targetPhase === 'main1') {
        enterMainPhase1();
        return;
    }
    if (gameState.phase === 'main1' && targetPhase === 'battle') {
        enterBattlePhase();
        return;
    }
    if (gameState.phase === 'battle' && targetPhase === 'main2') {
        enterMainPhase2();
        return;
    }
    if (['main1', 'battle', 'main2'].includes(gameState.phase) && targetPhase === 'end') {
        endTurn();
        return;
    }
}

function updatePhaseIndicator() {
    const currentPhaseIndex = phaseOrder.indexOf(gameState.phase);
    const isPlayerTurn = gameState.currentPlayer === 'player';

    document.querySelectorAll('.phase-step').forEach((step, index) => {
        const targetPhase = step.dataset.phase;
        const isFirstTurn = gameState.turn === 1;
        const isClickable = isPlayerTurn && (
            (gameState.phase === 'draw' && targetPhase === 'standby') ||
            (gameState.phase === 'standby' && targetPhase === 'main1') ||
            (gameState.phase === 'main1' && ((targetPhase === 'battle' && !isFirstTurn) || targetPhase === 'end')) ||
            (gameState.phase === 'battle' && (targetPhase === 'main2' || targetPhase === 'end')) ||
            (gameState.phase === 'main2' && targetPhase === 'end')
        );

        step.classList.toggle('completed', index < currentPhaseIndex);
        step.classList.toggle('active', index === currentPhaseIndex);
        step.classList.toggle('clickable', isClickable);
        step.classList.toggle('disabled', !isClickable && index > currentPhaseIndex);
        step.style.cursor = isClickable ? 'pointer' : 'default';
    });

    const currentPlayerName = gameState.currentPlayer === 'player' ? 'Giocatore' : 'Bot';
    const turnLabel = document.getElementById('phaseTurnLabel');
    if (turnLabel) {
        turnLabel.textContent = `Turno di: ${currentPlayerName}`;
    }
}

initGame();
setupPhaseStepper();
