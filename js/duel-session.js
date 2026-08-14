/**
 * duel-session.js — Chi sta duellando, da dove arriva e dove torna.
 * =====================================================================
 * yugioh_game.html è la PAGINA UNICA del duello: ci arrivano il Duello
 * Demo, il Duello Libero (sfida a un personaggio), il Multiplayer e —
 * in futuro — la Modalità Storia. Quello che cambia fra loro non è il
 * duello in sé, ma tre informazioni soltanto:
 *
 *   1. chi è l'avversario (nome, ritratto, titolo);
 *   2. quanto è difficile;
 *   3. a quale schermata si torna quando il duello finisce.
 *
 * Questo file legge quelle informazioni dall'URL e le espone a tutto il
 * resto del gioco come `DuelSession`, così nessun altro file deve sapere
 * "da dove siamo arrivati".
 *
 * URL riconosciuti:
 *   yugioh_game.html                                      -> Duello Demo contro il Bot
 *   yugioh_game.html?mode=free&character=kaiba&difficulty=Medio
 *   yugioh_game.html?mode=multiplayer                     -> lobby online
 *   yugioh_game.html?mode=story&character=yugi&chapter=3  -> predisposto, non ancora usato
 *
 * Le due funzioni pubbliche sono l'inizio e la fine del duello:
 *   DuelSession.start()             — riproduce l'intro cinematografica e
 *                                     poi avvia la partita vera (initGame).
 *   DuelSession.finish(playerWon)   — registra il risultato e mostra la
 *                                     schermata di Vittoria/Sconfitta con
 *                                     il pulsante "Continua".
 */
(function () {
    'use strict';

    const params = new URLSearchParams(window.location.search);
    const mode = (params.get('mode') || 'demo').toLowerCase();

    // Dove porta il pulsante "Continua" a fine duello, per modalità.
    const RETURN_URLS = {
        demo: 'index.html',
        free: 'duello-libero.html',
        story: 'duello-libero.html', // finché la Modalità Storia non ha una sua schermata
        multiplayer: 'index.html'
    };

    // Avversari "senza volto": modalità in cui non stiamo sfidando un
    // personaggio del database ma un generico Bot o un giocatore online.
    const GENERIC_OPPONENTS = {
        demo: { id: null, name: 'Bot', title: 'Avversario di allenamento', image: null, icon: '🤖' },
        multiplayer: { id: null, name: 'Avversario', title: 'Duellante online', image: null, icon: '🌐' }
    };

    /**
     * Risolve l'avversario. In Duello Libero/Storia lo cerca per id nel
     * database dei personaggi (js/characters-db.js); se l'id manca o non
     * esiste, ricade sul Bot generico invece di rompere il duello.
     */
    function resolveOpponent() {
        const characterId = params.get('character');
        if (characterId && typeof characterDatabase !== 'undefined') {
            const character = characterDatabase.find((c) => c.id === characterId);
            if (character) {
                return {
                    id: character.id,
                    name: character.name,
                    title: character.title || '',
                    image: character.image || null,
                    icon: '🧑‍🎤'
                };
            }
        }
        return GENERIC_OPPONENTS[mode] || GENERIC_OPPONENTS.demo;
    }

    const session = {
        mode: mode,
        isMultiplayer: mode === 'multiplayer',
        difficulty: params.get('difficulty') || null,
        chapter: params.get('chapter') || null,
        opponent: resolveOpponent(),
        player: { name: 'Giocatore', title: 'Duellante', image: null, icon: '👤' },
        returnUrl: RETURN_URLS[mode] || 'index.html',
        started: false,
        finished: false
    };

    /**
     * Scrive nome e ritratto dell'avversario nel pannello LP in alto a
     * sinistra, al posto del segnaposto "🤖 Bot" scritto nell'HTML.
     */
    function applyOpponentIdentity() {
        const heading = document.querySelector('#botInfo h3');
        if (!heading) return;

        heading.innerHTML = '';
        heading.classList.add('duelist-heading');
        heading.appendChild(buildAvatar(session.opponent, 'duelist-avatar--inline'));

        const label = document.createElement('span');
        label.className = 'duelist-name';
        label.textContent = session.opponent.name;
        label.title = session.opponent.name;
        heading.appendChild(label);

        // La difficoltà va su una riga sua: il pannello dei Life Point è
        // stretto e un nome lungo come "Maximillion Pegasus" spingerebbe
        // il badge a capo in modo disordinato.
        if (session.difficulty) {
            const badge = document.createElement('div');
            badge.className = 'duelist-difficulty diff--' + session.difficulty.toLowerCase();
            badge.textContent = session.difficulty;
            heading.insertAdjacentElement('afterend', badge);
        }
    }

    /**
     * Costruisce il ritratto di un duellante: parte dall'emoji di ripiego
     * e la sostituisce con l'immagine solo se questa carica davvero
     * (stessa convenzione usata in duello-libero.html — la cartella
     * images/characters/ può non esistere ancora).
     */
    function buildAvatar(duelist, extraClass) {
        const wrap = document.createElement('span');
        wrap.className = 'duelist-avatar' + (extraClass ? ' ' + extraClass : '');

        const fallback = document.createElement('span');
        fallback.className = 'duelist-avatar-fallback';
        fallback.textContent = duelist.icon || '🂠';
        wrap.appendChild(fallback);

        if (duelist.image) {
            const img = document.createElement('img');
            img.alt = duelist.name;
            img.onload = () => { wrap.classList.add('has-image'); };
            img.onerror = () => { img.remove(); };
            img.src = duelist.image;
            wrap.appendChild(img);
        }
        return wrap;
    }

    /**
     * Avvia il duello: intro cinematografica e, appena il sipario si apre,
     * la partita vera. Chiamata dal boot di js/game-flow.js (modalità
     * offline) oppure da js/multiplayer.js quando la stanza è pronta.
     */
    function start() {
        if (session.started) return;
        session.started = true;
        applyOpponentIdentity();

        const beginMatch = () => {
            if (typeof initGame === 'function') initGame();
            if (typeof setupPhaseStepper === 'function') setupPhaseStepper();
        };

        if (window.DuelCinematics) {
            DuelCinematics.playIntro(session, beginMatch);
        } else {
            beginMatch();
        }
    }

    /**
     * Chiude il duello. Aggiorna il record del personaggio (solo se
     * l'avversario è un personaggio vero: Bot e avversari online non
     * hanno un record da tenere) e mostra la schermata finale.
     */
    function finish(playerWon) {
        if (session.finished) return;
        session.finished = true;

        let record = null;
        if (session.opponent.id && typeof recordCharacterResult === 'function') {
            record = recordCharacterResult(session.opponent.id, playerWon);
        }
        // A fine duello il salvataggio va sempre "toccato" (aggiorna
        // l'Ultimo salvataggio in Profilo), anche per un Duello Demo/Bot
        // generico senza record da aggiornare — recordCharacterResult qui
        // sopra lo farebbe già, ma solo quando c'è un personaggio vero.
        if (window.SaveManager) {
            const save = SaveManager.load();
            if (save) SaveManager.touch(save);
        }

        const goBack = () => { window.location.href = session.returnUrl; };

        if (window.DuelCinematics) {
            DuelCinematics.showOutcome({
                playerWon: playerWon,
                session: session,
                record: record,
                onContinue: goBack
            });
        } else {
            goBack();
        }
    }

    session.start = start;
    session.finish = finish;
    session.buildAvatar = buildAvatar;
    window.DuelSession = session;
})();
