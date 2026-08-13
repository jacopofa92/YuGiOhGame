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
            promptPositionChange(sourceIndex);
        }
    } else if (sourceType === 'st' && sourceOwner === 'player' && isMainPhase) {
        // Click su una propria Magia/Trappola già piazzata: prova ad
        // attivarla di propria iniziativa (vedi js/duel-engine.js per le
        // regole di quando è permesso — es. una Trappola non si può
        // attivare nel turno in cui è stata Set).
        attemptActivateCard('player', 'st', sourceIndex);
    }
}

/**
 * Prova ad attivare manualmente una carta (Magia dalla mano/dal Terreno o
 * Trappola già Set): se le regole lo permettono, mostra il modale di
 * conferma "Attiva la carta" (vedi DuelEngineUI più sotto); altrimenti
 * spiega nel log perché non è possibile, invece di far succedere nulla
 * in silenzio.
 */
function attemptActivateCard(owner, zone, index) {
    const card = zone === 'hand' ? gameState.playerHand[index] : gameState.playerSTField[index] && gameState.playerSTField[index].card;
    if (!card) return;

    const def = DuelEngine.getDefinition(card.id);
    if (!def) {
        addToLog(`ℹ️ ${card.name} non ha un effetto attivabile.`);
        return;
    }
    if (typeof def.activate !== 'function') {
        // Carte come Forza Riflessa/Cilindro Magico/Buco Trappola non si
        // attivano mai di propria iniziativa: scattano da sole quando
        // l'avversario attacca o evoca (vedi js/duel-engine.js).
        addToLog(`ℹ️ ${card.name} si attiva automaticamente in risposta a un'azione dell'avversario, non manualmente.`);
        return;
    }
    if (!DuelEngine.canActivate(owner, zone, index)) {
        if (card.type === 'trap' && zone === 'st' && gameState.playerSTField[index].setOnTurn === gameState.turn) {
            addToLog(`❌ ${card.name} non può essere attivata nel turno in cui è stata Set.`);
        } else if (card.type === 'trap' && DuelEngine.areTrapsNegatedFor(owner)) {
            addToLog(`❌ Le Trappole sono negate in questo momento (es. Jinzo in campo).`);
        } else {
            addToLog(`❌ Non ci sono le condizioni per attivare ${card.name} adesso.`);
        }
        return;
    }

    window.DuelEngineUI.openActivateModal(card, {
        title: '✨ Attiva la carta',
        text: `Vuoi attivare ${card.name} adesso?`,
        onConfirm: () => DuelEngine.activateCard(owner, zone, index)
    });
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
    const preview = createCardElement(card);
    preview.classList.add('drag-preview');
    preview.style.left = `${x - 45}px`;
    preview.style.top = `${y - 66}px`;
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

/**
 * Popover leggero e ancorato: alternativa non invasiva ai modali a
 * schermo intero. Nessuno scurimento della pagina — solo una piccola card
 * vicino alla carta/slot interessato — e si chiude cliccando ovunque fuori
 * da sé grazie a un click-catcher trasparente sotto di lei. Il chiamante
 * riempie `innerHTML` con i propri pulsanti e li collega DOPO la chiamata
 * (vedi openSummonModal/promptPositionChange sotto per un esempio),
 * richiamando closeQuickPopover() dentro ogni handler.
 */
function openQuickPopover(anchorEl, innerHTML, { onDismiss } = {}) {
    closeQuickPopover();

    const catcher = document.createElement('div');
    catcher.className = 'quick-popover-catcher';
    catcher.id = 'quickPopoverCatcher';

    const pop = document.createElement('div');
    pop.className = 'quick-popover';
    pop.id = 'quickPopover';
    pop.innerHTML = innerHTML;

    document.body.appendChild(catcher);
    document.body.appendChild(pop);

    const anchorRect = anchorEl ? anchorEl.getBoundingClientRect() : {
        left: window.innerWidth / 2, right: window.innerWidth / 2,
        top: window.innerHeight / 2, bottom: window.innerHeight / 2, width: 0, height: 0
    };
    const popRect = pop.getBoundingClientRect();
    let left = anchorRect.left + anchorRect.width / 2 - popRect.width / 2;
    // Preferisce comparire SOPRA la carta; se non c'è spazio, sotto.
    let top = anchorRect.top - popRect.height - 10;
    if (top < 8) top = anchorRect.bottom + 10;
    left = Math.min(Math.max(left, 8), window.innerWidth - popRect.width - 8);
    top = Math.min(Math.max(top, 8), window.innerHeight - popRect.height - 8);
    pop.style.left = `${left}px`;
    pop.style.top = `${top}px`;

    catcher.onclick = () => {
        closeQuickPopover();
        if (typeof onDismiss === 'function') onDismiss();
    };

    return pop;
}

function closeQuickPopover() {
    const pop = document.getElementById('quickPopover');
    const catcher = document.getElementById('quickPopoverCatcher');
    if (pop) pop.remove();
    if (catcher) catcher.remove();
}

function openSummonModal(card, slotIndex, handIndex) {
    if (card.type === 'monster' && gameState.hasNormalSummoned) {
        addToLog('❌ Hai già effettuato un\'Evocazione Normale in questo turno.');
        return;
    }

    gameState.pendingSummon = { card, slotIndex, handIndex };
    const slotEl = document.querySelector(`.field-slot[data-owner="player"][data-type="monster"][data-index="${slotIndex}"]`);
    const tributesNeeded = getTributesRequired(card);
    const title = tributesNeeded > 0
        ? `Tributo completato (${tributesNeeded}). Attacco o Difesa?`
        : `${card.name}: Attacco o Difesa?`;

    // Lo slot scelto resta "in attesa" (bordo che pulsa) finché non si
    // sceglie Attacco/Difesa o si annulla — si vede subito QUALE slot sta
    // aspettando una decisione, utile soprattutto se il popover finisce
    // vicino ad altri slot vuoti.
    if (slotEl) slotEl.classList.add('slot-pending-position');
    const clearPendingVisual = () => { if (slotEl) slotEl.classList.remove('slot-pending-position'); };

    const cancelSummon = () => {
        clearPendingVisual();
        gameState.pendingSummon = null;
        clearSelection();
    };

    const pop = openQuickPopover(slotEl, `
        <div class="quick-popover-title">${title}</div>
        <div class="quick-popover-actions">
            <button type="button" class="quick-popover-btn attack icon-round" id="qpSummonAttack" title="Scoperta in Attacco">⚔️</button>
            <button type="button" class="quick-popover-btn defense icon-round" id="qpSummonDefense" title="Coperta in Difesa">🛡️</button>
            <button type="button" class="quick-popover-btn cancel icon-round" id="qpSummonCancel" title="Annulla">✖</button>
        </div>
    `, { onDismiss: cancelSummon });

    pop.querySelector('#qpSummonAttack').onclick = () => {
        closeQuickPopover();
        clearPendingVisual();
        summonMonster(card, slotIndex, 'attack', handIndex);
    };
    pop.querySelector('#qpSummonDefense').onclick = () => {
        closeQuickPopover();
        clearPendingVisual();
        summonMonster(card, slotIndex, 'defense', handIndex);
    };
    pop.querySelector('#qpSummonCancel').onclick = () => {
        closeQuickPopover();
        cancelSummon();
    };
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

    // Finestra per un'eventuale risposta dell'avversario (es. Buco
    // Trappola) — vedi js/duel-engine.js. È "fire and forget": se la
    // risposta distrugge il mostro appena Evocato, updateUI() nella
    // callback lo riflette subito a schermo.
    const summonCtx = DuelEngine.makeContext('player', { summonedCard: card, summonedSlotIndex: slotIndex, summonedPosition: position });
    DuelEngine.fireTrigger(DuelEngine.TRIGGER.ON_NORMAL_SUMMON, summonCtx, () => updateUI());
}

/**
 * Chiede conferma, con lo stesso popover leggero non invasivo usato per
 * l'Evocazione, prima di cambiare Posizione a un mostro già in campo —
 * evita che un click accidentale sul mostro lo giri/ruoti senza volerlo.
 */
function promptPositionChange(slotIndex) {
    const monsterSlot = gameState.playerMonsterField[slotIndex];
    if (!monsterSlot || !monsterSlot.canChangePosition) return;
    // Nessun box con la domanda: solo due pulsanti tondi, l'icona della
    // nuova posizione (⚔️/🛡️) e l'annulla — si capisce già dall'icona cosa
    // si sta per fare, senza bisogno di ripeterlo a parole.
    const goingToDefense = monsterSlot.position === 'attack';
    const slotEl = document.querySelector(`.field-slot[data-owner="player"][data-type="monster"][data-index="${slotIndex}"]`);

    const pop = openQuickPopover(slotEl, `
        <div class="quick-popover-actions">
            <button type="button" class="quick-popover-btn ${goingToDefense ? 'defense' : 'attack'} icon-round" id="qpPosConfirm" title="Cambia Posizione">${goingToDefense ? '🛡️' : '⚔️'}</button>
            <button type="button" class="quick-popover-btn cancel icon-round" id="qpPosCancel" title="Annulla">✖</button>
        </div>
    `);

    pop.querySelector('#qpPosConfirm').onclick = () => {
        closeQuickPopover();
        changeMonsterPosition(slotIndex);
    };
    pop.querySelector('#qpPosCancel').onclick = () => closeQuickPopover();
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

/**
 * Wrapper storico: l'attacco dichiarato dal giocatore umano passa sempre
 * per resolveAttack() qui sotto — l'unico posto dove la battaglia viene
 * davvero calcolata. Prima di questo motore, executeAttack() (qui) e
 * botExecuteAttack() (in bot.js) contenevano DUE COPIE quasi identiche
 * dello stesso calcolo di danni: un classico rischio di "il bug si
 * corregge in un posto e resta nell'altro". botExecuteAttack in bot.js
 * ora è un wrapper altrettanto sottile.
 */
function executeAttack(attackerIndex, targetIndex) {
    resolveAttack('player', attackerIndex, targetIndex);
}

function fieldOfOwner(owner) {
    return owner === 'player' ? gameState.playerMonsterField : gameState.botMonsterField;
}

/**
 * Risolve un'intera battaglia, chiunque l'abbia dichiarata (giocatore,
 * bot, o la sua replica in multiplayer). Sequenza:
 *   1) apre la finestra di risposta ON_ATTACK_DECLARE (Forza Riflessa /
 *      Cilindro Magico / Kuriboh da mano — vedi js/duel-engine.js);
 *   2) SOLO dopo che quella finestra si è chiusa (onDone), se l'attacco
 *      non è stato annullato, gioca le animazioni e calcola i danni.
 * Il passo 1 può essere asincrono (il giocatore umano deve confermare
 * un prompt), per questo tutto il resto vive dentro la callback onDone.
 *
 * `onComplete`, se passato, viene richiamato esattamente una volta,
 * quando l'INTERA battaglia (finestra di risposta compresa) è davvero
 * finita — non un timer a tempo fisso. botPerformAttacks() in bot.js lo
 * usa per aspettare la risoluzione piena di un attacco (incluso un
 * eventuale "vuoi rispondere?" del giocatore) prima di dichiararne un
 * altro, così due finestre di risposta non si sovrappongono mai.
 */
function resolveAttack(attackerOwner, attackerIndex, targetIndex, onComplete) {
    const done = typeof onComplete === 'function' ? onComplete : function () {};
    // Una volta che i LP di qualcuno sono a zero il duello è chiuso: qui
    // passano TUTTI gli attacchi (giocatore, bot e mosse remote), quindi
    // basta questo controllo perché nulla si muova più sotto la schermata
    // di Vittoria/Sconfitta.
    if (gameState.gameOver) { done(); return; }
    const defenderOwner = attackerOwner === 'player' ? 'bot' : 'player';
    const attackerField = fieldOfOwner(attackerOwner);
    const defenderField = fieldOfOwner(defenderOwner);
    const attackerSlot = attackerField[attackerIndex];
    if (!attackerSlot || attackerSlot.hasAttacked) { done(); return; }
    if (window.DuelEngine && DuelEngine.cannotAttack(attackerOwner)) {
        addToLog(`🚫 ${attackerOwner === 'player' ? 'I tuoi mostri non possono' : 'I mostri del bot non possono'} attaccare in questo momento (es. Spada Rivelatrice).`);
        done();
        return;
    }

    if (attackerOwner === 'player' && window.MP_broadcast && !window.MP_applyingRemote) {
        window.MP_broadcast({ kind: 'attack', attackerIndex, targetIndex });
    }

    const attackerBoardId = attackerOwner === 'player' ? 'playerFieldBoard' : 'botFieldBoard';
    const defenderBoardId = defenderOwner === 'player' ? 'playerFieldBoard' : 'botFieldBoard';
    const attackerCardEl = document.querySelector(`#${attackerBoardId} .field-slot[data-index="${attackerIndex}"] .card`);
    const targetAnchor = targetIndex === -1
        ? document.getElementById(defenderOwner === 'player' ? 'playerInfo' : 'botInfo')
        : document.querySelector(`#${defenderBoardId} .field-slot[data-index="${targetIndex}"] .card`);

    const attackState = { cancelled: false, damageNegated: false };
    const declareCtx = DuelEngine.makeContext(attackerOwner, {
        attackerOwner: attackerOwner,
        attackerIndex: attackerIndex,
        targetIndex: targetIndex,
        attackerAtk: attackerSlot.card.attack,
        cancelAttack: () => { attackState.cancelled = true; },
        negateDamage: () => { attackState.damageNegated = true; }
    });

    DuelEngine.fireTrigger(DuelEngine.TRIGGER.ON_ATTACK_DECLARE, declareCtx, () => {
        updateUI(); // mostra subito eventuali effetti della risposta (es. distruzioni di Forza Riflessa)

        // L'attacco si ferma qui se è stato annullato esplicitamente
        // (Cilindro Magico) oppure se il mostro attaccante non esiste
        // più (es. Forza Riflessa lo ha appena distrutto insieme a tutti
        // gli altri mostri in Posizione di Attacco del suo proprietario).
        if (attackState.cancelled || !attackerField[attackerIndex]) {
            addToLog('🚫 L\'attacco è stato annullato.');
            if (attackerField[attackerIndex]) attackerField[attackerIndex].hasAttacked = true;
            if (attackerOwner === 'player') clearSelection(); else updateUI();
            done();
            return;
        }

        // Attacco diretto: nessun mostro-bersaglio verso cui lanciarsi, la
        // rincorsa va dritta verso la metà alta (il Bot subisce) o bassa
        // (il giocatore subisce) dello schermo — vedi showBattleEffect.
        const directDirection = targetIndex === -1 ? (defenderOwner === 'bot' ? 'up' : 'down') : null;
        showBattleEffect(attackerCardEl, targetAnchor, directDirection);
        if (targetIndex !== -1 && window.FX) {
            FX.playBattleClashEpic(attackerCardEl, targetAnchor);
        }

        setTimeout(() => {
            resolveBattleDamage(attackerOwner, defenderOwner, attackerIndex, targetIndex, attackState.damageNegated);
            attackerSlot.hasAttacked = true;
            setTimeout(() => {
                if (attackerCardEl) attackerCardEl.classList.remove('is-attacking');
                document.querySelectorAll('.damage-shake').forEach(el => el.classList.remove('damage-shake'));
                if (attackerOwner === 'player') clearSelection(); else updateUI();
                setTimeout(() => {
                    if (targetIndex !== -1) {
                        const destroyedSlots = [];
                        if (attackerField[attackerIndex] === null) destroyedSlots.push({ owner: attackerOwner, index: attackerIndex });
                        if (defenderField[targetIndex] === null) destroyedSlots.push({ owner: defenderOwner, index: targetIndex });
                        destroyedSlots.forEach(item => triggerDestroyEffect(item.owner, item.index, 'monster'));
                    }
                    done();
                }, 0);
            }, 500);
        }, 500);
    });
}

/**
 * Il calcolo vero e proprio del confronto ATK/DEF: chi viene distrutto,
 * quanti Life Points si perdono. `damageNegated` arriva da un effetto
 * come Kuriboh, che annulla SOLO il danno di questo attacco (le regole
 * vere dicono "annulla il danno", non "annulla la battaglia": i mostri
 * coinvolti si distruggono comunque secondo il normale confronto ATK/DEF).
 */
function resolveBattleDamage(attackerOwner, defenderOwner, attackerIndex, targetIndex, damageNegated) {
    const attackerField = fieldOfOwner(attackerOwner);
    const defenderField = fieldOfOwner(defenderOwner);
    const attackerSlot = attackerField[attackerIndex];
    const attacker = attackerSlot.card;
    const attackerIsPlayer = attackerOwner === 'player';
    const attackerPrefix = attackerIsPlayer ? '' : '🤖 ';
    // "il tuo"/"" davanti al nome di una carta del difensore, per far
    // capire subito di chi è la carta coinvolta.
    const yourPrefix = defenderOwner === 'player' ? 'il tuo ' : '';

    const applyDamage = (owner, amount) => {
        if (damageNegated) {
            addToLog('🐰 Il danno da battaglia di questo attacco è stato annullato!');
            return;
        }
        DuelEngine.actions.dealDamage(owner, amount);
        const infoEl = document.getElementById(owner === 'player' ? 'playerInfo' : 'botInfo');
        if (infoEl) infoEl.classList.add('damage-shake');
        showFloatingDamage(amount, infoEl, owner);
    };

    if (targetIndex === -1) {
        if (typeof showDirectAttackWarning === 'function') showDirectAttackWarning();
        const damage = attacker.attack;
        applyDamage(defenderOwner, damage);
        addToLog(`${attackerPrefix}🔥 Attacco diretto! ${attacker.name} ${damageNegated ? 'avrebbe inflitto' : 'infligge'} ${damage} danni!`);
    } else {
        const targetSlot = defenderField[targetIndex];
        const target = targetSlot.card;
        addToLog(`${attackerPrefix}⚔️ ${attacker.name} attacca ${yourPrefix}${target.name}!`);

        if (targetSlot.position === 'attack') {
            if (attacker.attack > target.attack) {
                const damage = attacker.attack - target.attack;
                applyDamage(defenderOwner, damage);
                defenderField[targetIndex] = null;
                addToLog(`💥 ${yourPrefix}${target.name} distrutto! ${defenderOwner === 'player' ? 'Perdi' : 'Il bot perde'} ${damage} LP.`);
            } else if (attacker.attack < target.attack) {
                const damage = target.attack - attacker.attack;
                applyDamage(attackerOwner, damage);
                attackerField[attackerIndex] = null;
                addToLog(`💀 ${attackerIsPlayer ? '' : 'Il '}${attacker.name}${attackerIsPlayer ? '' : ' del bot'} distrutto! ${attackerOwner === 'player' ? 'Perdi' : 'Il bot perde'} ${damage} LP.`);
            } else {
                attackerField[attackerIndex] = null;
                defenderField[targetIndex] = null;
                addToLog('💫 Entrambe le carte sono distrutte!');
            }
        } else {
            if (targetSlot.isFaceDown) {
                targetSlot.isFaceDown = false;
                addToLog(`🔎 ${yourPrefix ? 'Il tuo mostro coperto' : 'Il mostro coperto'} era ${target.name}!`);
            }
            if (attacker.attack > target.defense) {
                defenderField[targetIndex] = null;
                addToLog(`🛡️ ${yourPrefix}${target.name} è stato distrutto in Posizione di Difesa!`);
            } else if (attacker.attack < target.defense) {
                const damage = target.defense - attacker.attack;
                applyDamage(attackerOwner, damage);
                addToLog(`🧱 L'attacco ${attackerIsPlayer ? '' : 'del bot '}rimbalza! ${attackerOwner === 'player' ? 'Perdi' : 'Il bot perde'} ${damage} LP.`);
            } else {
                addToLog(`🛡️ L'attacco ${attackerIsPlayer ? '' : 'del bot '}non ha effetto.`);
            }
        }
    }
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
    // setOnTurn ricorda in che turno è stata piazzata: serve al motore
    // effetti (js/duel-engine.js) per applicare la regola classica "una
    // Trappola Set non si può attivare nello stesso turno in cui è stata
    // piazzata".
    gameState.playerSTField[slotIndex] = { card: card, isFaceDown: true, setOnTurn: gameState.turn };
    if (window.MP_broadcast && !window.MP_applyingRemote) {
        window.MP_broadcast({ kind: 'spelltrap', card, slotIndex });
    }
    clearSelection();
}

// ============================================================
// DuelEngineUI — il "ponte" tra js/duel-engine.js (che non sa nulla di
// HTML/DOM) e il modale di attivazione già definito in yugioh_game.html
// (#activateModal). Il motore effetti la richiama in due casi, spiegati
// sopra a ciascuna funzione.
// ============================================================
window.DuelEngineUI = {
    /**
     * Mostra il modale "Attiva la carta?" con Sì/Annulla. Usato sia per
     * l'attivazione volontaria (attemptActivateCard qui sopra) sia da
     * promptDefenderResponse qui sotto per le risposte automatiche del
     * motore (es. "il bot ha attaccato: vuoi attivare Cilindro Magico?").
     */
    openActivateModal(card, { title, text, onConfirm, onCancel }) {
        const modal = document.getElementById('activateModal');
        const preview = document.getElementById('activatePreview');
        if (!modal || !preview) {
            // Nessun modale in pagina (es. una futura pagina senza duello
            // vero): risolviamo attivando direttamente, invece di bloccare.
            onConfirm();
            return;
        }
        document.getElementById('activateModalTitle').textContent = title;
        document.getElementById('activateModalText').textContent = text;
        preview.innerHTML = '';
        const previewCard = createCardElement(card);
        previewCard.classList.add('modal-preview-card');
        preview.appendChild(previewCard);

        modal.classList.add('open');
        const close = () => modal.classList.remove('open');

        document.getElementById('activateConfirmBtn').onclick = () => {
            close();
            onConfirm();
        };
        document.getElementById('activateCancelBtn').onclick = () => {
            close();
            if (onCancel) onCancel();
        };
        modal.onclick = (event) => {
            if (event.target === modal) {
                close();
                if (onCancel) onCancel();
            }
        };
    },

    /**
     * Richiamata da js/duel-engine.js quando è il turno del GIOCATORE
     * UMANO di decidere se rispondere a un evento (attacco dichiarato
     * dal bot, evocazione del bot) con una delle sue carte candidate.
     * `respond(choice|null)` va chiamata esattamente una volta, con la
     * carta scelta o null se il giocatore rinuncia.
     *
     * Semplificazione: se ci fosse più di una carta candidata (nel
     * database attuale non succede mai in pratica), questo prompt ne
     * propone solo la prima — una vera scelta multipla è un'estensione
     * futura di questo stesso file.
     */
    promptDefenderResponse(candidates, respond) {
        const choice = candidates[0];
        this.openActivateModal(choice.card, {
            title: '🛡️ Rispondere?',
            text: `L'avversario ha agito. Vuoi attivare ${choice.card.name} in risposta?`,
            onConfirm: () => respond(choice),
            onCancel: () => respond(null)
        });
    }
};
