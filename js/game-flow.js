let gameState = {};

const attackArrowSVG = document.getElementById('attack-arrow-svg');
const attackArrowLine = document.getElementById('attack-arrow-line');
const logToggleBtn = document.getElementById('logToggleBtn');
const gameLogContainer = document.getElementById('gameLogContainer');
let isDraggingAttack = false;
let attackDragStart = { x: 0, y: 0, attackerIndex: -1, forcedDirect: false };
let phaseTransitionTimeout = null;
let duelStartTime = null;
let duelTimerInterval = null;

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
 * Annuncio a schermo per cambi Fase, in stile Master Duel.
 * variant: 'phase' (oro, default) | 'battle' (rosso/oro, stessa dimensione
 * e stesso ritmo delle altre fasi — la Battle Phase non ha più un
 * trattamento speciale: quello ora è riservato al cambio turno, vedi
 * showEpicSlamAnnouncement() più sotto).
 */
function showPhaseAnnouncement(title, subtitle, variant = 'phase') {
    const existing = document.getElementById('phaseAnnouncement');
    if (existing) existing.remove();

    const wrap = document.createElement('div');
    wrap.id = 'phaseAnnouncement';
    wrap.className = variant === 'battle' ? 'phase-announce--battle' : 'phase-announce--phase';
    wrap.innerHTML = `
        <div class="phase-announce-banner">
            <div class="phase-announce-title">${title}</div>
            ${subtitle ? `<div class="phase-announce-sub">${subtitle}</div>` : ''}
        </div>
    `;
    document.body.appendChild(wrap);
    if (window.SFX) SFX.phaseChange();

    const duration = 1300;
    wrap.style.setProperty('--phase-anim-duration', `${duration}ms`);
    void wrap.offsetWidth;
    wrap.classList.add('phase-announce-play');
    setTimeout(() => wrap.remove(), duration + 80);
}

/**
 * Annuncio epico "cinematografico", in stile Master Duel: dura 3 secondi e
 * combina flash a schermo, barre cinematografiche, raggi rotanti e due
 * parole che si scontrano al centro con impatto e leggero screen-shake.
 * Riservato al momento più "importante" del duello — il cambio turno tra
 * giocatore e bot (vedi changeTurn()) — non più alla Battle Phase, che ora
 * usa lo stesso trattamento delle altre fasi (showPhaseAnnouncement sopra).
 */
function showEpicSlamAnnouncement(wordLeft, wordRight, subtitle) {
    const existing = document.getElementById('battleStartOverlay');
    if (existing) existing.remove();

    // Senza wordRight (es. la frase intera "IT'S MY TURN!" del giocatore)
    // mostriamo una sola parola/frase centrata, più piccola per starci su
    // una riga — non lo scontro fra due parole separate.
    const wordsHtml = wordRight
        ? `<span class="battle-start-word battle-start-word--left">${wordLeft}</span><span class="battle-start-word battle-start-word--right">${wordRight}</span>`
        : `<span class="battle-start-word battle-start-word--left battle-start-word--solo">${wordLeft}</span>`;

    const overlay = document.createElement('div');
    overlay.id = 'battleStartOverlay';
    overlay.innerHTML = `
        <div class="battle-start-flash"></div>
        <div class="battle-start-rays"></div>
        <div class="battle-start-bar bar-top"></div>
        <div class="battle-start-bar bar-bottom"></div>
        <div class="battle-start-title">${wordsHtml}</div>
        <div class="battle-start-sub">${subtitle}</div>
    `;
    document.body.appendChild(overlay);
    void overlay.offsetWidth;
    overlay.classList.add('play');

    const container = document.querySelector('.game-container') || document.body;
    container.classList.add('fx-shake');
    setTimeout(() => container.classList.remove('fx-shake'), 450);

    setTimeout(() => overlay.remove(), 3000);
}

/**
 * Pesca `amount` carte per il giocatore indicato. Se resetGameState() ha
 * potuto costruire un mazzo REALE (gameState.playerDeck/botDeck — vedi
 * lì per quando succede: partite offline, con un deck del giocatore
 * salvato e/o un avversario con un deck a tema), si pesca da lì, nel
 * vero ordine mescolato. Altrimenti (Multiplayer, o il Bot generico del
 * Duello Demo che non ha un deck proprio) resta il vecchio comportamento:
 * un semplice contatore e una carta casuale dall'intero pool.
 */
function drawCardsToHand(owner, amount) {
    const handKey = owner === 'player' ? 'playerHand' : 'botHand';
    const deckKey = owner === 'player' ? 'playerDeck' : 'botDeck';
    const countKey = owner === 'player' ? 'playerDeckCount' : 'botDeckCount';
    const realDeck = gameState[deckKey];
    let drawn = 0;

    for (let i = 0; i < amount; i++) {
        if (realDeck) {
            if (realDeck.length === 0) break;
            gameState[handKey].push(realDeck.pop());
            gameState[countKey] = realDeck.length;
        } else {
            if (gameState[countKey] <= 0) break;
            gameState[countKey] -= 1;
            gameState[handKey].push(createRandomCard());
        }
        drawn++;
    }

    return drawn;
}

