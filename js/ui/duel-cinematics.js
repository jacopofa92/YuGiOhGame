/**
 * duel-cinematics.js — La regia delle due sequenze che incorniciano il duello.
 * =====================================================================
 * Nessuna regola di gioco qui dentro: solo "cosa si vede e quando".
 * L'aspetto sta in js/ui/duel-cinematics.css, l'identità dei duellanti in
 * js/duel-session.js (che è anche l'unico file che chiama queste funzioni).
 *
 *   playIntro(session, onCurtainUp)
 *       ┌ 0.0s  buio, raggi e griglia entrano in scena
 *       ├ 0.3s  i due duellanti scivolano dai lati, "VS" piomba al centro
 *       ├ 0.4s  la barra "Preparazione del Duello" si riempie (1.75s)
 *       ├ 2.0s  i duellanti si scostano, flash bianco, la scritta "DUEL!"
 *       └ 2.9s  il sipario si apre: chiamiamo onCurtainUp() (= la partita
 *               inizia davvero) mentre l'arena entra con uno zoom.
 *       Un click in qualunque momento salta direttamente al sipario.
 *
 *   showOutcome({ playerWon, session, record, onContinue })
 *       Schermata VITTORIA/SCONFITTA con ritratto dell'avversario, record
 *       aggiornato e il pulsante "Continua" che riporta alla schermata da
 *       cui il duello era partito.
 */
