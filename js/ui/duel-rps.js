// js/ui/duel-rps.js
// =====================================================================
// Morra cinese (sasso/carta/forbice) prima di ogni duello, per decidere
// CHI GIOCA PER PRIMO — come al tavolo vero, dove si tira a sorte e chi
// vince sceglie se partire o lasciare partire l'avversario.
//
// QUANDO: DuelSession.start() la mostra dentro il callback che la
// cinematica VS chiama al momento di alzare il sipario, e restituisce la
// Promise di questo modulo — quindi la morra si gioca SOPRA la schermata
// VS, con il sipario ancora abbassato, e solo dopo parte la partita.
// Non è un dettaglio estetico: js/ui/duel-cinematics.js documenta che il
// lavoro pesante (initGame) deve avvenire con lo schermo fermo e coperto,
// altrimenti la transizione di zoom-out scatta invece di scorrere.
//
// COME: tutte le fasi (scelta -> conto alla rovescia -> esito) vivono
// nella STESSA cella di una griglia, sovrapposte, e si alternano solo in
// opacità. Così il pannello non cambia mai altezza e non c'è un solo
// riflusso di layout fra una fase e l'altra — il difetto principale
// della prima versione, che riscriveva innerHTML ad ogni passaggio e
// faceva "saltare" il riquadro. Tutto ciò che si muove usa solo
// transform/opacity.
//
// window.DUEL_RPS_SKIP = true salta tutto e risolve con 'player' (il
// comportamento storico: iniziava sempre il giocatore) — lo imposta la
// suite di test in tests/helpers/harness.js, come già fa con
// AUTH_GATE_SKIP.
// =====================================================================
(function () {
    'use strict';

    // `beats`: cosa batte questa scelta. Tre voci, nessun tabellone di
    // confronto da mantenere: chi vince si deduce da qui.
    const CHOICES = [
        { id: 'sasso', label: 'Sasso', icon: '✊', beats: 'forbice' },
        { id: 'carta', label: 'Carta', icon: '✋', beats: 'sasso' },
        { id: 'forbice', label: 'Forbice', icon: '✌️', beats: 'carta' }
    ];
    // Le tre battute scandite mentre le mani oscillano, prima della
    // rivelazione: è il ritmo con cui si gioca davvero.
    const CHANT = ['Sasso…', 'Carta…', 'Forbice!'];
    const CHANT_STEP_MS = 300;

    function choiceById(id) {
        return CHOICES.find((c) => c.id === id);
    }

    /** 'win' | 'lose' | 'draw' dal punto di vista del giocatore. */
    function outcome(playerId, botId) {
        if (playerId === botId) return 'draw';
        return choiceById(playerId).beats === botId ? 'win' : 'lose';
    }

    function escapeText(text) {
        return String(text).replace(/[&<>"']/g, (ch) => (
            { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
        ));
    }

    function prefersReducedMotion() {
        return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }

    function play(opponent) {
        return new Promise((resolve) => {
            if (window.DUEL_RPS_SKIP) { resolve('player'); return; }

            const opponentName = (opponent && opponent.name) ? opponent.name : 'Avversario';
            const overlay = document.createElement('div');
            overlay.id = 'duelRpsOverlay';
            overlay.className = 'rps-overlay';
            // Costruito UNA volta sola: da qui in poi si cambiano solo
            // classi e testi, mai la struttura.
            overlay.innerHTML = `
                <div class="rps-panel">
                    <div class="rps-eyebrow">Chi comincia?</div>
                    <div class="rps-arena">
                        <div class="rps-hand rps-hand--player">
                            <div class="rps-hand-icon" data-role="playerIcon">✊</div>
                            <div class="rps-hand-name">Tu</div>
                        </div>
                        <div class="rps-chant" data-role="chant">VS</div>
                        <div class="rps-hand rps-hand--bot">
                            <div class="rps-hand-icon" data-role="botIcon">✊</div>
                            <div class="rps-hand-name">${escapeText(opponentName)}</div>
                        </div>
                    </div>
                    <div class="rps-phases">
                        <div class="rps-phase is-on" data-phase="pick">
                            <p class="rps-sub">Scegli la tua mossa.</p>
                            <div class="rps-choices">
                                ${CHOICES.map((c, i) => `
                                    <button type="button" class="rps-choice" data-choice="${c.id}" style="--i:${i}">
                                        <span class="rps-choice-icon">${c.icon}</span>
                                        <span class="rps-choice-label">${c.label}</span>
                                    </button>
                                `).join('')}
                            </div>
                        </div>
                        <div class="rps-phase" data-phase="shoot">
                            <p class="rps-sub">…</p>
                        </div>
                        <!-- I due pulsanti dell'esito esistono fin da
                             ORA, anche se una parte degli esiti ne usa
                             uno solo: la cella della griglia prende
                             l'altezza della fase più alta, e se i
                             pulsanti comparissero solo al momento
                             dell'esito la cella crescerebbe allora,
                             spostando tutto (misurato: succedeva su
                             mobile, dove i pulsanti vanno a capo). Quello
                             che non serve viene reso invisibile ma
                             continua a occupare il suo spazio. -->
                        <div class="rps-phase" data-phase="result">
                            <div class="rps-verdict" data-role="verdict">&nbsp;</div>
                            <p class="rps-sub" data-role="resultSub">&nbsp;</p>
                            <div class="rps-actions">
                                <button type="button" class="rps-btn primary" data-role="actPrimary">&nbsp;</button>
                                <button type="button" class="rps-btn" data-role="actSecondary">&nbsp;</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);

            const el = (role) => overlay.querySelector(`[data-role="${role}"]`);
            const phase = (name) => overlay.querySelector(`[data-phase="${name}"]`);
            const playerIcon = el('playerIcon');
            const botIcon = el('botIcon');
            const chant = el('chant');
            const arena = overlay.querySelector('.rps-arena');

            function showPhase(name) {
                overlay.querySelectorAll('.rps-phase').forEach((p) => {
                    p.classList.toggle('is-on', p.dataset.phase === name);
                });
            }

            function finish(starter) {
                overlay.classList.remove('is-in');
                overlay.classList.add('is-out');
                // Si aspetta la fine della dissolvenza prima di restituire
                // il controllo: subito dopo parte il lavoro pesante di
                // inizio partita, che non deve sovrapporsi a un'animazione
                // ancora in corso.
                setTimeout(() => {
                    overlay.remove();
                    resolve(starter);
                }, 300);
            }

            function resetForNewRound() {
                arena.classList.remove('is-revealed', 'is-win', 'is-lose', 'is-draw');
                playerIcon.textContent = '✊';
                botIcon.textContent = '✊';
                chant.textContent = 'VS';
                showPhase('pick');
            }

            function reveal(playerId, botId) {
                const result = outcome(playerId, botId);
                playerIcon.textContent = choiceById(playerId).icon;
                botIcon.textContent = choiceById(botId).icon;
                chant.textContent = result === 'draw' ? '=' : 'VS';
                arena.classList.remove('is-shooting');
                arena.classList.add('is-revealed', 'is-' + result);

                const verdict = el('verdict');
                verdict.textContent = result === 'draw'
                    ? 'Pareggio!'
                    : result === 'win' ? 'Hai vinto!' : `${opponentName} ha vinto.`;
                verdict.className = 'rps-verdict rps-verdict--' + result;

                const sub = el('resultSub');
                const primary = el('actPrimary');
                const secondary = el('actSecondary');
                // Il secondo pulsante resta nel layout anche quando non
                // serve (visibility, non display): vedi il commento sul
                // markup: è ciò che tiene l'altezza costante.
                const useSecondary = (label, onClick) => {
                    secondary.textContent = label;
                    secondary.style.visibility = label ? 'visible' : 'hidden';
                    secondary.onclick = onClick || null;
                };
                if (result === 'draw') {
                    sub.textContent = 'Stessa mossa: si rigioca.';
                    primary.textContent = 'Rigioca ↻';
                    primary.onclick = resetForNewRound;
                    useSecondary('', null);
                } else if (result === 'win') {
                    // Chi vince SCEGLIE, non parte d'ufficio: è la regola
                    // vera, ed è anche la parte interessante (a volte
                    // conviene lasciare il primo turno all'avversario).
                    sub.textContent = 'Scegli chi gioca per primo:';
                    primary.textContent = '⚔️ Comincio io';
                    primary.onclick = () => finish('player');
                    useSecondary('🛡️ Comincia lui', () => finish('bot'));
                } else {
                    sub.textContent = `${opponentName} sceglie di cominciare.`;
                    primary.textContent = 'Inizia il duello ›';
                    primary.onclick = () => finish('bot');
                    useSecondary('', null);
                }
                showPhase('result');
            }

            function shoot(playerId) {
                const botId = CHOICES[Math.floor(Math.random() * CHOICES.length)].id;
                showPhase('shoot');
                if (prefersReducedMotion()) { reveal(playerId, botId); return; }
                arena.classList.add('is-shooting');
                CHANT.forEach((word, i) => {
                    setTimeout(() => { chant.textContent = word; }, i * CHANT_STEP_MS);
                });
                setTimeout(() => reveal(playerId, botId), CHANT.length * CHANT_STEP_MS);
            }

            overlay.querySelectorAll('.rps-choice').forEach((btn) => {
                btn.onclick = () => {
                    if (window.NativeHaptics) NativeHaptics.light();
                    btn.classList.add('is-picked');
                    shoot(btn.dataset.choice);
                };
            });

            // Un frame di ritardo perché la transizione d'entrata parta
            // davvero (un elemento appena inserito non anima).
            requestAnimationFrame(() => overlay.classList.add('is-in'));
        });
    }

    window.DuelRPS = { play: play, CHOICES: CHOICES, outcome: outcome };
})();