/**
 * Anima le ultime `count` carte in mano al giocatore con lo stesso
 * trattamento (sfilata da destra + FX.playDrawEffect + SFX.draw) della
 * pescata di inizio turno — vedi finishDrawEffect più sotto — ma per
 * pescate causate da un effetto carta (es. Vaso dell'Avidità) invece che
 * dal normale ciclo di turno. Va chiamata SOLO dopo che il DOM della mano
 * riflette già le nuove carte (cioè dopo un updateUI()): chiamarla prima
 * e lasciare che un updateUI() successivo ricostruisca la mano
 * "staccherebbe" i nodi appena animati dal documento, esattamente come
 * succedeva con l'esplosione di distruzione prima del fix in actions.js
 * (resolveAttack) — vedi il commento lì. Il bot non ha la mano mostrata
 * a schermo, quindi per lui non c'è nulla da animare.
 */
function animateEffectDraw(owner, count) {
    if (owner !== 'player' || count <= 0) return;
    const handEl = document.getElementById('playerHand');
    if (!handEl) return;
    const cards = Array.from(handEl.querySelectorAll('.card')).slice(-count);
    const STAGGER_MS = 300;
    cards.forEach((cardEl, index) => {
        setTimeout(() => {
            cardEl.classList.add('deal-in');
            if (window.FX) FX.playDrawEffect(cardEl);
            if (window.SFX) SFX.draw();
            setTimeout(() => cardEl.classList.remove('deal-in'), 320);
        }, index * STAGGER_MS);
    });
}

function initGame() {
    if (logToggleBtn) {
        logToggleBtn.onclick = toggleLog;
    }
    setupSurrenderButton();
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
    startDuelTimer();
    updateUI();
    // Ogni carta della mano appena renderizzata resta invisibile (vedi
    // .card.pending-deal in CSS) finché la telecamera non ha finito di
    // "atterrare" sul campo: solo a quel punto dealHandWithStagger() le
    // rivela una alla volta, non tutte insieme.
    markHandCardsPending();

    playCameraIntro(() => {
        // L'avanzamento di fase parte SOLO dopo che l'ultima carta della
        // mano ha finito di comparire, mai in sovrapposizione col dealing.
        dealHandWithStagger(() => {
            addToLog(gameState.currentPlayer === 'player'
                ? '🎮 Duello iniziato! È il tuo turno. Inizia la Draw Phase.'
                : '🎮 Duello iniziato! Turno dell\'avversario.');
            if (gameState.currentPlayer === 'player') {
                setTimeout(enterDrawPhase, 500);
            }
        });
    });
}

/**
 * Zoomata 3D d'apertura: il campo "atterra" dall'alto nell'inquadratura
 * definitiva (dall'alto, piatta). Durata legata alla keyframe CSS
 * cameraIntroZoomOut (1700ms) — se cambi una, aggiorna anche l'altra.
 */
function playCameraIntro(onDone) {
    const container = document.querySelector('.game-container');
    if (!container) { onDone(); return; }
    const DURATION = 1700;
    container.classList.add('camera-intro');
    setTimeout(() => {
        container.classList.remove('camera-intro');
        if (typeof onDone === 'function') onDone();
    }, DURATION);
}

/**
 * Marca ogni carta attualmente in mano come "in attesa" (invisibile):
 * chiamata subito dopo il render iniziale, PRIMA che dealHandWithStagger()
 * le riveli una alla volta. La classe vive sulla singola carta apposta —
 * se vivesse sul contenitore .hand, rimuoverla farebbe comparire tutte le
 * carte insieme invece che in sequenza.
 */
function markHandCardsPending() {
    const handEl = document.getElementById('playerHand');
    if (!handEl) return;
    handEl.querySelectorAll('.card').forEach((cardEl) => cardEl.classList.add('pending-deal'));
}

/**
 * Rivela le carte della mano iniziale una alla volta, ogni 0.3s, con lo
 * stesso effetto "pescata" (FX.playDrawEffect) usato per le pescate
 * successive — così l'apertura di mano sembra un vero e proprio dealing
 * di carte invece di comparire tutta insieme. `onComplete` scatta SOLO
 * dopo che l'ultima carta ha finito di comparire, mai prima: chi chiama
 * questa funzione (initGame) aspetta onComplete prima di far partire la
 * Draw Phase, così l'avanzamento di fase non si sovrappone mai al dealing.
 */
