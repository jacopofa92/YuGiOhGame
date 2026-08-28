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

    // Se è in corso lo scarto obbligatorio per il limite di mano a fine
    // turno (vedi startHandDiscardSelection più sotto), i click sulle
    // carte in mano servono a selezionare cosa scartare, non ad altro —
    // stesso identico principio della selezione Tributi qui sopra.
    if (gameState.pendingHandDiscard) {
        if (sourceType === 'hand' && sourceOwner === 'player') {
            handleHandDiscardSelectClick(sourceIndex);
        }
        return;
    }

    updateCardInfoPanel(card, { sourceType, sourceOwner, isFaceDown });

    if (sourceType === 'hand' && isMainPhase && card.type === 'spell' && window.DuelEngine && DuelEngine.canActivate('player', 'hand', sourceIndex)) {
        // Magia in mano che si può attivare SUBITO (senza passare dal
        // Terreno): mostra un pulsante "Attiva" appena sopra la carta
        // invece del solo evidenzia-slot. Per piazzarla Coperta si trascina
        // comunque la carta su una casella Magia/Trappola libera (drag &
        // drop, vedi placeDraggedCard) — quella via resta sempre disponibile
        // e non passa da questo popover.
        promptHandSpellActivation(card, sourceIndex);
    } else if (sourceType === 'hand' && isMainPhase && card.type === 'monster' && window.DuelEngine && DuelEngine.canSpecialSummonFromHand('player', sourceIndex)) {
        // Mostro in mano Special Summonabile tramite il proprio effetto
        // (es. Gilasaurus, i mostri Toon che dipendono da "Mondo dei
        // Toon"): offri la scelta tra Evocazione Normale (il vecchio
        // comportamento) e Special Summon, invece di forzare solo l'una o
        // solo l'altra.
        promptHandMonsterSpecialSummon(card, sourceIndex);
    } else if (sourceType === 'hand' && isMainPhase && card.type === 'monster' && window.DuelEngine && DuelEngine.canActivate('player', 'hand', sourceIndex)) {
        // Mostro in mano con un effetto attivabile DALLA MANO che non è
        // uno Special Summon (es. Thunder Dragon, id 537: scartalo per
        // cercarne altre copie nel Deck) — stesso identico spirito di
        // promptHandSpellActivation qui sopra, ma con la scelta
        // "Attiva/Evoca" invece di "Attiva/Set" (un mostro non si mette
        // mai Coperto senza combattere prima una selezione Attacco/Difesa).
        promptHandMonsterActivation(card, sourceIndex);
    } else if (sourceType === 'hand' && isMainPhase) {
        gameState.selectedCard = { type: sourceType, card: card, index: sourceIndex, owner: sourceOwner };
        updateCardInfoPanel(card, { sourceType, sourceOwner, isFaceDown: false });
        // updateUI() PRIMA di highlightEmptySlots(): renderFields() dentro
        // updateUI() ricostruisce da zero gli slot del Terreno, quindi
        // qualunque classe aggiunta PRIMA di quella chiamata sparisce subito
        // — l'evidenziazione va applicata DOPO, sul DOM appena ricostruito.
        updateUI();
        highlightEmptySlots(card);
    } else if (sourceType === 'monster' && sourceOwner === 'player' && isMainPhase) {
        promptMonsterFieldAction(sourceIndex);
    } else if (sourceType === 'st' && sourceOwner === 'player' && isMainPhase) {
        // Click su una propria Magia/Trappola già piazzata: prova ad
        // attivarla di propria iniziativa (vedi js/engine/duel-engine.js per le
        // regole di quando è permesso — es. una Trappola non si può
        // attivare nel turno in cui è stata Set).
        attemptActivateCard('player', 'st', sourceIndex);
    } else if (sourceType === 'field-spell' && sourceOwner === 'player' && isMainPhase) {
        // Click sulla propria Magia Terreno già piazzata: stesso principio
        // di sourceType === 'st' qui sopra, ma sulla sua zona dedicata.
        attemptActivateCard('player', 'fieldSpell', -1);
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
    const card = zone === 'hand' ? gameState.playerHand[index]
        : zone === 'fieldSpell' ? (gameState.playerFieldSpell && gameState.playerFieldSpell.card)
        : gameState.playerSTField[index] && gameState.playerSTField[index].card;
    if (!card) return;

    const def = DuelEngine.getDefinition(card.id);
    if (!def) {
        addToLog(`ℹ️ ${card.name} non ha un effetto attivabile.`);
        return;
    }
    if (typeof def.activate !== 'function') {
        // Carte come Forza Riflessa/Cilindro Magico/Buco Trappola non si
        // attivano mai di propria iniziativa: scattano da sole quando
        // l'avversario attacca o evoca (vedi js/engine/duel-engine.js).
        addToLog(`ℹ️ ${card.name} si attiva automaticamente in risposta a un'azione dell'avversario, non manualmente.`);
        return;
    }
    if (!DuelEngine.canActivate(owner, zone, index)) {
        if (def.continuous && zone === 'st' && !gameState.playerSTField[index].isFaceDown) {
            addToLog(`ℹ️ ${card.name} è già attiva: resta in campo da sola finché non viene rimossa.`);
        } else if (zone === 'fieldSpell' && gameState.playerFieldSpell && !gameState.playerFieldSpell.isFaceDown) {
            addToLog(`ℹ️ ${card.name} è già attiva: resta sul Terreno finché non viene rimossa o sostituita.`);
        } else if (card.type === 'trap' && zone === 'st' && gameState.playerSTField[index].setOnTurn === gameState.turn) {
            addToLog(`❌ ${card.name} non può essere attivata nel turno in cui è stata Set.`);
        } else if (card.type === 'trap' && DuelEngine.areTrapsNegatedFor(owner)) {
            addToLog(`❌ Le Trappole sono negate in questo momento (es. Jinzo in campo).`);
        } else if (card.type === 'spell' && DuelEngine.areSpellsNegatedFor(owner)) {
            addToLog(`❌ Le Magie sono negate in questo momento (es. Cancella Magie in campo).`);
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

    // Il fantasma ruotato (.drag-preview, transform: rotate(3deg) scale(1.05))
    // e l'occultamento della carta vera in mano NON si creano già qui: un
    // semplice click (nessun movimento) passava comunque da qui, quindi si
    // vedeva la carta "scattare" ruotata per un istante anche solo
    // cliccandola — creati invece in handleDragMove, solo quando il
    // movimento supera la soglia che lo qualifica come vero trascinamento
    // (vedi lì sotto).
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

    document.addEventListener('pointermove', handleDragMove);
    document.addEventListener('pointerup', handleDragEnd);
    document.addEventListener('pointercancel', handleDragEnd);
}

/**
 * Crea il "fantasma" della carta trascinata. L'offset che la centra sotto
 * il dito/cursore NON è più un numero fisso (45px/66px): su schermi
 * piccoli, dove la carta in mano è molto più stretta della dimensione per
 * cui quei numeri erano tarati, uno scarto fisso la faceva comparire
 * visibilmente spostata dal punto di contatto reale — tanto più evidente
 * quanto più il dito si spostava (il fantasma "andava fuori asse"). Ora
 * si misura la carta VERA appena creata (stessa larghezza --hand-card-w
 * della mano, vedi .drag-preview in CSS) e la si centra per la sua metà
 * esatta, qualunque sia la dimensione dello schermo.
 */
function createDragPreview(card, x, y) {
    const preview = createCardElement(card);
    preview.classList.add('drag-preview');
    document.body.appendChild(preview);
    const rect = preview.getBoundingClientRect();
    dragState.previewHalfW = rect.width / 2;
    dragState.previewHalfH = rect.height / 2;
    preview.style.left = `${x - dragState.previewHalfW}px`;
    preview.style.top = `${y - dragState.previewHalfH}px`;
    return preview;
}

/**
 * Anima una carta che "vola" dalla sua posizione di partenza (di solito
 * la mano) fino al centro dello slot di destinazione sul Terreno, invece
 * del "pop" istantaneo di prima — usata sia per l'Evocazione/Set via
 * click (dopo aver deciso con il popover Attacco/Difesa o Attiva/Copri)
 * sia via drag & drop. Il chiamante esegue la vera logica di piazzamento
 * (che ricostruisce il DOM tramite updateUI()/clearSelection()) solo
 * DENTRO `onArrive`, così la carta vera compare esattamente quando il suo
 * "fantasma" animato arriva a destinazione — mai due carte visibili
 * insieme, né un vuoto scomodo tra le due.
 * Se `fromEl` non esiste più (es. layout cambiato nel frattempo), esegue
 * `onArrive` subito invece di bloccare il piazzamento per un dettaglio
 * puramente estetico.
 */
function flyCardToSlot(card, fromSource, toEl, onArrive, hideEl, isFaceDown = false, position = 'attack') {
    if (!fromSource || !toEl || typeof createCardElement !== 'function') { onArrive(); return; }
    // fromSource può essere l'elemento DOM della carta in mano (caso
    // normale: click/popover, nessun drag in corso) OPPURE un rettangolo
    // già pronto {left, top, width, height} — quello dove si trovava
    // davvero il fantasma del trascinamento al momento del rilascio (vedi
    // handleDragEnd). Nel secondo caso il volo riparte da lì invece che
    // "tornare indietro" fino alla mano e ripartire da capo, che sembrava
    // un doppio movimento innaturale dopo aver già trascinato la carta a
    // vista fin lì.
    const isElement = typeof fromSource.getBoundingClientRect === 'function';
    const fromRect = isElement ? fromSource.getBoundingClientRect() : fromSource;
    const toRect = toEl.getBoundingClientRect();
    if (fromRect.width === 0 || toRect.width === 0) { onArrive(); return; }

    // Nasconde l'originale finché il fantasma vola al posto suo, altrimenti
    // per ~0.3s si vedrebbero DUE copie della stessa carta insieme (una
    // ferma in mano, una che vola) invece della sensazione "si è mossa
    // lei stessa". L'elemento da nascondere è SEMPRE `hideEl` (la vera
    // carta in mano), se passato dal chiamante — NON per forza fromSource:
    // quando il piazzamento parte da un trascinamento, fromSource è un
    // rettangolo (non un elemento), e handleDragEnd ha già reso di nuovo
    // visibile la carta vera in mano PRIMA di arrivare qui (per non
    // lasciarla invisibile per sempre se il piazzamento viene annullato) —
    // un bug reale corretto qui: senza hideEl esplicito, un piazzamento
    // avviato via drag mostrava la carta ferma in mano E il fantasma che
    // vola insieme, per tutta la durata dell'animazione.
    const elToHide = hideEl || (isElement ? fromSource : null);
    if (elToHide) elToHide.style.visibility = 'hidden';

    // Il fantasma deve già avere l'aspetto FINALE (coperto e/o ruotato in
    // Difesa) fin dal primo fotogramma, non quello scoperto/verticale di
    // default: altrimenti si vedrebbe volare una carta scoperta in
    // Attacco che poi "scatta" coperta in Difesa solo all'arrivo — proprio
    // il difetto segnalato. createCardElement (card-renderer.js) applica
    // già la classe .defense-pos (rotate(90deg) via CSS, vedi
    // yugioh_game.html) quando position è 'defense'.
    const ghost = createCardElement(card, isFaceDown, position);
    ghost.classList.add('card-fly-ghost');
    Object.assign(ghost.style, {
        position: 'fixed',
        left: `${fromRect.left}px`,
        top: `${fromRect.top}px`,
        width: `${fromRect.width}px`,
        height: `${fromRect.height}px`,
        margin: '0',
        zIndex: '9500',
        pointerEvents: 'none',
        transition: 'left 0.32s cubic-bezier(0.22, 0.61, 0.36, 1), top 0.32s cubic-bezier(0.22, 0.61, 0.36, 1), width 0.32s cubic-bezier(0.22, 0.61, 0.36, 1), height 0.32s cubic-bezier(0.22, 0.61, 0.36, 1), transform 0.32s ease'
    });
    document.body.appendChild(ghost);
    // Forza il reflow prima di cambiare le proprietà animate, altrimenti
    // il browser le applicherebbe insieme al posizionamento iniziale,
    // senza transizione (nessun "salto" da animare).
    void ghost.offsetWidth;
    ghost.style.left = `${toRect.left}px`;
    ghost.style.top = `${toRect.top}px`;
    ghost.style.width = `${toRect.width}px`;
    ghost.style.height = `${toRect.height}px`;
    // Il leggero "tilt" di volo è impostato via style INLINE, quindi
    // sovrascriverebbe del tutto la rotate(90deg) di .defense-pos (uno
    // style inline vince sempre su una classe, qualunque specificità) se
    // non venisse sommato qui apposta.
    ghost.style.transform = position === 'defense' ? 'rotate(92deg)' : 'rotate(2deg)';

    let done = false;
    const finish = () => {
        if (done) return;
        done = true;
        ghost.remove();
        onArrive();
    };
    ghost.addEventListener('transitionend', finish, { once: true });
    // Rete di sicurezza se transitionend non scattasse mai (es. tab in
    // background che mette in pausa le animazioni): non deve bloccare il
    // piazzamento della carta per sempre.
    setTimeout(finish, 380);
}

function handleDragMove(event) {
    if (!dragState) return;
    if (dragState.type !== 'hand') return;

    const dx = event.clientX - dragState.startX;
    const dy = event.clientY - dragState.startY;
    if (!dragState.moved && Math.hypot(dx, dy) > 8) {
        dragState.moved = true;
        // Il vero trascinamento inizia SOLO ora: crea il fantasma ruotato e
        // nasconde la carta vera in mano, così un semplice click (che non
        // supera mai questa soglia) non li mostra mai neanche per un
        // istante — vedi la nota in startHandCardDrag.
        if (dragState.sourceEl) {
            dragState.sourceEl.classList.add('dragging-source');
        }
        const preview = createDragPreview(dragState.card, event.clientX, event.clientY);
        dragState.previewEl = preview;
    }

    if (dragState.previewEl) {
        dragState.previewEl.style.left = `${event.clientX - dragState.previewHalfW}px`;
        dragState.previewEl.style.top = `${event.clientY - dragState.previewHalfH}px`;
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
        // Rettangolo del fantasma esattamente dov'era al momento del
        // rilascio, PRIMA di rimuoverlo: è il punto di partenza che
        // l'eventuale animazione di volo verso lo slot userà al posto
        // della mano (vedi flyCardToSlot) — così, se si è trascinata la
        // carta fin qui, il movimento prosegue da lì invece di "tornare
        // indietro" e ripartire dalla mano.
        const releaseRect = (moved && dragState.previewEl)
            ? dragState.previewEl.getBoundingClientRect()
            : null;
        if (dragState.previewEl) {
            dragState.previewEl.remove();
        }
        // La carta originale in mano è stata resa invisibile (.dragging-source,
        // vedi startHandCardDrag) per non vederne due copie mentre il
        // fantasma segue il puntatore. Il trascinamento/click è comunque
        // finito ORA: va resa visibile di nuovo qui, incondizionatamente —
        // altrimenti un ramo che non richiama subito updateUI() (es. il
        // popover "Attiva/Copri" di una Magia, se lo si annulla invece di
        // scegliere) la lascerebbe invisibile a tempo indeterminato, come se
        // la carta fosse sparita, finché un'azione qualunque successiva non
        // ricostruisce la mano da zero. Se il piazzamento vero riparte da
        // qui (flyCardToSlot), quella funzione la nasconde di nuovo da sola
        // con uno stile inline indipendente da questa classe.
        if (dragState.sourceEl) {
            dragState.sourceEl.classList.remove('dragging-source');
        }

        if (moved && dropTarget) {
            const owner = dropTarget.dataset.owner;
            const type = dropTarget.dataset.type;
            const index = parseInt(dropTarget.dataset.index, 10);
            const isFieldSpellCard = dragState.card.type === 'spell' && dragState.card.subtype === 'field';
            if (owner === 'player' && (
                (dragState.card.type === 'monster' && type === 'monster') ||
                (isFieldSpellCard && type === 'field-spell') ||
                (!isFieldSpellCard && (dragState.card.type === 'spell' || dragState.card.type === 'trap') && type === 'st')
            )) {
                placeDraggedCard(dragState.card, dragState.sourceIndex, owner, type, index, releaseRect);
            } else {
                handleCardClick(dragState.card, 'hand', dragState.sourceIndex, dragState.sourceOwner);
            }
        } else {
            handleCardClick(dragState.card, 'hand', dragState.sourceIndex, dragState.sourceOwner);
        }
    }

    dragState = null;
}

function placeDraggedCard(card, sourceIndex, owner, type, index, fromRect) {
    if (card.type === 'monster' && type === 'monster') {
        attemptMonsterSummon(card, sourceIndex, index, fromRect);
    } else if (card.type === 'spell' && card.subtype === 'field' && type === 'field-spell') {
        setFieldSpell(card, sourceIndex, fromRect);
    } else if ((card.type === 'spell' || card.type === 'trap') && type === 'st') {
        setSpellTrap(card, index, sourceIndex, fromRect);
    }
}

function handleSlotClick(owner, type, index) {
    if (gameState.pendingTributeSummon) return;
    if (gameState.pendingHandDiscard) return;
    // Zona Magia Terreno: se non c'è una selezione di mano in corso, il
    // click serve solo ad attivare l'eventuale Magia Terreno già piazzata
    // (gestito da handleCardClick sopra tramite sourceType 'field-spell',
    // non da qui) — qui serve solo per il piazzamento di una NUOVA carta.
    updateCardInfoPanel(null, { sourceType: 'deck' });
    const { card: selectedCard, type: selectedType, index: selectedIndex } = gameState.selectedCard;
    if (!selectedCard || selectedType !== 'hand') return;
    const isMainPhase = gameState.phase === 'main1' || gameState.phase === 'main2';
    if (!isMainPhase || owner !== 'player') return;

    if (selectedCard.type === 'monster' && type === 'monster') {
        attemptMonsterSummon(selectedCard, selectedIndex, index);
    } else if (selectedCard.type === 'spell' && selectedCard.subtype === 'field' && type === 'field-spell') {
        setFieldSpell(selectedCard, selectedIndex);
    } else if ((selectedCard.type === 'spell' || selectedCard.type === 'trap') && selectedCard.subtype !== 'field' && type === 'st') {
        // Una Magia Terreno NON può finire in una delle 5 caselle comuni:
        // esclusa qui esplicitamente, va sempre e solo nella sua zona
        // dedicata (ramo qui sopra) — altrimenti questo controllo, basato
        // solo su card.type, l'avrebbe accettata anche su una casella 'st'.
        setSpellTrap(selectedCard, index, selectedIndex);
    }
}

/**
 * Punto d'ingresso unico per l'Evocazione di un mostro dalla mano, sia via
 * click sia via drag & drop. Decide se serve un'Evocazione Tributo in base
 * al Livello della carta e avvia il flusso corretto.
 */
function attemptMonsterSummon(card, handIndex, slotIndex, fromRect) {
    // Bug reale corretto qui: il drag & drop (handleDragEnd, più sotto in
    // questo file) risolve la casella bersaglio con
    // document.elementFromPoint(...).closest('.field-slot'), che trova la
    // casella anche se è già occupata da un ALTRO mostro (il percorso via
    // click, invece, intercetta le caselle occupate PRIMA di arrivare qui,
    // vedi lo stopPropagation su ogni carta in campo, game-flow.js) — senza
    // questo controllo, trascinare una carta della mano su una casella
    // Mostro già occupata la sovrascriveva silenziosamente in
    // summonMonster() più sotto, senza mandare al Cimitero il mostro che
    // c'era prima: semplicemente spariva. Controllato qui, all'inizio di
    // TUTTO il flusso (Evocazione Normale e Tributo condividono questo
    // stesso punto d'ingresso), prima ancora di aprire la selezione dei
    // Tributi: se il giocatore trascina su una casella occupata, l'unico
    // caso legittimo è che quella stessa carta sia POI scelta come
    // Tributo — ma qui non lo sappiamo ancora (la selezione dei Tributi
    // avviene dopo), quindi rifiutiamo sempre e chiediamo di scegliere
    // una casella libera, coerente con l'esperienza reale del gioco (non
    // si può mai "atterrare" su una carta già in campo).
    if (gameState.playerMonsterField[slotIndex]) {
        addToLog('❌ Quella casella Mostro è già occupata: scegline una libera.');
        clearSelection();
        return;
    }
    if (gameState.hasNormalSummoned) {
        addToLog('❌ Hai già effettuato un\'Evocazione Normale in questo turno.');
        clearSelection();
        return;
    }
    // Le carte dell'Extra Deck (Fusione/Rituale, card.extraDeck === true —
    // es. Drago Bianco Definitivo id 29) non possono MAI essere Evocate
    // Normalmente/Tributo, solo Special Summonate con la procedura
    // giusta (Fusione/Rituale). In una partita vera non capiterebbe mai
    // (getRandomDrawPool le esclude già dal mazzo pescabile, vedi
    // js/data/cards-db.js), ma la Demo Duello Sandbox permette di
    // piazzare QUALSIASI carta in mano per testare scenari — senza
    // questo controllo il flusso di Evocazione Tributo generico le
    // accetterebbe comunque in base al solo Livello, un errore di
    // regole vero e proprio scoperto proprio grazie al sandbox.
    if (card.extraDeck) {
        addToLog(`❌ ${card.name} è una carta dell'Extra Deck: non può essere Evocata Normalmente, solo Special Summonata (es. Fusione).`);
        clearSelection();
        return;
    }
    // "Non può essere Evocata a meno che tu non controlli scoperta
    // [un'altra carta specifica]" (def.requiresFieldPresenceId — es.
    // Guardiano Grarl id 284, richiede Ascia di Gravità - Grarl id 277;
    // Guardiano Kay'est id 285, richiede Bastone del Silenzio - Kay'est
    // id 423). Stesso controllo lato IA in AI_SHARED.canNormalSummonNow
    // (js/ai/ai-shared.js), PRIMA di provare a Evocarla.
    const summonDef = window.DuelEngine && DuelEngine.getDefinition(card.id);
    if (summonDef && summonDef.requiresFieldPresenceId) {
        const requiredCard = cardDatabase.find((c) => c.id === summonDef.requiresFieldPresenceId);
        // La carta richiesta può essere sia un mostro (zona Mostro) sia
        // una Magia/Trappola (es. una Carta Equipaggiamento come Ascia di
        // Gravità - Grarl, id 277 — vive nella zona Magia/Trappola, non
        // in quella Mostro): controlla entrambe le zone.
        const hasRequired = gameState.playerMonsterField.some((s) => s && !s.isFaceDown && s.card.id === summonDef.requiresFieldPresenceId)
            || gameState.playerSTField.some((s) => s && !s.isFaceDown && s.card.id === summonDef.requiresFieldPresenceId);
        if (!hasRequired) {
            addToLog(`❌ ${card.name} non può essere Evocata: serve "${requiredCard ? requiredCard.name : '???'}" scoperta sul Terreno.`);
            clearSelection();
            return;
        }
    }

    // Gaia il Cavaliere Feroce Rapido (id 711): Evocabile senza Sacrificio
    // se è l'unica carta nella mano del giocatore — un'eccezione puntuale
    // al calcolo standard dei Tributi (getTributesRequired non ha
    // accesso al contesto della mano, quindi il controllo va qui).
    const noTributeException = card.id === 711 && gameState.playerHand.length === 1;
    const tributesNeeded = noTributeException ? 0 : getTributesRequired(card);

    if (tributesNeeded === 0) {
        openSummonModal(card, slotIndex, handIndex, fromRect);
        return;
    }

    // Maschera della Restrizione (id 371, gameState.tributesBlocked):
    // nessun giocatore può sacrificare carte — un'Evocazione Tributo non
    // può nemmeno iniziare finché resta attiva.
    if (gameState.tributesBlocked) {
        addToLog(`❌ Maschera della Restrizione impedisce di sacrificare mostri: non puoi Evocare Tributo ${card.name}.`);
        clearSelection();
        return;
    }

    // Il valore MASSIMO possibile va calcolato pesato (getTributeValue), non
    // come semplice conteggio di mostri: con un solo Cavaliere Marino
    // Kaiser in campo (che vale 2 per un'Evocazione Tributo LUCE) questo
    // controllo bloccherebbe l'Evocazione anche se in realtà è già
    // legale — un vero mostro fisico basta comunque da solo.
    // Fuoco Fatuo (id 684): "non può essere sacrificata per un'Evocazione
    // Tributo" mentre scoperta — esclusa dal conteggio del valore
    // massimo disponibile, non solo dalla selezione manuale qui sotto,
    // altrimenti il pre-check potrebbe dare il via libera a
    // un'Evocazione Tributo che poi non si può mai completare.
    const maxAvailableValue = gameState.playerMonsterField.reduce((sum, slot) => {
        if (!slot) return sum;
        const slotDef = DuelEngine.getDefinition(slot.card.id);
        if (!slot.isFaceDown && slotDef && slotDef.cannotBeTributed) return sum;
        return sum + getTributeValue(slot.card, card);
    }, 0);
    if (maxAvailableValue < tributesNeeded) {
        addToLog(`❌ ${card.name} (Lv. ${card.level}) richiede ${tributesNeeded} Tribut${tributesNeeded > 1 ? 'i' : 'o'}: non hai abbastanza mostri sul Terreno.`);
        clearSelection();
        return;
    }

    startTributeSelection(card, slotIndex, handIndex, tributesNeeded, fromRect);
}

/**
 * Promemoria "Seleziona N mostri da Sacrificare" — una banda fissa in
 * alto allo schermo, non solo una riga nel log (che di default è
 * chiuso ed è facile non notare). Resta visibile finché la selezione
 * non è completa o annullata.
 */
function showTributePrompt(cardName, tributesNeeded, selectedCount) {
    const el = document.getElementById('tributePrompt');
    if (!el) return;
    document.getElementById('tributePromptText').textContent =
        `Seleziona ${tributesNeeded} mostr${tributesNeeded > 1 ? 'i' : 'o'} da Sacrificare per evocare ${cardName}`;
    document.getElementById('tributePromptCount').textContent = `${selectedCount}/${tributesNeeded}`;
    el.classList.add('show');
}

function updateTributePromptCount(selectedCount, tributesNeeded) {
    const el = document.getElementById('tributePromptCount');
    if (el) el.textContent = `${selectedCount}/${tributesNeeded}`;
}

function hideTributePrompt() {
    const el = document.getElementById('tributePrompt');
    if (el) el.classList.remove('show');
}

/**
 * Avvia la modalità di selezione dei Tributi: evidenzia i mostri del
 * giocatore che possono essere sacrificati e attende i click.
 */
function startTributeSelection(card, slotIndex, handIndex, tributesNeeded, fromRect) {
    document.querySelectorAll('.action-highlight, .selected').forEach(el => el.classList.remove('action-highlight', 'selected'));
    gameState.selectedCard = { type: null, card: null, index: -1 };
    gameState.pendingTributeSummon = { card, slotIndex, handIndex, tributesNeeded, selected: [], fromRect };
    addToLog(`🔺 ${card.name} richiede ${tributesNeeded} Tribut${tributesNeeded > 1 ? 'i' : 'o'}. Seleziona i mostri da Sacrificare sul tuo Terreno.`);
    showTributePrompt(card.name, tributesNeeded, 0);
    updateCardInfoPanel(card, { sourceType: 'hand', sourceOwner: 'player', isFaceDown: false });
    updateUI();
}

/**
 * Somma pesata dei mostri già selezionati per il Sacrificio: normalmente
 * ogni mostro vale 1, ma alcune carte (vedi getTributeValue/
 * DOUBLE_TRIBUTE_CARDS in js/data/cards-db.js, es. Cavaliere Marino
 * Kaiser) ne valgono 2 quando il mostro evocato ha l'Attributo giusto —
 * ricalcolata da zero ad ogni click invece di un contatore incrementale,
 * più semplice da tenere corretta togliendo/riaggiungendo selezioni.
 */
function tributeSelectionValue(pending) {
    return pending.selected.reduce((sum, idx) => {
        const slot = gameState.playerMonsterField[idx];
        return sum + (slot ? getTributeValue(slot.card, pending.card) : 1);
    }, 0);
}

function handleTributeSelectClick(index) {
    const pending = gameState.pendingTributeSummon;
    if (!pending) return;
    const slot = gameState.playerMonsterField[index];
    if (!slot) return;

    // Fuoco Fatuo (id 684): "non può essere sacrificata per
    // un'Evocazione Tributo" mentre scoperta sul Terreno.
    if (!slot.isFaceDown) {
        const slotDef = DuelEngine.getDefinition(slot.card.id);
        if (slotDef && slotDef.cannotBeTributed && !pending.selected.includes(index)) {
            addToLog(`🚫 ${slot.card.name} non può essere sacrificata per un'Evocazione Tributo.`);
            return;
        }
    }

    const el = document.querySelector(`#playerFieldBoard .field-slot[data-owner="player"][data-type="monster"][data-index="${index}"]`);

    if (pending.selected.includes(index)) {
        pending.selected = pending.selected.filter(i => i !== index);
        if (el) el.classList.remove('tribute-selected');
        updateTributePromptCount(tributeSelectionValue(pending), pending.tributesNeeded);
        return;
    }

    if (tributeSelectionValue(pending) >= pending.tributesNeeded) return;
    pending.selected.push(index);
    if (el) el.classList.add('tribute-selected');
    const newValue = tributeSelectionValue(pending);
    updateTributePromptCount(newValue, pending.tributesNeeded);

    if (newValue >= pending.tributesNeeded) {
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
    hideTributePrompt();

    addToLog('🔻 Sacrificio in corso...');
    if (window.SFX) SFX.tribute();
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

        const { card, slotIndex, handIndex, fromRect } = pending;
        gameState.pendingTributeSummon = null;
        openSummonModal(card, slotIndex, handIndex, fromRect);
    }, 700);
}

// ============================================================
// Limite di 6 carte in mano a fine turno (regole.html, Capitolo 2/3):
// enterEndPhase() in js/engine/game-flow.js chiama startHandDiscardSelection()
// quando la mano del giocatore supera il limite — stesso "seleziona finché
// il conto torna, poi scatta da sola" di startTributeSelection() qui
// sopra, ma sulla propria MANO invece che sul proprio Terreno.
// ============================================================
const MAX_HAND_SIZE = 6;

function showHandDiscardPrompt(needed, selectedCount) {
    const el = document.getElementById('handDiscardPrompt');
    if (!el) return;
    document.getElementById('handDiscardPromptText').textContent =
        `Hai più di ${MAX_HAND_SIZE} carte in mano: scarta ${needed} cart${needed > 1 ? 'e' : 'a'}`;
    document.getElementById('handDiscardPromptCount').textContent = `${selectedCount}/${needed}`;
    el.classList.add('show');
}

function updateHandDiscardPromptCount(selectedCount, needed) {
    const el = document.getElementById('handDiscardPromptCount');
    if (el) el.textContent = `${selectedCount}/${needed}`;
}

function hideHandDiscardPrompt() {
    const el = document.getElementById('handDiscardPrompt');
    if (el) el.classList.remove('show');
}

/**
 * Avvia la selezione obbligatoria: `onComplete` viene richiamata a scarto
 * finito, così enterEndPhase() (che l'ha messa in pausa proprio per questo)
 * sa quando può far ripartire il timer che cambia turno.
 */
function startHandDiscardSelection(excess, onComplete) {
    document.querySelectorAll('.action-highlight, .selected').forEach(el => el.classList.remove('action-highlight', 'selected'));
    gameState.pendingHandDiscard = { needed: excess, selected: [], onComplete };
    addToLog(`🗑️ Hai più di ${MAX_HAND_SIZE} carte in mano: scegli ${excess} cart${excess > 1 ? 'e' : 'a'} da scartare.`);
    showHandDiscardPrompt(excess, 0);
    updateCardInfoPanel(null);
    updateUI();
}

function handleHandDiscardSelectClick(handIndex) {
    const pending = gameState.pendingHandDiscard;
    if (!pending) return;
    const card = gameState.playerHand[handIndex];
    if (!card) return;

    const cardEl = document.querySelectorAll('#playerHand .card')[handIndex];

    if (pending.selected.includes(handIndex)) {
        pending.selected = pending.selected.filter((i) => i !== handIndex);
        if (cardEl) cardEl.classList.remove('selected');
        updateHandDiscardPromptCount(pending.selected.length, pending.needed);
        return;
    }

    if (pending.selected.length >= pending.needed) return;
    pending.selected.push(handIndex);
    if (cardEl) cardEl.classList.add('selected');
    updateHandDiscardPromptCount(pending.selected.length, pending.needed);

    if (pending.selected.length === pending.needed) {
        performHandDiscard();
    }
}

function performHandDiscard() {
    const pending = gameState.pendingHandDiscard;
    if (!pending) return;
    hideHandDiscardPrompt();

    // Dagli indici più alti ai più bassi: rimuovere prima un indice basso
    // sposterebbe (di uno) gli indici più alti già raccolti in `selected`,
    // facendo scartare la carta sbagliata.
    const indices = [...pending.selected].sort((a, b) => b - a);
    const discardedNames = [];
    indices.forEach((idx) => {
        const card = gameState.playerHand[idx];
        if (!card) return;
        gameState.playerHand.splice(idx, 1);
        gameState.playerGraveyard.push(card);
        discardedNames.push(card.name);
    });
    addToLog(`🗑️ Hai scartato: ${discardedNames.join(', ')}.`);
    if (window.SFX) SFX.place();

    gameState.pendingHandDiscard = null;
    updateUI();

    if (typeof pending.onComplete === 'function') pending.onComplete();
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
function openQuickPopover(anchorEl, innerHTML, { onDismiss, dismissible = true } = {}) {
    closeQuickPopover();

    const catcher = document.createElement('div');
    catcher.className = 'quick-popover-catcher';
    catcher.id = 'quickPopoverCatcher';

    const pop = document.createElement('div');
    pop.className = 'quick-popover';
    pop.id = 'quickPopover';
    pop.innerHTML = innerHTML;
    // Sostituisce ogni <span data-icon="..."> col vero SVG a tema (vedi
    // js/ui/icon-library.js) PRIMA della misura qui sotto, altrimenti
    // popRect userebbe ancora la dimensione del segnaposto vuoto.
    if (window.Icons) Icons.hydrate(pop);

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
        // dismissible:false = scelta obbligatoria (es. Attacco/Difesa dopo
        // un Tributo già pagato — i mostri sacrificati sono già nel
        // Cimitero, non c'è modo di "annullare" a quel punto senza perderli
        // per niente): un click fuori dal popover viene ignorato invece di
        // chiuderlo, così l'unica via d'uscita resta un pulsante vero.
        if (!dismissible) return;
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

function openSummonModal(card, slotIndex, handIndex, fromRect) {
    if (card.type === 'monster' && gameState.hasNormalSummoned) {
        addToLog('❌ Hai già effettuato un\'Evocazione Normale in questo turno.');
        return;
    }

    gameState.pendingSummon = { card, slotIndex, handIndex, fromRect };
    const slotEl = document.querySelector(`.field-slot[data-owner="player"][data-type="monster"][data-index="${slotIndex}"]`);
    const tributesNeeded = getTributesRequired(card);
    const title = tributesNeeded > 0
        ? `Tributo completato (${tributesNeeded}). Attacco o Difesa?`
        : `${card.name}: Attacco o Difesa?`;

    // Se sono già stati pagati dei Tributi, i mostri sacrificati sono GIÀ
    // nel Cimitero (performTributeSacrifice() li rimuove dal Terreno prima
    // ancora di aprire questo popover) — a quel punto non esiste un
    // "annulla" che abbia senso: nelle regole vere, una volta pagato il
    // Tributo l'Evocazione va completata per forza. Per questo qui sotto
    // NON mostriamo il pulsante Annulla e il popover non si chiude
    // cliccando fuori (dismissible:false) — l'unica uscita resta scegliere
    // Attacco o Difesa. Un'Evocazione SENZA Tributo invece non ha ancora
    // pagato nulla: lì annullare resta sicuro, comportamento invariato.
    const canCancel = tributesNeeded === 0;

    // Lo slot scelto resta "in attesa" (bordo che pulsa) finché non si
    // sceglie Attacco/Difesa (o si annulla, se possibile) — si vede subito
    // QUALE slot sta aspettando una decisione, utile soprattutto se il
    // popover finisce vicino ad altri slot vuoti.
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
            <button type="button" class="quick-popover-btn attack icon-round" id="qpSummonAttack" title="Scoperta in Attacco"><span data-icon="attackPos"></span></button>
            <button type="button" class="quick-popover-btn defense icon-round" id="qpSummonDefense" title="Coperta in Difesa"><span data-icon="defensePos"></span></button>
            ${canCancel ? '<button type="button" class="quick-popover-btn cancel icon-round" id="qpSummonCancel" title="Annulla">✖</button>' : ''}
        </div>
    `, { onDismiss: canCancel ? cancelSummon : undefined, dismissible: canCancel });

    pop.querySelector('#qpSummonAttack').onclick = () => {
        closeQuickPopover();
        clearPendingVisual();
        summonMonster(card, slotIndex, 'attack', handIndex, gameState.pendingSummon && gameState.pendingSummon.fromRect);
    };
    pop.querySelector('#qpSummonDefense').onclick = () => {
        closeQuickPopover();
        clearPendingVisual();
        summonMonster(card, slotIndex, 'defense', handIndex, gameState.pendingSummon && gameState.pendingSummon.fromRect);
    };
    const cancelBtn = pop.querySelector('#qpSummonCancel');
    if (cancelBtn) {
        cancelBtn.onclick = () => {
            closeQuickPopover();
            cancelSummon();
        };
    }
}

function clearSelection() {
    gameState.selectedCard = { type: null, card: null, index: -1 };
    gameState.pendingTributeSummon = null;
    hideTributePrompt();
    document.querySelectorAll('.action-highlight, .selected, .tribute-highlight, .tribute-selected').forEach(el => el.classList.remove('action-highlight', 'selected', 'tribute-highlight', 'tribute-selected'));
    updateCardInfoPanel(null);
    updateUI();
}

/**
 * Evidenzia le caselle libere che possono ricevere la carta selezionata.
 * Una Magia Terreno (card.subtype === 'field') ha una zona tutta sua,
 * separata dalle 5 caselle Magia/Trappola comuni — vedi setFieldSpell più
 * sotto — quindi evidenzia SOLO quella (anche se già occupata: attivarne
 * una nuova sostituisce quella vecchia, come da regola vera), non le 5
 * caselle st.
 */
function highlightEmptySlots(card) {
    if (card.type === 'spell' && card.subtype === 'field') {
        const el = document.querySelector('.field-slot[data-owner="player"][data-type="field-spell"]');
        if (el) el.classList.add('action-highlight');
        return;
    }
    const targetField = card.type === 'monster' ? gameState.playerMonsterField : gameState.playerSTField;
    const targetType = card.type === 'monster' ? 'monster' : 'st';
    targetField.forEach((slot, index) => {
        if (!slot) {
            document.querySelector(`.field-slot[data-owner="player"][data-type="${targetType}"][data-index="${index}"]`).classList.add('action-highlight');
        }
    });
}

function summonMonster(card, slotIndex, position, handIndex = gameState.selectedCard.index, fromRect = null) {
    if (gameState.hasNormalSummoned) {
        addToLog('❌ Hai già effettuato un\'Evocazione Normale in questo turno.');
        return;
    }
    // Luce dell'Intervento (id 634, gameState.monsterSetBlocked): ogni Set
    // deve avvenire scoperto — la Posizione (Difesa) resta quella scelta,
    // solo la carta non risulta più coperta (isFaceDown), come da testo
    // reale della carta ("deve invece essere Evocata Normalmente scoperta
    // in Posizione di Difesa").
    let forceFaceUp = false;
    if (position === 'defense' && gameState.monsterSetBlocked) {
        forceFaceUp = true;
        addToLog('☀️ Luce dell\'Intervento impedisce il Set: evocato scoperto in Posizione di Difesa!');
    }
    // "Non può essere Posizionato Normalmente" (es. i 3 Dei Egizi id
    // 30/31/472): stesso trattamento di forceFaceUp qui sopra, ma
    // per-CARTA invece che globale — la Posizione (Difesa) scelta resta
    // valida, solo non può restare coperta.
    if (position === 'defense' && !forceFaceUp) {
        const cardDef = window.DuelEngine && DuelEngine.getDefinition(card.id);
        if (cardDef && cardDef.cannotBeSet) {
            forceFaceUp = true;
            addToLog(`🚫 ${card.name} non può essere Settata: Evocata scoperta in Posizione di Difesa!`);
        }
    }
    const isFaceDown = position === 'defense' && !forceFaceUp;
    const handEl = document.querySelectorAll('#playerHand .card')[handIndex] || null;
    const slotEl = document.querySelector(`.field-slot[data-owner="player"][data-type="monster"][data-index="${slotIndex}"]`);
    flyCardToSlot(card, fromRect || handEl, slotEl, () => {
        const usedTribute = getTributesRequired(card) > 0;
        gameState.playerHand.splice(handIndex, 1);
        gameState.playerMonsterField[slotIndex] = { card: card, position: position, isFaceDown: isFaceDown, hasAttacked: false, canChangePosition: false, summonedOnTurn: gameState.turn };
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
                const cardEl = document.querySelector(`#playerFieldBoard .field-slot[data-type="monster"][data-index="${slotIndex}"] .card`);
                FX.playMonsterSummonEffect(card, cardEl);
            }
            // Effetto audio DEDICATO per questa carta (audio/evocazioni/<id>.mp3
            // — vedi js/audio/audio-library.js), se esiste; altrimenti il suono
            // di Evocazione standard di sempre.
            if (!(window.AudioLibrary && AudioLibrary.tryPlayCardSound(card, 'evocazioni'))) {
                if (window.SFX) SFX.summon(position);
            }
        }, 30);

        // Finestra per un'eventuale risposta dell'avversario (es. Buco
        // Trappola) — vedi js/engine/duel-engine.js. È "fire and forget": se la
        // risposta distrugge il mostro appena Evocato, updateUI() nella
        // callback lo riflette subito a schermo.
        const summonCtx = DuelEngine.makeContext('player', { summonedCard: card, summonedSlotIndex: slotIndex, summonedPosition: position });
        DuelEngine.fireTrigger(DuelEngine.TRIGGER.ON_NORMAL_SUMMON, summonCtx, () => updateUI());
    }, handEl, isFaceDown, position);
}

