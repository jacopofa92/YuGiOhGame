// js/ui/duel-rps.js
// =====================================================================
// Morra cinese (sasso/carta/forbice) prima di ogni duello, per decidere
// CHI GIOCA PER PRIMO — come al tavolo vero, dove si tira a sorte e chi
// vince sceglie se partire o lasciare partire l'avversario.
//
// Perché proprio qui nel flusso: DuelSession.start() chiama la cinematica
// VS e poi beginMatch(); questo modulo si inserisce ESATTAMENTE in mezzo
// (vedi js/duel-session.js). Prima della cinematica non avrebbe senso
// (non si è ancora visto contro chi si gioca), dopo l'inizio della
// partita sarebbe tardi: a quel punto le mani sono già pescate e il
// primo turno è già impostato. In mezzo, invece, il campo è ancora
// coperto dall'overlay dell'intro e non si vede nulla di "mezzo fatto".
//
// API: DuelRPS.play(opponent) -> Promise<'player'|'bot'>
// Il chiamante scrive il risultato in window.DUEL_STARTING_ROLE, che
// js/engine/game-flow.js#initGame() legge subito dopo resetGameState()
// nello stesso identico punto in cui il Multiplayer applica
// window.MP_startingRole.
//
// window.DUEL_RPS_SKIP = true salta tutto e risolve con 'player' (il
// comportamento storico: iniziava sempre il giocatore) — lo imposta la
// suite di test in tests/helpers/harness.js, esattamente come già fa con
// AUTH_GATE_SKIP, così i test restano deterministici e non devono
// cliccare una schermata in più.
// =====================================================================
(function () {
    'use strict';

    // `beats`: cosa batte questa scelta. Tre voci, nessun tabellone di
    // confronto da mantenere: chi vince si deduce da qui.
    const CHOICES = [
        { id: 'sasso', label: 'Sasso', icon: '🪨', beats: 'forbice' },
        { id: 'carta', label: 'Carta', icon: '📄', beats: 'sasso' },
        { id: 'forbice', label: 'Forbice', icon: '✂️', beats: 'carta' }
    ];

    function choiceById(id) {
        return CHOICES.find((c) => c.id === id);
    }

    /** 'win' | 'lose' | 'draw' dal punto di vista del giocatore. */
    function outcome(playerId, botId) {
        if (playerId === botId) return 'draw';
        return choiceById(playerId).beats === botId ? 'win' : 'lose';
    }

    function play(opponent) {
        return new Promise((resolve) => {
            if (window.DUEL_RPS_SKIP) { resolve('player'); return; }

            const opponentName = (opponent && opponent.name) ? opponent.name : 'Avversario';
            const overlay = document.createElement('div');
            overlay.id = 'duelRpsOverlay';
            overlay.className = 'rps-overlay';
            document.body.appendChild(overlay);

            const finish = (starter) => {
                overlay.classList.add('is-out');
                // Lascia finire la dissolvenza prima di restituire il
                // controllo: initGame() parte subito dopo e comincia ad
                // animare il campo, che non deve comparire di scatto
                // sotto un overlay ancora opaco.
                setTimeout(() => {
                    overlay.remove();
                    resolve(starter);
                }, 320);
            };

            function renderPick() {
                overlay.innerHTML = `
                    <div class="rps-panel">
                        <div class="rps-eyebrow">Chi comincia?</div>
                        <h2 class="rps-title">Sasso, Carta, Forbice</h2>
                        <p class="rps-sub">Sfida ${escapeText(opponentName)} per decidere chi gioca per primo.</p>
                        <div class="rps-choices">
                            ${CHOICES.map((c) => `
                                <button type="button" class="rps-choice" data-choice="${c.id}">
                                    <span class="rps-choice-icon">${c.icon}</span>
                                    <span class="rps-choice-label">${c.label}</span>
                                </button>
                            `).join('')}
                        </div>
                    </div>
                `;
                overlay.querySelectorAll('.rps-choice').forEach((btn) => {
                    btn.onclick = () => {
                        if (window.NativeHaptics) NativeHaptics.light();
                        renderReveal(btn.dataset.choice, CHOICES[Math.floor(Math.random() * CHOICES.length)].id);
                    };
                });
            }

            function renderReveal(playerId, botId) {
                const result = outcome(playerId, botId);
                const p = choiceById(playerId);
                const b = choiceById(botId);
                const verdict = result === 'draw'
                    ? 'Pareggio!'
                    : result === 'win' ? 'Hai vinto!' : `${opponentName} ha vinto.`;

                overlay.innerHTML = `
                    <div class="rps-panel">
                        <div class="rps-duelists">
                            <div class="rps-side">
                                <div class="rps-side-name">Tu</div>
                                <div class="rps-side-icon">${p.icon}</div>
                                <div class="rps-side-label">${p.label}</div>
                            </div>
                            <div class="rps-vs">VS</div>
                            <div class="rps-side">
                                <div class="rps-side-name">${escapeText(opponentName)}</div>
                                <div class="rps-side-icon">${b.icon}</div>
                                <div class="rps-side-label">${b.label}</div>
                            </div>
                        </div>
                        <h2 class="rps-title rps-verdict rps-verdict--${result}">${verdict}</h2>
                        <div class="rps-actions" id="rpsActions"></div>
                    </div>
                `;

                const actions = overlay.querySelector('#rpsActions');
                if (result === 'draw') {
                    actions.innerHTML = '<button type="button" class="rps-btn" id="rpsAgain">Si ripete ↻</button>';
                    overlay.querySelector('#rpsAgain').onclick = renderPick;
                    return;
                }
                if (result === 'win') {
                    // Chi vince SCEGLIE, non parte d'ufficio: è la regola
                    // vera, ed è anche la parte interessante (a volte
                    // conviene lasciare il primo turno all'avversario).
                    actions.innerHTML = `
                        <p class="rps-sub">Scegli chi gioca per primo:</p>
                        <div class="rps-actions-row">
                            <button type="button" class="rps-btn primary" id="rpsGoFirst">⚔️ Comincio io</button>
                            <button type="button" class="rps-btn" id="rpsGoSecond">🛡️ Comincia lui</button>
                        </div>
                    `;
                    overlay.querySelector('#rpsGoFirst').onclick = () => finish('player');
                    overlay.querySelector('#rpsGoSecond').onclick = () => finish('bot');
                    return;
                }
                actions.innerHTML = `
                    <p class="rps-sub">${escapeText(opponentName)} sceglie di cominciare.</p>
                    <button type="button" class="rps-btn primary" id="rpsGo">Inizia il duello ›</button>
                `;
                overlay.querySelector('#rpsGo').onclick = () => finish('bot');
            }

            // Il nome dell'avversario può venire da un personaggio
            // personalizzato: mai iniettato grezzo in innerHTML.
            function escapeText(text) {
                return String(text).replace(/[&<>"']/g, (ch) => (
                    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
                ));
            }

            renderPick();
            // Un frame di ritardo perché la transizione d'entrata parta
            // davvero (un elemento appena inserito non anima).
            requestAnimationFrame(() => overlay.classList.add('is-in'));
        });
    }

    window.DuelRPS = { play: play, CHOICES: CHOICES, outcome: outcome };
})();
