/**
 * duel-session.js — Chi sta duellando, da dove arriva e dove torna.
 * =====================================================================
 * yugioh_game.html è l'arena di duello condivisa da Duello Demo, Duello
 * Libero (sfida a un personaggio) e — in futuro — la Modalità Storia.
 * Il Multiplayer ha la sua pagina dedicata, multiplayer.html, che carica
 * QUESTA stessa arena a runtime dopo la lobby (vedi js/multiplayer/mp-lobby.js) invece
 * di navigare qui con un parametro — per questo è l'unica modalità che si
 * segnala con window.MULTIPLAYER_MODE invece che con l'URL, qui sotto.
 * Quello che cambia fra le modalità non è il duello in sé, ma tre
 * informazioni soltanto:
 *
 *   1. chi è l'avversario (nome, ritratto, titolo);
 *   2. quanto è difficile;
 *   3. a quale schermata si torna quando il duello finisce.
 *
 * Questo file legge quelle informazioni dall'URL (o da MULTIPLAYER_MODE)
 * e le espone a tutto il resto del gioco come `DuelSession`, così nessun
 * altro file deve sapere "da dove siamo arrivati".
 *
 * URL riconosciuti:
 *   yugioh_game.html                                      -> Duello Demo contro il Bot
 *   yugioh_game.html?mode=free&character=kaiba&difficulty=Medio
 *   yugioh_game.html?mode=story&character=yugi&chapter=3  -> predisposto, non ancora usato
 *   multiplayer.html                                      -> lobby online (poi carica questa arena da sé)
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
    // In Multiplayer questo file viene eseguito dentro multiplayer.html
    // (non più yugioh_game.html?mode=multiplayer): la pagina non ha un
    // parametro ?mode nel proprio URL, quindi il segnale è invece
    // window.MULTIPLAYER_MODE, impostato da js/multiplayer/mp-lobby.js PRIMA di
    // caricare l'arena — vedi lì per il flusso completo.
    const mode = window.MULTIPLAYER_MODE ? 'multiplayer' : (params.get('mode') || 'demo').toLowerCase();

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
     * database dei personaggi (js/data/characters-db.js); se l'id manca o non
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

    // Traduce l'etichetta italiana scelta in duello-libero.html
    // (Medio/Difficile, vedi diff-btn lì — "Facile" è stato rimosso su
    // richiesta esplicita dell'utente, restano solo questi due livelli)
    // nella chiave interna che js/ai/ai-controller.js si aspetta in
    // gameState.botDifficulty ('medium'/'hard'), vedi resetGameState() in
    // js/engine/game-flow.js, che legge DuelSession.aiDifficultyKey. Il Duello
    // Demo (nessun ?difficulty= nell'URL) non imposta nulla e ricade sul
    // default 'medium' dentro ai-controller.js, cioè il comportamento del
    // bot di sempre.
    const DIFFICULTY_LABEL_TO_KEY = { Medio: 'medium', Difficile: 'hard' };

    const session = {
        mode: mode,
        isMultiplayer: mode === 'multiplayer',
        difficulty: params.get('difficulty') || null,
        aiDifficultyKey: DIFFICULTY_LABEL_TO_KEY[params.get('difficulty')] || null,
        chapter: params.get('chapter') || null,
        opponent: resolveOpponent(),
        // "Il Tuo Riflesso" (images/characters/mirror.jpg, la stessa foto
        // usata per l'avversario speciale "Te Stesso" in characters-db.js):
        // il giocatore non ha ancora un vero sistema di avatar personalizzabili,
        // quindi come immagine di default per SÉ STESSO usa lo specchio —
        // a differenza dell'icona 👤 generica, resta comunque coerente col
        // fallback automatico di buildAvatar() se il file non caricasse.
        // Il nome vero salvato dal giocatore in profilo.html
        // (SaveManager.getPlayerName(), persistito nel salvataggio) —
        // 'Giocatore' resta solo il fallback se non ne ha ancora scelto uno.
        player: { name: (window.SaveManager && SaveManager.getPlayerName()) || 'Giocatore', title: 'Duellante', image: 'images/characters/mirror.jpg', icon: '👤' },
        returnUrl: RETURN_URLS[mode] || 'index.html',
        started: false,
        finished: false
    };

    /**
     * Ricostruisce un pannello LP (#botInfo o #playerInfo) in stile "Duel
     * Links": ritratto grande a lato, nome/difficoltà/LP/tag turno
     * impilati accanto — al posto del solo testo centrato di prima.
     * Riusa i figli GIÀ presenti nell'HTML (h3, .life-points, .turn-tag,
     * già scritti dalle rispettive pagine) spostandoli dentro un nuovo
     * wrapper .duelist-details, invece di ricostruirli da zero — così
     * questa funzione non deve sapere nulla del loro contenuto interno.
     */
    function applyDuelistIdentity(boxSelector, duelist, options) {
        const box = document.querySelector(boxSelector);
        if (!box) return;
        options = options || {};

        const nameEl = box.querySelector('h3');
        if (nameEl) {
            nameEl.textContent = duelist.name;
            nameEl.title = duelist.name;
            nameEl.className = 'duelist-name';
        }

        const details = document.createElement('div');
        details.className = 'duelist-details';
        while (box.firstChild) {
            details.appendChild(box.firstChild);
        }

        // La difficoltà (solo per l'avversario) va subito sotto il nome,
        // su una riga sua — il pannello LP è stretto e un nome lungo come
        // "Maximillion Pegasus" spingerebbe un badge sulla stessa riga a
        // capo in modo disordinato.
        if (options.difficulty) {
            const badge = document.createElement('div');
            badge.className = 'duelist-difficulty diff--' + options.difficulty.toLowerCase();
            badge.textContent = options.difficulty;
            details.insertBefore(badge, details.children[1] || null);
        }

        box.insertBefore(buildWedge(options.corner || 'top-left'), box.firstChild);
        box.appendChild(buildAvatar(duelist, 'duelist-avatar--corner'));
        box.appendChild(details);
    }

    /**
     * Cuneo triangolare di sfondo (SVG): un poligono di riempimento +
     * UNA linea per la sola ipotenusa (bordo dorato) — un clip-path CSS
     * non permetterebbe di bordare un solo lato di una forma tagliata,
     * quindi qui serve davvero l'SVG. viewBox 0-100 con
     * preserveAspectRatio="none" così si adatta a QUALUNQUE
     * larghezza/altezza dia il CSS al contenitore (vedi
     * .player-info.side-player in yugioh_game.html) senza dover
     * ricalcolare nulla qui; vector-effect="non-scaling-stroke" evita che
     * lo stiramento non uniforme deformi lo spessore della linea.
     * `corner` è l'angolo dove sta la punta del cuneo: 'top-left' (bot) o
     * 'bottom-right' (giocatore, speculare).
     */
    function buildWedge(corner) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 100 100');
        svg.setAttribute('preserveAspectRatio', 'none');
        svg.setAttribute('class', 'duelist-wedge');

        const points = corner === 'bottom-right'
            ? '100,100 0,100 100,0'
            : '0,0 100,0 0,100';
        const edgePoints = corner === 'bottom-right'
            ? '0,100 100,0'
            : '100,0 0,100';

        const fill = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        fill.setAttribute('points', points);
        fill.setAttribute('class', 'duelist-wedge-fill');
        svg.appendChild(fill);

        const [p1, p2] = edgePoints.split(' ');
        const [x1, y1] = p1.split(',');
        const [x2, y2] = p2.split(',');
        const edge = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        edge.setAttribute('x1', x1); edge.setAttribute('y1', y1);
        edge.setAttribute('x2', x2); edge.setAttribute('y2', y2);
        edge.setAttribute('vector-effect', 'non-scaling-stroke');
        edge.setAttribute('class', 'duelist-wedge-edge');
        svg.appendChild(edge);

        return svg;
    }

    function applyOpponentIdentity() {
        applyDuelistIdentity('#botInfo', session.opponent, { difficulty: session.difficulty, corner: 'top-left' });
    }

    function applyPlayerIdentity() {
        applyDuelistIdentity('#playerInfo', session.player, { corner: 'bottom-right' });
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
     * la partita vera. Chiamata sempre dal boot in fondo a js/engine/game-flow.js
     * — anche in Multiplayer, dove quello script viene solo caricato più
     * tardi del solito (da js/multiplayer/mp-lobby.js, a stanza pronta) invece che
     * subito al caricamento pagina.
     */
    function start() {
        if (session.started) return;
        session.started = true;
        applyOpponentIdentity();
        applyPlayerIdentity();

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

        const goBack = () => {
            // Il pulsante "Indietro" di duello-libero.html usa document.referrer
            // per capire dove tornare — ma qui il referrer di questa pagina
            // sarebbe yugioh_game.html (il duello appena concluso, da cui
            // stiamo navigando via questo redirect), quindi "Indietro" ci
            // rimanderebbe dentro un duello già finito invece di risalire al
            // menu. Questo flag dice al pulsante "Indietro" della pagina di
            // destinazione di ignorare il referrer per QUESTA visita e usare
            // direttamente il proprio fallback (index.html) — vedi duello-libero.html.
            try { sessionStorage.setItem('ygoSkipReferrerBack', '1'); } catch (e) { /* noop */ }
            window.location.href = session.returnUrl;
        };

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
