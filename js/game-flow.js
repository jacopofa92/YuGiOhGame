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
    const preview = document.getElementById('cardInfoPreview');
    if (!panel || !content) return;

    const shouldHide = !card || options.sourceType === 'deck' || (options.sourceOwner === 'bot' && options.isFaceDown);
    if (shouldHide) {
        content.innerHTML = '';
        if (preview) preview.innerHTML = '';
        panel.classList.remove('visible');
        return;
    }

    if (preview) {
        preview.innerHTML = '';
        const previewCard = createCardElement(card, false, 'attack');
        previewCard.onclick = null;
        previewCard.onpointerdown = null;
        preview.appendChild(previewCard);
    }

    const typeLabel = card.type === 'monster' ? 'Mostro' : card.type === 'spell' ? 'Magia' : 'Trappola';
    const levelLabel = card.type === 'monster' && card.level ? ` • Livello ${card.level}${getTributesRequired(card) > 0 ? ` • Richiede ${getTributesRequired(card)} Tribut${getTributesRequired(card) > 1 ? 'i' : 'o'}` : ''}` : '';
    const effectText = card.effect || (card.type === 'monster' ? 'Mostro normale senza effetto speciale.' : 'Questa carta non presenta un effetto scritto.');
    content.innerHTML = `
        <div class="card-info-name">${card.name}</div>
        <div class="card-info-meta">${typeLabel}${levelLabel}</div>
        ${card.type === 'monster' ? `<div class="card-info-stats">ATK ${card.attack} • DEF ${card.defense}</div>` : ''}
        <p>${effectText}</p>
    `;
    panel.classList.add('visible');
}

/**
 * Annuncio epico a schermo per cambi Fase / Turno, in stile Master Duel.
 * variant: 'phase' (oro, default) | 'battle' (rosso/oro) | 'turn' (blu, più grande)
 */
function showPhaseAnnouncement(title, subtitle, variant = 'phase') {
    const existing = document.getElementById('phaseAnnouncement');
    if (existing) existing.remove();

    const wrap = document.createElement('div');
    wrap.id = 'phaseAnnouncement';
    wrap.className = variant === 'turn' ? 'phase-announce--turn' : (variant === 'battle' ? 'phase-announce--battle' : 'phase-announce--phase');
    wrap.innerHTML = `
        <div class="phase-announce-banner">
            <div class="phase-announce-title">${title}</div>
            ${subtitle ? `<div class="phase-announce-sub">${subtitle}</div>` : ''}
        </div>
    `;
    document.body.appendChild(wrap);

    const duration = variant === 'turn' ? 1900 : 1300;
    wrap.style.setProperty('--phase-anim-duration', `${duration}ms`);
    void wrap.offsetWidth;
    wrap.classList.add('phase-announce-play');
    setTimeout(() => wrap.remove(), duration + 80);
}

/**
 * Annuncio epico di inizio Battle Phase, in stile Master Duel: dura 3 secondi
 * e combina flash a schermo, barre cinematografiche, raggi rotanti e la
 * scritta "BATTLE PHASE" con impatto e leggero screen-shake.
 */
