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

// Le carte personalizzate (crea-carta.html) hanno nome/effetto scelti
// liberamente dall'utente. Ogni punto che li inserisce in innerHTML deve
// passarli da qui prima, altrimenti un nome tipo "<img src=x onerror=...>"
// verrebbe eseguito come HTML vero (XSS memorizzato, visibile anche in
// multiplayer a chi legge quella carta).
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text == null ? '' : String(text);
    return div.innerHTML;
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
        <div class="card-info-name">${escapeHtml(card.name)}</div>
        <div class="card-info-meta">${typeLabel}${levelLabel}</div>
        ${card.type === 'monster' ? `<div class="card-info-stats">ATK ${card.attack} • DEF ${card.defense}</div>` : ''}
        <p>${escapeHtml(effectText)}</p>
    `;
    panel.classList.add('visible');
}

// Click fuori dal pannello descrizione carta -> lo chiude. Esclude i click
// su una QUALUNQUE carta (.card): quelli sono l'azione che apre/aggiorna il
// pannello (vedi handleCardClick/onmouseenter sulle carte), non un "click
// fuori" — senza questa eccezione, il click che apre il pannello lo
// chiuderebbe di nuovo un istante dopo (l'evento raggiunge document in
// bubbling subito dopo aver aperto/aggiornato il pannello sulla carta).
document.addEventListener('click', (event) => {
    const panel = document.getElementById('cardInfoPanel');
    if (!panel || !panel.classList.contains('visible')) return;
    if (panel.contains(event.target)) return;
    if (event.target.closest('.card')) return;
    updateCardInfoPanel(null);
});

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

    // Senza wordRight (es. la frase intera "È il mio turno!" del giocatore)
    // mostriamo una sola parola/frase centrata, più piccola per starci su
    // una riga — non lo scontro fra due parole separate. wordRight ora può
    // essere il nome vero di un personaggio (es. "Maximillion Pegasus"),
    // molto più lungo del vecchio "BOT" fisso: oltre una certa lunghezza
    // usiamo un carattere più piccolo per entrambe le parole, altrimenti lo
    // scontro a tutta larghezza (clamp fino a 9vw) uscirebbe dallo schermo.
    const isLongRight = wordRight && wordRight.length > 8;
    const longClass = isLongRight ? ' battle-start-word--long' : '';
    const wordsHtml = wordRight
        ? `<span class="battle-start-word battle-start-word--left${longClass}">${wordLeft}</span><span class="battle-start-word battle-start-word--right${longClass}">${wordRight}</span>`
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

    // Una sola volta per CHIAMATA (non per singola carta pescata) — vedi il
    // commento su DuelEngine.TRIGGER.ON_DRAW_CARDS per il perché. Dopo, non
    // prima: una carta reattiva (es. Desideri Solenni id 875) deve vedere
    // già riflesso nel log/gameState l'avvenuta pescata.
    if (drawn > 0 && window.DuelEngine) {
        DuelEngine.firePhaseTrigger(DuelEngine.TRIGGER.ON_DRAW_CARDS, owner);
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
    // Il nome vero del giocatore (e il suo ritratto) sono già scritti nel
    // box LP da DuelSession.start() -> applyPlayerIdentity() PRIMA che
    // initGame() giri — vedi js/duel-session.js.
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
        // Zona Bandite: carte rimosse dal gioco in modo persistente (es.
        // Sfera Esplosiva/Spadaccino di Fiamma Blu, alcuni costi di
        // Evocazione Fusione, Special Summon dal Cimitero bandendo
        // materiali) — a differenza del Cimitero, informazione PUBBLICA
        // come nel gioco vero, mai un bersaglio di piazzamento. Popolata
        // da ACTIONS.banish/banishTemporarily/banishFromHandWithCountdown/
        // banishFusionSummon in js/engine/duel-engine.js — vedi lì per
        // come ogni singolo effetto la usa.
        playerBanished: [],
        botBanished: [],
        // Ondata Gelida (id 159): "fino al tuo prossimo turno, né tu né
        // il tuo avversario potete giocare o Set Magie/Trappole" — a
        // differenza di gameState.noSpellActivationFor/noTrapActivationFor
        // (azzerati ad OGNI cambio turno, durata "solo per il resto di
        // questo turno"), questo NON si azzera da solo: resta finché non
        // torna il turno di chi l'ha attivato — vedi il controllo dedicato
        // in changeTurn() qui sotto (stesso schema di skipNextTurnFor) e
        // DuelEngine.isColdWaveActive(), consultata da canActivate.
        coldWaveActiveFor: {},
        // 395 — Orgoth l'Implacabile: bonus ATK/DEF (x100 sul totale di 3
        // lanci di dado) e indistruttibilità concessi "fino alla fine del
        // turno del tuo avversario" — a differenza di temporaryAtkDefBonus
        // (svuotato ad OGNI End Phase, quindi solo "fino a fine di QUESTO
        // turno"), questi non si azzerano da soli: restano finché non
        // torna il turno di chi ha lanciato i dadi, stesso schema/stesso
        // punto di coldWaveActiveFor qui sopra (vedi il controllo dedicato
        // in changeTurn()). Set di uid per proprietario: quali carte hanno
        // ancora un bonus/un'indistruttibilità Orgoth pendente da revocare.
        orgothActiveUidsFor: { player: new Set(), bot: new Set() },
        // Spada Sigillante di Orichalcos (id 396), seconda clausola: "se
        // hai una carta in Field Zone, estendi la negazione a un altro
        // mostro Effetto fino alla fine del turno avversario" — stesso
        // schema/stesso motivo di orgothActiveUidsFor qui sopra (store
        // separato, scaduto in changeTurn quando torna il turno di chi
        // l'ha concesso), perché gameState.monsterEffectsNegatedUidsFor
        // (duel-engine.js) viene azzerato e ricostruito da zero ad OGNI
        // render dalla sola clausola base (equip), non da questa estensione.
        orichalcosExtendedNegationUidsFor: { player: new Set(), bot: new Set() },
        // Bonus ATK/DEF vero e proprio (uid -> {atk, def}) concesso da
        // Orgoth l'Implacabile — store dedicato, MAI toccato da
        // recomputeStaticEffects() (duel-engine.js), a differenza di
        // gameState.atkDefBonus che invece viene azzerato e ricostruito da
        // zero ad OGNI render (solo per effetti CONTINUI): un bonus
        // one-shot come questo ci sparirebbe al render successivo se
        // scritto lì. Letto da getEffectiveAtk/getEffectiveDef
        // (duel-engine.js) insieme ad atkDefBonus/temporaryAtkDefBonus.
        orgothAtkDefBonus: {},
        // Sottoinsieme di orgothActiveUidsFor qui sopra: uid attualmente
        // indistruttibili grazie a un lancio 1-2 (o un tris). Set globale
        // (non per proprietario): l'uid da solo è già univoco in tutta la
        // partita, e i punti che lo consultano (cardIsIndestructibleByBattle
        // in actions.js, ACTIONS.destroyMonster in duel-engine.js) non hanno
        // sempre a portata di mano l'owner del bersaglio.
        orgothIndestructibleUids: new Set(),
        playerFieldSpell: null,
        botFieldSpell: null,
        // Extra Deck: mostri Fusione posseduti da ciascun lato, mai
        // pescati normalmente — popolato più sotto da
        // buildExtraDeckFromSpec() (js/data/cards-db.js) se c'è un deck reale
        // con una sezione extra; altrimenti resta vuoto (Duello Demo senza
        // un vero mazzo: l'Evocazione Fusione semplicemente non è
        // disponibile). Consultato da ACTIONS.fusionSummon/getFusableMonsters
        // in js/engine/duel-engine.js.
        playerExtraDeck: [],
        botExtraDeck: [],
        selectedCard: { type: null, card: null, index: -1 },
        pendingSummon: null,
        pendingTributeSummon: null,
        // Scelta della VERA casella Mostro di destinazione dopo un
        // Sacrificio già completato, quando più di una casella resta
        // libera — vedi resolveTributeSummonPlacement/handleSlotClick in
        // js/engine/actions.js. null quando non c'è nessuna scelta in sospeso
        // (il caso comune: un solo Tributo libera esattamente una casella,
        // usata subito senza chiedere nulla).
        pendingTributePlacement: null,
        // Scarto obbligatorio in corso per il limite di 6 carte in mano a
        // fine turno — vedi startHandDiscardSelection() in js/engine/actions.js,
        // richiamata da enterEndPhase() qui sotto.
        pendingHandDiscard: null,
        // Spade Rivelatrici (id 8): diventa true SOLO quando le spade
        // mobili dell'animazione di attivazione hanno finito di calare —
        // vedi playSwordsOfRevealingLight (effects.js) e il suo chiamante
        // in card-effects.js. renderFields() (qui sotto) mostra il segno
        // fisso .field-sword-mark sul Terreno solo da quel momento, mai
        // prima, e tickContinuousEffectDurations() lo rimette a false
        // quando l'effetto scade — a differenza di gameState.revealedFor,
        // che invece si ricalcola sempre da zero ad ogni render.
        revealedSwordsLanded: {},
        hasNormalSummoned: false,
        // Effetti Ignition dei mostri (es. Soldato Cannone): chiave = uid
        // della carta -> true se già attivato in questo turno. Resettato
        // ad ogni cambio turno in changeTurn() qui sotto.
        usedIgnitionThisTurn: {},
        // Tracciamento generico "una volta per turno" per effetti che non
        // sono un Ignition di mostro (vedi ctx.hasUsedOncePerTurn/
        // markUsedOncePerTurn in duel-engine.js, es. Signore del Rosso id
        // 354). Chiave scelta da chi la usa. Resettato ad ogni cambio
        // turno in changeTurn() qui sotto, come usedIgnitionThisTurn.
        usedOncePerTurnEffect: {},
        // Bonus ATK/DEF "fino a fine turno" (vedi ctx.grantTemporaryAtkDefBonus/
        // clearTemporaryAtkDefBonus in duel-engine.js, es. Drenaggio di
        // Energia id 227, Rimozione del Limitatore id 350). Svuotato ad
        // ogni End Phase in enterEndPhase() qui sotto, non al cambio turno.
        temporaryAtkDefBonus: {},
        // Chiave = uid della carta -> true se questo mostro può attaccare
        // direttamente ANCHE se l'avversario controlla mostri, in questo
        // turno (es. Golem Meccanico la Fortezza Mobile, dopo aver pagato
        // 800 LP) — consultato in endAttackDrag() (game-flow.js). Resettato
        // ad ogni cambio turno.
        directAttackAllowedFor: {},
        // Chiave = 'player'/'bot' -> true se quel giocatore, in questo
        // turno, non subisce danno da battaglia / non può perdere mostri
        // per distruzione da battaglia (es. Waboku, id 503) — controllati
        // rispettivamente in applyDamage/resolveBattleDamage (actions.js).
        // Resettati ad ogni cambio turno come directAttackAllowedFor sopra.
        noBattleDamageFor: {},
        noBattleDestructionFor: {},
        // Chiave = 'player'/'bot' -> true se quel giocatore deve saltare
        // per intero il proprio prossimo turno (es. Azzardo, id 255) —
        // consultato UNA VOLTA in changeTurn() (game-flow.js), poi
        // azzerato subito lì stesso (non ha bisogno di un reset a parte
        // qui sotto in changeTurn come gli altri flag "per questo turno").
        skipNextTurnFor: {},
        // Chiave = 'player'/'bot' -> true se quel giocatore, in questo
        // turno, manda l'intera mano al Cimitero durante la propria End
        // Phase (es. Carta della Rovina, id 140) — consultato UNA VOLTA in
        // enterEndPhase() (game-flow.js) e azzerato subito lì, come
        // skipNextTurnFor sopra.
        discardHandAtEndPhaseFor: {},
        // Chiave = 'player'/'bot' -> true se quel giocatore, in questo
        // turno, non subisce ALCUN danno (non solo da battaglia, a
        // differenza di noBattleDamageFor — es. Carta della Rovina, id
        // 140: "il tuo avversario non subisce danni") — controllato
        // direttamente in ACTIONS.dealDamage (duel-engine.js), l'unico
        // punto per cui passa ogni variazione di LP. Resettato ad ogni
        // cambio turno come gli altri flag "per questo turno" qui sopra.
        noDamageFor: {},
        // Bando temporaneo con ritorno programmato (es. Buco Dimensionale,
        // Ninja d'Assalto): array di { card, owner, returnTrigger } — vedi
        // ACTIONS.banishTemporarily/processTemporaryBanishmentReturns in
        // duel-engine.js.
        temporaryBanishments: [],
        // Chiave = uid della carta -> { owner } se questo mostro deve
        // tornare in mano alla prossima End Phase del proprio controllore
        // (es. Cavaliere Missile, dopo aver usato il proprio effetto
        // Ignition) — consultato in enterEndPhase() tramite ON_END_PHASE.
        returnToHandOnEndPhase: {},
        gameOver: false,
        // Livello di difficoltà del bot ('easy'/'medium'/'hard' — vedi
        // js/ai/ai-controller.js): preso dalla scelta Facile/Medio/Difficile
        // fatta in duello-libero.html (DuelSession.aiDifficultyKey, vedi
        // js/duel-session.js), o 'medium' di default nel Duello Demo (nessuna
        // scelta esplicita) — cioè il comportamento del bot di sempre.
        botDifficulty: (window.DuelSession && DuelSession.aiDifficultyKey) || 'medium'
    };

    // Mazzo REALE del giocatore: se ha un deck salvato attivo si pesca da
    // lì (vedi drawCardsToHand()); altrimenti (Duello Demo, o Duello Libero
    // senza un deck attivo) non si ricade più sul vecchio pescaggio a
    // singola carta casuale dall'intero database — nessuna coerenza di
    // rapporto mostri/magie/trappole né curva di Livello — ma su un mazzo
    // di 40 carte generato al volo con un bilanciamento da vero Structure
    // Deck (vedi buildBalancedDemoDeckSpec() in js/data/cards-db.js). In
    // Multiplayer ogni client gestisce solo il proprio lato comunque,
    // quindi questo tocca solo "player".
    const playerDeckSpec = (window.SaveManager && SaveManager.getActiveDeck())
        || (typeof buildBalancedDemoDeckSpec === 'function' ? buildBalancedDemoDeckSpec() : null);
    if (playerDeckSpec && typeof buildDeckFromSpec === 'function') {
        const built = buildDeckFromSpec(playerDeckSpec);
        if (built) {
            gameState.playerDeck = built;
            gameState.playerDeckCount = built.length;
        }
        if (typeof buildExtraDeckFromSpec === 'function') {
            gameState.playerExtraDeck = buildExtraDeckFromSpec(playerDeckSpec);
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
            if (typeof buildExtraDeckFromSpec === 'function') {
                gameState.botExtraDeck = buildExtraDeckFromSpec(botDeckSpec);
            }
        }
    }
}

function nextPhase() {
    // Non avanzare fase mentre una finestra di priorità della Chain è
    // aperta (es. si sta ancora aspettando la scelta del giocatore se
    // rispondere con una Trappola) — vedi DuelEngine.isChainActive() in
    // js/engine/duel-engine.js.
    if (window.DuelEngine && DuelEngine.isChainActive()) return;
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
    // Stessa guardia di nextPhase() qui sopra: niente fine turno con una
    // Chain ancora aperta.
    if (window.DuelEngine && DuelEngine.isChainActive()) return;
    enterEndPhase();
}

/**
 * Fa scendere di 1 il conto alla rovescia delle Magie/Trappole Continue a
 * durata limitata (es. Spada Rivelatrice, 3 turni; Gabbia d'Acciaio
 * dell'Incubo, 2 turni) e le manda al Cimitero da sole quando arrivano a
 * 0 — invece di restare per sempre come le Magie Continue normali. Il
 * conteggio scende una volta per ogni turno dell'AVVERSARIO di chi ha
 * attivato la carta. Chiamata da enterEndPhase() (non da changeTurn()):
 * il testo reale di entrambe le carte dice "distrutta durante la N-esima
 * End Phase dell'avversario", quindi la carta deve restare attiva per
 * TUTTO l'ultimo turno dell'avversario (Battle Phase inclusa), non
 * sparire già al suo inizio — bug di fedeltà corretto in sessione
 * (prima veniva distrutta all'inizio di quel turno, non alla sua fine).
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
                // Spade Rivelatrici (id 8): se una futura riattivazione
                // colpisse di nuovo lo stesso giocatore, il segno fisso non
                // deve ricomparire all'istante prima che le spade mobili
                // abbiano rifatto la loro caduta — vedi la dichiarazione di
                // revealedSwordsLanded in resetGameState() qui sopra.
                if (slot.card.id === 8 && gameState.revealedSwordsLanded) {
                    gameState.revealedSwordsLanded[opponent] = false;
                }
            }
        });
    });
}

function changeTurn() {
    clearPhaseTransitionTimeout();
    addToLog(`🔄 Turno ${gameState.turn} terminato.`);
    gameState.turn++;
    gameState.currentPlayer = gameState.currentPlayer === 'player' ? 'bot' : 'player';
    // Blocco Trappole/Magie "per il resto del turno" (es. Manta
    // Perforante Strisciante id 693, famiglia Ingranaggio Antico) — vedi
    // gameState.noTrapActivationFor/noSpellActivationFor, controllati in
    // canActivate() (duel-engine.js).
    gameState.noTrapActivationFor = {};
    gameState.noSpellActivationFor = {};
    // "Non puoi condurre la tua Battle Phase in questo turno" (es. Makiu,
    // la Nebbia Magica id 366; Carica dell'Anima/Soul Charge id 59) —
    // vedi il controllo in enterBattlePhase() qui sopra.
    gameState.skipBattlePhaseFor = {};
    // Fata della Primavera (id 728)/Trapano Ingranaggio Antico (id 842):
    // "in questo turno, quella carta specifica non può essere attivata" —
    // stesso schema "per il resto del turno" di sopra, ma per uid di
    // carta invece che per proprietario/tipo — vedi
    // gameState.blockedCardUidsThisTurn in DuelEngine.canActivate.
    gameState.blockedCardUidsThisTurn = new Set();
    // Obelisk il Tormentatore (id 30): "questa carta non può dichiarare
    // un attacco nel turno in cui viene attivato questo effetto" — set
    // per uid, stesso schema "per il resto del turno" di sopra, azzerato
    // qui a ogni cambio turno.
    gameState.cannotAttackUidsThisTurn = new Set();
    // Maledizione di Anubis (id 655): "non possono cambiare Posizione di
    // Battaglia per il resto del turno" — stesso schema "per uid, per il
    // resto del turno" di cannotAttackUidsThisTurn qui sopra, ma per il
    // cambio Posizione. A differenza di gameState.cannotChangePositionUids
    // (ricalcolato ad ogni render da un effetto CONTINUO, es. Incantesimo
    // Ombra id 439 — si azzererebbe da solo al render successivo se
    // usato da un effetto non continuo come questo, un Trappola Normale
    // one-shot), questo Set sopravvive fino al prossimo cambio turno.
    gameState.cannotChangePositionUidsThisTurn = new Set();
    // Scintilla dell'Estasi Triangolare (id 789): "fino alla fine di
    // questo turno, annulla tutti gli effetti Trappola dell'avversario
    // sul Terreno" — stesso schema "per il resto del turno", consultato
    // da DuelEngine.areTrapsNegatedFor.
    gameState.trapsNegatedUntilEndOfTurnFor = {};
    // Tempesta di Piume delle Arpie (id 292): stesso schema "per il resto
    // del turno" qui sopra, ma per gli effetti Mostro invece che
    // Trappola — consultato da DuelEngine.areMonsterEffectsNegatedFor.
    gameState.monsterEffectsNegatedUntilEndOfTurnFor = {};
    // Occhio di Gorgone (id 271): "fino alla fine di questo turno, gli
    // effetti dei mostri in Posizione di Difesa sono annullati" — stesso
    // schema "per il resto del turno" di sopra, consultato in
    // DuelEngine.canActivate (Ignition) e recomputeStaticEffects
    // (static continui) — vedi duel-engine.js.
    gameState.defenseMonsterEffectsNegated = false;
    // Benedizione di Sebek (id 813): "attivabile solo quando un tuo
    // mostro ha attaccato direttamente l'avversario; guadagni Life
    // Points pari al danno da battaglia inflitto" — Magia Rapida
    // attivabile dalla mano DOPO che il danno è già stato inflitto (non
    // una risposta "nel momento", come una Trappola), quindi basta
    // ricordarsi l'ultimo danno da attacco diretto di ciascun
    // proprietario in questo turno (sovrascritto ad ogni nuovo attacco
    // diretto, vedi actions.js/resolveAttack), azzerato qui ad ogni
    // cambio turno.
    gameState.directAttackDamageFor = {};
    // Turno saltato per intero (es. Azzardo, id 255, se si sbaglia il
    // lancio di moneta): richiamare changeTurn() di nuovo, subito, passa
    // dritti al turno DOPO — stesso effetto pratico di "salta il tuo
    // turno successivo", senza dover introdurre una fase-fantasma vuota
    // solo per poi passare oltre.
    // Ondata Gelida (id 159): torna il turno di chi l'ha attivata -> il
    // blocco si esaurisce, stesso schema/stesso punto di skipNextTurnFor
    // qui sotto (gameState.currentPlayer è già il NUOVO giocatore di
    // turno a questo punto della funzione).
    gameState.coldWaveActiveFor = gameState.coldWaveActiveFor || {};
    if (gameState.coldWaveActiveFor[gameState.currentPlayer]) {
        gameState.coldWaveActiveFor[gameState.currentPlayer] = false;
        addToLog(`❄️ Ondata Gelida smette di fare effetto: ${gameState.currentPlayer === 'player' ? 'puoi' : 'il bot può'} di nuovo giocare Magie/Trappole.`);
    }
    // 395 — Orgoth l'Implacabile: il bonus ATK/DEF e l'indistruttibilità
    // durano "fino alla fine del turno dell'avversario" di chi li ha
    // attivati — cioè finché non torna il turno di quel giocatore, esattamente
    // come Ondata Gelida qui sopra (gameState.currentPlayer è già il NUOVO
    // giocatore di turno a questo punto della funzione).
    gameState.orgothActiveUidsFor = gameState.orgothActiveUidsFor || { player: new Set(), bot: new Set() };
    gameState.orgothIndestructibleUids = gameState.orgothIndestructibleUids || new Set();
    gameState.orgothAtkDefBonus = gameState.orgothAtkDefBonus || {};
    const orgothSet = gameState.orgothActiveUidsFor[gameState.currentPlayer];
    if (orgothSet && orgothSet.size) {
        orgothSet.forEach((uid) => {
            delete gameState.orgothAtkDefBonus[uid];
            gameState.orgothIndestructibleUids.delete(uid);
        });
        addToLog('🎲 Il bonus ATK/DEF e l\'indistruttibilità di Orgoth l\'Implacabile terminano.');
        orgothSet.clear();
    }
    // Spada Sigillante di Orichalcos (id 396): stessa identica durata
    // "fino alla fine del turno avversario" di Orgoth qui sopra, per
    // l'estensione della negazione effetti a un secondo mostro.
    gameState.orichalcosExtendedNegationUidsFor = gameState.orichalcosExtendedNegationUidsFor || { player: new Set(), bot: new Set() };
    const orichalcosSet = gameState.orichalcosExtendedNegationUidsFor[gameState.currentPlayer];
    if (orichalcosSet && orichalcosSet.size) {
        addToLog('⚔️ L\'estensione di Spada Sigillante di Orichalcos termina.');
        orichalcosSet.clear();
    }
    gameState.skipNextTurnFor = gameState.skipNextTurnFor || {};
    if (gameState.skipNextTurnFor[gameState.currentPlayer]) {
        gameState.skipNextTurnFor[gameState.currentPlayer] = false;
        addToLog(`⏭️ ${gameState.currentPlayer === 'player' ? 'Il tuo turno viene saltato' : 'Il turno del bot viene saltato'} (Azzardo)!`);
        changeTurn();
        return;
    }
    updateDuelTimer();
    if (window.SFX) SFX.turnChange();
    const isPlayerTurn = gameState.currentPlayer === 'player';
    // Il cambio turno è il momento più "importante" del duello: qui, e non
    // più all'inizio della Battle Phase, va l'annuncio cinematografico da
    // 3 secondi (flash, barre, raggi, parole che si scontrano). Il turno
    // del giocatore ha la sua battuta iconica in stile anime; quello del
    // bot resta "TURNO" + nome, split in due parole che si scontrano.
    if (isPlayerTurn) {
        showEpicSlamAnnouncement('È il mio turno!', '', `Turno ${gameState.turn}`);
    } else {
        // Nome vero dell'avversario (es. "Seto Kaiba"), non più il generico
        // "BOT" — window.DuelSession lo risolve già correttamente per ogni
        // modalità (Duello Demo -> "Bot", Duello Libero/Storia -> il
        // personaggio scelto, Multiplayer -> "Avversario").
        const wordRight = (window.DuelSession && window.DuelSession.opponent && window.DuelSession.opponent.name) || 'BOT';
        showEpicSlamAnnouncement('TURNO', wordRight, `Turno ${gameState.turn}`);
    }
    gameState.hasNormalSummoned = false;
    gameState.usedIgnitionThisTurn = {};
    gameState.usedOncePerTurnEffect = {};
    gameState.directAttackAllowedFor = {};
    gameState.noBattleDamageFor = {};
    gameState.noBattleDestructionFor = {};
    gameState.noDamageFor = {};
    const field = gameState.currentPlayer === 'player' ? gameState.playerMonsterField : gameState.botMonsterField;
    field.forEach(slot => {
        if (slot) {
            slot.hasAttacked = false;
            slot.canChangePosition = true;
            // Attacchi extra nella stessa Battle Phase (es. Cavaliere
            // Hayabusa id 294, Riavvolgimento Toon id 485, Samurai Armato -
            // Ben Kei id 721): "quanti già usati" e "concesso da un'altra
            // carta" si azzerano un turno per volta, come hasAttacked qui
            // sopra — vedi resolveAttack in actions.js.
            slot.extraAttacksUsedThisTurn = 0;
            slot.extraAttackGranted = false;
            slot.extraAttacksGrantedCount = 0;
        }
    });
    // 199/747 — "deve attaccare tutti i mostri avversari": l'obbligo dura
    // solo il turno in cui è stato concesso, come extraAttacksGrantedCount
    // qui sopra.
    gameState.mustAttackTargetUidsFor = {};
    gameState.negatesEffectsOnForcedAttackFor = new Set();
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

/**
 * 755 — Maharaghi: "quando questa carta viene Evocata Normalmente o
 * girata scoperta, guarda la prima carta del tuo Deck alla tua prossima
 * Draw Phase (PRIMA di pescare) e scegli se lasciarla in cima (la
 * pescherai) o mandarla in fondo (ne pescherai un'altra)" — effetto
 * RITARDATO che sopravvive al ritorno in mano di Maharaghi stessa a fine
 * turno (gameState.pendingMaharaghiPeekFor, per owner, impostato da
 * onSummon/onFlip in card-effects.js). Wrapper attorno alla vera
 * enterDrawPhase (rinominata enterDrawPhaseInner qui sotto): se c'è un
 * obbligo in sospeso per gameState.currentPlayer, mostra la scelta
 * PRIMA di procedere con la Draw Phase vera e propria, invece di
 * toccare la logica di pesca già esistente (temporizzata, con finestre
 * di risposta) — un solo nuovo punto d'ingresso, zero rischio per il
 * flusso normale quando non c'è nulla in sospeso.
 */
function enterDrawPhase(autoAdvance = true, onComplete = null) {
    const owner = gameState.currentPlayer;
    const deck = gameState[owner === 'player' ? 'playerDeck' : 'botDeck'];
    if (gameState.pendingMaharaghiPeekFor && gameState.pendingMaharaghiPeekFor[owner] && Array.isArray(deck) && deck.length > 0) {
        gameState.pendingMaharaghiPeekFor[owner] = false;
        const topCard = deck[deck.length - 1];
        const proceed = () => enterDrawPhaseInner(autoAdvance, onComplete);
        if (owner === 'player' && window.DuelEngineUI) {
            addToLog(`🔮 Maharaghi: guardi la prima carta del tuo Deck (${topCard.name})!`);
            window.DuelEngineUI.openChoicePopover(null, {
                title: `🔮 Maharaghi: ${topCard.name} — lasciarla in cima o mandarla in fondo?`,
                choiceA: {
                    icon: '⬆️', label: 'Lasciala in cima',
                    onSelect: () => { addToLog('🔮 Maharaghi: la carta resta in cima al Deck.'); proceed(); }
                },
                choiceB: {
                    icon: '⬇️', label: 'Mandala in fondo',
                    onSelect: () => {
                        deck.splice(deck.length - 1, 1);
                        deck.unshift(topCard);
                        addToLog('🔮 Maharaghi: la carta va in fondo al Deck.');
                        proceed();
                    }
                }
            });
            return;
        }
        // Bot: mantiene la prima carta se è vantaggiosa (mostro/Magia/Trappola
        // sempre benvenuti), altrimenti la manda in fondo — euristica minima,
        // nessuna vera IA dedicata per questa scelta di nicchia.
        addToLog('🔮 Maharaghi: il bot guarda la prima carta del suo Deck.');
        proceed();
        return;
    }
    enterDrawPhaseInner(autoAdvance, onComplete);
}

function enterDrawPhaseInner(autoAdvance = true, onComplete = null) {
    clearPhaseTransitionTimeout();
    gameState.phase = 'draw';
    if (window.MP_broadcast && !window.MP_applyingRemote) {
        window.MP_broadcast({ kind: 'phase', name: 'draw' });
    }
    // Avidità Sconsiderata (id 653): "pesca 2 carte e salta le tue
    // prossime 2 Draw Phase" — gameState.skipDrawFor[owner] è un
    // contatore (non un booleano) per coprire il "2 volte", stesso
    // spirito di skipNextTurnFor ma granulare sulla sola Draw Phase
    // invece che sull'intero turno.
    gameState.skipDrawFor = gameState.skipDrawFor || {};
    if (gameState.skipDrawFor[gameState.currentPlayer] > 0) {
        gameState.skipDrawFor[gameState.currentPlayer]--;
        addToLog(`🚫 ${gameState.currentPlayer === 'player' ? 'Salti' : 'Il bot salta'} la Draw Phase (Avidità Sconsiderata)!`);
        if (typeof onComplete === 'function') onComplete();
        else if (autoAdvance) phaseTransitionTimeout = setTimeout(() => enterStandbyPhase(true), 500);
        return;
    }
    // Freed il Generale Senza Rivali (id 888): "durante la tua Draw
    // Phase, invece della pescata normale, puoi aggiungere 1 mostro
    // Guerriero di Livello 4 o inferiore dal tuo Deck alla mano" — stesso
    // schema hardcoded qui (non in card-effects.js) di skipDrawFor/
    // pendingMaharaghiPeekFor qui sopra/sotto: una sostituzione della
    // pescata vive per forza a questo livello, non in un normale hook di
    // card-effects.js. SEMPLIFICAZIONE (vedi missingEffectNote su id 888):
    // sostituzione AUTOMATICA se disponibile un bersaglio, invece di una
    // vera scelta libera "pesca o cerca".
    const freedOwner = gameState.currentPlayer;
    const freedField = freedOwner === 'player' ? gameState.playerMonsterField : gameState.botMonsterField;
    const freedSlot = (freedField || []).find((s) => s && !s.isFaceDown && s.card.id === 888);
    if (freedSlot) {
        const freedDeckKey = freedOwner === 'player' ? 'playerDeck' : 'botDeck';
        const freedDeck = gameState[freedDeckKey];
        const freedIndex = Array.isArray(freedDeck) ? freedDeck.findIndex((c) => c.type === 'monster' && c.race === 'Guerriero' && (c.level || 0) <= 4) : -1;
        if (freedIndex !== -1) {
            const foundCard = freedDeck.splice(freedIndex, 1)[0];
            gameState[freedOwner === 'player' ? 'playerHand' : 'botHand'].push(foundCard);
            gameState[freedDeckKey === 'playerDeck' ? 'playerDeckCount' : 'botDeckCount'] = freedDeck.length;
            addToLog(`⚔️ Freed il Generale Senza Rivali cerca ${foundCard.name} dal Deck invece di pescare!`);
            if (typeof onComplete === 'function') onComplete();
            else if (autoAdvance) phaseTransitionTimeout = setTimeout(() => enterStandbyPhase(true), 500);
            return;
        }
    }
    const opponentLabel = (window.DuelSession && window.DuelSession.opponent && window.DuelSession.opponent.name) || 'Bot';
    showPhaseAnnouncement('Pesca', gameState.currentPlayer === 'player' ? 'Draw Phase' : `Draw Phase - ${opponentLabel}`);
    addToLog(`--- ${gameState.currentPlayer === 'player' ? 'Tuo Turno' : `Turno ${opponentLabel}`} ${gameState.turn} ---`);
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
            let drawnCard = null;
            if (gameState.currentPlayer === 'player') {
                const drawn = drawCardsToHand('player', 1);
                if (drawn > 0) {
                    drawnCard = gameState.playerHand[gameState.playerHand.length - 1];
                    addToLog(`Hai pescato: ${drawnCard.name}`);
                    drawnToPlayerHand = true;
                } else {
                    // Mazzo esaurito (regole.html, Capitolo 1 e 2): non è più
                    // solo un messaggio nel log, chi deve pescare e non può
                    // perde subito il duello — endDuel() ferma da sola ogni
                    // timer di fase in corso, quindi si esce da questa
                    // funzione senza chiamare finishDrawEffect().
                    addToLog('💀 Il tuo mazzo è vuoto: non puoi pescare e perdi il duello!');
                    if (deckSlot) deckSlot.classList.remove('draw-effect');
                    endDuel(false);
                    return;
                }
            } else {
                const drawn = drawCardsToHand('bot', 1);
                if (drawn > 0) {
                    drawnCard = gameState.botHand[gameState.botHand.length - 1];
                    addToLog('Il bot ha pescato una carta.');
                } else {
                    addToLog('🎉 Il mazzo del bot è vuoto: non può pescare e perde il duello!');
                    if (deckSlot) deckSlot.classList.remove('draw-effect');
                    endDuel(true);
                    return;
                }
            }
            if (deckSlot) {
                deckSlot.classList.remove('draw-effect');
            }
            // Finestra di risposta per l'avversario di chi ha appena
            // pescato (es. Fuori Gioco, id 216) PRIMA di completare
            // l'animazione/passare avanti — se non c'è nulla con cui
            // rispondere, DuelEngine.openDrawResponseWindow richiama subito
            // il proprio onDone, comportamento identico a prima per tutti
            // gli altri turni.
            if (window.DuelEngine && typeof DuelEngine.openDrawResponseWindow === 'function') {
                DuelEngine.openDrawResponseWindow(gameState.currentPlayer, drawnCard, () => finishDrawEffect(drawnToPlayerHand));
            } else {
                finishDrawEffect(drawnToPlayerHand);
            }
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
    if (window.DuelEngine) {
        DuelEngine.processTemporaryBanishmentReturns('standby', gameState.currentPlayer);
        DuelEngine.processDelayedHandReturns(gameState.currentPlayer);
        DuelEngine.processDelayedGraveyardRevivals(gameState.currentPlayer);
        DuelEngine.processPendingBlastSphereDetonations(gameState.currentPlayer);
        DuelEngine.processKiseitaiLifeGain(gameState.currentPlayer);
        DuelEngine.firePhaseTrigger(DuelEngine.TRIGGER.ON_STANDBY_PHASE, gameState.currentPlayer);
    }
    updateUI();
    if (autoAdvance) {
        phaseTransitionTimeout = setTimeout(() => enterMainPhase1(), 500);
    }
}

function enterMainPhase1() {
    clearPhaseTransitionTimeout();
    // Divoratempo (id 480): "se distrugge in battaglia un mostro
    // dell'avversario, l'avversario salta la sua prossima Main Phase 1" —
    // stesso spirito granulare di skipDrawFor (Draw Phase) qui sopra, ma
    // booleano invece di contatore (il testo reale copre una sola volta).
    // Salta subito alla Battle Phase, come farebbe normalmente il
    // giocatore dopo un Main Phase 1 senza azioni.
    gameState.skipMainPhase1For = gameState.skipMainPhase1For || {};
    if (gameState.skipMainPhase1For[gameState.currentPlayer]) {
        gameState.skipMainPhase1For[gameState.currentPlayer] = false;
        addToLog(`🚫 ${gameState.currentPlayer === 'player' ? 'Salti' : 'Il bot salta'} la Main Phase 1 (Divoratempo)!`);
        if (gameState.turn > 1) {
            phaseTransitionTimeout = setTimeout(() => enterBattlePhase(), 500);
            return;
        }
    }
    gameState.phase = 'main1';
    if (window.MP_broadcast && !window.MP_applyingRemote) {
        window.MP_broadcast({ kind: 'phase', name: 'main1' });
    }
    showPhaseAnnouncement('Main Phase 1');
    addToLog('⚡ Main Phase 1');
    if (window.DuelEngine) {
        DuelEngine.fireOwnMainPhase1GraveyardActivations(gameState.currentPlayer);
    }
    updateUI();
}

function enterBattlePhase() {
    if (gameState.turn === 1) {
        addToLog('❌ Non puoi entrare in Battle Phase nel primo turno. Rimani in Main Phase 1 o vai direttamente a End Phase.');
        return;
    }
    // "Non puoi condurre la tua Battle Phase in questo turno" (es. Makiu,
    // la Nebbia Magica id 366; Carica dell'Anima/Soul Charge id 59) —
    // per-proprietario, per-turno: gameState.skipBattlePhaseFor,
    // azzerato ad ogni cambio turno (changeTurn(), qui sotto).
    if (gameState.skipBattlePhaseFor && gameState.skipBattlePhaseFor[gameState.currentPlayer]) {
        addToLog(`❌ ${gameState.currentPlayer === 'player' ? 'Non puoi' : 'Il bot non può'} condurre la Battle Phase in questo turno.`);
        return;
    }
    gameState.phase = 'battle';
    if (window.MP_broadcast && !window.MP_applyingRemote) {
        window.MP_broadcast({ kind: 'phase', name: 'battle' });
    }
    showPhaseAnnouncement('Battaglia', 'Battle Phase', 'battle');
    addToLog('⚔️ Battle Phase! Clicca e trascina da un tuo mostro per attaccare.');
    // "All'inizio della Battle Phase" (es. Prigione dei Dadi, id 197) —
    // stesso schema/stesso nome dinamico di 'onBattlePhaseEnd' (già usato
    // da Bestia Mitica Cerbero id 734/Cavaliere del Miraggio id 381), solo
    // all'INIZIO invece che alla fine — ma chiamato per ENTRAMBI i lati
    // (non solo gameState.currentPlayer): una Magia Terreno come id 197
    // resta valida indipendentemente da chi sta vivendo il proprio
    // turno/la propria Battle Phase, a differenza di un Mostro/Trappola
    // "del proprio turno" tipico di onEndPhase/onStandbyPhase qui sopra.
    if (window.DuelEngine) {
        DuelEngine.firePhaseTrigger('onBattlePhaseStart', 'player');
        DuelEngine.firePhaseTrigger('onBattlePhaseStart', 'bot');
    }
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
    // Catturato PRIMA di sovrascrivere gameState.phase qui sotto: serve
    // per sapere se questa End Phase arriva DAVVERO dalla Battle Phase
    // (non da un Main Phase 1 senza combattimento) — vedi
    // 'onBattlePhaseEnd' più sotto.
    const wasInBattlePhase = gameState.phase === 'battle';
    gameState.phase = 'end';
    if (window.MP_broadcast && !window.MP_applyingRemote) {
        window.MP_broadcast({ kind: 'phase', name: 'end' });
    }
    showPhaseAnnouncement('Fine', 'End Phase');
    addToLog('🏁 End Phase');
    tickContinuousEffectDurations();
    // 637 Tribù dei D./153 Notte Meccanica: "considerati di Tipo X fino
    // alla End Phase" — gameState.raceOverridesUntilEndOfTurn (array di
    // {card, originalRace}, popolato da ctx.overrideRaceUntilEndOfTurn in
    // duel-engine.js) ripristina qui il Tipo originale di ogni carta
    // coinvolta, poi svuota la lista.
    if (gameState.raceOverridesUntilEndOfTurn && gameState.raceOverridesUntilEndOfTurn.length > 0) {
        gameState.raceOverridesUntilEndOfTurn.forEach(({ card, originalRace }) => { card.race = originalRace; });
        gameState.raceOverridesUntilEndOfTurn = [];
        addToLog('🔄 Il Tipo dei mostri coinvolti torna quello originale.');
    }
    // Tribù dei D. (id 637): il floodgate che estendeva l'override anche
    // ai mostri Evocati DOPO l'attivazione (vedi fireTrigger, duel-engine.js)
    // smette di valere qui, stessa fine turno del resto.
    gameState.raceOverrideFloodgateFor = {};
    // Ultimo Turno (id 341): il verdetto si valuta qui, alla End Phase
    // DELLO STESSO turno in cui è stata attivata — non nell'onEndPhase
    // della carta stessa, perché essendo una Trappola Normale è già
    // finita nel Cimitero non appena si è risolta (una carta lì non
    // riceve mai trigger di fase). gameState.pendingUltimateTurnCheck
    // (impostato da activate(), card-effects.js) porta con sé forTurn:
    // il numero di turno al momento dell'attivazione, per assicurarsi che
    // sia DAVVERO la End Phase dello stesso turno (non una successiva,
    // se per qualche motivo il flag non venisse ripulito).
    if (gameState.pendingUltimateTurnCheck && gameState.pendingUltimateTurnCheck.forTurn === gameState.turn) {
        const check = gameState.pendingUltimateTurnCheck;
        gameState.pendingUltimateTurnCheck = null;
        const playerHasMonster = gameState.playerMonsterField.some((s) => s);
        const botHasMonster = gameState.botMonsterField.some((s) => s);
        if (playerHasMonster && !botHasMonster) {
            addToLog('⏳ Ultimo Turno: solo il tuo mostro resta sul Terreno. Vittoria!');
            endDuel(true);
            return;
        }
        if (botHasMonster && !playerHasMonster) {
            addToLog('⏳ Ultimo Turno: solo il mostro del bot resta sul Terreno. Il bot vince!');
            endDuel(false);
            return;
        }
        addToLog('⏳ Ultimo Turno: nessuno dei due resta da solo sul Terreno. Pareggio!');
        endDuel('draw');
        return;
    }
    if (window.DuelEngine) {
        DuelEngine.processTemporaryBanishmentReturns('endphase', gameState.currentPlayer);
        DuelEngine.processNoDamageExpiry();
        DuelEngine.processSelfDestructAtOpponentEndPhase(gameState.currentPlayer);
        DuelEngine.firePhaseTrigger(DuelEngine.TRIGGER.ON_END_PHASE, gameState.currentPlayer);
        // "Alla fine della Battle Phase, se questa carta ha combattuto"
        // (es. Bestia Mitica Cerbero id 734, Cavaliere del Miraggio id
        // 381 — "ha attaccato O È STATA attaccata") — SOLO se questo End
        // Phase arriva davvero dalla Battle Phase. Su ENTRAMBI i lati (a
        // differenza di ON_END_PHASE qui sopra, solo il proprietario di
        // turno): un mostro può aver combattuto anche da difensore,
        // quindi appartenere all'altro giocatore. Handler generico
        // 'onBattlePhaseEnd', riusa firePhaseTrigger con un nome
        // dinamico invece di uno dei TRIGGER.* fissi (quella funzione
        // accetta già qualunque stringa, nessuna modifica lì necessaria).
        if (wasInBattlePhase) {
            DuelEngine.firePhaseTrigger('onBattlePhaseEnd', gameState.currentPlayer);
            DuelEngine.firePhaseTrigger('onBattlePhaseEnd', gameState.currentPlayer === 'player' ? 'bot' : 'player');
            // Cappelli Magici (id 363): le 2 carte del Deck travestite da
            // Mostri vanno distrutte qui — la carta Cappelli Magici stessa
            // è già finita nel Cimitero (Trappola Normale, non Continua)
            // molto prima di questo momento, quindi non può reagire da
            // sola con un proprio onBattlePhaseEnd: lista pendente globale,
            // stesso schema di gameState.pendingUltimateTurnCheck qui sopra.
            ['player', 'bot'].forEach((owner) => {
                const pending = gameState.pendingMagicalHatsDestroy && gameState.pendingMagicalHatsDestroy[owner];
                if (!pending || pending.length === 0) return;
                const field = owner === 'player' ? gameState.playerMonsterField : gameState.botMonsterField;
                pending.forEach((uid) => {
                    const idx = field.findIndex((s) => s && s.card.uid === uid);
                    if (idx !== -1) DuelEngine.actions.destroyMonster(owner, idx);
                });
                gameState.pendingMagicalHatsDestroy[owner] = [];
            });
        }
        // Bonus ATK/DEF "fino a fine turno" (es. Drenaggio di Energia id
        // 227, Rimozione del Limitatore id 350): scadono qui, con le
        // eventuali distruzioni previste — vedi ACTIONS.clearTemporaryAtkDefBonus
        // in duel-engine.js.
        DuelEngine.actions.clearTemporaryAtkDefBonus();
        // Trappola Inversa (id 558): l'inversione dei bonus/malus ATK/DEF
        // dura solo "fino alla End Phase" — si azzera qui, stesso punto di
        // clearTemporaryAtkDefBonus qui sopra.
        gameState.reverseAtkDefBonusUntilEndOfTurn = false;
        // Restituisce ai veri proprietari i mostri presi temporaneamente
        // sotto controllo (es. Cambio di Cuore) — "fino alla tua End
        // Phase" è sempre quella dello stesso turno in cui il controllo è
        // stato preso, stessa scelta di clearTemporaryAtkDefBonus() qui
        // sopra. Vedi ACTIONS.takeControl in duel-engine.js.
        DuelEngine.processTemporaryControlReturns();
    }
    // Carta della Rovina (id 140): manda l'intera mano al Cimitero nella
    // propria End Phase — consultato una volta sola e subito azzerato,
    // stesso spirito di skipNextTurnFor in changeTurn() qui sotto.
    if (gameState.discardHandAtEndPhaseFor && gameState.discardHandAtEndPhaseFor[gameState.currentPlayer]) {
        gameState.discardHandAtEndPhaseFor[gameState.currentPlayer] = false;
        const owner = gameState.currentPlayer;
        const hand = owner === 'player' ? gameState.playerHand : gameState.botHand;
        const graveyard = owner === 'player' ? gameState.playerGraveyard : gameState.botGraveyard;
        if (hand.length > 0) {
            graveyard.push(...hand.splice(0, hand.length));
            addToLog(`🗑️ ${owner === 'player' ? 'Mandi' : 'Il bot manda'} l'intera mano al Cimitero (Carta della Rovina)!`);
        }
    }
    updateUI();

    // Limite di carte in mano (regole.html, Capitolo 2/3): chi finisce il
    // turno con più di MAX_HAND_SIZE carte deve scartare fino a tornarci
    // PRIMA che il turno passi. Il bot lo fa da solo, in automatico; il
    // giocatore sceglie lui stesso cosa scartare (vedi
    // startHandDiscardSelection in js/engine/actions.js) — in quel caso il timer
    // che cambia turno riparte solo a scelta completata, non su un tempo
    // fisso, esattamente come già succede per l'Evocazione Tributo.
    const handKey = gameState.currentPlayer === 'player' ? 'playerHand' : 'botHand';
    const stKey = gameState.currentPlayer === 'player' ? 'playerSTField' : 'botSTField';
    // Carte Infinite (id 307): "non c'è alcun limite al numero di carte
    // nella mano dei giocatori" — sopprime lo scarto per eccesso mentre è
    // scoperta sul Terreno di CHI sta terminando il turno (stesso spirito
    // di "regola vera": la carta annulla il limite per ENTRAMBI, ma qui
    // basta controllarla dal lato di chi in questo momento supererebbe il
    // limite, dato che il motore applica il controllo un giocatore alla
    // volta).
    const hasInfiniteCards = (gameState[stKey] || []).some((s) => s && !s.isFaceDown && s.card.id === 307);
    const excess = hasInfiniteCards ? 0 : gameState[handKey].length - MAX_HAND_SIZE;
    if (excess > 0) {
        if (gameState.currentPlayer === 'player' && typeof startHandDiscardSelection === 'function') {
            startHandDiscardSelection(excess, () => {
                phaseTransitionTimeout = setTimeout(changeTurn, 700);
            });
            return;
        }
        if (gameState.currentPlayer === 'bot') {
            autoDiscardBotHandExcess(excess);
            updateUI();
        }
    }

    phaseTransitionTimeout = setTimeout(changeTurn, 1500);
}