function dealHandWithStagger(onComplete) {
    const done = typeof onComplete === 'function' ? onComplete : function () {};
    const handEl = document.getElementById('playerHand');
    if (!handEl) { done(); return; }
    const cards = Array.from(handEl.querySelectorAll('.card'));
    const STAGGER_MS = 300;
    const REVEAL_MS = 320;
    cards.forEach((cardEl, index) => {
        setTimeout(() => {
            cardEl.classList.remove('pending-deal');
            cardEl.classList.add('deal-in');
            if (window.FX) FX.playDrawEffect(cardEl);
            if (window.SFX) SFX.draw();
            setTimeout(() => cardEl.classList.remove('deal-in'), REVEAL_MS);
        }, index * STAGGER_MS);
    });
    const totalDuration = cards.length > 0 ? (cards.length - 1) * STAGGER_MS + REVEAL_MS : 0;
    setTimeout(done, totalDuration);
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

    // Mazzi REALI, solo offline: se il giocatore ha un deck salvato e/o
    // l'avversario è un personaggio con un deck a tema (o "Te Stesso",
    // che usa lo STESSO deck del giocatore), si pesca da lì invece che
    // dal pool casuale generico — vedi drawCardsToHand(). In Multiplayer
    // ogni client gestisce solo il proprio lato comunque, quindi qui
    // tocca solo "player"; senza un deck valido (es. Duello Demo contro
    // il Bot generico, che non ha un deck proprio) resta il vecchio
    // comportamento a pool casuale, senza rompere nulla.
    const playerDeckSpec = window.SaveManager ? SaveManager.getDecks()[0] : null;
    if (playerDeckSpec && typeof buildDeckFromSpec === 'function') {
        const built = buildDeckFromSpec(playerDeckSpec);
        if (built) {
            gameState.playerDeck = built;
            gameState.playerDeckCount = built.length;
        }
    }

    if (!window.MULTIPLAYER_MODE) {
        const opponent = window.DuelSession ? DuelSession.opponent : null;
        let botDeckSpec = null;
        if (opponent && opponent.id === 'mirror') {
            botDeckSpec = playerDeckSpec; // Te Stesso: lo stesso mazzo del giocatore
        } else if (opponent && opponent.id && typeof getCharacterDeck === 'function') {
            botDeckSpec = getCharacterDeck(opponent.id);
        }
        if (botDeckSpec && typeof buildDeckFromSpec === 'function') {
            const built = buildDeckFromSpec(botDeckSpec);
            if (built) {
                gameState.botDeck = built;
                gameState.botDeckCount = built.length;
            }
        }
    }
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

/**
 * Fa scendere di 1 il conto alla rovescia delle Magie/Trappole Continue a
 * durata limitata (es. Spada Rivelatrice, 3 turni) e le manda al Cimitero
 * da sole quando arrivano a 0 — invece di restare per sempre come le
 * Magie Continue normali. Il conteggio scende una volta per ogni turno
 * dell'AVVERSARIO di chi ha attivato la carta (l'effetto dura "3 turni
 * dell'avversario"), quindi va chiamata da changeTurn() dopo aver
 * aggiornato gameState.currentPlayer.
 */
function tickContinuousEffectDurations() {
    ['player', 'bot'].forEach((owner) => {
        const opponent = owner === 'player' ? 'bot' : 'player';
        if (gameState.currentPlayer !== opponent) return;
        const field = owner === 'player' ? gameState.playerSTField : gameState.botSTField;
        const graveyard = owner === 'player' ? gameState.playerGraveyard : gameState.botGraveyard;
        field.forEach((slot, index) => {
            if (!slot || slot.isFaceDown || typeof slot.turnsLeft !== 'number') return;
            slot.turnsLeft -= 1;
            if (slot.turnsLeft <= 0) {
                addToLog(`⌛ ${slot.card.name} ${owner === 'player' ? 'ti' : 'gli'} ha esaurito il suo effetto e va al Cimitero.`);
                graveyard.push(slot.card);
                field[index] = null;
            }
        });
    });
}

function changeTurn() {
    clearPhaseTransitionTimeout();
    addToLog(`🔄 Turno ${gameState.turn} terminato.`);
    gameState.turn++;
    gameState.currentPlayer = gameState.currentPlayer === 'player' ? 'bot' : 'player';
    tickContinuousEffectDurations();
    updateDuelTimer();
    if (window.SFX) SFX.turnChange();
    const isPlayerTurn = gameState.currentPlayer === 'player';
    // Il cambio turno è il momento più "importante" del duello: qui, e non
    // più all'inizio della Battle Phase, va l'annuncio cinematografico da
    // 3 secondi (flash, barre, raggi, parole che si scontrano). Il turno
    // del giocatore ha la sua battuta iconica in stile anime; quello del
    // bot resta "TURNO" + nome, split in due parole che si scontrano.
    if (isPlayerTurn) {
        showEpicSlamAnnouncement("IT'S MY TURN!", '', `Turno ${gameState.turn}`);
    } else {
        const wordRight = window.MULTIPLAYER_MODE ? 'RIVALE' : 'BOT';
        showEpicSlamAnnouncement('TURNO', wordRight, `Turno ${gameState.turn}`);
    }
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
    // Il turno vero e proprio (pescata del bot o del giocatore) parte solo
    // a annuncio concluso, così non si sovrappone alla scena cinematografica.
    if (gameState.currentPlayer === 'bot') {
        if (!window.MULTIPLAYER_MODE) setTimeout(botTurn, 3000);
    } else {
        setTimeout(() => enterDrawPhase(true), 3000);
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

    // `animateNewCard`: la carta appena pescata scorre in mano da destra,
    // stesso identico effetto (e stessa durata, 0.3s) della mano iniziale
    // — vedi .card.deal-in in CSS. Va animata DOPO updateUI(), che è il
    // momento in cui la carta compare davvero nel DOM della mano.
    const finishDrawEffect = (animateNewCard) => {
        updateUI();
        if (animateNewCard && handEl) {
            const cards = handEl.querySelectorAll('.card');
            const lastCard = cards[cards.length - 1];
            if (lastCard) {
                lastCard.classList.add('deal-in');
                if (window.FX) FX.playDrawEffect(lastCard);
                if (window.SFX) SFX.draw();
                setTimeout(() => lastCard.classList.remove('deal-in'), 320);
            }
        }
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
            let drawnToPlayerHand = false;
            if (gameState.currentPlayer === 'player') {
                const drawn = drawCardsToHand('player', 1);
                if (drawn > 0) {
                    const drawnCard = gameState.playerHand[gameState.playerHand.length - 1];
                    addToLog(`Hai pescato: ${drawnCard.name}`);
                    drawnToPlayerHand = true;
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
            finishDrawEffect(drawnToPlayerHand);
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
    showPhaseAnnouncement('Battaglia', 'Battle Phase', 'battle');
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

/**
 * Anima il numero dei LP con un "conteggio" fluido invece di scattare
 * istantaneamente al nuovo valore (effetto contatore, stile Master Duel),
 * più un impulso di colore rosso (danno) o verde (recupero) sul contenitore.
 */
function animateLifePoints(el, newValue) {
    if (!el) return;
    const container = el.closest('.life-points');
    const oldValue = parseInt(el.dataset.lpValue ?? el.textContent, 10) || 0;
    el.dataset.lpValue = newValue;
    if (oldValue === newValue) {
        el.textContent = newValue;
        return;
    }
    if (container) {
        container.classList.remove('lp-hit', 'lp-heal');
        void container.offsetWidth;
        container.classList.add(newValue < oldValue ? 'lp-hit' : 'lp-heal');
        setTimeout(() => container.classList.remove('lp-hit', 'lp-heal'), 1000);
    }
    // Conteggio quasi lineare (leggero ease-out solo in coda) invece che
    // una decelerazione immediata: si legge come i LP che "ticchettano"
    // verso il basso uno via l'altro, come nell'anime, non come un
    // semplice fade tra due numeri.
    const duration = 1000;
    const start = performance.now();
    const step = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 2);
        const current = Math.round(oldValue + (newValue - oldValue) * eased);
        el.textContent = Math.max(current, 0);
        if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
}

function renderLifePoints() {
    const playerLPEl = document.getElementById('playerLP');
    const botLPEl = document.getElementById('botLP');
    animateLifePoints(playerLPEl, gameState.playerLP);
    animateLifePoints(botLPEl, gameState.botLP);

    const playerInfo = document.getElementById('playerInfo');
    const botInfo = document.getElementById('botInfo');
    if (playerInfo) playerInfo.classList.toggle('active-turn', gameState.currentPlayer === 'player');
    if (botInfo) botInfo.classList.toggle('active-turn', gameState.currentPlayer === 'bot');
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
                // Un mostro coperto resta "coperto" per le regole (flip,
                // reveal-on-attack, ecc. — vedi js/actions.js), ma se
                // l'avversario ha un effetto tipo Spada Rivelatrice attivo
                // contro il suo proprietario lo mostriamo scoperto A
                // SCHERMO: solo la resa visiva cambia, slot.isFaceDown
                // resta true ovunque nella logica di gioco.
                const visuallyFaceDown = slot.isFaceDown && !(isMonsterRow && window.DuelEngine && DuelEngine.isRevealedFor(owner));
                const cardEl = createCardElement(slot.card, visuallyFaceDown, slot.position);
                cardEl.onclick = (event) => {
                    event.stopPropagation();
                    if (!dragState) {
                        handleCardClick(slot.card, slotType, index, owner, visuallyFaceDown);
                    }
                };
                cardEl.onmouseenter = () => {
                    if (dragState) return;
                    updateCardInfoPanel(slot.card, { sourceType: slotType, sourceOwner: owner, isFaceDown: visuallyFaceDown });
                };
                if (isMonsterRow && owner === 'player' && gameState.phase === 'battle' && !slot.hasAttacked && slot.position === 'attack' && !(window.DuelEngine && DuelEngine.cannotAttack('player'))) {
                    cardEl.classList.add('can-attack');
                    cardEl.onpointerdown = (event) => startAttackDrag(event, index);
                }
                slotEl.appendChild(cardEl);
                // ATK/DEF sotto la carta, stile Duel Masters: solo per i
                // mostri SCOPERTI (un mostro coperto non rivela le sue
                // statistiche, a meno che non sia stato reso visibile da
                // un effetto come Spada Rivelatrice). Appesa allo SLOT,
                // non alla carta: .card ha overflow:hidden (vedi
                // js/card.css), quindi un'etichetta che sporge sotto il
                // bordo verrebbe tagliata se fosse figlia della carta stessa.
                if (isMonsterRow && slot.card.type === 'monster' && !visuallyFaceDown) {
                    const statsBadge = document.createElement('div');
                    statsBadge.className = 'field-stats-badge';
                    statsBadge.innerHTML = `<span class="fsb-atk">${slot.card.attack}</span><span class="fsb-sep">/</span><span class="fsb-def">${slot.card.defense}</span>`;
                    slotEl.appendChild(statsBadge);
                }
                // Spada Rivelatrice attiva: bagliore verde "a spade dall'alto"
                // sulla carta + contatore dei turni rimasti, così si vede
                // subito quanto manca prima che l'effetto svanisca da solo.
                if (!isMonsterRow && slot.card.id === 8 && !slot.isFaceDown && typeof slot.turnsLeft === 'number') {
                    cardEl.classList.add('revealing-light-active');
                    const turnsBadge = document.createElement('div');
                    turnsBadge.className = 'field-turns-badge';
                    turnsBadge.textContent = `⏳ ${slot.turnsLeft}`;
                    slotEl.appendChild(turnsBadge);
                }
            }
            row.appendChild(slotEl);
        });

        if (!isMirrored) {
            row.appendChild(secondSpecial);
        } else {
            row.appendChild(firstSpecial);
        }
        // Spada Rivelatrice attiva: le SPADE brillano sopra l'intera fila
        // Mostri del lato colpito (non solo sulla carta che l'ha attivata),
        // così si vede subito CHI non può attaccare ed è scoperto.
        if (isMonsterRow && window.DuelEngine && DuelEngine.isRevealedFor(owner)) {
            row.classList.add('monster-row-revealed');
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
    }, true, true));

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

    // Il bot non ha mostri: qualunque punto tu rilasci, l'attacco sarà per
    // forza diretto. Invece di farti mirare con precisione, la freccia si
    // blocca subito verso il box LP del bot e mostra il warning laterale
    // in anteprima, così è chiaro fin da subito cosa sta per succedere.
    attackDragStart.forcedDirect = !gameState.botMonsterField.some((monster) => monster !== null);
    if (attackDragStart.forcedDirect) {
        const botInfoEl = document.getElementById('botInfo');
        if (botInfoEl) {
            const botRect = botInfoEl.getBoundingClientRect();
            attackArrowLine.setAttribute('x2', botRect.left + botRect.width / 2);
            attackArrowLine.setAttribute('y2', botRect.top + botRect.height / 2);
        }
        showDirectAttackHint();
    }

    document.addEventListener('pointermove', dragAttackArrow);
    document.addEventListener('pointerup', endAttackDrag);
    document.addEventListener('pointercancel', endAttackDrag);
}