/**
 * Chiede conferma, con lo stesso popover leggero non invasivo usato per
 * l'Evocazione, prima di agire su un proprio mostro già in campo: cambiare
 * Posizione e/o attivare il suo effetto Ignition (es. Soldato Cannone),
 * se ne ha uno e non è già stato usato in questo turno — vedi il ramo
 * zone === 'monster' di DuelEngine.canActivate/activateCard in
 * duel-engine.js. Mostra solo i pulsanti davvero disponibili in questo
 * momento; se non ce n'è nessuno, non apre nulla (click a vuoto).
 */
function promptMonsterFieldAction(slotIndex) {
    const monsterSlot = gameState.playerMonsterField[slotIndex];
    if (!monsterSlot) return;
    const canChangePos = monsterSlot.canChangePosition;
    const canActivateEffect = window.DuelEngine && DuelEngine.canActivate('player', 'monster', slotIndex);
    if (!canChangePos && !canActivateEffect) return;

    const goingToDefense = monsterSlot.position === 'attack';
    const slotEl = document.querySelector(`.field-slot[data-owner="player"][data-type="monster"][data-index="${slotIndex}"]`);

    // Nessun box con la domanda: solo pulsanti tondi — l'icona della nuova
    // posizione (spada/scudo a tema, vedi js/ui/icon-library.js) e/o ✨ per
    // l'effetto, più l'annulla — si capisce già dall'icona cosa si sta per
    // fare, senza bisogno di ripeterlo a parole.
    const buttons = [];
    if (canChangePos) {
        buttons.push(`<button type="button" class="quick-popover-btn ${goingToDefense ? 'defense' : 'attack'} icon-round" id="qpPosConfirm" title="Cambia Posizione"><span data-icon="${goingToDefense ? 'defensePos' : 'attackPos'}"></span></button>`);
    }
    if (canActivateEffect) {
        buttons.push(`<button type="button" class="quick-popover-btn confirm icon-round" id="qpMonsterActivate" title="Attiva Effetto">✨</button>`);
    }
    buttons.push(`<button type="button" class="quick-popover-btn cancel icon-round" id="qpPosCancel" title="Annulla">✖</button>`);

    const pop = openQuickPopover(slotEl, `
        <div class="quick-popover-actions">${buttons.join('')}</div>
    `);

    if (canChangePos) {
        pop.querySelector('#qpPosConfirm').onclick = () => {
            closeQuickPopover();
            changeMonsterPosition(slotIndex);
        };
    }
    if (canActivateEffect) {
        pop.querySelector('#qpMonsterActivate').onclick = () => {
            closeQuickPopover();
            DuelEngine.activateCard('player', 'monster', slotIndex);
        };
    }
    pop.querySelector('#qpPosCancel').onclick = () => closeQuickPopover();
}