/**
 * Scarto automatico del bot quando supera il limite di mano a fine turno
 * (vedi enterEndPhase qui sopra) — nessuna vera IA di scelta: il bot
 * scarta le ultime carte in mano (le più recenti pescate, in fondo
 * all'array), la stessa semplificazione "nessun criterio di valore"
 * documentata altrove in questo motore per le scelte automatiche del bot.
 */
function autoDiscardBotHandExcess(excess) {
    // ctx.discardChosenFromHand (duel-engine.js) invece di uno splice/push
    // manuale, stesso motivo del lato giocatore in performHandDiscard()
    // (actions.js): fa scattare def.onSentToGraveyardFromHand (es. Roc
    // dalla Valle della Foschia id 781) invece di ignorarlo silenziosamente.
    // Le ultime carte in mano restano scartate per prime (nessun criterio
    // di valore, comportamento invariato) — indici dall'ultimo al primo
    // per lo stesso motivo del lato giocatore (uno splice sposta gli indici
    // successivi).
    const startIndex = gameState.botHand.length - excess;
    for (let i = gameState.botHand.length - 1; i >= startIndex; i--) {
        DuelEngine.actions.discardChosenFromHand.call({ owner: 'bot' }, 'bot', i);
    }
    addToLog(`🗑️ Il bot ha più di ${MAX_HAND_SIZE} carte in mano: scarta ${excess} cart${excess > 1 ? 'e' : 'a'}.`);
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

    renderBanishedBadge('player');
    renderBanishedBadge('bot');
}