function dragAttackArrow(event) {
    if (!isDraggingAttack) return;
    // Con l'attacco forzatamente diretto (vedi startAttackDrag) la freccia
    // resta ancorata al bot: non segue il puntatore.
    if (attackDragStart.forcedDirect) return;
    attackArrowLine.setAttribute('x2', event.clientX);
    attackArrowLine.setAttribute('y2', event.clientY);
}

function endAttackDrag(event) {
    if (!isDraggingAttack) return;
    isDraggingAttack = false;
    attackArrowSVG.style.display = 'none';
    hideDirectAttackHint();
    document.removeEventListener('pointermove', dragAttackArrow);
    document.removeEventListener('pointerup', endAttackDrag);
    document.removeEventListener('pointercancel', endAttackDrag);

    // Attacco forzatamente diretto: qualunque punto dello schermo si
    // rilasci il dito/mouse, è comunque l'unico attacco possibile.
    if (attackDragStart.forcedDirect) {
        executeAttack(attackDragStart.attackerIndex, -1);
        return;
    }

    const targetElement = document.elementFromPoint(event.clientX, event.clientY);
    const targetSlot = targetElement ? targetElement.closest('.field-slot') : null;
    const hasBotMonsters = gameState.botMonsterField.some(monster => monster !== null);
    const isBotInfoTarget = !!targetElement && (targetElement.closest('#botInfo') || targetElement.id === 'botInfo' || targetElement.closest('.player-info#botInfo'));

    if (targetSlot && targetSlot.dataset.owner === 'bot' && targetSlot.dataset.type === 'monster' && gameState.botMonsterField[parseInt(targetSlot.dataset.index, 10)]) {
        executeAttack(attackDragStart.attackerIndex, parseInt(targetSlot.dataset.index, 10));
        return;
    }
    if (isBotInfoTarget && !hasBotMonsters) {
        executeAttack(attackDragStart.attackerIndex, -1);
        return;
    }

    // Rilascio impreciso ma comunque vicino al campo del bot (es. su uno
    // slot vuoto adiacente, o tra due elementi): prima questo caso non
    // faceva NULLA, in silenzio — un dito che manca lo slot esatto per
    // pochi pixel buttava via l'intero attacco senza alcuna spiegazione.
    // Ora si punta al mostro del bot più vicino al punto di rilascio,
    // finché resta ragionevolmente dentro l'area del suo campo.
    if (hasBotMonsters) {
        const nearestIndex = findNearestBotMonsterSlot(event.clientX, event.clientY);
        if (nearestIndex !== -1) {
            executeAttack(attackDragStart.attackerIndex, nearestIndex);
            return;
        }
    }

    // Nessun bersaglio valido nemmeno per approssimazione: invece di non
    // fare nulla in silenzio, si spiega perché l'attacco non è partito.
    addToLog(hasBotMonsters
        ? '❌ Rilascia l\'attacco su un mostro del bot per colpirlo.'
        : '❌ Rilascia l\'attacco sul box del Bot per un attacco diretto.');
}