/**
 * Popover mostrato al click su una Magia in mano il cui effetto si può
 * attivare SUBITO (vedi handleCardClick sopra, che ha già verificato
 * DuelEngine.canActivate('player','hand',...)): un solo pulsante "Attiva",
 * che risolve l'effetto subito (la carta va al Cimitero — o resta scoperta
 * sul Terreno se è una Continua, vedi js/engine/duel-engine.js). Per
 * piazzarla Coperta invece di attivarla si trascina la carta su una
 * casella Magia/Trappola libera (drag & drop, vedi placeDraggedCard): un
 * percorso indipendente da questo popover, niente pulsante "Copri" qui.
 */
function promptHandSpellActivation(card, handIndex) {
    const anchorEl = document.querySelectorAll('#playerHand .card')[handIndex] || null;

    const pop = openQuickPopover(anchorEl, `
        <div class="quick-popover-title">${card.name}</div>
        <div class="quick-popover-actions">
            <button type="button" class="quick-popover-btn attack icon-round" id="qpSpellActivate" title="Attiva subito">✨</button>
            <button type="button" class="quick-popover-btn cancel icon-round" id="qpSpellCancel" title="Annulla">✖</button>
        </div>
    `);

    pop.querySelector('#qpSpellActivate').onclick = () => {
        closeQuickPopover();
        DuelEngine.activateCard('player', 'hand', handIndex);
    };
    pop.querySelector('#qpSpellCancel').onclick = () => closeQuickPopover();
}