function showBattlePhaseEpicAnnouncement() {
    const existing = document.getElementById('battleStartOverlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'battleStartOverlay';
    overlay.innerHTML = `
        <div class="battle-start-flash"></div>
        <div class="battle-start-rays"></div>
        <div class="battle-start-bar bar-top"></div>
        <div class="battle-start-bar bar-bottom"></div>
        <div class="battle-start-title">
            <span class="battle-start-word battle-start-word--left">BATTLE</span>
            <span class="battle-start-word battle-start-word--right">PHASE</span>
        </div>
        <div class="battle-start-sub">La Fase di Battaglia ha inizio</div>
    `;
    document.body.appendChild(overlay);
    void overlay.offsetWidth;
    overlay.classList.add('play');

    const container = document.querySelector('.game-container') || document.body;
    container.classList.add('fx-shake');
    setTimeout(() => container.classList.remove('fx-shake'), 450);

    setTimeout(() => overlay.remove(), 3000);
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
    if (window.MULTIPLAYER_MODE && typeof window.MP_startingRole === 'string') {
        // In multiplayer "player" significa sempre "io" e "bot" significa
        // sempre "l'avversario": chi inizia per primo lo decide il server
        // al momento dell'accoppiamento nella stanza.
        gameState.currentPlayer = window.MP_startingRole;
    }
    if (!document.getElementById('playerHand') || !document.getElementById('playerFieldBoard') || !document.getElementById('botFieldBoard')) {
        console.error('Elementi del campo mancanti nella pagina.');
        return;
    }
    drawCardsToHand('player', 5);
    drawCardsToHand('bot', 5);
    if (gameState.currentPlayer === 'player' && !window.MULTIPLAYER_MODE) {
        drawCardsToHand('player', 1);
    }
    updateUI();
    addToLog(gameState.currentPlayer === 'player'
        ? '🎮 Duello iniziato! È il tuo turno. Inizia la Draw Phase.'
        : '🎮 Duello iniziato! Turno dell\'avversario.');
    if (gameState.currentPlayer === 'player') {
        setTimeout(enterDrawPhase, 500);
    }
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
        pendingTributeSummon: null,
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
    const opponentLabel = window.MULTIPLAYER_MODE ? 'Turno dell\'Avversario' : 'Turno del Bot';
    showPhaseAnnouncement(
        gameState.currentPlayer === 'player' ? 'Il Tuo Turno' : opponentLabel,
        `Turno ${gameState.turn}`,
        'turn'
    );
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
        if (!window.MULTIPLAYER_MODE) setTimeout(botTurn, 1000);
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
    if (window.MP_broadcast && !window.MP_applyingRemote) {
        window.MP_broadcast({ kind: 'phase', name: 'draw' });
    }
    showPhaseAnnouncement('Pesca', gameState.currentPlayer === 'player' ? 'Draw Phase' : 'Draw Phase - Bot');
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
                        const flyingCard = createCardElement(drawnCard);
                        flyingCard.classList.add('draw-flying-card');
                        const rect = deckSlot ? deckSlot.getBoundingClientRect() : { left: 0, top: 0 };
                        const handRect = handEl.getBoundingClientRect();
                        const targetX = handRect.left + handRect.width * 0.35 - rect.left - 45;
                        const targetY = handRect.top + handRect.height * 0.35 - rect.top - 65;
                        flyingCard.style.left = `${rect.left + 8}px`;
                        flyingCard.style.top = `${rect.top + 8}px`;
                        flyingCard.style.setProperty('--dx', `${targetX}px`);
                        flyingCard.style.setProperty('--dy', `${targetY}px`);
                        document.body.appendChild(flyingCard);
                        if (window.FX) FX.playDrawEffect(flyingCard);
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
    if (window.MP_broadcast && !window.MP_applyingRemote) {
        window.MP_broadcast({ kind: 'phase', name: 'standby' });
    }
    showPhaseAnnouncement('Standby', 'Standby Phase');
    addToLog('⏳ Standby Phase');
    updateUI();
    if (autoAdvance) {
        phaseTransitionTimeout = setTimeout(() => enterMainPhase1(), 500);
    }
}

function enterMainPhase1() {
    clearPhaseTransitionTimeout();
    gameState.phase = 'main1';
    if (window.MP_broadcast && !window.MP_applyingRemote) {
        window.MP_broadcast({ kind: 'phase', name: 'main1' });
    }
    showPhaseAnnouncement('Main Phase 1');
    addToLog('⚡ Main Phase 1');
    updateUI();
}

function enterBattlePhase() {
    if (gameState.turn === 1) {
        addToLog('❌ Non puoi entrare in Battle Phase nel primo turno. Rimani in Main Phase 1 o vai direttamente a End Phase.');
        return;
    }
    gameState.phase = 'battle';
    if (window.MP_broadcast && !window.MP_applyingRemote) {
        window.MP_broadcast({ kind: 'phase', name: 'battle' });
    }
    showBattlePhaseEpicAnnouncement();
    addToLog('⚔️ Battle Phase! Clicca e trascina da un tuo mostro per attaccare.');
    updateUI();
}

function enterMainPhase2() {
    clearPhaseTransitionTimeout();
    gameState.phase = 'main2';
    if (window.MP_broadcast && !window.MP_applyingRemote) {
        window.MP_broadcast({ kind: 'phase', name: 'main2' });
    }
    showPhaseAnnouncement('Main Phase 2');
    addToLog('⚡ Main Phase 2');
    updateUI();
}

function enterEndPhase() {
    clearPhaseTransitionTimeout();
    gameState.phase = 'end';
    if (window.MP_broadcast && !window.MP_applyingRemote) {
        window.MP_broadcast({ kind: 'phase', name: 'end' });
    }
    showPhaseAnnouncement('Fine', 'End Phase');
    addToLog('🏁 End Phase');
    updateUI();
    phaseTransitionTimeout = setTimeout(changeTurn, 1500);
}

function renderLifePoints() {
    const playerLPEl = document.getElementById('playerLP');
    const botLPEl = document.getElementById('botLP');
    if (playerLPEl) playerLPEl.textContent = gameState.playerLP;
    if (botLPEl) botLPEl.textContent = gameState.botLP;
}

function updateUI() {
    if (gameState.gameOver) return;
    // Ricalcola gli effetti continui (es. Jinzo nega le Trappole, Spada
    // Rivelatrice blocca gli attacchi) PRIMA di disegnare qualunque cosa,
    // così il render riflette sempre lo stato corrente del campo — vedi
    // js/duel-engine.js.
    if (window.DuelEngine) DuelEngine.recomputeStaticEffects();
    renderLifePoints();
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
                cardEl.onmouseenter = () => {
                    if (dragState) return;
                    updateCardInfoPanel(slot.card, { sourceType: slotType, sourceOwner: owner, isFaceDown: slot.isFaceDown });
                };
                if (isMonsterRow && owner === 'player' && gameState.phase === 'battle' && !slot.hasAttacked && slot.position === 'attack' && !(window.DuelEngine && DuelEngine.cannotAttack('player'))) {
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

    if (gameState.pendingTributeSummon) {
        gameState.playerMonsterField.forEach((slot, index) => {
            if (!slot) return;
            const el = document.querySelector(`#playerFieldBoard .field-slot[data-owner="player"][data-type="monster"][data-index="${index}"]`);
            if (!el) return;
            el.classList.add('tribute-highlight');
            if (gameState.pendingTributeSummon.selected.includes(index)) {
                el.classList.add('tribute-selected');
            }
        });
    }
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

function showBattleEffect(attackerEl, targetEl) {
    if (attackerEl) {
        attackerEl.classList.remove('attack-flash', 'is-attacking');
        void attackerEl.offsetWidth;
        attackerEl.classList.add('attack-flash', 'is-attacking');
        setTimeout(() => attackerEl.classList.remove('attack-flash', 'is-attacking'), 650);
    }

    if (targetEl) {
        const rect = targetEl.getBoundingClientRect();
        const hitEl = document.createElement('div');
        hitEl.className = 'battle-hit';
        hitEl.style.left = `${rect.left}px`;
        hitEl.style.top = `${rect.top}px`;
        hitEl.style.width = `${rect.width}px`;
        hitEl.style.height = `${rect.height}px`;
        document.body.appendChild(hitEl);
        setTimeout(() => hitEl.remove(), 550);
    }
}

function showFloatingDamage(value, anchorEl) {
    if (!anchorEl) return;
    const rect = anchorEl.getBoundingClientRect();
    const el = document.createElement('div');
    el.className = `floating-damage ${value > 0 ? 'heal' : 'damage'}`;
    el.textContent = value > 0 ? `+${value}` : `-${Math.abs(value)}`;
    el.style.left = `${rect.left + rect.width / 2 - 18}px`;
    el.style.top = `${rect.top - 6}px`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 950);

    if (value < 0 && window.FX) {
        FX.playDamageEffect(Math.abs(value), { anchorEl });
    }
}

function showPositionEffect(owner, index, position) {
    setTimeout(() => {
        const boardId = owner === 'player' ? 'playerFieldBoard' : 'botFieldBoard';
        const cardEl = document.querySelector(`#${boardId} .field-slot[data-index="${index}"] .card`);
        if (!cardEl) return;
        // La carta in Posizione di Difesa è già ruotata (classe .defense-pos,
        // applicata al render). Usiamo un keyframe dedicato che include quella
        // rotazione, così l'animazione non la fa "scattare" temporaneamente
        // in orizzontale come se fosse in attacco.
        const animClass = position === 'defense' ? 'positioning-defense' : 'positioning';
        cardEl.classList.remove('positioning', 'positioning-defense');
        void cardEl.offsetWidth;
        cardEl.classList.add(animClass);
        if (position === 'attack' && window.FX) {
            FX.playSummonShockwave(cardEl);
        }
        const badge = document.createElement('div');
        badge.className = position === 'defense' ? 'position-badge badge-defense' : 'position-badge';
        badge.textContent = position === 'attack' ? '⚔️' : '🛡️';
        cardEl.appendChild(badge);
        setTimeout(() => badge.remove(), 700);
        setTimeout(() => cardEl.classList.remove(animClass), 700);
    }, 60);
}

function renderPlayerHand() {
    const handEl = document.getElementById('playerHand');
    if (!handEl) return;
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
        cardEl.onmouseenter = () => {
            if (dragState) return;
            updateCardInfoPanel(card, { sourceType: 'hand', sourceOwner: 'player', isFaceDown: false });
        };
        if (gameState.selectedCard.type === 'hand' && gameState.selectedCard.index === index) {
            cardEl.classList.add('selected');
        }
        handEl.appendChild(cardEl);
    });
}