/**
 * Trova lo slot mostro del bot più vicino al punto (x, y) di rilascio del
 * trascinamento d'attacco, per il fallback "rilascio impreciso" qui sopra.
 * Torna -1 se il punto è troppo lontano dal campo del bot per essere
 * ragionevolmente un tentativo di colpirne un mostro (es. un rilascio
 * accidentale altrove sullo schermo non deve "agganciarsi" a un bersaglio).
 */
function findNearestBotMonsterSlot(x, y) {
    const board = document.getElementById('botFieldBoard');
    if (!board) return -1;
    const boardRect = board.getBoundingClientRect();
    const margin = 70;
    if (x < boardRect.left - margin || x > boardRect.right + margin || y < boardRect.top - margin || y > boardRect.bottom + margin) {
        return -1;
    }
    let bestIndex = -1;
    let bestDist = Infinity;
    gameState.botMonsterField.forEach((slot, index) => {
        if (!slot) return;
        const el = document.querySelector(`#botFieldBoard .field-slot[data-owner="bot"][data-type="monster"][data-index="${index}"]`);
        if (!el) return;
        const r = el.getBoundingClientRect();
        const dist = Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2));
        if (dist < bestDist) {
            bestDist = dist;
            bestIndex = index;
        }
    });
    return bestIndex;
}