/**
 * Come promptHandSpellActivation qui sopra, ma per un MOSTRO in mano il
 * cui effetto si attiva DALLA MANO senza essere uno Special Summon (es.
 * Thunder Dragon, id 537: scartalo per cercare fino a 2 copie nel Deck) —
 * offre la scelta tra attivare quell'effetto (la carta si scarta da sola,
 * gestito da activateCard() in duel-engine.js) e selezionarla per
 * un'Evocazione normale come qualunque altro mostro.
 */
function promptHandMonsterActivation(card, handIndex) {
    const anchorEl = document.querySelectorAll('#playerHand .card')[handIndex] || null;

    const pop = openQuickPopover(anchorEl, `
        <div class="quick-popover-title">${card.name}</div>
        <div class="quick-popover-actions">
            <button type="button" class="quick-popover-btn attack icon-round" id="qpMonsterActivateEffect" title="Attiva l'effetto (scarta questa carta)">✨</button>
            <button type="button" class="quick-popover-btn defense icon-round" id="qpMonsterSelectNormal" title="Seleziona per Evocarla">🂠</button>
            <button type="button" class="quick-popover-btn cancel icon-round" id="qpMonsterActivateCancel" title="Annulla">✖</button>
        </div>
    `);

    pop.querySelector('#qpMonsterActivateEffect').onclick = () => {
        closeQuickPopover();
        DuelEngine.activateCard('player', 'hand', handIndex);
    };
    pop.querySelector('#qpMonsterSelectNormal').onclick = () => {
        closeQuickPopover();
        gameState.selectedCard = { type: 'hand', card: card, index: handIndex, owner: 'player' };
        updateCardInfoPanel(card, { sourceType: 'hand', sourceOwner: 'player', isFaceDown: false });
        updateUI();
        highlightEmptySlots(card);
    };
    pop.querySelector('#qpMonsterActivateCancel').onclick = () => closeQuickPopover();
}

/**
 * Come promptHandSpellActivation qui sopra, ma per un MOSTRO in mano che
 * può essere Special Summonato tramite il proprio effetto (es. Gilasaurus):
 * offre la scelta tra Evocazione Normale (passa alla selezione classica,
 * che poi chiede Attacco/Difesa) e Special Summon immediato.
 */
function promptHandMonsterSpecialSummon(card, handIndex) {
    const anchorEl = document.querySelectorAll('#playerHand .card')[handIndex] || null;
    // Alcune carte (es. i mostri Toon) non sono MAI Evocabili Normalmente
    // nella realtà: per loro il popover offre solo Special Summon.
    const def = DuelEngine.getDefinition(card.id);
    const canNormalSummon = !(def && def.cannotNormalSummon);

    const pop = openQuickPopover(anchorEl, `
        <div class="quick-popover-title">${card.name}</div>
        <div class="quick-popover-actions">
            <button type="button" class="quick-popover-btn confirm icon-round" id="qpMonsterSpecialSummon" title="Special Summon">✨</button>
            ${canNormalSummon ? '<button type="button" class="quick-popover-btn attack icon-round" id="qpMonsterNormalSummon" title="Evoca Normalmente">🔺</button>' : ''}
            <button type="button" class="quick-popover-btn cancel icon-round" id="qpMonsterSummonCancel" title="Annulla">✖</button>
        </div>
    `);

    pop.querySelector('#qpMonsterSpecialSummon').onclick = () => {
        closeQuickPopover();
        DuelEngine.trySpecialSummonFromHand('player', handIndex);
        updateUI();
    };
    if (canNormalSummon) {
        pop.querySelector('#qpMonsterNormalSummon').onclick = () => {
            closeQuickPopover();
            gameState.selectedCard = { type: 'hand', card: card, index: handIndex, owner: 'player' };
            updateCardInfoPanel(card, { sourceType: 'hand', sourceOwner: 'player', isFaceDown: false });
            updateUI();
            highlightEmptySlots(card);
        };
    }
    pop.querySelector('#qpMonsterSummonCancel').onclick = () => closeQuickPopover();
}

function changeMonsterPosition(slotIndex) {
    const monsterSlot = gameState.playerMonsterField[slotIndex];
    if (!monsterSlot || !monsterSlot.canChangePosition) return;
    // Divieto di cambio Posizione per QUESTO SOLO mostro — es. Incantesimo
    // Ombra (id 439): vedi gameState.cannotChangePositionUids, stesso
    // meccanismo (ricalcolato ad ogni render) del divieto d'attacco in
    // resolveAttack() più sopra in questo file.
    if (gameState.cannotChangePositionUids && gameState.cannotChangePositionUids[monsterSlot.card.uid]) {
        addToLog(`🚫 ${monsterSlot.card.name} non può cambiare Posizione in questo momento.`);
        return;
    }
    // Divieto per TUTTI i propri mostri fino a un certo turno (es.
    // Controllo Mesmerico, id 814) — gameState.cannotChangePositionFor[owner]
    // è il numero del turno oltre il quale il divieto scade, non un booleano.
    if (gameState.cannotChangePositionFor && gameState.cannotChangePositionFor.player && gameState.turn <= gameState.cannotChangePositionFor.player) {
        addToLog('🚫 Non puoi cambiare la Posizione dei tuoi mostri in questo turno (Controllo Mesmerico).');
        return;
    }
    // Un mostro coperto (isFaceDown) che passa in Attacco è un Flip
    // Summon manuale (catturato PRIMA del cambio qui sotto, che azzera
    // isFaceDown) — a differenza di un flip subito attaccando
    // (resolveBattleDamage in questo stesso file), questo caso non
    // scatenava MAI TRIGGER.ON_FLIP: bug corretto qui sotto, stesso
    // aggancio già usato per l'altro caso.
    const isManualFlipSummon = monsterSlot.isFaceDown;
    const newPosition = monsterSlot.position === 'attack' ? 'defense' : 'attack';
    DuelEngine.actions.changePosition('player', slotIndex, newPosition);
    if (monsterSlot.position === 'attack') monsterSlot.isFaceDown = false;
    monsterSlot.canChangePosition = false;
    if (isManualFlipSummon && monsterSlot.position === 'attack') {
        monsterSlot.summonedViaFlip = true;
        if (window.DuelEngine) {
            const flipCtx = DuelEngine.makeContext('player', { card: monsterSlot.card, slotIndex: slotIndex });
            DuelEngine.fireTrigger(DuelEngine.TRIGGER.ON_FLIP, flipCtx);
        }
    }
    if (window.MP_broadcast && !window.MP_applyingRemote) {
        window.MP_broadcast({ kind: 'position', slotIndex, position: monsterSlot.position });
    }
    addToLog(`Hai cambiato ${monsterSlot.card.name} in Posizione di ${monsterSlot.position}.`);
    if (window.SFX) SFX.place();
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
 *
 * Prima di richiamare resolveAttack, gestisce anche l'unico costo
 * PRE-dichiarazione d'attacco di questo dataset: "questa carta non può
 * dichiarare un attacco a meno che tu non sacrifichi 1 mostro" (es.
 * Guerriero Pantera, id 399 — def.requiresTributeToAttack). Un costo, non
 * una condizione: va pagato PRIMA che l'attacco venga anche solo
 * dichiarato, quindi qui, non dentro resolveAttack (che risponde solo a
 * "l'attacco è già stato dichiarato, può procedere?").
 */
function executeAttack(attackerIndex, targetIndex) {
    const attackerSlot = gameState.playerMonsterField[attackerIndex];
    const attackerDef = attackerSlot && window.DuelEngine && DuelEngine.getDefinition(attackerSlot.card.id);
    if (attackerDef && attackerDef.requiresTributeToAttack) {
        const tributeCandidates = [];
        gameState.playerMonsterField.forEach((slot, index) => {
            if (slot && index !== attackerIndex) tributeCandidates.push({ slot: slot, index: index });
        });
        if (tributeCandidates.length === 0) {
            addToLog(`🚫 ${attackerSlot.card.name} non può attaccare: non hai un altro mostro da sacrificare.`);
            return;
        }
        if (tributeCandidates.length === 1 || !window.DuelEngineUI) {
            performAttackTribute(tributeCandidates[0].index, attackerIndex, targetIndex);
            return;
        }
        window.DuelEngineUI.openCardListPicker(tributeCandidates.map((c) => c.slot.card), {
            title: `🔻 ${attackerSlot.card.name}: sacrifica un mostro per attaccare`,
            text: 'Scegli quale mostro sacrificare per permettere questo attacco.',
            onSelect: (card) => {
                const match = tributeCandidates.find((c) => c.slot.card.uid === card.uid);
                if (match) performAttackTribute(match.index, attackerIndex, targetIndex);
            }
        });
        return;
    }
    resolveAttack('player', attackerIndex, targetIndex);
}

/** Sacrifica il mostro in `tributeIndex` (costo pre-attacco, vedi executeAttack sopra) e poi dichiara l'attacco. */
function performAttackTribute(tributeIndex, attackerIndex, targetIndex) {
    const slot = gameState.playerMonsterField[tributeIndex];
    if (!slot) { resolveAttack('player', attackerIndex, targetIndex); return; }
    // Stesso messaggio 'tribute' già usato da performTributeSacrifice per
    // un'Evocazione Tributo: applyRemoteTribute (multiplayer.js) è
    // generico, non gli importa il MOTIVO del sacrificio, solo QUALI
    // indici sparire dal campo — riusabile qui senza bisogno di un nuovo
    // tipo di messaggio.
    if (window.MP_broadcast && !window.MP_applyingRemote) {
        window.MP_broadcast({ kind: 'tribute', indices: [tributeIndex] });
    }
    gameState.playerGraveyard.push(slot.card);
    gameState.playerMonsterField[tributeIndex] = null;
    addToLog(`🔻 Sacrifichi ${slot.card.name} per permettere l'attacco.`);
    updateUI();
    resolveAttack('player', attackerIndex, targetIndex);
}

function fieldOfOwner(owner) {
    return owner === 'player' ? gameState.playerMonsterField : gameState.botMonsterField;
}

function graveyardOfOwner(owner) {
    return owner === 'player' ? gameState.playerGraveyard : gameState.botGraveyard;
}