// createCardElement(card, isFaceDown, position) e getCardImagePath(card)
// vivono ora in js/card-renderer.js (condiviso da tutte le pagine) — vedi
// quel file per come si costruisce il DOM di una carta.

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
        // Pila di carte coperte: fallback CSS a 3 dorsi sfalsati (vedi
        // .deck-preview:nth-child in CSS) sostituita automaticamente da
        // images/cards/backPilaCards.jpeg se quel file esiste — vedi
        // js/card-renderer.js.
        CardRenderer.appendDeckPile(slotEl);
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
    if (!log) {
        console.log(`[Game Log] ${message}`);
        return;
    }

    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerHTML = message;
    log.appendChild(entry);
    log.scrollTop = log.scrollHeight;
}

function checkGameOver() {
    if (gameState.gameOver) return;
    const playerLost = gameState.playerLP <= 0;
    const botLost = gameState.botLP <= 0;
    if (!playerLost && !botLost) return;

    // ATTENZIONE all'ordine: updateUI() termina chiamando checkGameOver(),
    // quindi la bandierina gameOver va alzata PRIMA di toccare l'interfaccia,
    // altrimenti le due funzioni si richiamano a vicenda all'infinito e la
    // schermata finale non compare mai. Per lo stesso motivo qui aggiorniamo
    // i Life Point con renderLifePoints() invece che con updateUI().
    gameState.gameOver = true;
    if (playerLost) gameState.playerLP = 0;
    if (botLost) gameState.botLP = 0;
    renderLifePoints();

    // Se cadono entrambi nello stesso momento il duello è perso, come già
    // faceva la versione precedente del controllo.
    endDuel(!playerLost);
}