/**
 * `directDirection` ('up' | 'down' | null): solo per un attacco DIRETTO
 * (nessun mostro bersaglio). L'attaccante non ha una carta-bersaglio verso
 * cui lanciarsi, quindi si lancia dritto verso la metà alta dello schermo
 * (il Bot subisce) o quella bassa (il giocatore subisce) — stessa
 * direzione dell'impatto epico a mezzo schermo (vedi showHalfScreenImpact).
 * Per un attacco a un mostro, invece, si lancia dritto sul suo bersaglio.
 */
function showBattleEffect(attackerEl, targetEl, directDirection) {
    if (attackerEl) {
        attackerEl.classList.remove('is-attacking');
        void attackerEl.offsetWidth;

        const aRect = attackerEl.getBoundingClientRect();
        let dx = 0;
        let dy = 0;
        if (directDirection) {
            const margin = aRect.height * 0.5;
            dy = directDirection === 'up' ? -(aRect.top - margin) : (window.innerHeight - aRect.bottom - margin);
        } else if (targetEl) {
            const tRect = targetEl.getBoundingClientRect();
            // Si ferma un po' prima del centro esatto del bersaglio (82%):
            // sembra un impatto, non un attraversamento.
            dx = ((tRect.left + tRect.width / 2) - (aRect.left + aRect.width / 2)) * 0.82;
            dy = ((tRect.top + tRect.height / 2) - (aRect.top + aRect.height / 2)) * 0.82;
        }
        attackerEl.style.setProperty('--charge-dx', `${dx}px`);
        attackerEl.style.setProperty('--charge-dy', `${dy}px`);

        attackerEl.classList.add('is-attacking');
        setTimeout(() => attackerEl.classList.remove('is-attacking'), 650);
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

        targetEl.classList.remove('being-hit');
        void targetEl.offsetWidth;
        targetEl.classList.add('being-hit');
        setTimeout(() => targetEl.classList.remove('being-hit'), 500);
    }
}