/**
 * Aggiorna il badge "Zona Bandite" (duelMonstersCore.html, dentro
 * .player-info#playerInfo/#botInfo) di `owner`: conteggio + visibilità
 * (nascosto finché vuota) + click per aprire lo stesso visualizzatore già
 * usato per il Cimitero (informazione pubblica per entrambi i lati, vedi
 * createSlotElement in questo file). Chiamata da renderLifePoints() ad
 * ogni render, così resta sempre in sincrono con
 * gameState.playerBanished/botBanished.
 */
function renderBanishedBadge(owner) {
    const badge = document.getElementById(owner === 'player' ? 'playerBanishedBadge' : 'botBanishedBadge');
    const countEl = document.getElementById(owner === 'player' ? 'playerBanishedCount' : 'botBanishedCount');
    if (!badge || !countEl) return;
    const banished = owner === 'player' ? gameState.playerBanished : gameState.botBanished;
    countEl.textContent = banished.length;
    badge.classList.toggle('has-cards', banished.length > 0);
    badge.onclick = () => {
        if (banished.length === 0 || !window.DuelEngineUI) return;
        window.DuelEngineUI.openCardListPicker(banished, {
            title: owner === 'player' ? '🌀 Zona Bandite' : '🌀 Zona Bandite dell\'avversario',
            text: `${banished.length} cart${banished.length === 1 ? 'a' : 'e'} bandit${banished.length === 1 ? 'a' : 'e'}.`,
            selectable: false
        });
    };
}

