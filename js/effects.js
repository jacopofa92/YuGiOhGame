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
 *   FX.playDamageEffect(amount, { anchorEl })
 *   FX.playDrawEffect(cardElement)
 *   FX.playCardActivateEffect(cardElement)
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

    // ============================================================
    window.FX = {
        playBattleDestroyEffect,
        playSummonShockwave,
        playSummonCircle,
        playDamageEffect,
        playDrawEffect,
        playCardActivateEffect,
        playTributeSacrifice,
        playBattleClashEpic,
        spawnParticles
    };
})();