/**
 * Convenzione del segno (stessa di ACTIONS.dealDamage in duel-engine.js,
 * "può essere negativo per curare"): `value` positivo = danno subito da
 * `owner` (Life Points che scendono), negativo = cura. L'unico chiamante
 * reale oggi è resolveBattleDamage in actions.js, che passa sempre un
 * importo positivo (il danno appena calcolato).
 */
function showFloatingDamage(value, anchorEl, owner) {
    showEpicDamageNumber(value);
    if (value > 0 && owner) showHalfScreenImpact(owner);

    if (!anchorEl) return;
    const rect = anchorEl.getBoundingClientRect();
    const el = document.createElement('div');
    el.className = `floating-damage ${value > 0 ? 'damage' : 'heal'}`;
    el.textContent = value > 0 ? `-${value}` : `+${Math.abs(value)}`;
    el.style.left = `${rect.left + rect.width / 2 - 18}px`;
    el.style.top = `${rect.top - 6}px`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 950);

    if (value > 0 && window.FX) {
        FX.playDamageEffect(value, { anchorEl });
    }
    if (window.SFX) {
        if (value > 0) SFX.damage(); else if (value < 0) SFX.heal();
    }
}

/**
 * Impatto epico su mezza schermata quando si SUBISCE danno: la metà alta
 * (dove sta il Bot) o bassa (dove sta il giocatore) si accende di rosso —
 * molto più "epico" di un piccolo effetto sul solo box LP. `owner` è chi
 * ha PERSO i Life Points.
 */
function showHalfScreenImpact(owner) {
    const existing = document.getElementById('halfScreenImpact');
    if (existing) existing.remove();

    const el = document.createElement('div');
    el.id = 'halfScreenImpact';
    el.className = owner === 'bot' ? 'top' : 'bottom';
    el.innerHTML = `
        <div class="hsi-vignette"></div>
        <div class="hsi-flash"></div>
        <div class="hsi-cracks"></div>
        <div class="hsi-edge-glow"></div>
    `;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 900);
}

/**
 * Numero enorme a centro schermo quando si perdono (o recuperano) Life
 * Points, in stile anime: il colpo si vede al centro della scena mentre il
 * contatore nel box LP scende con l'animazione di animateLifePoints().
 */
function showEpicDamageNumber(value) {
    const existing = document.getElementById('epicDamageBurst');
    if (existing) existing.remove();

    const el = document.createElement('div');
    el.id = 'epicDamageBurst';
    el.className = value > 0 ? 'epic-damage-burst dmg' : 'epic-damage-burst heal';
    el.innerHTML = `
        <div class="epic-damage-value">${value > 0 ? '−' : '+'}${Math.abs(value)}</div>
        <div class="epic-damage-label">${value > 0 ? 'Life Points' : 'Recupero'}</div>
    `;
    document.body.appendChild(el);
    void el.offsetWidth;
    el.classList.add('play');
    setTimeout(() => el.remove(), 1150);
}

/**
 * Avviso "ATTACCO DIRETTO", stile Yu-Gi-Oh! Master Duel: due barre a
 * strisce diagonali che entrano dai lati dello schermo, con la scritta al
 * centro. Richiamato solo quando un attacco colpisce i Life Points senza
 * passare da un mostro avversario (vedi resolveBattleDamage in actions.js).
 */
function showDirectAttackWarning() {
    const existing = document.getElementById('directAttackWarning');
    if (existing) existing.remove();

    const el = document.createElement('div');
    el.id = 'directAttackWarning';
    el.innerHTML = `
        <div class="daw-bar daw-bar--left"><span class="daw-bar-text">ATTACCO DIRETTO</span></div>
        <div class="daw-bar daw-bar--right"><span class="daw-bar-text">ATTACCO DIRETTO</span></div>
        <div class="daw-center-label">Attacco Diretto!</div>
    `;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1450);
}

/**
 * Anteprima "live" delle barre ATTACCO DIRETTO durante il trascinamento
 * (vedi startAttackDrag): a differenza di showDirectAttackWarning(), che
 * scompare da sola dopo l'impatto, questa resta finché non viene chiusa a
 * mano con hideDirectAttackHint() (il rilascio del trascinamento).
 */
function showDirectAttackHint() {
    hideDirectAttackHint();
    const el = document.createElement('div');
    el.id = 'directAttackHint';
    el.innerHTML = `
        <div class="daw-bar daw-bar--left daw-bar--hint"><span class="daw-bar-text">ATTACCO DIRETTO</span></div>
        <div class="daw-bar daw-bar--right daw-bar--hint"><span class="daw-bar-text">ATTACCO DIRETTO</span></div>
    `;
    document.body.appendChild(el);
}

