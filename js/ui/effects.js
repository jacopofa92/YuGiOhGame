/**
 * effects.js — Motore effetti visivi in stile Yu-Gi-Oh! Master Duel
 * ---------------------------------------------------------------
 * Libreria PURAMENTE ADDITIVA: non legge né modifica gameState,
 * non tocca la logica di gioco. Espone window.FX con funzioni
 * riutilizzabili da chiamare nei punti giusti del codice esistente.
 *
 * Funzioni esposte:
 *   FX.playBattleDestroyEffect(cardElement)
 *   FX.playSummonShockwave(monsterElement)
 *   FX.playSummonCircle(monsterElement)
 *   FX.playBlueEyesSummon(monsterElement, card)
 *   FX.playDarkMagicianSummon(monsterElement, card)
 *   FX.playMonsterSummonEffect(card, monsterElement)
 *   FX.playDamageEffect(amount, { anchorEl })
 *   FX.playDrawEffect(cardElement)
 *   FX.playCardActivateEffect(cardElement)
 *   FX.playCardActivateCenterScreen(card)
 *   FX.playSwordsOfRevealingLight(owner)
 *   FX.playDarkHoleVortex(sucked)
 *   FX.playTributeSacrifice(cardElement)
 *   FX.spawnParticles(x, y, opts)
 */