/**
 * Risolve un'intera battaglia, chiunque l'abbia dichiarata (giocatore,
 * bot, o la sua replica in multiplayer). Sequenza:
 *   1) apre la finestra di risposta ON_ATTACK_DECLARE (Forza Riflessa /
 *      Cilindro Magico / Kuriboh da mano — vedi js/engine/duel-engine.js);
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
    // Un mostro in Posizione di Difesa (coperto O scoperto) non può MAI
    // dichiarare un attacco, per regola — controllo centralizzato qui,
    // l'unico punto per cui passa ogni attacco (giocatore, bot, mosse
    // remote in multiplayer), invece di fidarsi che ogni chiamante lo
    // filtri da solo a monte (l'UI del giocatore già lo fa via
    // slot.position==='attack' in game-flow.js, ma l'elenco di
    // candidati-attaccanti del bot in js/ai/bot.js non lo controllava
    // affatto: bug reale osservato, un mostro in Difesa del bot poteva
    // attaccare).
    if (attackerSlot.position !== 'attack') {
        addToLog(`🚫 ${attackerSlot.card.name} è in Posizione di Difesa: non può dichiarare un attacco.`);
        done();
        return;
    }
    // "Questa carta non può dichiarare un attacco nel turno in cui viene
    // attivato questo effetto" (es. Obelisk il Tormentatore, id 30, dopo
    // aver usato il suo Ignition di sacrificio) — per uid, valido SOLO
    // per il resto DI QUESTO turno, azzerato in changeTurn() (game-flow.js),
    // stesso schema di blockedCardUidsThisTurn.
    if (gameState.cannotAttackUidsThisTurn && gameState.cannotAttackUidsThisTurn.has(attackerSlot.card.uid)) {
        addToLog(`🚫 ${attackerSlot.card.name} non può attaccare in questo turno.`);
        done();
        return;
    }
    // "Questa carta non può attaccare direttamente il tuo avversario"
    // (es. Zombyra l'Oscuro, id 625) — per-carta, fissa (non condizionata
    // dal campo avversario come il divieto normale di attacco diretto).
    if (targetIndex === -1) {
        const attackerDef = window.DuelEngine && DuelEngine.getDefinition(attackerSlot.card.id);
        if (attackerDef && attackerDef.cannotAttackDirectly) {
            addToLog(`🚫 ${attackerSlot.card.name} non può attaccare direttamente il tuo avversario.`);
            done();
            return;
        }
    }
    if (window.DuelEngine && DuelEngine.cannotAttack(attackerOwner)) {
        addToLog(`🚫 ${attackerOwner === 'player' ? 'I tuoi mostri non possono' : 'I mostri del bot non possono'} attaccare in questo momento (es. Spada Rivelatrice).`);
        done();
        return;
    }
    // Divieto d'attacco per QUESTO SOLO mostro (a differenza del divieto
    // per l'intero giocatore qui sopra) — es. Incantesimo Ombra (id 439):
    // vedi gameState.cannotAttackUids, ricalcolato ad ogni render da un
    // effetto-carta continuo in card-effects.js (mai una proprietà
    // persistente sullo slot, altrimenti non si azzererebbe mai da sola).
    if (gameState.cannotAttackUids && gameState.cannotAttackUids[attackerSlot.card.uid]) {
        addToLog(`🚫 ${attackerSlot.card.name} non può attaccare in questo momento.`);
        done();
        return;
    }
    // Divieto d'attacco per UN TURNO PRECISO nel futuro (es. Lucertola
    // Elettrica, id 222: "il mostro che l'attacca non può attaccare nel
    // suo turno successivo") — a differenza di cannotAttackUids qui sopra
    // (ricalcolato ad ogni render da un effetto continuo), questo è un
    // numero di turno fisso salvato al momento del trigger: gameState.turn
    // avanza di 1 ad ogni cambio giocatore, quindi "il tuo turno
    // successivo" da quando l'evento scatta è sempre gameState.turn + 2
    // (regola: nessuna cancellazione esplicita necessaria, il confronto
    // smette da solo di corrispondere una volta passato quel turno).
    if (gameState.attackLockedUntilTurn && gameState.attackLockedUntilTurn[attackerSlot.card.uid] === gameState.turn) {
        addToLog(`🚫 ${attackerSlot.card.name} non può attaccare in questo turno.`);
        done();
        return;
    }
    // Divieto di essere scelto come BERSAGLIO per QUESTO SOLO mostro
    // difensore (es. Capitano Predone id 714: "l'avversario non può
    // bersagliare i Guerrieri con gli attacchi, eccetto questa carta") —
    // stesso schema dei controlli sull'attaccante qui sopra, ma sul lato
    // del difensore. Non copre l'attacco diretto (targetIndex === -1):
    // quella scelta non passa da un mostro bersaglio.
    if (targetIndex !== -1) {
        const targetSlot = defenderField[targetIndex];
        if (targetSlot && gameState.cannotBeAttackTargetUids && gameState.cannotBeAttackTargetUids[targetSlot.card.uid]) {
            addToLog(`🚫 ${targetSlot.card.name} non può essere scelta come bersaglio per un attacco in questo momento.`);
            done();
            return;
        }
    }

    if (attackerOwner === 'player' && window.MP_broadcast && !window.MP_applyingRemote) {
        window.MP_broadcast({ kind: 'attack', attackerIndex, targetIndex });
    }

    const attackerBoardId = attackerOwner === 'player' ? 'playerFieldBoard' : 'botFieldBoard';
    const defenderBoardId = defenderOwner === 'player' ? 'playerFieldBoard' : 'botFieldBoard';
    // Interroga il DOM per gli elementi carta attaccante/bersaglio: NON va
    // fatto qui, va rifatto DOPO l'updateUI() dentro la callback di
    // fireTrigger qui sotto. renderFields() (chiamata da updateUI) ricrea
    // da zero l'intero field-board con innerHTML='', quindi qualunque nodo
    // preso PRIMA di quella chiamata risulta "staccato" dal documento
    // (isConnected: false, getBoundingClientRect() tutto a zero) — le
    // animazioni di carica/scontro applicate a un nodo così sono invisibili
    // o compaiono in un angolo (0,0) invece che sulla carta vera.
    const queryBattleElements = (effectiveTargetIndex, targetBoardId, targetOwnerForHand) => ({
        // [data-type="monster"] è OBBLIGATORIO qui: la zona Magia/Trappola
        // e la zona Mostri condividono gli stessi valori di data-index
        // (0-4 ciascuna), quindi un selettore senza data-type può
        // agganciarsi al .field-slot SBAGLIATO (es. una Magia/Trappola
        // Set nella stessa colonna) se quello compare per primo nel DOM —
        // bug reale osservato: l'animazione d'attacco mostrava la carta
        // coperta in zona Magia/Trappola al posto del vero mostro
        // attaccante/bersaglio.
        attackerCardEl: document.querySelector(`#${attackerBoardId} .field-slot[data-type="monster"][data-index="${attackerIndex}"] .card`),
        // Attacco diretto: la freccia/rincorsa punta ora verso la mano di
        // chi lo subisce (le sue carte, il "bersaglio" concettuale di un
        // attacco senza un mostro a fare da scudo), non più verso il box
        // LP — quello resta comunque il punto dove i Life Points scendono
        // davvero (vedi renderLifePoints più sotto, indipendente da qui).
        // targetBoardId di default è quello del difensore (defenderBoardId),
        // ma può essere quello dell'ATTACCANTE se il bersaglio è stato
        // ridiretto sul suo stesso campo (vedi redirectAttack/Ragno della
        // Roulette qui sopra).
        targetAnchor: effectiveTargetIndex === -1
            ? document.getElementById((targetOwnerForHand || defenderOwner) === 'player' ? 'playerHand' : 'botHand')
            : document.querySelector(`#${targetBoardId || defenderBoardId} .field-slot[data-type="monster"][data-index="${effectiveTargetIndex}"] .card`)
    });

    const attackState = { cancelled: false, damageNegated: false, attackerAtkZeroed: false, redirectedTargetIndex: null, redirectedTargetOwner: null };
    const declareCtx = DuelEngine.makeContext(attackerOwner, {
        attackerOwner: attackerOwner,
        attackerIndex: attackerIndex,
        targetIndex: targetIndex,
        attackerAtk: DuelEngine.getEffectiveAtk(attackerSlot.card),
        cancelAttack: () => { attackState.cancelled = true; },
        negateDamage: () => { attackState.damageNegated = true; },
        // Es. Suijin/Kazejin: "durante il calcolo dei danni, rendi 0 l'ATK
        // dell'attaccante" — diverso da negateDamage() (che annulla solo i
        // Life Points persi), qui l'ATK usato nel confronto di battaglia
        // stesso diventa 0, quindi l'attaccante può anche essere distrutto
        // dalla DEF del difensore.
        zeroAttackerAtk: () => { attackState.attackerAtkZeroed = true; },
        // Es. Spiritello dei Sogni (id 214): il DIFENDENTE designa un altro
        // proprio mostro come nuovo bersaglio di QUESTO attacco (l'attacco
        // in sé non viene annullato, solo ridiretto) — `newIndex` deve
        // essere uno slot occupato del campo del difensore, altrimenti il
        // ridirezionamento viene ignorato più sotto. `newOwner` è opzionale
        // e serve SOLO a Ragno della Roulette (id 425, risultato 4 del
        // dado: "scegli un altro mostro che controlla l'AVVERSARIO [di chi
        // controlla Ragno della Roulette, cioè l'attaccante] e cambia il
        // bersaglio dell'attacco su di esso") — l'unico caso in questo
        // dataset in cui il nuovo bersaglio sta sul campo dell'ATTACCANTE
        // stesso, non del difensore: senza `newOwner` il default resta il
        // campo del difensore, comportamento invariato per ogni altro
        // effetto che chiama redirectAttack con un solo argomento.
        redirectAttack: (newIndex, newOwner) => {
            attackState.redirectedTargetIndex = newIndex;
            attackState.redirectedTargetOwner = newOwner || defenderOwner;
        },
        // Es. Ragno della Roulette (id 425, risultato 2 del dado): "rendi
        // quell'attacco un attacco diretto" — stesso meccanismo di
        // redirectAttack qui sopra, ma verso targetIndex -1 (nessun
        // mostro, i Life Points del difensore incassano tutto l'ATK
        // dell'attaccante) invece che verso un altro mostro.
        forceDirectAttack: () => {
            attackState.redirectedTargetIndex = -1;
            attackState.redirectedTargetOwner = defenderOwner;
        }
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

        // Bersaglio effettivo di questo attacco: quello ridiretto da
        // redirectAttack(), se presente e ancora valido (uno slot
        // realmente occupato sul campo del difensore o — solo per Ragno
        // della Roulette, vedi redirectAttack più sopra — dell'attaccante
        // stesso), altrimenti quello dichiarato in origine. effectiveDefenderOwner
        // resta 'defenderOwner' per ogni caso normale: cambia SOLO quando un
        // redirect valido ha esplicitamente designato l'altro campo.
        let effectiveDefenderOwner = defenderOwner;
        let effectiveTargetIndex = targetIndex;
        if (attackState.redirectedTargetIndex !== null) {
            const candidateOwner = attackState.redirectedTargetOwner || defenderOwner;
            if (attackState.redirectedTargetIndex === -1) {
                // forceDirectAttack(): -1 è sempre "valido" di per sé, non
                // punta a nessuno slot da verificare sul campo.
                effectiveDefenderOwner = candidateOwner;
                effectiveTargetIndex = -1;
            } else {
                const candidateField = fieldOfOwner(candidateOwner);
                if (candidateField[attackState.redirectedTargetIndex]) {
                    effectiveDefenderOwner = candidateOwner;
                    effectiveTargetIndex = attackState.redirectedTargetIndex;
                }
            }
        }
        const effectiveDefenderField = fieldOfOwner(effectiveDefenderOwner);
        const effectiveDefenderBoardId = effectiveDefenderOwner === 'player' ? 'playerFieldBoard' : 'botFieldBoard';

        // Presi ORA, dopo l'updateUI() qui sopra: sono i nodi realmente
        // visibili a schermo in questo momento (vedi commento su
        // queryBattleElements più sopra).
        const { attackerCardEl, targetAnchor } = queryBattleElements(effectiveTargetIndex, effectiveDefenderBoardId, effectiveDefenderOwner);

        // Attacco diretto: nessun mostro-bersaglio verso cui lanciarsi, la
        // rincorsa va dritta verso la metà alta (il Bot subisce) o bassa
        // (il giocatore subisce) dello schermo — vedi showBattleEffect.
        const directDirection = effectiveTargetIndex === -1 ? (effectiveDefenderOwner === 'bot' ? 'up' : 'down') : null;
        showBattleEffect(attackerCardEl, targetAnchor, directDirection);
        if (window.SFX) SFX.attackSwing();
        if (effectiveTargetIndex !== -1 && window.FX) {
            FX.playBattleClashEpic(attackerCardEl, targetAnchor);
        }
        if (effectiveTargetIndex !== -1 && window.SFX) {
            setTimeout(() => SFX.clash(), 270);
        }

        setTimeout(() => {
            resolveBattleDamage(attackerOwner, effectiveDefenderOwner, attackerIndex, effectiveTargetIndex, attackState.damageNegated, attackState.attackerAtkZeroed);
            attackerSlot.hasAttacked = true;
            // Attacco extra nella stessa Battle Phase: SOLO se l'attaccante
            // è sopravvissuto a QUESTA battaglia (attackerField[attackerIndex]
            // è ancora lui stesso, non null/un altro mostro). Il NUMERO di
            // attacchi extra concessi (non più solo "sì/no") somma tre fonti
            // indipendenti, ciascuna eleggibile al massimo una volta a
            // testa per turno:
            //   - def.canAttackTwice (es. Cavaliere Hayabusa id 294): +1 fisso.
            //   - slot.extraAttackGranted (es. Riavvolgimento Toon id 485):
            //     +1 concesso una tantum da un'altra carta, azzerato ogni
            //     turno in changeTurn()/game-flow.js.
            //   - def.getExtraAttackCount(ctx) (es. Samurai Armato - Ben
            //     Kei id 721): +N DINAMICO, ricalcolato ad ogni attacco (nel
            //     suo caso, 1 per ogni Carta Equipaggiamento attualmente
            //     agganciata) — a differenza delle prime due, può cambiare
            //     nel corso dello stesso turno (es. se una Carta Equip
            //     viene distrutta a metà Battle Phase).
            // slot.extraAttacksUsedThisTurn (numero, azzerato ogni turno
            // insieme a extraAttackGranted) traccia quanti ne sono già
            // stati usati, confrontato col totale concesso ORA.
            if (attackerField[attackerIndex] === attackerSlot) {
                const attackerDef = DuelEngine.getDefinition(attackerSlot.card.id);
                let totalExtraAllowed = 0;
                if (attackerDef && attackerDef.canAttackTwice) totalExtraAllowed += 1;
                if (attackerSlot.extraAttackGranted) totalExtraAllowed += 1;
                if (attackerDef && typeof attackerDef.getExtraAttackCount === 'function') {
                    totalExtraAllowed += attackerDef.getExtraAttackCount(DuelEngine.makeContext(attackerOwner, { card: attackerSlot.card, slotIndex: attackerIndex }));
                }
                const extraUsedSoFar = attackerSlot.extraAttacksUsedThisTurn || 0;
                if (extraUsedSoFar < totalExtraAllowed) {
                    attackerSlot.hasAttacked = false;
                    attackerSlot.extraAttacksUsedThisTurn = extraUsedSoFar + 1;
                    addToLog(`⚔️ ${attackerSlot.card.name} può attaccare di nuovo in questa Battle Phase!`);
                }
            }

            // "Se questa carta attacca: viene cambiata in Posizione di
            // Difesa a fine Battle Phase, e non può cambiare Posizione
            // fino alla End Phase del tuo turno successivo" (es. Forza
            // d'Attacco Goblin, id 269 — def.forcesDefenseAfterAttack).
            // SEMPLIFICAZIONE: applicato SUBITO invece che a fine Battle
            // Phase (equivalente in pratica: nessun'altra azione di questo
            // attaccante può più accadere prima della fine della Battle
            // Phase), e sbloccato all'inizio del turno successivo del
            // proprietario invece che alla sua End Phase (changeTurn() in
            // game-flow.js resetta canChangePosition per l'intero campo di
            // chi inizia il turno) — un turno di blocco in meno rispetto
            // alla regola vera, stesso genere di scorciatoia già preso per
            // altri effetti "fino a un momento preciso di un turno futuro"
            // in questo file. Solo se l'attaccante è sopravvissuto a questa
            // battaglia.
            if (attackerField[attackerIndex] === attackerSlot) {
                const attackerDef = DuelEngine.getDefinition(attackerSlot.card.id);
                // Ragnatela (id 456, Magia Terreno): stesso effetto di
                // Forza d'Attacco Goblin qui sopra, ma per QUALUNQUE mostro
                // che attacca, di ENTRAMBI i lati, finché questa Magia
                // Terreno resta scoperta sul Terreno (di uno qualunque dei
                // due giocatori — non ha un "proprietario" ai fini di
                // questo controllo, come da regola vera). Stessa
                // SEMPLIFICAZIONE sul momento esatto di applicazione/sblocco
                // spiegata sopra.
                const ragnatelaActive = ['playerFieldSpell', 'botFieldSpell'].some((key) => {
                    const fs = gameState[key];
                    return fs && !fs.isFaceDown && fs.card.id === 456;
                });
                const forcesDefense = (attackerDef && attackerDef.forcesDefenseAfterAttack) || ragnatelaActive;
                if (forcesDefense && attackerSlot.position === 'attack') {
                    attackerSlot.position = 'defense';
                    attackerSlot.canChangePosition = false;
                    addToLog(`🛡️ ${attackerSlot.card.name} passa in Posizione di Difesa dopo aver attaccato!`);
                }
            }

            // Il contatore LP parte a scendere SUBITO, in sincrono con il
            // flash/numero di danno epico (già mostrati da resolveBattleDamage
            // qui sopra tramite applyDamage): renderLifePoints() da sola
            // (non il pesante updateUI/renderFields più sotto, che invece
            // aspetta la fine dell'esplosione) tocca solo i box LP, fissi
            // fuori dal field-board, quindi è sicura da chiamare qui.
            renderLifePoints();

            // L'esplosione (FX.playBattleDestroyEffect) va scatenata QUI,
            // finché il campo mostrato a schermo è ancora quello di PRIMA
            // di questo attacco: updateUI()/clearSelection() più sotto
            // ricostruiscono l'intero field-board da gameState (che ora ha
            // già lo slot a null), staccando dal documento la carta
            // distrutta. Se triggerDestroyEffect girasse DOPO quel
            // ricalcolo — come succedeva prima — troverebbe lo slot già
            // vuoto e l'esplosione non partirebbe mai: la carta spariva di
            // colpo, senza alcuna animazione.
            if (effectiveTargetIndex !== -1) {
                const destroyedSlots = [];
                if (attackerField[attackerIndex] === null) destroyedSlots.push({ owner: attackerOwner, index: attackerIndex });
                if (effectiveDefenderField[effectiveTargetIndex] === null) destroyedSlots.push({ owner: effectiveDefenderOwner, index: effectiveTargetIndex });
                destroyedSlots.forEach(item => triggerDestroyEffect(item.owner, item.index, 'monster'));
            }

            setTimeout(() => {
                if (attackerCardEl) attackerCardEl.classList.remove('is-attacking');
                document.querySelectorAll('.damage-shake').forEach(el => el.classList.remove('damage-shake'));
                if (attackerOwner === 'player') clearSelection(); else updateUI();
                done();
            }, 700);
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
function resolveBattleDamage(attackerOwner, defenderOwner, attackerIndex, targetIndex, damageNegated, attackerAtkZeroed) {
    const attackerField = fieldOfOwner(attackerOwner);
    const defenderField = fieldOfOwner(defenderOwner);
    const attackerSlot = attackerField[attackerIndex];
    const attacker = attackerSlot.card;
    // ATK effettivo (base + eventuale bonus continuo, es. Maga Oscura):
    // vedi DuelEngine.getEffectiveAtk/getEffectiveDef in duel-engine.js. Il
    // bonus valido SOLO per questo Damage Step (es. Soldati Insetto del
    // Cielo, Soldato Cinetico — DuelEngine.getDamageStepBonus) si aggiunge
    // più sotto, quando/se l'avversario di questa battaglia è noto (non
    // esiste per un attacco diretto).
    const attackerBaseAtk = DuelEngine.getEffectiveAtk(attacker);
    const attackerIsPlayer = attackerOwner === 'player';
    const attackerPrefix = attackerIsPlayer ? '' : '🤖 ';
    // "il tuo"/"" davanti al nome di una carta del difensore, per far
    // capire subito di chi è la carta coinvolta.
    const yourPrefix = defenderOwner === 'player' ? 'il tuo ' : '';

    // `involvedCard` (opzionale) è la carta del giocatore `owner` coinvolta
    // in QUESTA battaglia (l'attaccante se il danno va a attackerOwner, il
    // difensore se va a defenderOwner) — assente per un attacco diretto,
    // dove il giocatore che subisce danno non ha nessun proprio mostro in
    // campo coinvolto. Permette a carte come Amazzone Combattente/
    // Spadaccina di intercettare il PROPRIO danno da battaglia.
    const applyDamage = (owner, amount, involvedCard) => {
        if (damageNegated) {
            addToLog('🐰 Il danno da battaglia di questo attacco è stato annullato!');
            return;
        }
        // Es. Waboku (id 503): "non subisci danno da battaglia in questo
        // turno" — flag per-giocatore con scadenza a fine turno, vedi
        // gameState.noBattleDamageFor (resettato in changeTurn(),
        // game-flow.js) e la registrazione della carta in card-effects.js.
        if (gameState.noBattleDamageFor && gameState.noBattleDamageFor[owner]) {
            addToLog(`🙏 ${owner === 'player' ? 'Non subisci' : 'Il bot non subisce'} danno da battaglia in questo turno!`);
            return;
        }
        // Muro del Tornado (id 489): a differenza di Waboku qui sopra (un
        // flag "per questo turno" impostato una tantum), questa protezione
        // è CONTINUA finché la carta e "Umi" (id 497) restano scoperte sul
        // Terreno — controllata direttamente qui, non tramite
        // gameState.noBattleDamageFor, per non confonderla col reset "una
        // volta a turno" di quel flag in changeTurn() (game-flow.js).
        const umiOnField = ['playerFieldSpell', 'botFieldSpell'].some((key) => {
            const fs = gameState[key];
            return fs && !fs.isFaceDown && fs.card.id === 497;
        });
        if (umiOnField) {
            const ownerSTField = owner === 'player' ? gameState.playerSTField : gameState.botSTField;
            if (ownerSTField.some((slot) => slot && !slot.isFaceDown && slot.card.id === 489)) {
                addToLog(`🌪️ Muro del Tornado protegge ${owner === 'player' ? 'te' : 'il bot'} dal danno da battaglia finché "Umi" resta sul Terreno!`);
                return;
            }
        }
        const involvedDef = involvedCard && DuelEngine.getDefinition(involvedCard.id);
        if (involvedDef && involvedDef.redirectOwnBattleDamageToOpponent) {
            const opp = owner === 'player' ? 'bot' : 'player';
            addToLog(`🔄 ${involvedCard.name} redirige il danno da battaglia al tuo avversario!`);
            DuelEngine.actions.dealDamage(opp, amount);
            const oppInfoEl = document.getElementById(opp === 'player' ? 'playerInfo' : 'botInfo');
            if (oppInfoEl) oppInfoEl.classList.add('damage-shake');
            showFloatingDamage(amount, oppInfoEl, opp);
            return;
        }
        if (involvedDef && involvedDef.preventOwnBattleDamage) {
            addToLog(`🛡️ ${involvedCard.name} impedisce il danno da battaglia!`);
            return;
        }
        DuelEngine.actions.dealDamage(owner, amount);
        const infoEl = document.getElementById(owner === 'player' ? 'playerInfo' : 'botInfo');
        if (infoEl) infoEl.classList.add('damage-shake');
        showFloatingDamage(amount, infoEl, owner);
        // Vero solo se il danno è DAVVERO arrivato a `owner` (nessuno dei
        // return early qui sopra è scattato) — usato da chi chiama per
        // sapere se registrare quel danno altrove (es. Benedizione di
        // Sebek, id 813: "guadagni Life Points pari al danno da battaglia
        // inflitto con un attacco diretto", solo se il danno non è stato
        // annullato/prevenuto/rediretto).
        return true;
    };

    // Effetto "quando questa carta viene distrutta [in battaglia] e
    // mandata al Cimitero" (es. Germe Gigante, Pomodoro Mistico): va
    // chiamato QUI, subito dopo aver spinto la carta nel suo Cimitero e
    // svuotato lo slot, per ciascun mostro che questa battaglia distrugge
    // — stesso punto d'aggancio già usato per ON_FLIP più sotto in questa
    // funzione.
    // `opponentBattleCard` (opzionale) è l'ALTRO mostro coinvolto in
    // QUESTA battaglia (chi ha attaccato, se `card` era il difensore
    // distrutto; chi difendeva, se `card` era l'attaccante distrutto) —
    // esposto come ctx.destroyedByOpponentCard a onDestroy(ctx), es.
    // Ossigeddon (id 804): "se distrutta in battaglia da un mostro Tipo
    // Piroico". SEMPLIFICAZIONE: presente SOLO per distruzioni in
    // battaglia (qui in resolveBattleDamage) — una distruzione da
    // effetto Carta (ACTIONS.destroyMonster, duel-engine.js) non ha un
    // "altro mostro della battaglia" concettualmente, quindi
    // ctx.destroyedByOpponentCard resta null in quel caso, distinguibile
    // da chi legge il campo.
    const fireOnDestroy = (owner, index, card, opponentBattleCard) => {
        DuelEngine.fireTrigger(DuelEngine.TRIGGER.ON_DESTROY, DuelEngine.makeContext(owner, { slotIndex: index, card: card, destroyedByOpponentCard: opponentBattleCard || null }));
    };

    /**
     * "Quando questa carta infligge danno da Battaglia ai Life Points del
     * tuo avversario: [effetto]" (es. Cappello Magico Bianco, id 591) —
     * chiamata SOLO nei due rami più comuni (l'attaccante vince in
     * Posizione di Attacco, o perfora in Posizione di Difesa): non nel
     * pareggio o nella ridirezione del danno (redirectOwnBattleDamageToOpponent),
     * dove "chi ha davvero inflitto danno" è ambiguo — SEMPLIFICAZIONE
     * accettata per una carta di nicchia.
     */
    const fireOwnBattleDamageDealt = (attackerCard, victimOwner, effectiveTargetIndex) => {
        const attackerDef = DuelEngine.getDefinition(attackerCard.id);
        if (attackerDef && typeof attackerDef.onDealsBattleDamage === 'function') {
            attackerDef.onDealsBattleDamage(DuelEngine.makeContext(attackerOwner, { opponent: victimOwner, targetIndex: effectiveTargetIndex }));
        }
        // "Ogni volta che un mostro che controlli infligge danno da
        // battaglia [...]" (es. Goblin Ladro, id 610) — a differenza di
        // onDealsBattleDamage qui sopra (proprietà del mostro attaccante
        // stesso), questa reagisce dalle Magie/Trappole Continue scoperte
        // sul Terreno di chi controlla l'attaccante, stesso spirito di
        // reactToAnyNormalOrFlipSummon (duel-engine.js) ma per il danno da
        // battaglia.
        const stField = attackerOwner === 'player' ? gameState.playerSTField : gameState.botSTField;
        stField.forEach((slot) => {
            if (!slot || slot.isFaceDown) return;
            const def = DuelEngine.getDefinition(slot.card.id);
            if (def && typeof def.onOwnMonsterDealsBattleDamage === 'function') {
                def.onOwnMonsterDealsBattleDamage(DuelEngine.makeContext(attackerOwner, { opponent: victimOwner, attackerCard: attackerCard }));
            }
        });
    };

    /**
     * "Alla fine del Damage Step, se questa carta ha combattuto [...]"
     * (es. Ryu Kokki id 663, D.D. Guerriera id 716, Guerriero D.D. id
     * 179, Testa di Martello Iper id 800): a differenza di
     * onDealsBattleDamage/applyBattleDestroyBonus qui sopra (solo quando
     * l'attaccante VINCE davvero), questo scatta ogni volta che `card` ha
     * effettivamente combattuto in questo Damage Step E resta ancora sul
     * Terreno dopo la risoluzione — MAI per un attacco diretto (nessun
     * "avversario di battaglia" lì) e MAI per una carta appena distrutta
     * in QUESTA stessa battaglia (SEMPLIFICAZIONE: niente "ultima
     * informazione nota" per una carta già rimossa dal campo, coerente
     * con altre semplificazioni già accettate in questo file).
     * `opponentSurvived` indica se `opponentCard` è ancora sul Terreno
     * dopo la stessa risoluzione (es. Testa di Martello Iper, id 800, ne
     * ha bisogno).
     */
    const fireOwnBattled = (card, owner, opponentCard, opponentSurvived) => {
        // Marcatore generico "ha combattuto in questa Battle Phase" (es.
        // Bestia Mitica Cerbero, id 734: "alla fine della Battle Phase,
        // se questa carta ha combattuto") — scritto per OGNI carta che
        // sopravvive a una battaglia, non solo quelle con un proprio
        // onBattled, così un handler 'onBattlePhaseEnd' (game-flow.js/
        // enterEndPhase) può controllarlo in un secondo momento. Si
        // auto-consuma: chi lo legge lo azzera anche, nessun reset
        // separato necessario.
        card.battledThisBattlePhase = true;
        const def = DuelEngine.getDefinition(card.id);
        if (def && typeof def.onBattled === 'function') {
            def.onBattled(DuelEngine.makeContext(owner, { card: card, opponentCard: opponentCard, opponentSurvived: opponentSurvived }));
        }
        // Una Carta Equipaggiamento agganciata a `card` può reagire anche
        // lei alla battaglia del mostro a cui è agganciata (es. Pugno
        // Ingranaggio Antico, id 840) — stesso spirito di
        // onOwnMonsterDealsBattleDamage qui sopra, ma per l'Equip invece
        // che per una Magia/Trappola Continua qualsiasi sul Terreno.
        const ownerStField = owner === 'player' ? gameState.playerSTField : gameState.botSTField;
        ownerStField.forEach((slot) => {
            if (!slot || slot.isFaceDown || slot.card.equippedToUid !== card.uid) return;
            const eqDef = DuelEngine.getDefinition(slot.card.id);
            if (eqDef && typeof eqDef.onEquippedMonsterBattled === 'function') {
                eqDef.onEquippedMonsterBattled(DuelEngine.makeContext(owner, { equippedCard: card, opponentCard: opponentCard, opponentSurvived: opponentSurvived }));
            }
        });
        // "Se questa carta viene distrutta in battaglia: il mostro che
        // l'ha distrutta [effetto]" (es. Guerriero di Ardesia, id 776) —
        // reazione della carta APPENA distrutta in QUESTA battaglia
        // (`opponentCard`, quando non è sopravvissuta), dal punto di
        // vista del SUO proprietario, con `card` (chi l'ha distrutta)
        // passato come bersaglio dell'effetto — l'unico punto in cui
        // questo motore conosce sia il distruttore sia il distrutto nello
        // stesso momento (SEMPLIFICAZIONE: non scatta se entrambi i lati
        // sono stati distrutti nello stesso pareggio, dato che a quel
        // punto anche `card` è già andata al Cimitero e l'effetto
        // sarebbe comunque ininfluente).
        if (!opponentSurvived) {
            const opponentDef = DuelEngine.getDefinition(opponentCard.id);
            if (opponentDef && typeof opponentDef.onDestroyedInBattle === 'function') {
                const destroyedOwner = owner === 'player' ? 'bot' : 'player';
                opponentDef.onDestroyedInBattle(DuelEngine.makeContext(destroyedOwner, { destroyerCard: card }));
            }
        }
    };

    /**
     * Es. Waboku (id 503): "i tuoi mostri non possono essere distrutti in
     * battaglia in questo turno" — vedi gameState.noBattleDestructionFor
     * (resettato in changeTurn(), game-flow.js). `owner` è il
     * CONTROLLORE del mostro che sta per essere distrutto (attaccante o
     * difensore, la protezione non dipende da chi dei due ha dichiarato
     * l'attacco).
     */
    const survivesBattleDestruction = (owner) => !!(gameState.noBattleDestructionFor && gameState.noBattleDestructionFor[owner]);
    // "Questa carta non può essere distrutta in battaglia" (es. Mietitore
    // Spirituale/Spirit Reaper, id 661) — immunità PER CARTA, sempre
    // attiva, a differenza di survivesBattleDestruction() qui sopra
    // (Waboku, per-PROPRIETARIO, solo per il turno). Controllata in
    // aggiunta ad essa in ognuno dei rami di distruzione qui sotto.
    // def.cannotBeDestroyedByBattle può essere `true` (sempre) oppure una
    // funzione (opponentAtk) => bool per un'immunità CONDIZIONATA (es.
    // Guardiano Celtico Sgradito, id 712: "non distrutta da un mostro con
    // 1900+ ATK" — opponentAtk è l'ATK effettivo dell'altro mostro
    // coinvolto in QUESTO scontro).
    const cardIsIndestructibleByBattle = (card, opponentAtk) => {
        const flag = DuelEngine.getDefinition(card.id)?.cannotBeDestroyedByBattle;
        if (typeof flag === 'function') return !!flag(opponentAtk);
        return !!flag;
    };

    /**
     * "Quando QUESTA carta distrugge un mostro in battaglia: [danno
     * extra]" (es. Skull Servant, id 526: def.damageOnBattleDestroy = 500)
     * — chiamata SOLO quando l'attaccante vince davvero lo scontro (mai su
     * un pareggio o su una difesa che sopravvive), stesso pattern-flag già
     * usato per redirectOwnBattleDamageToOpponent/preventOwnBattleDamage
     * più sopra in questa funzione.
     */
    const applyBattleDestroyBonus = (attackerCard, victimOwner) => {
        const def = DuelEngine.getDefinition(attackerCard.id);
        const bonus = def?.damageOnBattleDestroy;
        if (bonus) {
            applyDamage(victimOwner, bonus);
            addToLog(`💀 ${attackerCard.name} infligge ${bonus} danni extra per aver distrutto un mostro in battaglia!`);
        }
        // "Quando QUESTA carta distrugge un mostro in battaglia: perde X
        // ATK" (es. Zombyra l'Oscuro, id 625) — riduzione PERMANENTE,
        // scritta direttamente su attackerCard.attack (stesso pattern già
        // usato altrove in card-effects.js per un calo di ATK definitivo),
        // non un bonus turno-per-turno come grantTemporaryAtkDefBonus.
        const atkLoss = def?.atkLossOnBattleDestroy;
        if (atkLoss) {
            attackerCard.attack = Math.max(0, attackerCard.attack - atkLoss);
            addToLog(`💀 ${attackerCard.name} perde ${atkLoss} ATK per aver distrutto un mostro in battaglia!`);
        }
    };

    if (targetIndex === -1) {
        if (typeof showDirectAttackWarning === 'function') showDirectAttackWarning();
        if (window.SFX) SFX.directHit();
        // Nessun "altro mostro" in un attacco diretto: i bonus Damage Step
        // condizionati a un avversario specifico (es. Soldati Insetto del
        // Cielo) non si applicano mai qui, coerentemente con le regole vere.
        const attackerAtk = attackerBaseAtk + DuelEngine.getDamageStepBonus(attacker, null, 'attacker').atk;
        const damage = attackerAtk;
        const damageLanded = applyDamage(defenderOwner, damage);
        // Benedizione di Sebek (id 813): ricordato per proprietario
        // dell'ATTACCANTE (non del difensore che l'ha subito), azzerato
        // ad ogni cambio turno (changeTurn(), game-flow.js) — sovrascrive
        // un eventuale attacco diretto precedente nello stesso turno
        // (SEMPLIFICAZIONE: solo l'ultimo resta utilizzabile).
        if (damageLanded) {
            gameState.directAttackDamageFor = gameState.directAttackDamageFor || {};
            gameState.directAttackDamageFor[attackerOwner] = damage;
        }
        fireOwnBattleDamageDealt(attacker, defenderOwner, -1);
        addToLog(`${attackerPrefix}🔥 Attacco diretto! ${attacker.name} ${damageNegated ? 'avrebbe inflitto' : 'infligge'} ${damage} danni!`);
    } else {
        const targetSlot = defenderField[targetIndex];
        const target = targetSlot.card;
        // Bonus valido solo per QUESTO Damage Step, su entrambi i lati
        // della battaglia (es. Soldati Insetto del Cielo se attacca,
        // Soldato Cinetico se attacca O difende) — vedi damageStepBonus(ctx)
        // in card-effects.js.
        // Es. Suijin/Kazejin (zeroAttackerAtk in declareCtx, ON_ATTACK_DECLARE):
        // l'ATK dell'attaccante diventa 0 per QUESTO scontro, prima ancora
        // del bonus Damage Step (che comunque non si applica più: 0 resta 0).
        const attackerAtk = attackerAtkZeroed ? 0 : attackerBaseAtk + DuelEngine.getDamageStepBonus(attacker, target, 'attacker').atk;
        const targetDmgBonus = DuelEngine.getDamageStepBonus(target, attacker, 'defender');
        const targetAtk = DuelEngine.getEffectiveAtk(target) + targetDmgBonus.atk;
        const targetDef = DuelEngine.getEffectiveDef(target) + targetDmgBonus.def;
        addToLog(`${attackerPrefix}⚔️ ${attacker.name} attacca ${yourPrefix}${target.name}!`);
        if (attackerAtkZeroed) addToLog(`💧 L'ATK di ${attacker.name} è stato azzerato per questo scontro!`);

        if (targetSlot.position === 'attack') {
            if (attackerAtk > targetAtk) {
                const damage = attackerAtk - targetAtk;
                applyDamage(defenderOwner, damage, target);
                fireOwnBattleDamageDealt(attacker, defenderOwner, targetIndex);
                const targetSurvivesThisBattle = survivesBattleDestruction(defenderOwner) || cardIsIndestructibleByBattle(target, attackerAtk);
                if (targetSurvivesThisBattle) {
                    addToLog(`🙏 ${yourPrefix}${target.name} non viene distrutto in battaglia in questo turno!`);
                    fireOwnBattled(target, defenderOwner, attacker, true);
                } else {
                    graveyardOfOwner(defenderOwner).push(target);
                    defenderField[targetIndex] = null;
                    addToLog(`💥 ${yourPrefix}${target.name} distrutto! ${defenderOwner === 'player' ? 'Perdi' : 'Il bot perde'} ${damage} LP.`);
                    applyBattleDestroyBonus(attacker, defenderOwner);
                    fireOnDestroy(defenderOwner, targetIndex, target, attacker);
                }
                fireOwnBattled(attacker, attackerOwner, target, targetSurvivesThisBattle);
            } else if (attackerAtk < targetAtk) {
                const damage = targetAtk - attackerAtk;
                applyDamage(attackerOwner, damage, attacker);
                const attackerSurvivesThisBattle = survivesBattleDestruction(attackerOwner) || cardIsIndestructibleByBattle(attacker, targetAtk);
                if (attackerSurvivesThisBattle) {
                    addToLog(`🙏 ${attackerIsPlayer ? '' : 'Il '}${attacker.name}${attackerIsPlayer ? '' : ' del bot'} non viene distrutto in battaglia in questo turno!`);
                    fireOwnBattled(attacker, attackerOwner, target, true);
                } else {
                    graveyardOfOwner(attackerOwner).push(attacker);
                    attackerField[attackerIndex] = null;
                    addToLog(`💀 ${attackerIsPlayer ? '' : 'Il '}${attacker.name}${attackerIsPlayer ? '' : ' del bot'} distrutto! ${attackerOwner === 'player' ? 'Perdi' : 'Il bot perde'} ${damage} LP.`);
                    fireOnDestroy(attackerOwner, attackerIndex, attacker, target);
                }
                fireOwnBattled(target, defenderOwner, attacker, attackerSurvivesThisBattle);
            } else {
                // Pareggio: normalmente entrambe distrutte, salvo
                // un'immunità specifica come quella di Kaiser Glider (id
                // 320) — "non può essere distrutta in battaglia da un
                // mostro con lo stesso ATK" — o Waboku (id 503) per uno o
                // entrambi i lati.
                const attackerSurvives = !!DuelEngine.getDefinition(attacker.id)?.survivesEqualAtkBattle || survivesBattleDestruction(attackerOwner) || cardIsIndestructibleByBattle(attacker, targetAtk);
                const targetSurvives = !!DuelEngine.getDefinition(target.id)?.survivesEqualAtkBattle || survivesBattleDestruction(defenderOwner) || cardIsIndestructibleByBattle(target, attackerAtk);
                if (!attackerSurvives) {
                    graveyardOfOwner(attackerOwner).push(attacker);
                    attackerField[attackerIndex] = null;
                }
                if (!targetSurvives) {
                    graveyardOfOwner(defenderOwner).push(target);
                    defenderField[targetIndex] = null;
                }
                addToLog(attackerSurvives || targetSurvives
                    ? `💫 Pareggio, ma ${attackerSurvives ? attacker.name : target.name} è immune e sopravvive!`
                    : '💫 Entrambe le carte sono distrutte!');
                if (!attackerSurvives) fireOnDestroy(attackerOwner, attackerIndex, attacker, target);
                if (!targetSurvives) fireOnDestroy(defenderOwner, targetIndex, target, attacker);
                if (attackerSurvives) fireOwnBattled(attacker, attackerOwner, target, targetSurvives);
                if (targetSurvives) fireOwnBattled(target, defenderOwner, attacker, attackerSurvives);
            }
        } else {
            // Paladino del Drago Bianco (id 398): "All'inizio del Damage
            // Step, se questa carta attacca un mostro coperto in
            // Posizione di Difesa: distruggilo (niente danno né
            // calcolo)" — caso speciale isolato, PRIMA di qualunque
            // confronto ATK/DEF o rivelazione normale: il mostro coperto
            // viene distrutto direttamente.
            if (attacker.id === 398 && targetSlot.isFaceDown) {
                graveyardOfOwner(defenderOwner).push(target);
                defenderField[targetIndex] = null;
                addToLog(`⚔️ ${attacker.name} distrugge istantaneamente ${yourPrefix}il mostro coperto, senza calcolo dei danni!`);
                fireOnDestroy(defenderOwner, targetIndex, target, attacker);
                fireOwnBattled(attacker, attackerOwner, target, false);
                return;
            }
            // Sfera Esplosiva / Blast Sphere (id 120): "se un mostro
            // dell'avversario attacca questa carta coperta in Posizione di
            // Difesa: si equipaggia al mostro attaccante, senza calcolo dei
            // danni. Distruggi il mostro equipaggiato e questa carta alla
            // Standby Phase del prossimo turno del tuo avversario e
            // infliggigli danno pari all'ATK del mostro equipaggiato" —
            // stesso caso speciale isolato di id 398 qui sopra (PRIMA di
            // qualunque confronto ATK/DEF), ma con detonazione ritardata
            // invece di distruzione immediata (vedi
            // gameState.pendingBlastSphereDetonations,
            // DuelEngine.processPendingBlastSphereDetonations).
            if (target.id === 120 && targetSlot.isFaceDown) {
                defenderField[targetIndex] = null;
                gameState.pendingBlastSphereDetonations = gameState.pendingBlastSphereDetonations || [];
                gameState.pendingBlastSphereDetonations.push({ sferaCard: target, sferaOwner: defenderOwner, attackerUid: attacker.uid, attackerOwner: attackerOwner, standbysRemaining: 1 });
                addToLog(`💣 ${yourPrefix}${target.name} si equipaggia a ${attacker.name}, senza calcolo dei danni! Detonerà alla prossima Standby Phase ${attackerOwner === 'player' ? 'tua' : 'del bot'}.`);
                fireOwnBattled(attacker, attackerOwner, target, true);
                return;
            }
            const willBeDestroyed = attackerAtk > targetDef;
            let targetSurvivedThisBattle = true;
            if (targetSlot.isFaceDown) {
                targetSlot.isFaceDown = false;
                addToLog(`🔎 ${yourPrefix ? 'Il tuo mostro coperto' : 'Il mostro coperto'} era ${target.name}!`);
                // Il flip 3D si vede solo se il mostro SOPRAVVIVE alla
                // rivelazione: se sta per essere distrutto qui sotto,
                // l'esplosione (triggerDestroyEffect, scatenata dopo il
                // ritorno di questa funzione) è già di per sé la sua
                // "rivelazione" — farle partire entrambe sullo stesso
                // elemento nello stesso istante le farebbe accavallare.
                if (!willBeDestroyed && window.CardRenderer && typeof CardRenderer.playFlipReveal === 'function') {
                    const defenderBoardId = defenderOwner === 'player' ? 'playerFieldBoard' : 'botFieldBoard';
                    const targetSlotEl = document.querySelector(`#${defenderBoardId} .field-slot[data-owner="${defenderOwner}"][data-type="monster"][data-index="${targetIndex}"]`);
                    if (targetSlotEl) CardRenderer.playFlipReveal(targetSlotEl, target, 'defense');
                }
                // Effetto FLIP (es. Insetto Divoratore Mostruoso, id 49): il
                // punto d'aggancio TRIGGER.ON_FLIP esisteva già in
                // duel-engine.js ma non veniva mai richiamato da nessuna
                // parte del gioco, quindi nessuna carta FLIP poteva mai
                // attivarsi. Solo se sopravvive (stesso motivo del flip 3D
                // qui sopra: una carta appena distrutta non ha più un
                // effetto da attivare) — questa stessa regola generale
                // soddisfa già per costruzione il testo di Lady Arpia 2
                // (id 783, "annulla gli effetti dei Mostri Flip che questa
                // carta distrugge in battaglia"): un Mostro Flip distrutto
                // in battaglia non attiva MAI il proprio effetto in questo
                // motore, per qualunque attaccante, quindi nessuna
                // registrazione dedicata serve per quella clausola.
                if (!willBeDestroyed && window.DuelEngine) {
                    const flipCtx = DuelEngine.makeContext(defenderOwner, { card: target, slotIndex: targetIndex });
                    DuelEngine.fireTrigger(DuelEngine.TRIGGER.ON_FLIP, flipCtx);
                }
            }
            if (willBeDestroyed && (survivesBattleDestruction(defenderOwner) || cardIsIndestructibleByBattle(target, attackerAtk))) {
                addToLog(`🙏 ${yourPrefix}${target.name} non viene distrutto in battaglia in questo turno!`);
            } else if (willBeDestroyed) {
                targetSurvivedThisBattle = false;
                graveyardOfOwner(defenderOwner).push(target);
                defenderField[targetIndex] = null;
                addToLog(`🛡️ ${yourPrefix}${target.name} è stato distrutto in Posizione di Difesa!`);
                // Danno perforante (es. Parshath il Cavaliere Alato, id 82):
                // se l'attaccante ha def.piercing, l'eccesso di ATK sopra la
                // DEF del difensore passa come danno diretto — stesso
                // meccanismo del ramo "Posizione di Attacco" più sopra, solo
                // per le carte che lo dichiarano esplicitamente (la regola
                // vera: normalmente un mostro in Difesa NON infligge/subisce
                // danno da LP quando viene distrutto in battaglia).
                // def.piercing: fisso sulla carta (es. Parshath). hasRacePiercing:
                // esteso a un intero Tipo mostro da un effetto continuo
                // ALTROVE sul campo (es. Furia del Drago, id 212, "i propri
                // mostri Tipo Drago infliggono danno perforante") — vedi
                // gameState.piercingRacesFor in duel-engine.js.
                const attackerPiercing = DuelEngine.getDefinition(attacker.id)?.piercing || DuelEngine.hasRacePiercing(attackerOwner, attacker.race) || DuelEngine.hasUidPiercing(attackerOwner, attacker.uid);
                if (attackerPiercing) {
                    const pierceDamage = attackerAtk - targetDef;
                    applyDamage(defenderOwner, pierceDamage, target);
                    fireOwnBattleDamageDealt(attacker, defenderOwner, targetIndex);
                    addToLog(`🗡️ Danno perforante! ${defenderOwner === 'player' ? 'Perdi' : 'Il bot perde'} ${pierceDamage} LP.`);
                }
                applyBattleDestroyBonus(attacker, defenderOwner);
                fireOnDestroy(defenderOwner, targetIndex, target, attacker);
            } else if (attackerAtk < targetDef) {
                let damage = targetDef - attackerAtk;
                // Canyon (id 767): raddoppia questo danno se il difensore è
                // Tipo Roccia e Canyon è scoperta come Magia Terreno (di
                // uno qualsiasi dei due giocatori: una Magia Terreno
                // riguarda l'intero Terreno, non solo chi la controlla,
                // stesso spirito di Umi/id 497) — unico punto in cui
                // l'attaccante subisce danno per aver attaccato un mostro
                // in Difesa più forte, quindi il posto giusto per un
                // moltiplicatore così di nicchia.
                const canyonActive = [gameState.playerFieldSpell, gameState.botFieldSpell].some((fs) => fs && !fs.isFaceDown && fs.card.id === 767);
                if (target.race === 'Roccia' && canyonActive) {
                    damage *= 2;
                    addToLog('🏜️ Canyon raddoppia il danno da battaglia!');
                }
                // Statua di Pietra degli Aztechi (id 758): "Double any
                // Battle Damage your opponent takes when they attack this
                // monster" — raddoppio legato alla carta stessa (si somma
                // moltiplicativamente a Canyon qui sopra, sono due
                // moltiplicatori distinti e indipendenti).
                if (target.id === 758) {
                    damage *= 2;
                    addToLog('🗿 Statua di Pietra degli Aztechi raddoppia il danno da battaglia!');
                }
                applyDamage(attackerOwner, damage, attacker);
                addToLog(`🧱 L'attacco ${attackerIsPlayer ? '' : 'del bot '}rimbalza! ${attackerOwner === 'player' ? 'Perdi' : 'Il bot perde'} ${damage} LP.`);
            } else {
                addToLog(`🛡️ L'attacco ${attackerIsPlayer ? '' : 'del bot '}non ha effetto.`);
            }
            // L'attaccante non viene MAI distrutto attaccando un mostro in
            // Posizione di Difesa in questo motore (coerente con le regole
            // vere): sopravvive sempre a questo ramo.
            fireOwnBattled(attacker, attackerOwner, target, targetSurvivedThisBattle);
            if (targetSurvivedThisBattle) fireOwnBattled(target, defenderOwner, attacker, true);
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
        if (window.SFX) SFX.destroy();
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

function setSpellTrap(card, slotIndex, handIndex = gameState.selectedCard.index, fromRect = null) {
    const handEl = document.querySelectorAll('#playerHand .card')[handIndex] || null;
    const slotEl = document.querySelector(`.field-slot[data-owner="player"][data-type="st"][data-index="${slotIndex}"]`);
    flyCardToSlot(card, fromRect || handEl, slotEl, () => {
        addToLog(`🪄 ${card.name} è stata piazzata sul Terreno.`);
        if (window.SFX) SFX.place();
        gameState.playerHand.splice(handIndex, 1);
        // setOnTurn ricorda in che turno è stata piazzata: serve al motore
        // effetti (js/engine/duel-engine.js) per applicare la regola classica "una
        // Trappola Set non si può attivare nello stesso turno in cui è stata
        // piazzata".
        gameState.playerSTField[slotIndex] = { card: card, isFaceDown: true, setOnTurn: gameState.turn };
        if (window.MP_broadcast && !window.MP_applyingRemote) {
            window.MP_broadcast({ kind: 'spelltrap', card, slotIndex });
        }
        clearSelection();
    }, handEl, true);
}

/**
 * Come setSpellTrap qui sopra, ma per una Magia Terreno: va SEMPRE nella
 * sua zona dedicata (gameState.playerFieldSpell, un solo oggetto, non un
 * array di 5 caselle) — mai in una delle 5 caselle Magia/Trappola comuni.
 * Se c'era già una Magia Terreno lì, va al Cimitero: attivarne una nuova
 * sostituisce sempre quella vecchia, come da regola vera.
 */
function setFieldSpell(card, handIndex = gameState.selectedCard.index, fromRect = null) {
    const handEl = document.querySelectorAll('#playerHand .card')[handIndex] || null;
    const slotEl = document.querySelector('.field-slot[data-owner="player"][data-type="field-spell"]');
    flyCardToSlot(card, fromRect || handEl, slotEl, () => {
        const existing = gameState.playerFieldSpell;
        if (existing) {
            gameState.playerGraveyard.push(existing.card);
            addToLog(`🌍 ${existing.card.name} lascia il Terreno, sostituita da ${card.name}.`);
        }
        addToLog(`🌍 ${card.name} è stata piazzata sulla zona Terreno.`);
        if (window.SFX) SFX.place();
        gameState.playerHand.splice(handIndex, 1);
        gameState.playerFieldSpell = { card: card, isFaceDown: true, setOnTurn: gameState.turn };
        if (window.MP_broadcast && !window.MP_applyingRemote) {
            window.MP_broadcast({ kind: 'fieldspell', card });
        }
        clearSelection();
    }, handEl, true);
}

// ============================================================
// DuelEngineUI — il "ponte" tra js/engine/duel-engine.js (che non sa nulla di
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
     * Richiamata da js/engine/duel-engine.js quando è il turno del GIOCATORE
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
    },

    /**
     * Box con una fila di carte scorrevole in orizzontale — per ogni
     * effetto-carta che deve mostrare più carte insieme invece di una
     * sola (es. "guarda la mano dell'avversario e scegline 1 mostro", "hai
     * scavato queste 5 carte del Deck"). `selectable: true` (default) rende
     * ogni carta cliccabile: cliccarla chiama onSelect(card, index) e
     * chiude il box; `selectable: false` lo rende solo informativo, con un
     * unico pulsante Chiudi. Se il box non esiste in pagina (fallback),
     * sceglie da sola la prima carta invece di bloccare l'effetto, stesso
     * spirito di openActivateModal qui sopra.
     */
    openCardListPicker(cards, { title, text, selectable = true, emptyText, onSelect, onCancel } = {}) {
        const modal = document.getElementById('cardListPickerModal');
        const row = document.getElementById('cardListPickerRow');
        if (!modal || !row) {
            if (selectable && cards.length > 0 && onSelect) onSelect(cards[0], 0);
            else if (onCancel) onCancel();
            return;
        }

        document.getElementById('cardListPickerTitle').textContent = title || '🃏 Scegli una carta';
        document.getElementById('cardListPickerText').textContent = text || '';

        const close = () => modal.classList.remove('open');

        row.innerHTML = '';
        if (cards.length === 0) {
            row.innerHTML = `<div class="card-list-empty">${emptyText || 'Nessuna carta disponibile.'}</div>`;
        } else {
            cards.forEach((card, index) => {
                const item = document.createElement('div');
                item.className = 'card-list-item' + (selectable ? '' : ' not-selectable');
                item.appendChild(createCardElement(card));
                if (selectable) {
                    item.onclick = () => {
                        close();
                        if (onSelect) onSelect(card, index);
                    };
                }
                row.appendChild(item);
            });
        }

        modal.classList.add('open');
        document.getElementById('cardListPickerCloseBtn').onclick = () => {
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
     * Stesso popover Attacco/Difesa già usato da openSummonModal per
     * l'Evocazione Normale, ma riutilizzabile da QUALUNQUE effetto-carta
     * che debba far scegliere una Posizione dopo un Special Summon (es.
     * Rinascita del Mostro, id 35) — nessun pulsante Annulla: una volta
     * scelto CHE mostro far tornare in campo, la regola vera impone
     * comunque di piazzarlo in una Posizione, non si può più fare
     * marcia indietro solo su questo secondo passaggio.
     */
    openPositionPicker(anchorEl, { title, onSelect } = {}) {
        const pop = openQuickPopover(anchorEl, `
            <div class="quick-popover-title">${title || 'Attacco o Difesa?'}</div>
            <div class="quick-popover-actions">
                <button type="button" class="quick-popover-btn attack icon-round" id="qpPositionAttack" title="Scoperta in Attacco"><span data-icon="attackPos"></span></button>
                <button type="button" class="quick-popover-btn defense icon-round" id="qpPositionDefense" title="Coperta in Difesa"><span data-icon="defensePos"></span></button>
            </div>
        `);
        pop.querySelector('#qpPositionAttack').onclick = () => { closeQuickPopover(); onSelect('attack'); };
        pop.querySelector('#qpPositionDefense').onclick = () => { closeQuickPopover(); onSelect('defense'); };
    },

    /**
     * Popover generico a 2 pulsanti per una scelta secondaria dopo aver
     * già selezionato una carta bersaglio (es. Predone Cyber, id 174:
     * prima scegli QUALE Carta Equipaggiamento con openCardListPicker,
     * poi se distruggerla o rubarla con questo) — più generico di
     * openPositionPicker qui sopra (Attacco/Difesa fissi), riusabile per
     * qualunque coppia di azioni testuali con icona.
     */
    openChoicePopover(anchorEl, { title, choiceA, choiceB } = {}) {
        const pop = openQuickPopover(anchorEl, `
            <div class="quick-popover-title">${title || ''}</div>
            <div class="quick-popover-actions">
                <button type="button" class="quick-popover-btn attack icon-round" id="qpChoiceA" title="${choiceA.label}">${choiceA.icon}</button>
                <button type="button" class="quick-popover-btn defense icon-round" id="qpChoiceB" title="${choiceB.label}">${choiceB.icon}</button>
            </div>
        `);
        pop.querySelector('#qpChoiceA').onclick = () => { closeQuickPopover(); choiceA.onSelect(); };
        pop.querySelector('#qpChoiceB').onclick = () => { closeQuickPopover(); choiceB.onSelect(); };
    }
};