function hideDirectAttackHint() {
    const el = document.getElementById('directAttackHint');
    if (el) el.remove();
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
    // Deck e Cimitero condividono lo stesso linguaggio visivo di "pila di
    // carte coperte" (vedi sotto): stesse classi/offset CSS (.deck-slot,
    // .deck-preview:nth-child), anche se sono due zone di gioco diverse.
    const isPileZone = options.zone === 'deck' || options.zone === 'graveyard';
    if (isPileZone) slotEl.classList.add('deck-slot');
    if (owner === 'bot' && isPileZone) slotEl.classList.add('bot-deck-slot');
    slotEl.dataset.owner = owner;
    slotEl.dataset.type = type;
    if (index !== -1) slotEl.dataset.index = index;
    if (options.zone) slotEl.dataset.zone = options.zone;
    slotEl.onclick = () => {
        if (!options.special) {
            handleSlotClick(owner, type, index);
        }
    };

    if (isPileZone) {
        // 0 carte -> zona vuota, 1 carta -> un solo dorso, 2+ carte -> pila
        // di 3 dorsi sfalsati (fallback CSS via .deck-preview:nth-child,
        // sostituita automaticamente da images/cards/backPilaCards.jpeg se
        // quel file esiste — vedi js/card-renderer.js).
        const pileCount = options.count || 0;
        if (pileCount === 1) {
            CardRenderer.appendDeckPile(slotEl, 1);
        } else if (pileCount > 1) {
            CardRenderer.appendDeckPile(slotEl, 3);
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

// I 5 pezzi di Exodia il Proibito (vedi js/cards-db.js, id 11 e 41-44):
// chi li ha tutti e 5 in mano vince il duello all'istante, a prescindere
// dai Life Points — regola storica della prima serie.
const EXODIA_PIECE_IDS = [11, 41, 42, 43, 44];

function hasExodiaAssembled(hand) {
    return EXODIA_PIECE_IDS.every((pieceId) => hand.some((card) => card.id === pieceId));
}

function checkGameOver() {
    if (gameState.gameOver) return;

    if (hasExodiaAssembled(gameState.playerHand)) {
        addToLog('✨ Hai riunito tutti e 5 i pezzi di Exodia il Proibito! Vittoria automatica!');
        endDuel(true);
        return;
    }
    if (hasExodiaAssembled(gameState.botHand)) {
        addToLog('✨ Il bot ha riunito tutti e 5 i pezzi di Exodia il Proibito! Vittoria automatica!');
        endDuel(false);
        return;
    }

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
    stopDuelTimer();
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
 * Pulsante "Abbandona" (in alto a destra, accanto al contatore turni/tempo):
 * unico modo per uscire da un duello in corso, dato che l'icona 🏠 di
 * ritorno al menu è stata rimossa dalla pagina apposta per questo.
 * Chiede conferma con il modale #surrenderModal e, se confermato, chiude
 * il duello come una sconfitta (endDuel(false) -> stessa animazione/
 * schermata finale di una sconfitta normale, poi si torna al menu duelli
 * tramite DuelSession.finish). Nascosto in Multiplayer: abbandonare lì
 * richiederebbe avvisare l'altro giocatore, cosa che questo pulsante non fa.
 */
function setupSurrenderButton() {
    const btn = document.getElementById('surrenderBtn');
    const modal = document.getElementById('surrenderModal');
    if (!btn) return;
    if (window.MULTIPLAYER_MODE) {
        btn.style.display = 'none';
        return;
    }
    btn.onclick = () => {
        if (gameState.gameOver) return;
        if (!modal) { endDuel(false); return; }
        modal.classList.add('open');
    };
    if (!modal) return;
    const close = () => modal.classList.remove('open');
    document.getElementById('surrenderConfirmBtn').onclick = () => {
        close();
        endDuel(false);
    };
    document.getElementById('surrenderCancelBtn').onclick = close;
    modal.onclick = (event) => {
        if (event.target === modal) close();
    };
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

/**
 * Cronometro del duello + numero turno, mostrati sotto lo stepper delle
 * fasi (vedi #duelTimerBadge). Parte da initGame() e si ferma quando il
 * duello finisce (checkGameOver), così non continua a girare a vuoto
 * sulla schermata di Vittoria/Sconfitta.
 */
function startDuelTimer() {
    stopDuelTimer();
    duelStartTime = Date.now();
    updateDuelTimer();
    duelTimerInterval = setInterval(updateDuelTimer, 1000);
}

function stopDuelTimer() {
    if (duelTimerInterval) {
        clearInterval(duelTimerInterval);
        duelTimerInterval = null;
    }
}

function updateDuelTimer() {
    const el = document.getElementById('duelTimerBadge');
    if (!el || !duelStartTime) return;
    const elapsed = Math.max(0, Math.floor((Date.now() - duelStartTime) / 1000));
    const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const ss = String(elapsed % 60).padStart(2, '0');
    el.textContent = `⏱ ${mm}:${ss} · Turno ${gameState.turn}`;
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
