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
 *   FX.playElementalConvergence(monsterElement, card, theme)
 *   FX.playVideoOverlay(path, onDone)
 *   FX.playMonsterSummonEffect(card, monsterElement)
 *   FX.playInstantWinCinematic(kind, bannerText, pieceElements, onDone)
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
    // del cerchio magico generico, per QUALSIASI mostro di Livello 7+
    // (vedi ATTRIBUTE_SUMMON_THEMES/playMonsterSummonEffect più sotto):
    // generica per Attributo, non più cablata su un elenco fisso di id
    // carta. Un unico motore, `playElementalConvergence`, orchestrato a
    // orari fissi (uguali per ogni tema, così restano sempre
    // sincronizzati con le keyframe in effects.css); solo i COLORI
    // cambiano da un tema all'altro, impostati come custom property CSS
    // (--fx-conv-bright/mid/mid-soft/deep) sugli elementi appena creati
    // invece che duplicando l'intero blocco di classi/keyframe una
    // volta per Attributo (vedi fx-elemconv-* in effects.css, un solo
    // set condiviso).
    // ============================================================
    function playElementalConvergence(monsterElement, card, theme) {
        if (!monsterElement) return;
        const { x, y } = centerOf(monsterElement);

        const applyThemeVars = (el) => {
            el.style.setProperty('--fx-conv-bright', theme.bright);
            el.style.setProperty('--fx-conv-mid', theme.mid);
            el.style.setProperty('--fx-conv-mid-soft', theme.midSoft);
            el.style.setProperty('--fx-conv-deep', theme.deep);
        };

        const backdrop = document.createElement('div');
        backdrop.className = 'fx-elemconv-backdrop';
        backdrop.style.setProperty('--fx-bex', `${(x / window.innerWidth) * 100}%`);
        backdrop.style.setProperty('--fx-bey', `${(y / window.innerHeight) * 100}%`);
        applyThemeVars(backdrop);
        document.body.appendChild(backdrop);
        setTimeout(() => backdrop.remove(), 4000);

        applyThemeVars(monsterElement);
        monsterElement.classList.add('fx-elemconv-charge');
        setTimeout(() => monsterElement.classList.remove('fx-elemconv-charge'), 3600);

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
            bolt.className = 'fx-elemconv-bolt';
            applyThemeVars(bolt);
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
            const flash = document.createElement('div');
            flash.className = 'fx-elemconv-flash';
            applyThemeVars(flash);
            flash.style.left = `${x}px`;
            flash.style.top = `${y}px`;
            document.body.appendChild(flash);
            setTimeout(() => flash.remove(), 500);
            const container = document.querySelector('.game-container') || document.body;
            container.classList.add('fx-shake');
            setTimeout(() => container.classList.remove('fx-shake'), 450);
            spawnParticles(x, y, { count: 40, colors: theme.particleColors, speed: 7, life: 650 });
        }, 2300);

        // Cartiglio col nome vero della carta.
        setTimeout(() => {
            const banner = document.createElement('div');
            banner.className = 'fx-elemconv-banner';
            applyThemeVars(banner);
            banner.textContent = ((card && card.name) || 'Evocazione').toUpperCase();
            document.body.appendChild(banner);
            setTimeout(() => banner.remove(), 1350);
        }, 2500);
    }

    /**
     * Un tema per Attributo (LUCE/OSCURITÀ/ACQUA/FUOCO/VENTO/TERRA, le
     * stringhe esatte usate da card.attribute in questo database),
     * usato da QUALSIASI mostro di Livello 7+ — non più legato a
     * specifiche carte. `bright`/`mid`/`midSoft`/`deep` sono le 4 tinte
     * lette da playElementalConvergence per popolare le custom property
     * CSS --fx-conv-* (vedi fx-elemconv-* in effects.css); `particleColors`
     * per la raffica di particelle del flash finale (FX.spawnParticles).
     * Nessuna voce per un Attributo assente da questo dataset (es. non
     * ce n'è uno "senza Attributo"): in quel caso playMonsterSummonEffect
     * ricade sul cerchio magico generico di sempre, come per i mostri
     * sotto Livello 7.
     */
    const ATTRIBUTE_SUMMON_THEMES = {
        'LUCE': {
            bright: '#ffffff',
            mid: 'rgba(247, 215, 116, 0.95)',
            midSoft: 'rgba(247, 215, 116, 0.55)',
            deep: 'rgba(243, 156, 18, 0.9)',
            particleColors: ['#ffffff', '#f7d774', '#fff4c2']
        },
        'OSCURITÀ': {
            bright: '#eadcf5',
            mid: 'rgba(142, 68, 173, 0.95)',
            midSoft: 'rgba(142, 68, 173, 0.55)',
            deep: 'rgba(44, 15, 66, 0.95)',
            particleColors: ['#0d0616', '#8e44ad', '#c39bd3']
        },
        'ACQUA': {
            bright: '#ffffff',
            mid: 'rgba(93, 173, 226, 0.95)',
            midSoft: 'rgba(93, 173, 226, 0.55)',
            deep: 'rgba(27, 111, 184, 0.9)',
            particleColors: ['#ffffff', '#5dade2', '#d6eaf8']
        },
        'FUOCO': {
            bright: '#fff0d9',
            mid: 'rgba(231, 76, 60, 0.95)',
            midSoft: 'rgba(231, 76, 60, 0.55)',
            deep: 'rgba(155, 34, 20, 0.9)',
            particleColors: ['#ffe0b2', '#e74c3c', '#ff6b35']
        },
        'VENTO': {
            bright: '#e8fff5',
            mid: 'rgba(46, 204, 113, 0.95)',
            midSoft: 'rgba(46, 204, 113, 0.55)',
            deep: 'rgba(14, 122, 95, 0.9)',
            particleColors: ['#e8fff5', '#2ecc71', '#48d1a0']
        },
        'TERRA': {
            bright: '#f5e6c8',
            mid: 'rgba(180, 130, 60, 0.95)',
            midSoft: 'rgba(180, 130, 60, 0.55)',
            deep: 'rgba(92, 58, 30, 0.9)',
            particleColors: ['#f5deb3', '#b4823c', '#5c3a1e']
        },
        // I 3 Dei Egizi (Obelisk id 30, Slifer id 31, Ra id 472) sono
        // tutti Attributo DIVINO, non LUCE/OSCURITÀ — senza questa voce
        // ricadrebbero sul cerchio magico generico come qualunque altro
        // mostro sotto Livello 7, perdendo la sequenza speciale. Tema
        // oro-radiante più intenso/caldo di LUCE apposta, per restare
        // visivamente distinto.
        'DIVINO': {
            bright: '#ffffff',
            mid: 'rgba(255, 215, 130, 0.98)',
            midSoft: 'rgba(255, 180, 80, 0.6)',
            deep: 'rgba(255, 140, 0, 0.92)',
            particleColors: ['#ffffff', '#ffe985', '#ff8c00']
        }
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

    // --- FADE-IN ---
    // Il backdrop (sfondo nero) parte subito: dietro non c'è nulla di
    // brutto da nascondere, è solo un dissolvimento a nero.
    requestAnimationFrame(() => {
        backdrop.classList.add('show');
    });

    // Il VIDEO invece aspetta l'evento 'playing' (sta DAVVERO dipingendo
    // un fotogramma vero — a differenza di 'canplay'/'loadeddata', che
    // possono scattare un istante prima che qualcosa sia davvero
    // visibile) prima di diventare visibile: senza questo, la breve
    // finestra di caricamento (rete/decodifica) mostrava l'icona nativa
    // di play/caricamento del browser sopra lo sfondo nero già visibile —
    // segnalato dall'utente ("l'icona del video con il play... camuffa
    // questa cosa"). Stesso principio già usato per le immagini delle
    // carte (has-image/art-loaded in card-renderer.js): non rivelare un
    // elemento multimediale finché non è DAVVERO pronto, invece di
    // lasciare che si veda il suo stato di caricamento nativo.
    let videoRevealed = false;
    function revealVideo() {
        if (videoRevealed) return;
        videoRevealed = true;
        video.classList.add('show');
    }
    video.addEventListener('playing', revealVideo);
    // Rete di sicurezza: se 'playing' non scattasse mai (video mal
    // codificato, connessione lentissima), il video non deve restare
    // invisibile per sempre — dopo un'attesa breve si rivela comunque
    // (al peggio si vede l'icona nativa con un ritardo, mai uno schermo
    // nero fisso per i 12s dell'intera rete di sicurezza qui sotto).
    setTimeout(revealVideo, 1500);

    let done = false;

    const cleanup = () => {
        if (done) return;
        done = true;
        clearTimeout(safetyTimeout);

        // --- FADE-OUT ---
        backdrop.classList.remove('show');
        video.classList.remove('show');

        // aspetta la fine della transizione
        setTimeout(() => {
            backdrop.remove();
            if (typeof onDone === 'function') onDone();
        }, 600); // deve combaciare con transition CSS
    };

    video.addEventListener('ended', cleanup);
    video.addEventListener('error', cleanup);

    // Rete di sicurezza SOLO per un video che non arriva mai a 'ended'/
    // 'error' (bloccato, mal codificato, connessione interrotta) — MAI
    // per un video che sta semplicemente giocando più a lungo del tetto
    // fisso. BUG REALE trovato e corretto: questo tetto era fisso a 12s
    // indipendentemente dalla vera durata del video — segnalato
    // dall'utente come "il video parte e si blocca" (in realtà giocava
    // perfettamente, veniva solo TAGLIATO a metà da questo timeout prima
    // della fine, es. video/vittorie/exodiawin.mp4 dura 18.27s). Appena
    // 'loadedmetadata' rivela la durata VERA, il tetto si ricalibra su
    // quella (+5s di margine) invece di restare indovinato a caso.
    let safetyTimeout = setTimeout(cleanup, 12000);
    video.addEventListener('loadedmetadata', () => {
        if (done || !isFinite(video.duration) || video.duration <= 0) return;
        clearTimeout(safetyTimeout);
        safetyTimeout = setTimeout(cleanup, video.duration * 1000 + 5000);
    });
}

    /**
     * Punto di scelta unico dell'effetto visivo di Evocazione (Normale o
     * Speciale, entrambe le chiamano — vedi js/engine/actions.js e
     * js/engine/duel-engine.js/specialSummon), invece del solo
     * FX.playSummonCircle di sempre. Priorità, per QUALSIASI carta (non
     * più un elenco ristretto e cablato di id):
     *   1) Filmato dedicato (video/evocazioni/<id>.mp4, vedi
     *      VisualEffects.getVideoFor) — controllato per OGNI Evocazione,
     *      qualunque Livello/Attributo: se esiste, vince sempre su tutto
     *      il resto.
     *   2) Altrimenti, se il mostro è di Livello 7+ ed ha un Attributo
     *      con un tema in ATTRIBUTE_SUMMON_THEMES: la sequenza "a
     *      convergenza elementale" (playElementalConvergence), colorata
     *      in base all'Attributo.
     *   3) Altrimenti, il cerchio magico generico di sempre.
     */
    /**
     * Quante cinematiche di Evocazione "lunghe" sono in corso in questo
     * momento: un filmato dedicato, o la convergenza elementale di un
     * Livello 7+. Il cerchio magico generico NON conta — dura un attimo e
     * bloccare il duello per lui darebbe solo l'impressione di un gioco
     * lento.
     *
     * Serve perche' il duello ASPETTI: senza, la fase avanzava (e il bot
     * continuava a giocare) mentre il filmato era ancora a schermo, e la
     * partita andava avanti sotto a un'animazione che copriva tutto.
     * Chi aspetta lo legge da FX.isCinematicPlaying() — oggi
     * isBlockingModalOpen() in js/engine/game-flow.js, che governa ogni
     * transizione di fase, e il ciclo del bot in js/ai/bot.js.
     *
     * E' un CONTATORE e non un booleano perche' due Evocazioni ravvicinate
     * (es. un effetto che ne fa due di fila) devono sommarsi: con un
     * booleano la prima a finire sbloccherebbe tutto mentre la seconda sta
     * ancora girando. Il decremento passa sempre da endSummonCinematic,
     * mai da un `= false` sparso.
     */
    let summonCinematicCount = 0;
    /** Durata reale della convergenza elementale: il suo backdrop viene rimosso a 4000ms (vedi playElementalConvergence). */
    const ELEMENTAL_CONVERGENCE_MS = 4000;

    function beginSummonCinematic() { summonCinematicCount++; }
    function endSummonCinematic() { summonCinematicCount = Math.max(0, summonCinematicCount - 1); }
    function isCinematicPlaying() { return summonCinematicCount > 0; }

    function playMonsterSummonEffect(card, monsterElement) {
        if (!monsterElement) return;

        // Si segna come cinematica in corso SUBITO, prima ancora di sapere
        // se ce ne sara' davvero una. La ricerca del filmato dedicato e'
        // ASINCRONA (VisualEffects.getVideoFor), mentre chi deve aspettare
        // — il ciclo del bot — interroga il flag nell'istante appena dopo
        // questa chiamata: alzandolo solo dentro il .then() troverebbe
        // "nessuna cinematica" e tirerebbe dritto proprio sul caso che
        // doveva attendere. Se poi si scopre che basta il cerchio
        // generico, lo si riabbassa subito.
        beginSummonCinematic();
        let chiusa = false;
        const chiudi = () => { if (chiusa) return; chiusa = true; endSummonCinematic(); };

        const fallback = () => {
            const theme = card && (card.level || 0) >= 7 ? ATTRIBUTE_SUMMON_THEMES[card.attribute] : null;
            if (theme) {
                playElementalConvergence(monsterElement, card, theme);
                // playElementalConvergence non ha un callback di
                // completamento (e' tutta CSS + setTimeout interni):
                // si sblocca a durata nota. Anche fosse sbagliata, il
                // duello ripartirebbe un po' prima o un po' dopo — mai
                // restando bloccato per sempre.
                setTimeout(chiudi, ELEMENTAL_CONVERGENCE_MS);
                return;
            }
            // Cerchio magico generico: dura un attimo, non blocca nulla.
            playSummonCircle(monsterElement);
            chiudi();
        };

        if (card && window.VisualEffects && typeof VisualEffects.getVideoFor === 'function') {
            VisualEffects.getVideoFor(card.id, 'evocazioni').then((videoPath) => {
                // playVideoOverlay ha gia' il proprio tetto di sicurezza
                // interno (durata reale del filmato + 5s), quindi `chiudi`
                // arriva SEMPRE, anche se il filmato non raggiungesse mai
                // 'ended'.
                if (videoPath) playVideoOverlay(videoPath, chiudi);
                else fallback();
            }).catch(chiudi);
            return;
        }
        fallback();
    }

    /**
     * Effetto di vittoria per QUALUNQUE condizione di vittoria
     * ISTANTANEA/alternativa (Exodia, Destiny Board, Elefante Volante,
     * ecc. — vedi checkGameOver/game-flow.js, che orchestra tutte le
     * chiamate) — stessa priorità di playMonsterSummonEffect qui sopra:
     * 1) filmato dedicato (video/vittorie/<kind>.mp4, vedi
     * VisualEffects.getVideoFor) se esiste, altrimenti 2) una sequenza
     * CSS dedicata (bagliore dorato in successione sulle carte coinvolte,
     * poi un flash + banner col testo passato a schermo intero) — MAI il
     * cerchio di evocazione generico, questa non è un'Evocazione.
     * Generica per `kind`/`bannerText` invece di una funzione (e un set
     * di classi CSS) copiata per ogni singola carta — vedi
     * js/ui/effects.css per gli stessi nomi fx-instantwin-* condivisi da
     * ogni condizione.
     *
     * `kind`: usato SOLO per comporre il percorso del filmato
     * (`video/vittorie/<kind>.mp4`) — una stringa breve, senza estensione
     * (es. "exodiawin", "destinyboard").
     * `bannerText`: il testo mostrato nel banner finale (fallback CSS) —
     * ignorato se esiste un filmato dedicato.
     * `pieceElements`: i DOM element delle carte coinvolte da far
     * brillare in sequenza PRIMA del flash finale, se disponibili e
     * mostrate a schermo (es. i 5 pezzi in mano per Exodia, le 5 carte
     * in zona Magia/Trappola per Destiny Board) — array vuoto per
     * saltare dritti al flash finale (es. per il bot, la cui mano non è
     * mostrata a schermo, o per una condizione senza "pezzi" da
     * evidenziare).
     * `onDone` va chiamata SEMPRE, alla fine della sequenza scelta: il
     * chiamante dichiara la vittoria vera solo dopo, non prima.
     */
    function playInstantWinCinematic(kind, bannerText, pieceElements, onDone) {
        const finish = typeof onDone === 'function' ? onDone : function () {};

        const runCssFallback = () => {
            const elements = (pieceElements || []).filter(Boolean);
            elements.forEach((el, i) => {
                setTimeout(() => {
                    const { x, y } = centerOf(el);
                    el.classList.add('fx-instantwin-piece-glow');
                    spawnParticles(x, y, { count: 20, colors: ['#ffd700', '#fff4c2', '#ffffff'], speed: 4, life: 650, gravity: -0.08 });
                    setTimeout(() => el.classList.remove('fx-instantwin-piece-glow'), 700);
                }, i * 220);
            });

            const flashDelay = elements.length * 220 + 500;
            setTimeout(() => {
                const container = document.querySelector('.game-container') || document.body;
                container.classList.add('fx-shake');
                setTimeout(() => container.classList.remove('fx-shake'), 450);

                const backdrop = document.createElement('div');
                backdrop.className = 'fx-instantwin-flash-backdrop';
                document.body.appendChild(backdrop);
                requestAnimationFrame(() => backdrop.classList.add('show'));

                spawnParticles(window.innerWidth / 2, window.innerHeight / 2, { count: 60, colors: ['#ffd700', '#fff4c2', '#ffffff'], speed: 8, life: 900, gravity: -0.05, spread: 360 });

                const banner = document.createElement('div');
                banner.className = 'fx-instantwin-banner';
                banner.textContent = bannerText || '';
                document.body.appendChild(banner);

                setTimeout(() => {
                    backdrop.classList.remove('show');
                    setTimeout(() => {
                        backdrop.remove();
                        banner.remove();
                        finish();
                    }, 500);
                }, 1500);
            }, flashDelay);
        };

        if (window.VisualEffects && typeof VisualEffects.getVideoFor === 'function') {
            VisualEffects.getVideoFor(kind, 'vittorie').then((videoPath) => {
                if (videoPath) playVideoOverlay(videoPath, finish);
                else runCssFallback();
            });
            return;
        }
        runCssFallback();
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
    // --info-card-w in duelMonstersCore.html), pulsa un paio di volte con un
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
    /**
     * L'attacco si infrange: il bersaglio ha retto. Versione di base, in
     * CSS/DOM come il resto di questo file — quella spettacolare la
     * fornisce il backend GSAP (js/ui/fx-gsap.js), che la rimpiazza.
     * Chiamata da triggerBlockedEffect (js/engine/actions.js) quando dopo
     * il calcolo della battaglia lo slot del bersaglio e' ancora occupato.
     */
    function playAttackBlocked(attackerEl, targetEl) {
        if (!targetEl) return;
        const t = centerOf(targetEl);

        targetEl.classList.add('fx-blocked-shake');
        setTimeout(() => targetEl.classList.remove('fx-blocked-shake'), 420);

        spawnDomFx('fx-block-shield', t.x, t.y, undefined, undefined, 700);

        // Le scintille rimbalzano INDIETRO, verso chi ha attaccato: e' il
        // dettaglio che distingue un colpo respinto da uno andato a segno.
        const a = attackerEl ? centerOf(attackerEl) : null;
        const baseAngle = a ? Math.atan2(a.y - t.y, a.x - t.x) * (180 / Math.PI) : -90;
        spawnParticles(t.x, t.y, {
            count: 22, colors: ['#bfe9ff', '#ffffff', '#7dd3fc'],
            speed: 6, life: 550, size: 3, spread: 90, baseAngle: baseAngle, gravity: 0.06
        });
    }

    /** Rettangolo a schermo di una casella del Terreno — condiviso da chi deve animare qualcosa da una casella all'altra. */
    function fieldSlotRect(owner, index, type) {
        const boardId = owner === 'player' ? 'playerFieldBoard' : 'botFieldBoard';
        const el = document.querySelector(`#${boardId} .field-slot[data-owner="${owner}"][data-type="${type || 'monster'}"][data-index="${index}"]`);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return r.width ? r : null;
    }

    /**
     * Passaggio di controllo (Cambio di Cuore, Controllo Mentale...): la
     * carta attraversa il campo dalla casella che lascia a quella dove
     * arriva. Versione di base; il backend GSAP la rimpiazza con una piu'
     * elaborata.
     * Chiamata da ACTIONS.takeControl (js/engine/duel-engine.js) PRIMA del
     * render successivo, quando entrambe le caselle sono ancora al loro
     * posto a schermo.
     */
    function playControlSwitch(card, fromOwner, fromIndex, toOwner, toIndex) {
        if (!card || typeof window.createCardElement !== 'function') return;
        const from = fieldSlotRect(fromOwner, fromIndex);
        const to = fieldSlotRect(toOwner, toIndex);
        if (!from || !to) return;

        const ghost = window.createCardElement(card);
        Object.assign(ghost.style, {
            position: 'fixed',
            left: `${from.left}px`,
            top: `${from.top}px`,
            width: `${from.width}px`,
            height: `${from.height}px`,
            margin: '0',
            zIndex: '10045',
            pointerEvents: 'none',
            transition: 'left 620ms cubic-bezier(0.5, 0, 0.3, 1), top 620ms cubic-bezier(0.5, 0, 0.3, 1), transform 620ms ease',
            filter: 'drop-shadow(0 0 18px rgba(200, 120, 255, 0.9))'
        });
        document.body.appendChild(ghost);
        void ghost.offsetWidth; // reflow: senza, il browser accorpa i due stati e non anima nulla
        ghost.style.left = `${to.left}px`;
        ghost.style.top = `${to.top}px`;
        ghost.style.transform = 'scale(1.08)';
        setTimeout(() => ghost.remove(), 660);

        spawnParticles(from.left + from.width / 2, from.top + from.height / 2, {
            count: 18, colors: ['#c87aff', '#e9c9ff', '#ffffff'], speed: 3.5, life: 600, gravity: -0.04
        });
    }

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
    // BACKEND DI ANIMAZIONE INTERCAMBIABILI
    // ============================================================
    // Tutte le animazioni qui sopra sono scritte a mano con CSS + DOM +
    // canvas 2D, e restano l'implementazione DI BASE: quella che c'e'
    // sempre, che non dipende da niente e che funziona ovunque.
    //
    // Un "backend" e' un pacchetto opzionale che ne RIMPIAZZA alcune con
    // una versione fatta con una libreria (es. js/ui/fx-gsap.js, che usa
    // GSAP per le timeline). Si registra da solo e dichiara di cosa ha
    // bisogno; se quella roba non c'e', semplicemente non si attiva.
    //
    // Il punto di tutto questo e' che `FX.playQualcosa(...)` resta l'unica
    // API che il resto del gioco conosce: il motore (actions.js,
    // game-flow.js, bot.js...) non sa nemmeno che i backend esistono e non
    // va toccato ne' per aggiungerne uno ne' per toglierlo.
    //
    // COME SI SPEGNE: cancellare il file del backend basta e avanza — con
    // nessuno registrato si torna esattamente al comportamento attuale.
    // Senza cancellare niente: window.FX_BACKEND = 'css' (o il nome di un
    // backend specifico per forzare proprio quello).
    //
    // Se un backend lancia un'eccezione, l'animazione di base parte
    // comunque al suo posto: un plugin decorativo non deve MAI poter
    // rompere un duello in corso — stesso principio di safeCallCardHandler
    // in js/engine/duel-engine.js.
    const fxBackends = [];
    let fxActiveBackend = null;

    function fxPrefersReducedMotion() {
        return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }

    /** Rivaluta quale backend e' attivo: l'ultimo registrato le cui dipendenze sono tutte pronte. */
    function resolveFxBackend() {
        fxActiveBackend = null;
        if (window.FX_BACKEND === 'css') return;
        for (let i = fxBackends.length - 1; i >= 0; i--) {
            const b = fxBackends[i];
            if (window.FX_BACKEND && b.name !== window.FX_BACKEND) continue;
            if ((b.requires || []).every((global) => !!window[global])) { fxActiveBackend = b; return; }
        }
    }

    /**
     * Registra un backend. `def.requires` elenca i GLOBALI che devono
     * esistere perche' sia utilizzabile (es. ['gsap']) — controllati ad
     * ogni risoluzione, non solo alla registrazione, perche' le librerie
     * di js/vendor/ arrivano in modo pigro dopo l'evento 'load'.
     * `def.impls` e' una mappa PARZIALE nome-animazione -> funzione: le
     * animazioni non elencate restano quelle di base.
     */
    function registerBackend(name, def) {
        fxBackends.push({ name: name, requires: (def && def.requires) || [], impls: (def && def.impls) || {} });
        resolveFxBackend();
    }

    /**
     * Avvolge un'animazione di base in modo che passi dal backend attivo,
     * se ne esiste uno che la rimpiazza. Tre motivi per cui puo' ricadere
     * sulla base: nessun backend attivo, il backend non rimpiazza QUESTA
     * animazione, oppure chi ha chiesto meno movimento
     * (prefers-reduced-motion) — li' le versioni CSS sono gia' neutralizzate
     * dai @media dei fogli di stile, mentre una timeline JS continuerebbe
     * ad animare ignorando la preferenza.
     */
    function viaBackend(name, builtin) {
        return function () {
            const backend = fxActiveBackend;
            if (backend && typeof backend.impls[name] === 'function' && !fxPrefersReducedMotion()) {
                try {
                    return backend.impls[name].apply(null, arguments);
                } catch (e) {
                    console.warn(`[FX] backend "${backend.name}" fallito su ${name}, uso l'animazione di base:`, e);
                }
            }
            return builtin.apply(null, arguments);
        };
    }

    window.FX = {
        registerBackend: registerBackend,
        /** Nome del backend attivo, o null se si stanno usando le animazioni di base — utile in console per capire cosa sta girando davvero. */
        activeBackend: function () { return fxActiveBackend ? fxActiveBackend.name : null; },
        /** Da richiamare se le dipendenze di un backend arrivano DOPO la sua registrazione (caricamento pigro). */
        refreshBackend: resolveFxBackend,

        playBattleDestroyEffect: viaBackend('playBattleDestroyEffect', playBattleDestroyEffect),
        playSummonShockwave: viaBackend('playSummonShockwave', playSummonShockwave),
        playDamageEffect: viaBackend('playDamageEffect', playDamageEffect),
        playTributeSacrifice: viaBackend('playTributeSacrifice', playTributeSacrifice),
        playBattleClashEpic: viaBackend('playBattleClashEpic', playBattleClashEpic),
        playAttackBlocked: viaBackend('playAttackBlocked', playAttackBlocked),
        playControlSwitch: viaBackend('playControlSwitch', playControlSwitch),
        playDrawEffect: viaBackend('playDrawEffect', playDrawEffect),
        playDarkHoleVortex: viaBackend('playDarkHoleVortex', playDarkHoleVortex),
        playCoinFlip: viaBackend('playCoinFlip', playCoinFlip),
        playDiceRoll: viaBackend('playDiceRoll', playDiceRoll),
        // ATTENZIONE per chi scrivera' un backend per questa: i chiamanti
        // non aspettano una callback, aspettano ACTIVATE_CENTER_DURATION_MS
        // e tirano dritto. Una versione che sfora lascia una carta a
        // schermo mentre il gioco e' gia' andato avanti.
        playCardActivateCenterScreen: viaBackend('playCardActivateCenterScreen', playCardActivateCenterScreen),

        // Le restanti NON passano dai backend, per due motivi diversi:
        //
        // - playSummonCircle / playElementalConvergence / playCardActivateEffect
        //   sono chiamate solo da qui dentro (da playMonsterSummonEffect e
        //   affini), quindi avvolgerle sulla facciata non avrebbe alcun
        //   effetto: le chiamate interne non ci passano.
        // - playVideoOverlay / playInstantWinCinematic / playSwordsOfRevealingLight
        //   hanno una CALLBACK di completamento da cui dipende il gioco
        //   (il filmato che finisce, endDuel, le spade che restano in campo
        //   finche' il chiamante non ha ridisegnato): un backend che si
        //   dimenticasse di richiamarla bloccherebbe il duello. Restano
        //   deliberatamente fuori finche' non serviranno davvero.
        /** true finche' un filmato di Evocazione o una convergenza di Livello 7+ e' a schermo — vedi il commento su summonCinematicCount. */
        isCinematicPlaying: isCinematicPlaying,
        playSummonCircle,
        playElementalConvergence,
        playVideoOverlay,
        playMonsterSummonEffect,
        playInstantWinCinematic,
        playCardActivateEffect,
        playSwordsOfRevealingLight,
        ACTIVATE_CENTER_DURATION_MS,
        spawnParticles
    };
})();