function updateUI() {
    if (gameState.gameOver) return;
    // Ricalcola gli effetti continui (es. Jinzo nega le Trappole, Spada
    // Rivelatrice blocca gli attacchi) PRIMA di disegnare qualunque cosa,
    // così il render riflette sempre lo stato corrente del campo — vedi
    // js/engine/duel-engine.js.
    if (window.DuelEngine) DuelEngine.recomputeStaticEffects();
    renderLifePoints();
    renderPlayerHand();
    renderBotHand();
    renderFields();
    updatePhaseIndicator();
    checkGameOver();
}

function renderFields() {
    const createRow = (owner, slots, slotType, specialConfig, isMonsterRow, isMirrored = false) => {
        const row = document.createElement('div');
        row.className = 'field-row';

        // La zona Magia Terreno (specialConfig.firstZone.zone === 'fieldSpell')
        // è l'unica zona "speciale" che accetta davvero una carta giocabile
        // dal giocatore (le altre — Fusion/Deck/Cimitero — restano pura
        // informazione, mai un bersaglio di piazzamento): resta "special"
        // per la STILE CSS (.special-slot, stesso aspetto di Fusion/Deck),
        // ma il suo onclick viene sovrascritto qui sotto per passare
        // comunque da handleSlotClick — e, se occupata, mostra la carta
        // vera al posto della sola etichetta testuale "Terreno".
        const isFieldSpellZone = specialConfig.firstZone.zone === 'fieldSpell';
        const fieldSpellSlotState = isFieldSpellZone ? (owner === 'player' ? gameState.playerFieldSpell : gameState.botFieldSpell) : null;
        const firstSpecial = createSlotElement(owner, specialConfig.firstZone.type, -1, {
            special: true,
            zone: specialConfig.firstZone.zone,
            label: fieldSpellSlotState ? null : specialConfig.firstZone.label,
            count: specialConfig.firstZone.count
        });
        if (isFieldSpellZone) {
            firstSpecial.onclick = () => handleSlotClick(owner, 'field-spell', -1);
        }
        if (fieldSpellSlotState) {
            const visuallyFaceDown = fieldSpellSlotState.isFaceDown;
            const fieldSpellCardEl = createCardElement(fieldSpellSlotState.card, visuallyFaceDown, 'attack');
            fieldSpellCardEl.onclick = (event) => {
                event.stopPropagation();
                if (!dragState) {
                    handleCardClick(fieldSpellSlotState.card, 'field-spell', -1, owner, visuallyFaceDown);
                }
            };
            fieldSpellCardEl.onmouseenter = () => {
                if (dragState) return;
                updateCardInfoPanel(fieldSpellSlotState.card, { sourceType: 'field-spell', sourceOwner: owner, isFaceDown: visuallyFaceDown });
            };
            firstSpecial.appendChild(fieldSpellCardEl);
        }
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
            // Spada di luce verde INFILZATA nel terreno, su OGNI zona
            // Mostro della fila colpita da Spada Rivelatrice, occupata o
            // no — la STESSA sagoma CSS dell'animazione di attivazione
            // (.field-sword-mark riusa il clip-path/gradiente di
            // .fx-sword-beam in effects.css), ma ferma e senza scadenza
            // propria: va ricreata ad ogni render finché
            // DuelEngine.isRevealedFor(owner) resta vero (dura quanto dura
            // l'effetto, 3 turni), esattamente come .monster-row-revealed
            // sulla fila (vedi sotto). Il secondo controllo
            // (revealedSwordsLanded) evita che compaia PRIMA che le spade
            // mobili dell'animazione di attivazione siano davvero atterrate
            // — altrimenti si vedrebbe questo segno fisso apparire
            // all'istante, PRIMA ancora del "colpo di scena" della caduta
            // (impostato da card-effects.js/id 8 via FX.playSwordsOfRevealingLight).
            if (isMonsterRow && window.DuelEngine && DuelEngine.isRevealedFor(owner) && gameState.revealedSwordsLanded && gameState.revealedSwordsLanded[owner]) {
                const swordMark = document.createElement('div');
                swordMark.className = 'field-sword-mark';
                slotEl.appendChild(swordMark);
            }
            if (slot) {
                // Un mostro coperto resta "coperto" per le regole (flip,
                // reveal-on-attack, ecc. — vedi js/engine/actions.js), ma se
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
                // js/ui/card.css), quindi un'etichetta che sporge sotto il
                // bordo verrebbe tagliata se fosse figlia della carta stessa.
                if (isMonsterRow && slot.card.type === 'monster' && !visuallyFaceDown) {
                    // ATK/DEF "effettivo" come sulla carta stessa (vedi
                    // js/ui/card-renderer.js): senza DuelEngine.getEffectiveAtk/
                    // getEffectiveDef questo badge mostrava sempre i valori
                    // BASE della carta, ignorando bonus/malus temporanei o
                    // continui — disallineato dalla carta appena sotto, che
                    // invece li rifletteva già correttamente.
                    const hasEffectiveStats = window.DuelEngine && typeof DuelEngine.getEffectiveAtk === 'function';
                    const fsbAtk = hasEffectiveStats ? DuelEngine.getEffectiveAtk(slot.card) : slot.card.attack;
                    const fsbDef = hasEffectiveStats ? DuelEngine.getEffectiveDef(slot.card) : slot.card.defense;
                    const statsBadge = document.createElement('div');
                    statsBadge.className = 'field-stats-badge';
                    statsBadge.innerHTML = `<span class="fsb-atk">${fsbAtk}</span><span class="fsb-sep">/</span><span class="fsb-def">${fsbDef}</span>`;
                    slotEl.appendChild(statsBadge);
                }
                // Segnalini sulla carta (es. id 131 Distruttore/Segnalino
                // Magia, id 139 Guardia di Carte/Segnalino Guardia — vedi
                // la convenzione `card.counters` spiegata in cima a
                // js/engine/card-effects.js): un badge tondo col numero, appeso
                // in alto a destra della carta, generico per QUALUNQUE
                // carta futura che ne usi — non serve insegnare alla UI il
                // nome di ogni singolo tipo di segnalino, solo il conteggio.
                if (!visuallyFaceDown && slot.card.counters > 0) {
                    const counterBadge = document.createElement('div');
                    counterBadge.className = 'field-counter-badge';
                    counterBadge.textContent = slot.card.counters;
                    slotEl.appendChild(counterBadge);
                }
                // Effetto Continua a conto alla rovescia (Spada Rivelatrice
                // id 8, Spade della Luce Occultante id 730, ecc.): bagliore
                // verde "a spade dall'alto" sulla carta + contatore dei
                // turni rimasti, così si vede subito quanto manca prima che
                // l'effetto svanisca da solo. Generico su qualunque carta
                // con def.durationTurns, non più legato al solo id 8.
                if (!isMonsterRow && !slot.isFaceDown && typeof slot.turnsLeft === 'number' && window.DuelEngine && DuelEngine.getDefinition(slot.card.id)?.durationTurns) {
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
        firstZone: { type: 'fusion', zone: 'fusion', label: 'Fusion', count: gameState.playerExtraDeck.length },
        secondZone: { type: 'deck', zone: 'deck', label: 'Deck', count: gameState.playerDeckCount }
    }, false));

    botBoard.appendChild(createRow('bot', gameState.botSTField, 'st', {
        firstZone: { type: 'fusion', zone: 'fusion', label: 'Fusion', count: gameState.botExtraDeck.length },
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
    // blocca subito verso la MANO del bot (il bersaglio concettuale di un
    // attacco diretto, non il box LP — dove i Life Points scendono è solo
    // la conseguenza, non il "cosa" stai colpendo) e mostra il warning
    // laterale in anteprima, così è chiaro fin da subito cosa sta per
    // succedere.
    attackDragStart.forcedDirect = !gameState.botMonsterField.some((monster) => monster !== null);
    if (attackDragStart.forcedDirect) {
        const botHandEl = document.getElementById('botHand');
        if (botHandEl) {
            const botRect = botHandEl.getBoundingClientRect();
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
    // Riconosce come "voglio un attacco diretto" sia il rilascio sul box LP
    // del bot sia sulla sua mano (il nuovo bersaglio verso cui punta la
    // freccia, vedi startAttackDrag) — non solo il primo, altrimenti
    // rilasciare esattamente dove la freccia stessa punta non funzionerebbe.
    const isBotInfoTarget = !!targetElement && (
        targetElement.closest('#botInfo') || targetElement.id === 'botInfo' || targetElement.closest('.player-info#botInfo') ||
        targetElement.closest('#botHand') || targetElement.id === 'botHand'
    );
    // Un mostro con il permesso speciale di attaccare direttamente in
    // questo turno (es. Golem Meccanico la Fortezza Mobile, dopo aver
    // pagato 800 LP tramite il suo effetto Ignition — vedi
    // gameState.directAttackAllowedFor) può farlo anche se il bot
    // controlla dei mostri, non solo quando il suo campo è vuoto.
    const attackerSlot = gameState.playerMonsterField[attackDragStart.attackerIndex];
    const hasDirectAttackPermit = !!(attackerSlot && (
        (gameState.directAttackAllowedFor && gameState.directAttackAllowedFor[attackerSlot.card.uid])
        || (gameState.directAttackAllowedUids && gameState.directAttackAllowedUids[attackerSlot.card.uid])
    ));

    if (targetSlot && targetSlot.dataset.owner === 'bot' && targetSlot.dataset.type === 'monster' && gameState.botMonsterField[parseInt(targetSlot.dataset.index, 10)]) {
        executeAttack(attackDragStart.attackerIndex, parseInt(targetSlot.dataset.index, 10));
        return;
    }
    if (isBotInfoTarget && (!hasBotMonsters || hasDirectAttackPermit)) {
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
        : '❌ Rilascia l\'attacco sulla mano del Bot per un attacco diretto.');
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
    // Il suono dei Life Points NON parte da qui: lo scatena già
    // ACTIONS.dealDamage in duel-engine.js (unico punto per cui passa
    // OGNI variazione di LP, anche quella da carte che non chiamano mai
    // showFloatingDamage) — richiamarlo anche qui suonerebbe due volte
    // per lo stesso danno da battaglia.
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
        const cardEl = document.querySelector(`#${boardId} .field-slot[data-type="monster"][data-index="${index}"] .card`);
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
        badge.dataset.icon = position === 'attack' ? 'attackPos' : 'defensePos';
        cardEl.appendChild(badge);
        if (window.Icons) Icons.hydrate(cardEl);
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
        // NIENTE cardEl.onclick qui: il sistema a Pointer Event qui sotto
        // (onpointerdown -> startHandCardDrag -> handleDragMove/handleDragEnd
        // in js/engine/actions.js) gestisce GIÀ da solo sia il click sia il
        // trascinamento, per mouse E touch. Un handler 'click' nativo IN PIÙ
        // sulla stessa carta duplicava ogni tap: il rilascio del dito faceva
        // scattare handleCardClick() dal sistema Pointer, e POCO DOPO il
        // browser sparava anche il proprio evento 'click' sintetico
        // (compatibilità touch->mouse) che richiamava handleCardClick() UNA
        // SECONDA volta — su desktop innocuo (apre/richiude lo stesso
        // popover), ma su telefono reale la doppia invocazione ravvicinata
        // poteva far sembrare che il primo tap "non facesse nulla" (il
        // popover apriva e richiudeva quasi subito) finché un vero
        // trascinamento non bypassava del tutto questo doppio percorso.
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

/**
 * Mano dell'avversario: SOLO dorsi, mai le carte vere — tante quante sono
 * davvero in gameState.botHand, così si vede a colpo d'occhio quante
 * carte ha in mano senza che il gioco "bari" mostrandone il contenuto.
 * Nessuna interazione (niente click/drag): sono pura informazione, come
 * il mazzo o il Cimitero.
 */
function renderBotHand() {
    const handEl = document.getElementById('botHand');
    if (!handEl) return;
    handEl.innerHTML = '';
    gameState.botHand.forEach(() => {
        handEl.appendChild(CardRenderer.renderCardBack());
    });
}

// createCardElement(card, isFaceDown, position) e getCardImagePath(card)
// vivono ora in js/ui/card-renderer.js (condiviso da tutte le pagine) — vedi
// quel file per come si costruisce il DOM di una carta.

// Icone al posto del nome testuale per le zone speciali vuote (vedi
// createSlotElement sotto) — icone SVG a tema (js/ui/icon-library.js,
// stesso window.Icons già usato per i menu/topbar del sito), non emoji
// generiche di sistema. "Deck" non è nella mappa apposta: resta testo,
// dato che in pratica è quasi sempre coperto dalla pila di dorsi (vuoto
// solo se il mazzo finisce le carte).
const FIELD_ZONE_ICONS = { Terreno: 'fieldSpell', Cimitero: 'graveyard', Fusion: 'fusionDeck' };

function createSlotElement(owner, type, index, options = {}) {
    const slotEl = document.createElement('div');
    slotEl.className = 'field-slot';
    if (options.special) slotEl.classList.add('special-slot');
    // Deck e Cimitero condividono lo stesso linguaggio visivo di "pila di
    // carte coperte" (vedi sotto): stesse classi/offset CSS (.deck-slot,
    // .deck-preview:nth-child), anche se sono due zone di gioco diverse.
    const isPileZone = options.zone === 'deck' || options.zone === 'graveyard' || options.zone === 'fusion';
    if (isPileZone) slotEl.classList.add('deck-slot');
    if (owner === 'bot' && isPileZone) slotEl.classList.add('bot-deck-slot');
    slotEl.dataset.owner = owner;
    slotEl.dataset.type = type;
    if (index !== -1) slotEl.dataset.index = index;
    if (options.zone) slotEl.dataset.zone = options.zone;
    slotEl.onclick = () => {
        // Zona Extra Deck: normalmente solo consultabile (mai un bersaglio
        // di piazzamento — vi si arriva soprattutto tramite la Magia
        // "Fusione", vedi ctx.fusionSummon in js/engine/duel-engine.js). MA
        // alcuni Mostri Extra Deck (es. Cannone Drago XY/XYZ) si Special
        // Summonano bandendo materiali dal proprio Terreno SENZA passare
        // da nessuna Magia — per quelli, cliccare qui sulla propria zona
        // durante la propria Main Phase offre direttamente la scelta di
        // Evocarli (DuelEngine.getBanishFusableExtraDeckMonsters), invece
        // del solo elenco informativo.
        if (options.zone === 'fusion') {
            const isMainPhase = gameState.phase === 'main1' || gameState.phase === 'main2';
            const canAct = owner === 'player' && gameState.currentPlayer === 'player' && isMainPhase && window.DuelEngine;
            const banishOptions = canAct ? DuelEngine.getBanishFusableExtraDeckMonsters('player') : [];
            if (banishOptions.length > 0 && window.DuelEngineUI) {
                window.DuelEngineUI.openCardListPicker(banishOptions.map((o) => o.card), {
                    title: '🌀 Evoca dall\'Extra Deck',
                    text: 'Puoi Special Summonare bandendo i materiali che controlli scoperti sul Terreno. Scegli quale Evocare.',
                    onSelect: (card) => {
                        const match = banishOptions.find((o) => o.card.uid === card.uid);
                        if (match) {
                            DuelEngine.banishFusionSummon('player', match.extraDeckIndex, match.materialFieldIndices);
                        }
                    }
                });
                return;
            }
            // L'Extra Deck non è informazione pubblica (a differenza del
            // Cimitero, vedi sotto): consultabile a piacere SOLO il
            // proprio, mai quello dell'avversario — quello resta visibile
            // solo se e quando un vero effetto carta lo rivela (già
            // gestito altrove, non da questo click generico sullo slot).
            if (owner === 'player' && gameState.playerExtraDeck.length > 0 && window.DuelEngineUI) {
                window.DuelEngineUI.openCardListPicker(gameState.playerExtraDeck, {
                    title: '🔗 Extra Deck',
                    text: `${gameState.playerExtraDeck.length} carta${gameState.playerExtraDeck.length === 1 ? '' : 'e'} nell'Extra Deck.`,
                    selectable: false
                });
            }
            return;
        }
        // Zona Cimitero: informazione PUBBLICA come nel gioco vero (sempre
        // consultabile, anche quello dell'avversario) — a differenza
        // dell'Extra Deck qui sopra. Mai un bersaglio di piazzamento;
        // stesso modale usato per rianimare/scegliere un mostro.
        if (options.zone === 'graveyard') {
            const graveyard = owner === 'player' ? gameState.playerGraveyard : gameState.botGraveyard;
            if (graveyard.length > 0 && window.DuelEngineUI) {
                window.DuelEngineUI.openCardListPicker(graveyard, {
                    title: owner === 'player' ? '⚰️ Cimitero' : '⚰️ Cimitero dell\'avversario',
                    text: `${graveyard.length} cart${graveyard.length === 1 ? 'a' : 'e'} nel Cimitero.`,
                    selectable: false
                });
            }
            return;
        }
        if (!options.special) {
            handleSlotClick(owner, type, index);
        }
    };

    // 0 carte -> zona vuota, 1 carta -> un solo dorso, 2+ carte -> pila di 3
    // dorsi sfalsati (fallback CSS via .deck-preview:nth-child, sostituita
    // automaticamente da images/cards/backPilaCards.jpeg se quel file
    // esiste — vedi js/ui/card-renderer.js).
    const pileCount = isPileZone ? (options.count || 0) : 0;
    if (isPileZone) {
        if (pileCount === 1) {
            CardRenderer.appendDeckPile(slotEl, 1);
        } else if (pileCount > 1) {
            CardRenderer.appendDeckPile(slotEl, 3);
        }
    }

    // Con la pila presente, l'etichetta/conteggio testuale centrati
    // (sotto) finirebbero coperti dai dorsi delle carte (z-index più alto)
    // — al loro posto, lo stesso badge a pillola già usato per ATK/DEF
    // sotto le carte in campo (.field-stats-badge), solo col numero di
    // carte: stessa lingua visiva, sempre leggibile sopra la pila.
    if (isPileZone && pileCount > 0) {
        const pileBadge = document.createElement('div');
        pileBadge.className = 'field-stats-badge field-pile-badge';
        pileBadge.textContent = pileCount;
        slotEl.appendChild(pileBadge);
    } else {
        if (options.label) {
            const iconName = FIELD_ZONE_ICONS[options.label];
            const labelEl = document.createElement('div');
            labelEl.title = options.label;
            if (iconName && window.Icons) {
                labelEl.className = 'field-slot-label field-slot-icon';
                labelEl.dataset.icon = iconName;
                slotEl.appendChild(labelEl);
                Icons.hydrate(slotEl);
            } else {
                labelEl.className = 'field-slot-label';
                labelEl.textContent = options.label;
                slotEl.appendChild(labelEl);
            }
        }
        if (options.count !== undefined) {
            const countEl = document.createElement('div');
            countEl.className = 'field-slot-count';
            countEl.textContent = options.count;
            slotEl.appendChild(countEl);
        }
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
    // textContent, non innerHTML: `message` spesso incorpora card.name/
    // card.effect (es. "Hai attivato ${card.name}!"), che con le carte
    // personalizzate (crea-carta.html) è testo scelto liberamente
    // dall'utente — un nome tipo "<img src=x onerror=...>" verrebbe
    // altrimenti eseguito. Nessun messaggio di log di questo motore
    // incorpora mai vero markup HTML intenzionale, quindi il cambio non
    // toglie nulla.
    entry.textContent = message;
    log.appendChild(entry);
    log.scrollTop = log.scrollHeight;
}

// I 5 pezzi di Exodia il Proibito (vedi js/data/cards-db.js, id 11 e 41-44):
// chi li ha tutti e 5 in mano vince il duello all'istante, a prescindere
// dai Life Points — regola storica della prima serie.
const EXODIA_PIECE_IDS = [11, 41, 42, 43, 44];

function hasExodiaAssembled(hand) {
    return EXODIA_PIECE_IDS.every((pieceId) => hand.some((card) => card.id === pieceId));
}

// Destiny Board (id 866) + le 4 carte Spirit Message "I"/"N"/"A"/"L" (id
// 867-870, vedi js/engine/card-effects.js): chi le ha tutte e 5 scoperte
// sulla propria zona Magia/Trappola contemporaneamente vince il duello
// all'istante — testo ufficiale di Destiny Board, verificato su
// db.yugioh-card.com. Stesso identico schema di EXODIA_PIECE_IDS/
// hasExodiaAssembled qui sopra, solo sulla zona Magia/Trappola invece
// che sulla mano.
const DESTINY_BOARD_CARD_IDS = [866, 867, 868, 869, 870];

function hasDestinyBoardComplete(owner) {
    const stField = owner === 'player' ? gameState.playerSTField : gameState.botSTField;
    return DESTINY_BOARD_CARD_IDS.every((id) => stField.some((slot) => slot && !slot.isFaceDown && slot.card.id === id));
}

/**
 * Come hasExodiaAssembled() qui sopra, ma controlla il Cimitero invece
 * della mano — usata da "Patto con Exodia" (id 161, card-effects.js), che
 * richiede tutti e 5 i pezzi nel Cimitero, non in mano. Non collegata a
 * checkGameOver(): la vittoria automatica resta SOLO per i pezzi in mano,
 * come da regola vera (id 161 li manda al Cimitero apposta per pagare il
 * proprio costo, non per vincere).
 */
function hasExodiaInGraveyard(owner) {
    const graveyard = owner === 'player' ? gameState.playerGraveyard : gameState.botGraveyard;
    return EXODIA_PIECE_IDS.every((pieceId) => graveyard.some((card) => card.id === pieceId));
}

/**
 * Cerca i DOM element di `cardIds` (uid REALI, non id-carta) dentro il
 * contenitore DOM `containerId` — helper condiviso da ogni trigger*Win
 * qui sotto per "trova le carte coinvolte da far brillare nella
 * cinematica" (vedi triggerInstantWin). Torna sempre un array (mai
 * null/undefined), filtrando via ogni carta non trovata (contenitore
 * assente, o carta di un giocatore la cui zona non è mostrata a
 * schermo — es. la mano del bot).
 */
function findCardElementsByUid(containerId, cardUids) {
    const container = document.getElementById(containerId);
    if (!container) return [];
    return cardUids
        .map((uid) => container.querySelector(`[data-uid="${CSS.escape(uid)}"]`))
        .filter(Boolean);
}

/**
 * Orchestratore condiviso da OGNI condizione di vittoria istantanea/
 * alternativa (Exodia, Destiny Board, Elefante Volante — vedi
 * checkGameOver più sotto, che le richiama tutte): imposta il
 * guardrail anti-rientranza, gioca la cinematica dedicata
 * (FX.playInstantWinCinematic, effects.js — un filmato se esiste
 * video/vittorie/<kind>.mp4, altrimenti una sequenza CSS), poi SOLO
 * alla fine registra il log passato e dichiara la vittoria vera con
 * endDuel() — stesso principio di FX.playMonsterSummonEffect già usato
 * per un'Evocazione (video dedicato prioritario, poi un fallback
 * "cool" via CSS), qui applicato a un momento di VITTORIA. Un'unica
 * funzione condivisa invece di una copia per condizione: una FUTURA
 * vittoria istantanea deve solo chiamare questa (vedi
 * triggerExodiaWin/triggerDestinyBoardWin/triggerFlyingElephantWin qui
 * sotto per l'esempio), non reinventare guardrail/cinematica/log/
 * endDuel da capo.
 *
 * gameState.instantWinCinematicPlaying blocca chiamate rientranti a
 * checkGameOver() mentre una cinematica gira (updateUI(), che la
 * richiama, viene invocata molto spesso durante il duello) — non va
 * mai resettato esplicitamente: endDuel() (chiamata da `finish` qui
 * sotto) imposta gameState.gameOver, che fa uscire checkGameOver() dal
 * SUO PRIMO controllo, prima ancora di arrivare a leggere questo flag.
 */
function triggerInstantWin(kind, bannerText, logMessage, playerWon, pieceElements) {
    gameState.instantWinCinematicPlaying = true;
    const finish = () => {
        addToLog(logMessage);
        endDuel(playerWon);
    };
    if (!window.FX || typeof FX.playInstantWinCinematic !== 'function') { finish(); return; }
    FX.playInstantWinCinematic(kind, bannerText, pieceElements || [], finish);
}

/**
 * "5 pezzi di Exodia riuniti". I DOM element dei 5 pezzi vengono
 * cercati SOLO per il giocatore umano (playerWon === true): il bot non
 * ha la propria mano mostrata a schermo, quindi per lui l'array resta
 * vuoto e la cinematica salta dritta al flash finale (vedi il commento
 * su playInstantWinCinematic/effects.js per il dettaglio).
 */
function triggerExodiaWin(playerWon) {
    const pieceElements = playerWon
        ? findCardElementsByUid('playerHand', gameState.playerHand.filter((card) => EXODIA_PIECE_IDS.includes(card.id)).map((card) => card.uid))
        : [];
    const logMessage = playerWon
        ? '✨ Hai riunito tutti e 5 i pezzi di Exodia il Proibito! Vittoria automatica!'
        : '✨ Il bot ha riunito tutti e 5 i pezzi di Exodia il Proibito! Vittoria automatica!';
    triggerInstantWin('exodiawin', 'EXODIA IL PROIBITO', logMessage, playerWon, pieceElements);
}

/**
 * "Destiny Board completo" (Santuario Oscuro id 866 + le 4 Spirit
 * Message id 867-870, tutte scoperte insieme in zona Magia/Trappola).
 * A differenza della mano di Exodia (visibile solo per il giocatore
 * umano), la zona Magia/Trappola è mostrata a schermo per ENTRAMBI i
 * lati — playerFieldBoard/botFieldBoard contengono sia la fila Mostri
 * sia quella Magia/Trappola dello stesso proprietario, quindi si cerca
 * sempre nel board del VINCITORE, non solo per il giocatore umano.
 */
function triggerDestinyBoardWin(playerWon) {
    const owner = playerWon ? 'player' : 'bot';
    const stField = owner === 'player' ? gameState.playerSTField : gameState.botSTField;
    const uids = DESTINY_BOARD_CARD_IDS
        .map((id) => stField.find((slot) => slot && !slot.isFaceDown && slot.card.id === id))
        .filter(Boolean)
        .map((slot) => slot.card.uid);
    const pieceElements = findCardElementsByUid(owner === 'player' ? 'playerFieldBoard' : 'botFieldBoard', uids);
    const logMessage = playerWon
        ? '💀 Destiny Board è completo: "FINAL" è scritto sul tuo Terreno! Vittoria automatica!'
        : '💀 Il bot ha completato Destiny Board: "FINAL" è scritto sul suo Terreno! Vittoria automatica!';
    triggerInstantWin('destinyboard', 'FINAL', logMessage, playerWon, pieceElements);
}

/**
 * Elefante Volante (id 246): a differenza delle due condizioni sopra
 * non c'è un "insieme di pezzi" da far brillare (una singola carta, la
 * cui abilità ha già finito di risolversi quando questa vittoria
 * scatta) — pieceElements resta sempre vuoto, la cinematica salta
 * dritta al flash finale.
 */
function triggerFlyingElephantWin(playerWon) {
    const logMessage = '🐘 Elefante Volante infligge danno da attacco diretto dopo essere sopravvissuto nella End Phase avversaria: vittoria automatica!';
    triggerInstantWin('flyingelephant', 'VITTORIA AUTOMATICA', logMessage, playerWon, []);
}

function checkGameOver() {
    if (gameState.gameOver) return;
    // updateUI() chiama checkGameOver() molto spesso: mentre una
    // cinematica di vittoria istantanea sta girando (gameState.gameOver
    // ancora false, endDuel() non ancora chiamato) una nuova chiamata
    // rientrante la riavvierebbe da capo — bloccata qui, azzerata
    // implicitamente appena endDuel() imposta gameState.gameOver (il
    // controllo qui sopra prende il sopravvento).
    if (gameState.instantWinCinematicPlaying) return;

    if (hasExodiaAssembled(gameState.playerHand)) {
        triggerExodiaWin(true);
        return;
    }
    if (hasExodiaAssembled(gameState.botHand)) {
        triggerExodiaWin(false);
        return;
    }

    if (hasDestinyBoardComplete('player')) {
        triggerDestinyBoardWin(true);
        return;
    }
    if (hasDestinyBoardComplete('bot')) {
        triggerDestinyBoardWin(false);
        return;
    }

    // 246 — Elefante Volante: "se questo [sopravvivere a un effetto
    // distruttivo avversario] è successo nella End Phase dell'avversario,
    // e questa carta infligge danno da attacco diretto nel turno
    // successivo del suo controllore: vittoria automatica". L'armamento
    // (gameState.flyingElephantWinPendingUids) avviene in ACTIONS.destroyMonster
    // (duel-engine.js) quando la distruzione viene prevenuta durante la
    // End Phase avversaria; il consumo (gameState.flyingElephantWinnerOwner)
    // avviene in onDealsBattleDamage (card-effects.js, id 246) quando
    // quella stessa carta infligge danno da attacco diretto. Controllato
    // qui, non direttamente da card-effects.js, per lo stesso motivo di
    // hasExodiaAssembled qui sopra: endDuel() va chiamato da un punto
    // "pulito" della catena di updateUI(), non da metà di resolveAttack()
    // (actions.js), che dopo aver chiamato onDealsBattleDamage continua
    // ancora con la propria logica (animazioni, hasAttacked, ecc.).
    if (gameState.flyingElephantWinnerOwner) {
        const winnerOwner = gameState.flyingElephantWinnerOwner;
        gameState.flyingElephantWinnerOwner = null;
        triggerFlyingElephantWin(winnerOwner === 'player');
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
 * `playerWon`: true/false come sempre, oppure la stringa 'draw' — Pareggio
 * (es. Ultimo Turno, id 341: nessun giocatore resta con un mostro da
 * solo sul Terreno). Un Pareggio non tocca il record V/S del personaggio
 * (recordCharacterResult non viene proprio chiamata, vedi
 * DuelSession.finish) — nessuna modifica allo schema di salvataggio.
 */
function endDuel(playerWon) {
    gameState.gameOver = true;
    clearPhaseTransitionTimeout();
    stopDuelTimer();
    // Una modale rimasta aperta (evocazione, o una finestra di risposta del
    // motore effetti) resterebbe lì sotto la schermata finale: la chiudiamo.
    document.querySelectorAll('.modal-backdrop.open').forEach((modal) => modal.classList.remove('open'));
    addToLog(playerWon === 'draw' ? '🤝 Il duello finisce in pareggio!' : playerWon ? '🎉 Hai vinto il duello!' : '💀 Hai perso il duello.');

    // Feedback tattile di fine duello (vedi js/native/haptics.js, no-op
    // sul web): nessuna vibrazione per un pareggio, non è né una vittoria
    // né una sconfitta netta.
    if (window.NativeHaptics && playerWon !== 'draw') {
        if (playerWon) NativeHaptics.success(); else NativeHaptics.error();
    }

    if (window.DuelSession) {
        // Un attimo di respiro dopo l'ultimo colpo, prima della schermata finale.
        setTimeout(() => DuelSession.finish(playerWon), 900);
    } else if (playerWon === 'draw') {
        showVictoryScreen('🤝 Pareggio!', 'gray');
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
    const openConfirm = () => {
        if (gameState.gameOver) return;
        if (!modal) { endDuel(false); return; }
        modal.classList.add('open');
    };
    btn.onclick = openConfirm;
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

    // "Indietro" del browser durante il duello chiede prima conferma,
    // esattamente come il pulsante Abbandona, invece di uscire di colpo
    // dal duello (e quindi contarlo comunque come sconfitta senza che
    // l'utente l'abbia scelto consapevolmente). Tecnica standard: si
    // aggiunge una voce "sentinella" alla cronologia appena parte il
    // duello, così il PRIMO "indietro" va lì invece che alla pagina
    // precedente vera; ad ogni popstate la si "ripristina" subito (per
    // restare sulla stessa pagina) e si apre il modale di conferma al suo
    // posto — se l'utente conferma, endDuel(false) più sotto naviga via
    // lui stesso (tramite DuelSession.finish -> goBack), stavolta per
    // davvero. Se il duello è già finito lascia fare al browser: a quel
    // punto uscire non ha più nulla da confermare.
    history.pushState({ duelGuard: true }, '', location.href);
    window.addEventListener('popstate', () => {
        if (gameState.gameOver) return;
        history.pushState({ duelGuard: true }, '', location.href);
        openConfirm();
    });
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

/**
 * 199/747 — "deve attaccare tutti i mostri avversari, una volta ciascuno":
 * vero se un attaccante con un obbligo ancora aperto (gameState.
 * mustAttackTargetUidsFor, popolato da grantAttackAllEnemiesOncEach in
 * card-effects.js) è ancora in campo E può ancora attaccare — in quel
 * caso la Battle Phase non può essere abbandonata. Se l'attaccante non
 * può più attaccare (distrutto, o attacchi extra esauriti) l'obbligo
 * diventa impossibile da soddisfare e smette di bloccare: coerente col
 * fatto che un attaccante rimosso a metà Battle Phase non può più agire.
 */
function hasUnfulfilledForcedAttack() {
    if (!gameState.mustAttackTargetUidsFor) return false;
    return Object.keys(gameState.mustAttackTargetUidsFor).some((attackerUid) => {
        const remaining = gameState.mustAttackTargetUidsFor[attackerUid];
        if (!remaining || remaining.size === 0) return false;
        const slot = gameState.playerMonsterField.find((s) => s && s.card.uid === attackerUid);
        return !!slot && !slot.hasAttacked;
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

    if (gameState.phase === 'battle' && (targetPhase === 'main2' || targetPhase === 'end') && hasUnfulfilledForcedAttack()) {
        addToLog('❌ Un tuo mostro deve ancora attaccare tutti i mostri avversari prima di lasciare la Battle Phase!');
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

// Boot del duello: appena questo file viene caricato, la partita parte con
// l'intro cinematografica, che al termine avvia initGame() +
// setupPhaseStepper(). Vale anche in Multiplayer: multiplayer.html carica
// questo script (fra gli altri) solo DOPO che la stanza si è riempita
// (vedi js/multiplayer/mp-lobby.js), quindi "appena caricato" coincide già con "il
// momento giusto per partire", senza bisogno di un flag di rinvio.
if (window.DuelSession) {
    DuelSession.start();
} else {
    initGame();
    setupPhaseStepper();
}