(function () {
    'use strict';

    // Durata della parte "spettacolo" dell'intro, prima dell'apertura del
    // sipario. Deve restare allineata alle animazioni da 2900ms in
    // js/ui/duel-cinematics.css (diSlideFromLeft, diVsSlam, diDuelWord...).
    const INTRO_SHOW_MS = 2900;
    const CURTAIN_MS = 620;

    function avatarFor(duelist) {
        if (window.DuelSession && typeof DuelSession.buildAvatar === 'function') {
            return DuelSession.buildAvatar(duelist);
        }
        const span = document.createElement('span');
        span.className = 'duelist-avatar';
        span.textContent = duelist.icon || '🂠';
        return span;
    }

    function buildDuelistBlock(duelist, role, roleLabel) {
        const block = document.createElement('div');
        block.className = 'di-duelist di-duelist--' + role;

        block.appendChild(avatarFor(duelist));

        const name = document.createElement('div');
        name.className = 'di-duelist-name';
        name.textContent = duelist.name;
        block.appendChild(name);

        if (duelist.title) {
            const title = document.createElement('div');
            title.className = 'di-duelist-title';
            title.textContent = duelist.title;
            block.appendChild(title);
        }

        const badge = document.createElement('div');
        badge.className = 'di-duelist-role';
        badge.textContent = roleLabel;
        block.appendChild(badge);

        return block;
    }

    function playIntro(session, onCurtainUp) {
        const existing = document.getElementById('duelIntroOverlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'duelIntroOverlay';

        const grid = document.createElement('div');
        grid.className = 'di-grid';
        const rays = document.createElement('div');
        rays.className = 'di-rays';
        overlay.append(grid, rays);

        const stage = document.createElement('div');
        stage.className = 'di-stage';
        stage.appendChild(buildDuelistBlock(session.player, 'player', 'Tu'));

        const vs = document.createElement('div');
        vs.className = 'di-vs';
        vs.textContent = 'VS';
        stage.appendChild(vs);

        const opponentRole = session.isMultiplayer ? 'Online' : (session.difficulty || 'Sfidante');
        stage.appendChild(buildDuelistBlock(session.opponent, 'opponent', opponentRole));
        overlay.appendChild(stage);

        const loading = document.createElement('div');
        loading.className = 'di-loading';
        loading.innerHTML = `
            <div class="di-loading-label">Preparazione del Duello</div>
            <div class="di-bar"><div class="di-bar-fill"></div></div>
        `;
        overlay.appendChild(loading);

        const flash = document.createElement('div');
        flash.className = 'di-flash';
        const duelWord = document.createElement('div');
        duelWord.className = 'di-duel-word';
        duelWord.textContent = "It's time to duel!";
        const skip = document.createElement('div');
        skip.className = 'di-skip';
        skip.textContent = 'Clicca per saltare';
        overlay.append(flash, duelWord, skip);

        document.body.appendChild(overlay);
        void overlay.offsetWidth;
        overlay.classList.add('is-in');

        // Botto di particelle in corrispondenza dell'impatto di "DUEL!".
        const impactTimeout = setTimeout(() => {
            if (window.FX) {
                FX.spawnParticles(window.innerWidth / 2, window.innerHeight * 0.42, {
                    count: 60, speed: 9, life: 900, size: 4, spread: 360, gravity: 0.02
                });
            }
        }, INTRO_SHOW_MS - 640);

        let curtainRaised = false;
        let showTimeout = null;
        function raiseCurtain() {
            if (curtainRaised) return;
            curtainRaised = true;
            clearTimeout(impactTimeout);
            clearTimeout(showTimeout);
            overlay.classList.add('is-out');

            // La partita comincia mentre il sipario si sta alzando, così
            // il campo è già popolato quando diventa visibile.
            if (typeof onCurtainUp === 'function') onCurtainUp();

            const arena = document.querySelector('.game-container');
            if (arena) {
                arena.classList.add('duel-arena-enter');
                setTimeout(() => arena.classList.remove('duel-arena-enter'), 950);
            }

            setTimeout(() => overlay.remove(), CURTAIN_MS + 120);
        }

        showTimeout = setTimeout(raiseCurtain, INTRO_SHOW_MS);
        overlay.addEventListener('click', raiseCurtain);
    }

    function showOutcome(options) {
        // 'draw' (Ultimo Turno, id 341: nessun giocatore resta con un
        // mostro da solo sul Terreno) — terzo stato oltre a Vittoria/
        // Sconfitta, mai passato dal resto del gioco (ogni altro punto
        // chiama sempre con true/false, invariati).
        const isDraw = options.playerWon === 'draw';
        const playerWon = !isDraw && !!options.playerWon;
        const session = options.session || {};
        const opponent = session.opponent || { name: 'Avversario', icon: '🤖' };

        // Stacchetto di fine duello (una volta sola, non in loop): ferma la
        // colonna sonora del duello e lascia il posto al jingle di
        // Vittoria/Game Over — vedi DuelMusic.playOneShot in audio-manager.js.
        // Un Pareggio riusa il jingle di sconfitta (nessun terzo jingle
        // dedicato nella libreria audio di questo gioco).
        if (window.DuelMusic) {
            const jingle = playerWon ? 'audio/soundtracks/46. Victory.mp3' : 'audio/soundtracks/49. Game Over.mp3';
            DuelMusic.playOneShot(jingle);
        }

        const existing = document.getElementById('duelOutcomeOverlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'duelOutcomeOverlay';
        overlay.className = isDraw ? 'draw' : (playerWon ? 'won' : 'lost');

        const rays = document.createElement('div');
        rays.className = 'do-rays';
        overlay.appendChild(rays);

        const content = document.createElement('div');
        content.className = 'do-content';

        const portrait = document.createElement('div');
        portrait.className = 'do-portrait';
        portrait.appendChild(avatarFor(opponent));
        content.appendChild(portrait);

        const title = document.createElement('div');
        title.className = 'do-title';
        title.textContent = isDraw ? 'Pareggio' : (playerWon ? 'Vittoria' : 'Sconfitta');
        content.appendChild(title);

        const sub = document.createElement('div');
        sub.className = 'do-sub';
        sub.textContent = isDraw
            ? `Il duello con ${opponent.name} finisce in pareggio.`
            : playerWon
                ? `Hai sconfitto ${opponent.name}!`
                : `${opponent.name} ti ha sconfitto.`;
        content.appendChild(sub);

        // Il record esiste solo contro un personaggio vero (non contro il
        // Bot della demo o un avversario online).
        if (options.record) {
            const recordEl = document.createElement('div');
            recordEl.className = 'do-record';
            recordEl.innerHTML = `
                <span>Record contro ${opponent.name}</span>
                <span class="sep">·</span>
                <span class="wins">${options.record.wins}V</span>
                <span class="losses">${options.record.losses}S</span>
            `;
            content.appendChild(recordEl);
        }

        const continueBtn = document.createElement('button');
        continueBtn.type = 'button';
        continueBtn.className = 'do-continue';
        continueBtn.textContent = 'Continua ›';
        continueBtn.onclick = () => {
            continueBtn.disabled = true;
            if (typeof options.onContinue === 'function') options.onContinue();
        };
        content.appendChild(continueBtn);

        overlay.appendChild(content);
        document.body.appendChild(overlay);
        void overlay.offsetWidth;
        overlay.classList.add('is-in');

        if (playerWon && window.FX) {
            setTimeout(() => {
                FX.spawnParticles(window.innerWidth / 2, window.innerHeight * 0.5, {
                    count: 70, speed: 8, life: 1400, size: 4, spread: 360, gravity: 0.08,
                    colors: ['#ffdf8c', '#f39c12', '#ffffff', '#fff6dc']
                });
            }, 300);
        }
    }

    window.DuelCinematics = { playIntro, showOutcome };
})();