/**
 * Chiude il duello: blocca ogni azione ancora in coda (turni del bot,
 * transizioni di fase) e passa la palla a js/duel-session.js, che sa chi
 * era l'avversario, aggiorna il suo record e mostra la schermata di
 * Vittoria/Sconfitta con il pulsante "Continua".
 */
function endDuel(playerWon) {
    gameState.gameOver = true;
    clearPhaseTransitionTimeout();
    // Una modale rimasta aperta (evocazione, o una finestra di risposta del
    // motore effetti) resterebbe lì sotto la schermata finale: la chiudiamo.
    document.querySelectorAll('.modal-backdrop.open').forEach((modal) => modal.classList.remove('open'));
    addToLog(playerWon ? '🎉 Hai vinto il duello!' : '💀 Hai perso il duello.');

    if (window.DuelSession) {
        // Un attimo di respiro dopo l'ultimo colpo, prima della schermata finale.
        setTimeout(() => DuelSession.finish(playerWon), 900);
    } else {
        showVictoryScreen(playerWon ? '🎉 Hai Vinto!' : '🤖 Il Bot Vince!', playerWon ? 'gold' : 'red');
    }
}

/**
 * Schermata finale di ripiego, usata solo se la pagina viene aperta senza
 * js/duel-session.js (per esempio in un test isolato del motore).
 */
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

    const currentPlayerName = gameState.currentPlayer === 'player' ? 'Giocatore' : (window.MULTIPLAYER_MODE ? 'Avversario' : 'Bot');
    const turnLabel = document.getElementById('phaseTurnLabel');
    if (turnLabel) {
        turnLabel.textContent = `Turno di: ${currentPlayerName}`;
    }
}

// Boot del duello. In multiplayer la partita non parte all'apertura della
// pagina ma quando la stanza si riempie: in quel caso è js/multiplayer.js
// a chiamare DuelSession.start() (vedi MULTIPLAYER_DEFER_INIT).
// In tutte le altre modalità partiamo subito con l'intro cinematografica,
// che al termine avvia initGame() + setupPhaseStepper().
if (!window.MULTIPLAYER_DEFER_INIT) {
    if (window.DuelSession) {
        DuelSession.start();
    } else {
        initGame();
        setupPhaseStepper();
    }
}