(function () {
    'use strict';

    // ============================================================
    // Layer particellare condiviso (canvas fullscreen, no immagini)
    // ============================================================
    let fxCanvas = null;
    let fxCtx = null;
    let fxParticles = [];
    let fxRafId = null;

    function ensureCanvas() {
        if (fxCanvas) return;
        fxCanvas = document.createElement('canvas');
        fxCanvas.id = 'fxParticleCanvas';
        Object.assign(fxCanvas.style, {
            position: 'fixed',
            inset: '0',
            width: '100vw',
            height: '100vh',
            pointerEvents: 'none',
            zIndex: '10050'
        });
        document.body.appendChild(fxCanvas);
        fxCtx = fxCanvas.getContext('2d');
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
    }

    function resizeCanvas() {
        if (!fxCanvas) return;
        const dpr = window.devicePixelRatio || 1;
        fxCanvas.width = Math.round(window.innerWidth * dpr);
        fxCanvas.height = Math.round(window.innerHeight * dpr);
        fxCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    /**
     * Genera particelle energetiche in un punto dello schermo.
     * opts: { count, colors[], spread(deg), speed, life(ms), size, gravity, baseAngle(deg) }
     */
    function spawnParticles(x, y, opts = {}) {
        ensureCanvas();
        const count = opts.count ?? 24;
        const colors = opts.colors ?? ['#ffdf8c', '#f39c12', '#ffffff'];
        const spread = opts.spread ?? 360;
        const speed = opts.speed ?? 4;
        const life = opts.life ?? 600;
        const size = opts.size ?? 3;
        const gravity = opts.gravity ?? 0.05;
        const baseAngle = opts.baseAngle ?? -90;

        for (let i = 0; i < count; i++) {
            const angle = ((Math.random() * spread - spread / 2) + baseAngle) * (Math.PI / 180);
            const v = speed * (0.4 + Math.random() * 0.9);
            fxParticles.push({
                x, y,
                vx: Math.cos(angle) * v,
                vy: Math.sin(angle) * v,
                life,
                size: size * (0.6 + Math.random() * 0.8),
                color: colors[Math.floor(Math.random() * colors.length)],
                gravity,
                born: performance.now()
            });
        }
        runParticleLoop();
    }

    function runParticleLoop() {
        if (fxRafId) return;
        const step = (t) => {
            fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
            fxParticles = fxParticles.filter((p) => {
                const age = t - p.born;
                if (age > p.life) return false;
                p.x += p.vx;
                p.y += p.vy;
                p.vy += p.gravity;
                const alpha = Math.max(1 - age / p.life, 0);
                fxCtx.globalAlpha = alpha;
                fxCtx.fillStyle = p.color;
                fxCtx.shadowColor = p.color;
                fxCtx.shadowBlur = 8;
                fxCtx.beginPath();
                fxCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                fxCtx.fill();
                return true;
            });
            fxCtx.globalAlpha = 1;
            fxCtx.shadowBlur = 0;
            fxRafId = fxParticles.length > 0 ? requestAnimationFrame(step) : null;
        };
        fxRafId = requestAnimationFrame(step);
    }

    function centerOf(el) {
        const rect = el.getBoundingClientRect();
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, rect };
    }

    function spawnDomFx(className, x, y, w, h, life) {
        const el = document.createElement('div');
        el.className = className;
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        if (w !== undefined) el.style.width = `${w}px`;
        if (h !== undefined) el.style.height = `${h}px`;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), life);
        return el;
    }

    // ============================================================
    // 1) Distruzione carta in battaglia — esplosione + frammenti
    // ============================================================
    function playBattleDestroyEffect(cardElement) {
        if (!cardElement) return;
        const { x, y, rect } = centerOf(cardElement);

        cardElement.classList.add('fx-destroy-flash');
        setTimeout(() => cardElement.classList.remove('fx-destroy-flash'), 500);

        spawnDomFx('fx-destroy-rays', x, y, undefined, undefined, 550);
        spawnDomFx('fx-explosion-burst', x, y, undefined, undefined, 650);

        const shardCount = 6;
        for (let i = 0; i < shardCount; i++) {
            const angle = (360 / shardCount) * i + (Math.random() * 20 - 10);
            const dist = 50 + Math.random() * 40;
            const shard = document.createElement('div');
            shard.className = 'fx-shard';
            shard.style.left = `${x}px`;
            shard.style.top = `${y}px`;
            shard.style.width = `${rect.width * 0.28}px`;
            shard.style.height = `${rect.height * 0.28}px`;
            shard.style.setProperty('--fx-angle', `${angle}deg`);
            shard.style.setProperty('--fx-dist', `${dist}px`);
            document.body.appendChild(shard);
            setTimeout(() => shard.remove(), 700);
        }

        spawnParticles(x, y, { count: 32, colors: ['#ffdf8c', '#e74c3c', '#ffffff'], speed: 6.5, life: 650 });
    }

    // ============================================================
    // 2) Mostro posizionato in attacco — shockwave + glow
    // ============================================================
    function playSummonShockwave(monsterElement) {
        if (!monsterElement) return;
        const { x, y } = centerOf(monsterElement);

        spawnDomFx('fx-shockwave-ring', x, y, undefined, undefined, 700);

        monsterElement.classList.add('fx-summon-glow');
        setTimeout(() => monsterElement.classList.remove('fx-summon-glow'), 800);

        spawnParticles(x, y, { count: 16, colors: ['#f7d774', '#3498db', '#ffffff'], speed: 3, life: 500, gravity: -0.02 });
    }

    // ============================================================
    // 3) Evocazione mostro — cerchio magico + flare
    // ============================================================
    function playSummonCircle(monsterElement) {
        if (!monsterElement) return;
        const { x, y, rect } = centerOf(monsterElement);
        const size = Math.max(rect.width, rect.height) * 2.6;

        const circle = document.createElement('div');
        circle.className = 'fx-summon-circle';
        circle.style.left = `${x}px`;
        circle.style.top = `${y}px`;
        circle.style.width = `${size}px`;
        circle.style.height = `${size}px`;
        circle.innerHTML = '<div class="fx-summon-circle-ring fx-ring-outer"></div><div class="fx-summon-circle-ring fx-ring-inner"></div>';
        document.body.appendChild(circle);
        setTimeout(() => circle.remove(), 900);

        spawnDomFx('fx-summon-flare', x, y, undefined, undefined, 600);
    }

    // ============================================================
    // 3bis) Evocazione con "convergenza elementale" — sequenza dedicata
    // di ~4s (energia che converge, flash, cartiglio col nome) al posto
    // del cerchio magico generico, usata per una manciata di carte
    // iconiche invece che per tutte (vedi CARD_SUMMON_EFFECTS più sotto
    // per l'elenco). Un unico motore, `playElementalConvergence`,
    // orchestrata a orari fissi (uguali per ogni tema, così restano
    // sempre sincronizzate); solo i NOMI delle classi CSS (quindi i
    // colori/keyframe, vedi effects.css) e il testo del cartiglio
    // cambiano da un tema all'altro — playBlueEyesSummon/
    // playDarkMagicianSummon sotto sono solo due preset di questa.
    // ============================================================
    function playElementalConvergence(monsterElement, card, theme) {
        if (!monsterElement) return;
        const { x, y } = centerOf(monsterElement);

        const backdrop = document.createElement('div');
        backdrop.className = theme.backdropClass;
        backdrop.style.setProperty('--fx-bex', `${(x / window.innerWidth) * 100}%`);
        backdrop.style.setProperty('--fx-bey', `${(y / window.innerHeight) * 100}%`);
        document.body.appendChild(backdrop);
        setTimeout(() => backdrop.remove(), 4000);

        monsterElement.classList.add(theme.chargeClass);
        setTimeout(() => monsterElement.classList.remove(theme.chargeClass), 3600);

        // Raggi di energia che convergono da ogni direzione sul mostro,
        // scaglionati: ognuno è un fascio piatto, ruotato verso il
        // centro, "tirato" verso l'interno animando scaleX (transform-
        // origin sul lato esterno) invece che una vera animazione di
        // posizione — stesso trucco leggero già in uso altrove nel file
        // (vedi fx-sword-beam) invece di un canvas/libreria dedicata.
        const boltCount = 7;
        for (let i = 0; i < boltCount; i++) {
            const angle = (360 / boltCount) * i + (Math.random() * 24 - 12);
            const length = 260 + Math.random() * 140;
            const delay = 300 + i * 130;
            const bolt = document.createElement('div');
            bolt.className = theme.boltClass;
            Object.assign(bolt.style, {
                left: `${x}px`,
                top: `${y}px`,
                width: `${length}px`,
                transform: `translateY(-50%) rotate(${angle}deg) scaleX(0)`
            });
            document.body.appendChild(bolt);
            setTimeout(() => { bolt.style.transform = `translateY(-50%) rotate(${angle}deg) scaleX(1)`; }, delay);
            setTimeout(() => bolt.remove(), delay + 550);
        }

        // Flash centrale + scossa schermo al culmine della carica.
        setTimeout(() => {
            spawnDomFx(theme.flashClass, x, y, undefined, undefined, 500);
            const container = document.querySelector('.game-container') || document.body;
            container.classList.add('fx-shake');
            setTimeout(() => container.classList.remove('fx-shake'), 450);
            spawnParticles(x, y, { count: 40, colors: theme.particleColors, speed: 7, life: 650 });
        }, 2300);

        // Cartiglio col nome della carta (quello vero, es. "Drago Bianco
        // Definitivo" invece di "Drago Bianco Occhi Blu" quando questo
        // stesso tema è riusato per la Fusione, non un testo fisso).
        setTimeout(() => {
            const banner = document.createElement('div');
            banner.className = theme.bannerClass;
            banner.textContent = ((card && card.name) || theme.fallbackName).toUpperCase();
            document.body.appendChild(banner);
            setTimeout(() => banner.remove(), 1350);
        }, 2500);
    }

    /** Drago Bianco Occhi Blu (id 1) e Drago Bianco Definitivo (id 29, la sua Fusione): fulmini gelidi color ghiaccio. */
    function playBlueEyesSummon(monsterElement, card) {
        playElementalConvergence(monsterElement, card, {
            backdropClass: 'fx-blueeyes-backdrop',
            chargeClass: 'fx-blueeyes-charge',
            boltClass: 'fx-blueeyes-bolt',
            flashClass: 'fx-blueeyes-flash',
            bannerClass: 'fx-blueeyes-banner',
            fallbackName: 'Drago Bianco Occhi Blu',
            particleColors: ['#ffffff', '#5dade2', '#d6eaf8']
        });
    }

    /** Mago Nero (id 2), attributo OSCURITÀ: stessa sequenza, ma energia oscura viola/nera invece dei fulmini di ghiaccio. */
    function playDarkMagicianSummon(monsterElement, card) {
        playElementalConvergence(monsterElement, card, {
            backdropClass: 'fx-darkmagician-backdrop',
            chargeClass: 'fx-darkmagician-charge',
            boltClass: 'fx-darkmagician-bolt',
            flashClass: 'fx-darkmagician-flash',
            bannerClass: 'fx-darkmagician-banner',
            fallbackName: 'Mago Nero',
            particleColors: ['#0d0616', '#8e44ad', '#c39bd3']
        });
    }

    /**
     * Elenco delle carte con una sequenza di Evocazione dedicata (vedi
     * playMonsterSummonEffect più sotto) — aggiungerne una nuova vuol
     * dire aggiungere una riga qui e, se serve un tema nuovo (non uno
     * dei due esistenti), un nuovo preset come i due sopra + le classi
     * CSS gemelle in effects.css.
     */
    const CARD_SUMMON_EFFECTS = {
        1: playBlueEyesSummon,
        29: playBlueEyesSummon,
        2: playDarkMagicianSummon
    };

    /**
     * Riproduce un video a schermo intero (usato quando esiste un
     * filmato dedicato per una carta, vedi VisualEffects.getVideoFor in
     * js/ui/visual-effects-library.js) — si rimuove da solo alla fine
     * della riproduzione, in errore, o dopo 12s come rete di sicurezza
     * (un video mal codificato non deve mai bloccare la UI per sempre).
     */
    function playVideoOverlay(path, onDone) {
        const backdrop = document.createElement('div');
        backdrop.className = 'fx-video-backdrop';
        const video = document.createElement('video');
        video.src = path;
        video.autoplay = true;
        video.playsInline = true;
        video.className = 'fx-video-player';
        backdrop.appendChild(video);
        document.body.appendChild(backdrop);
        let done = false;
        const cleanup = () => {
            if (done) return;
            done = true;
            backdrop.remove();
            if (typeof onDone === 'function') onDone();
        };
        video.addEventListener('ended', cleanup);
        video.addEventListener('error', cleanup);
        setTimeout(cleanup, 12000);
    }

    /**
     * Punto di scelta unico dell'effetto visivo di Evocazione (Normale o
     * Speciale, entrambe le chiamano — vedi js/engine/actions.js e
     * js/engine/duel-engine.js/specialSummon), invece del solo
     * FX.playSummonCircle di sempre: per la stragrande maggioranza delle
     * carte non cambia nulla. Solo le carte elencate in
     * CARD_SUMMON_EFFECTS sopra hanno oggi una sequenza dedicata — MA se
     * in futuro comparirà un filmato vero per quell'id
     * (video/evocazioni/<id>.mp4, vedi VisualEffects.getVideoFor),
     * quello vince sempre sulla sequenza CSS, mai il contrario.
     */
    function playMonsterSummonEffect(card, monsterElement) {
        if (!monsterElement) return;
        const special = card && CARD_SUMMON_EFFECTS[card.id];
        if (special) {
            if (window.VisualEffects && typeof VisualEffects.getVideoFor === 'function') {
                VisualEffects.getVideoFor(card.id, 'evocazioni').then((videoPath) => {
                    if (videoPath) playVideoOverlay(videoPath);
                    else special(monsterElement, card);
                });
            } else {
                special(monsterElement, card);
            }
            return;
        }
        playSummonCircle(monsterElement);
    }

    // ============================================================
    // 4) Danno subito — screen shake + vignette rossa
    // ============================================================
    function playDamageEffect(amount, opts = {}) {
        const container = document.querySelector('.game-container') || document.body;
        container.classList.add('fx-shake');
        setTimeout(() => container.classList.remove('fx-shake'), 450);

        spawnDomFx('fx-damage-vignette', 0, 0, undefined, undefined, 500);

        if (opts.anchorEl) {
            const { x, y } = centerOf(opts.anchorEl);
            spawnDomFx('fx-damage-impact-flash', x, y, undefined, undefined, 550);
            spawnDomFx('fx-damage-impact-rays', x, y, undefined, undefined, 600);
            spawnParticles(x, y, { count: 22, colors: ['#e74c3c', '#ff6b6b', '#ffffff'], speed: 5.5, life: 550, gravity: 0.12 });
        }
    }

    // ============================================================
    // 5) Pescata carta — scia luminosa + particelle veloci
    // ============================================================
    function playDrawEffect(cardElement) {
        if (!cardElement) return;
        cardElement.classList.add('fx-draw-trail');
        const { x, y } = centerOf(cardElement);
        spawnParticles(x, y, { count: 10, colors: ['#7dd3fc', '#ffffff'], speed: 2.2, life: 400, gravity: 0, spread: 50, baseAngle: 180 });
        setTimeout(() => cardElement.classList.remove('fx-draw-trail'), 500);
    }

    // ============================================================
    // 6) Attivazione effetto carta — glow pulsante + overlay
    // ============================================================
    function playCardActivateEffect(cardElement) {
        if (!cardElement) return;
        cardElement.classList.add('fx-activate-glow');
        const rect = cardElement.getBoundingClientRect();
        spawnDomFx('fx-activate-overlay', rect.left, rect.top, rect.width, rect.height, 700);
        setTimeout(() => cardElement.classList.remove('fx-activate-glow'), 900);
    }

    // ============================================================
    // 6bis) Attivazione carta a CENTRO SCHERMO — per OGNI Magia/Trappola o
    // effetto Mostro che scatta o si attiva (manuale, es. cliccando
    // "Attiva", o automatico, es. un onDestroy/onAttackDeclare/
    // onStandbyPhase che scatta da solo): la carta appare grande al
    // centro dello schermo (dimensione da "dettaglio carta", vedi
    // --info-card-w in yugioh_game.html), pulsa un paio di volte con un
    // effetto audio, poi sparisce con un fade. Durata totale ~2s — vedi
    // fxActivateCenterCard in effects.css. `card` è l'oggetto carta
    // (da cards-db.js); richiede che window.createCardElement esista
    // (card-renderer.js, caricato prima di questo file nelle pagine di
    // duello).
    // ============================================================
    // Durata totale dell'animazione "carta a centro schermo" qui sotto,
    // in ms — deve combaciare con `2s` di fxActivateCenterCard in
    // effects.css. Esposta come FX.ACTIVATE_CENTER_DURATION_MS così ogni
    // effetto successivo scatenato da un'attivazione (Buco Nero, Spade
    // Rivelatrici, futuri) può aspettare che questa sia DAVVERO finita
    // prima di iniziare, invece di sovrapporsi: vedi il commento sull'uso
    // di questa costante in js/engine/card-effects.js (id 7 e id 8).
    const ACTIVATE_CENTER_DURATION_MS = 2000;

    function playCardActivateCenterScreen(card) {
        if (!card || typeof window.createCardElement !== 'function') return;

        const backdrop = document.createElement('div');
        backdrop.className = 'fx-activate-center-backdrop';
        document.body.appendChild(backdrop);

        const wrapper = document.createElement('div');
        wrapper.className = 'fx-activate-center-card';
        const cardEl = window.createCardElement(card);
        // --card-h è una custom property GLOBALE (definita su :root nelle
        // pagine di duello, per dimensionare le carte del Terreno) che si
        // eredita già calcolata da un --card-w tutto suo: impostare qui
        // solo --card-w non basta, il figlio erediterebbe comunque
        // quell'altezza sbagliata (da cui la carta "schiacciata") — va
        // quindi sovrascritta esplicitamente anche lei, in proporzione.
        cardEl.style.setProperty('--card-w', 'clamp(160px, 22vw, 260px)');
        cardEl.style.setProperty('--card-h', 'calc(clamp(160px, 22vw, 260px) / 0.685)');
        wrapper.appendChild(cardEl);
        document.body.appendChild(wrapper);

        // Libreria di effetti visivi nominati (vedi
        // js/ui/visual-effects-library.js): se la carta dichiara
        // card.visualEffect e il preset esiste, aggiunge un tocco extra
        // (glow colorato, raffica di particelle) SOPRA il pulse standard
        // qui sotto — mai al posto suo, così ogni carta continua a
        // mostrare almeno il flourish di sempre anche senza preset.
        if (window.VisualEffects) VisualEffects.applyPreset(card, wrapper, cardEl);

        // Il suono accompagna il momento in cui la carta "atterra" al
        // centro e comincia il pulse (~15% dei 2s totali, vedi la
        // keyframe), non l'istante iniziale in cui è ancora minuscola e
        // trasparente.
        setTimeout(() => {
            // Effetto audio DEDICATO per questa carta (audio/trappole/<id>.mp3
            // o audio/magie/<id>.mp3 — vedi js/audio/audio-library.js), se esiste;
            // altrimenti il suono "standard" di sempre (SFX.activateTrap()/
            // activateSpell(), che a loro volta possono ricadere su
            // audio/standard/ — vedi js/audio/sfx.js).
            const kind = card.type === 'trap' ? 'trappole' : 'magie';
            if (window.AudioLibrary && AudioLibrary.tryPlayCardSound(card, kind)) return;
            if (!window.SFX) return;
            if (card.type === 'trap') SFX.activateTrap();
            else SFX.activateSpell();
        }, 260);

        setTimeout(() => {
            backdrop.remove();
            wrapper.remove();
        }, 2000);
    }

    // ============================================================
    // 6ter) Spade Rivelatrici — barrage di spade di luce in stile
    // Forbidden Memories che calano dal cielo sull'intera fila di mostri
    // di `owner` ('player'/'bot'), una per slot, scaglionate, seguite da
    // un flash orizzontale su tutta la fila. A differenza di un normale
    // effetto "spettacolo", queste spade NON svaniscono da sole: restano
    // ferme esattamente dove atterrano finché il chiamante non ha
    // sostituito ogni carta con il segno permanente sullo slot
    // (.field-sword-mark, generato da renderFields() in game-flow.js) —
    // per questo `onLanded(removeFlyingSwords)`, richiamata quando
    // l'ultima è atterrata, passa al chiamante la funzione che le rimuove:
    // il chiamante (card-effects.js, id 8) prima aggiorna lo stato e
    // ridisegna il campo (facendo comparire i segni fissi), POI le
    // rimuove — mai il contrario, altrimenti si vedrebbe un vuoto tra le
    // due.
    // ============================================================
    function playSwordsOfRevealingLight(owner, onLanded) {
        const boardId = owner === 'player' ? 'playerFieldBoard' : 'botFieldBoard';
        const slots = document.querySelectorAll(`#${boardId} .field-slot[data-owner="${owner}"][data-type="monster"]`);
        if (!slots.length) { if (typeof onLanded === 'function') onLanded(() => {}); return; }
        const rects = Array.from(slots).map((s) => s.getBoundingClientRect());
        const rowTop = Math.min(...rects.map((r) => r.top));
        const rowBottom = Math.max(...rects.map((r) => r.bottom));
        const rowLeft = Math.min(...rects.map((r) => r.left));
        const rowRight = Math.max(...rects.map((r) => r.right));

        const swordEls = rects.map((rect, i) => {
            const cx = rect.left + rect.width / 2;
            const sword = document.createElement('div');
            sword.className = 'fx-sword-beam';
            Object.assign(sword.style, {
                left: `${cx}px`,
                top: '-140px',
                height: '140px',
                transitionDelay: `${i * 80}ms`
            });
            document.body.appendChild(sword);
            return sword;
        });
        void document.body.offsetWidth; // forza il reflow prima di animare `top`
        swordEls.forEach((sword) => { sword.style.top = `${rowBottom - 140}px`; });

        if (window.SFX && typeof SFX.swordsOfRevealingLight === 'function') SFX.swordsOfRevealingLight();

        const lastLandedAt = 400 + (rects.length - 1) * 80 + 400;
        setTimeout(() => {
            const flash = document.createElement('div');
            flash.className = 'fx-swords-row-flash';
            Object.assign(flash.style, {
                left: `${rowLeft}px`,
                top: `${rowTop}px`,
                width: `${rowRight - rowLeft}px`,
                height: `${rowBottom - rowTop}px`
            });
            document.body.appendChild(flash);
            setTimeout(() => flash.remove(), 650);
        }, lastLandedAt);

        setTimeout(() => {
            if (typeof onLanded === 'function') {
                onLanded(() => swordEls.forEach((el) => el.remove()));
            } else {
                swordEls.forEach((el) => el.remove());
            }
        }, lastLandedAt + 60);
    }

    // ============================================================
    // 6quater) Buco Nero — vortice oscuro al centro del campo che si
    //    allarga e risucchia tutti i mostri presenti. `sucked` è l'elenco
    //    { card, rect } di ogni mostro che c'era sul campo (entrambi i
    //    lati), catturato dal chiamante PRIMA di distruggerli davvero —
    //    vedi il commento in js/engine/card-effects.js (id 7) sul perché.
    // ============================================================
    function playDarkHoleVortex(sucked) {
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;

        const vortex = document.createElement('div');
        vortex.className = 'fx-darkhole-vortex';
        vortex.style.left = `${cx}px`;
        vortex.style.top = `${cy}px`;
        document.body.appendChild(vortex);
        setTimeout(() => vortex.remove(), 1350);

        if (window.SFX) SFX.darkHole();

        if (!Array.isArray(sucked) || typeof window.createCardElement !== 'function') return;
        sucked.forEach(({ card, rect }, i) => {
            if (!card || !rect || rect.width === 0) return;
            const ghost = window.createCardElement(card);
            ghost.classList.add('fx-darkhole-sucked');
            Object.assign(ghost.style, {
                position: 'fixed',
                left: `${rect.left}px`,
                top: `${rect.top}px`,
                width: `${rect.width}px`,
                height: `${rect.height}px`,
                margin: '0',
                zIndex: '10052',
                pointerEvents: 'none',
                transitionDelay: `${150 + i * 25}ms`
            });
            document.body.appendChild(ghost);
            void ghost.offsetWidth; // forza il reflow prima di animare la "caduta" verso il centro
            ghost.style.left = `${cx}px`;
            ghost.style.top = `${cy}px`;
            ghost.style.width = '4px';
            ghost.style.height = '4px';
            ghost.style.opacity = '0';
            ghost.style.transform = `translate(-50%, -50%) rotate(${(i % 2 === 0 ? 1 : -1) * 540}deg)`;
            setTimeout(() => ghost.remove(), 1000 + i * 25);
        });
    }

    // ============================================================
    // 7) Scontro epico in battaglia — quando due mostri si scontrano.
    //    Stesso linguaggio visivo dell'annuncio "BATTLE PHASE" (flash
    //    bianco/oro/rosso + raggi rotanti + screen-shake), ma localizzato
    //    nel punto d'impatto tra le due carte e molto più breve.
    // ============================================================
    function playBattleClashEpic(attackerEl, targetEl) {
        const a = attackerEl ? centerOf(attackerEl) : null;
        const t = targetEl ? centerOf(targetEl) : null;
        const point = t || a;
        if (!point) return;
        const midX = a && t ? (a.x + t.x) / 2 : point.x;
        const midY = a && t ? (a.y + t.y) / 2 : point.y;

        spawnDomFx('fx-clash-flash', midX, midY, undefined, undefined, 550);
        spawnDomFx('fx-clash-rays', midX, midY, undefined, undefined, 600);

        const container = document.querySelector('.game-container') || document.body;
        container.classList.add('fx-clash-shake');
        setTimeout(() => container.classList.remove('fx-clash-shake'), 500);

        spawnParticles(midX, midY, { count: 30, colors: ['#ffffff', '#f7d774', '#e74c3c'], speed: 7, life: 500 });
    }

    // ============================================================
    // 8) Sacrificio per Evocazione Tributo — implosione + fascio di luce
    // ============================================================
    function playTributeSacrifice(cardElement) {
        if (!cardElement) return;
        const { x, y, rect } = centerOf(cardElement);

        cardElement.classList.add('fx-tribute-vanish');
        setTimeout(() => cardElement.classList.remove('fx-tribute-vanish'), 700);

        spawnDomFx('fx-tribute-beam', x, y, rect.width * 0.7, rect.height * 1.8, 700);

        spawnParticles(x, y, { count: 26, colors: ['#8e44ad', '#f7d774', '#ffffff'], speed: 5, life: 650, gravity: -0.14, spread: 70, baseAngle: -90 });
    }

    /**
     * Lancio di moneta a schermo intero (Testa/Croce): usato da OGNI carta
     * con un lancio di moneta nel suo testo (Mago del Tempo id 28, Drago
     * Barile id 104, ecc. — vedi card-effects.js) invece che restare solo
     * un `Math.random()` con un log testuale, che il giocatore poteva
     * facilmente non notare (log di default chiuso). Puramente visivo e
     * "fire and forget", come playCardActivateCenterScreen sopra: NON
     * ritarda/blocca la risoluzione dell'effetto vero, che il chiamante
     * calcola comunque subito — la moneta si limita a mostrare a schermo
     * il risultato GIÀ deciso.
     */
    function playCoinFlip(heads) {
        const backdrop = document.createElement('div');
        backdrop.className = 'fx-randomizer-backdrop';
        const coin = document.createElement('div');
        coin.className = 'fx-coinflip-coin';
        coin.textContent = '🪙';
        const label = document.createElement('div');
        label.className = 'fx-coinflip-label';
        label.textContent = heads ? 'TESTA' : 'CROCE';
        backdrop.appendChild(coin);
        backdrop.appendChild(label);
        document.body.appendChild(backdrop);
        // Rivela il risultato sulla moneta proprio mentre la rotazione
        // CSS (fxCoinSpin, 1.1s) sta per fermarsi, invece che a rotazione
        // già ferma — dà la sensazione che sia la moneta STESSA a
        // "decidere" il risultato atterrando, non un testo scollegato.
        setTimeout(() => { coin.textContent = heads ? '☀️' : '🌑'; }, 1000);
        setTimeout(() => backdrop.remove(), 1700);
    }

    /**
     * Lancio di dado a sei facce a schermo intero — stesso schema di
     * playCoinFlip sopra (fire and forget, non ritarda la risoluzione
     * dell'effetto), usato da ogni carta con un vero lancio di dado nel
     * testo (Dado di Evocazione id 460, Dado Teschio id 445, Dado
     * Aggraziato id 273). `result` è il numero 1-6 già deciso da chi
     * chiama.
     */
    function playDiceRoll(result) {
        const backdrop = document.createElement('div');
        backdrop.className = 'fx-randomizer-backdrop';
        const die = document.createElement('div');
        die.className = 'fx-dice-cube';
        die.textContent = '🎲';
        const label = document.createElement('div');
        label.className = 'fx-dice-label';
        label.textContent = `RISULTATO: ${result}`;
        backdrop.appendChild(die);
        backdrop.appendChild(label);
        document.body.appendChild(backdrop);
        setTimeout(() => { die.textContent = String(result); }, 1000);
        setTimeout(() => backdrop.remove(), 1700);
    }

    // ============================================================
    window.FX = {
        playBattleDestroyEffect,
        playSummonShockwave,
        playSummonCircle,
        playBlueEyesSummon,
        playDarkMagicianSummon,
        playVideoOverlay,
        playMonsterSummonEffect,
        playDamageEffect,
        playDrawEffect,
        playCardActivateEffect,
        playCardActivateCenterScreen,
        playSwordsOfRevealingLight,
        playDarkHoleVortex,
        ACTIVATE_CENTER_DURATION_MS,
        playTributeSacrifice,
        playBattleClashEpic,
        spawnParticles,
        playCoinFlip,
        playDiceRoll
    };
})();
