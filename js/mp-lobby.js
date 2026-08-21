/**
 * mp-lobby.js — Lobby del Duello Multiplayer (multiplayer.html)
 * ---------------------------------------------------------------
 * Tutto quello che serve PRIMA che il duello inizi: connettersi al
 * server di stanze (js/network.js), creare o raggiungere una stanza con
 * un codice a 5 caratteri, e attendere l'avversario.
 *
 * Quando la stanza si riempie (evento 'room-ready'), questo file NON
 * naviga verso un'altra pagina: la connessione WebSocket appena aperta
 * (window.DuelNetwork) vive solo dentro QUESTA pagina, e il server di
 * stanze non sa come far "riprendere" una partita già in corso — quindi
 * un cambio pagina qui la perderebbe. Invece, loadDuelArena() qui sotto
 * scarica il markup/CSS/script dell'arena di duello direttamente da
 * yugioh_game.html (che resta l'UNICA fonte per come è fatto un duello:
 * niente arena duplicata da mantenere in due posti) e li inserisce in
 * questa stessa pagina — stessa scheda, stessa connessione, nessuna
 * riconnessione. Il vero avvio della partita (DuelSession.start(), in
 * fondo a js/game-flow.js) parte da sé appena quegli script sono caricati,
 * esattamente come su ogni altra pagina di duello.
 */
(function () {
    'use strict';

    const net = window.DuelNetwork;

    function $(id) { return document.getElementById(id); }

    function showStatus(text, isError) {
        const el = $('mpStatus');
        if (!el) return;
        el.textContent = text || '';
        el.classList.toggle('mp-status-error', !!isError);
    }

    // ============================================================
    // Lobby: tab switching, creazione/adesione a una stanza
    // ============================================================
    function initLobbyUI() {
        const tabCreate = $('mpTabCreate');
        const tabJoin = $('mpTabJoin');
        const panelCreate = $('mpPanelCreate');
        const panelJoin = $('mpPanelJoin');

        tabCreate.onclick = () => {
            tabCreate.classList.add('active');
            tabJoin.classList.remove('active');
            panelCreate.style.display = '';
            panelJoin.style.display = 'none';
            showStatus('');
        };
        tabJoin.onclick = () => {
            tabJoin.classList.add('active');
            tabCreate.classList.remove('active');
            panelJoin.style.display = '';
            panelCreate.style.display = 'none';
            showStatus('');
        };

        $('mpCreateBtn').onclick = handleCreateRoom;
        $('mpJoinBtn').onclick = handleJoinRoom;
        $('mpCopyBtn').onclick = () => {
            const code = $('mpRoomCodeValue').textContent;
            if (navigator.clipboard && code) {
                navigator.clipboard.writeText(code).then(() => showStatus('✅ Codice copiato negli appunti!'));
            }
        };
    }

    async function ensureConnected() {
        const url = ($('mpServerUrl').value || '').trim();
        if (!url) {
            showStatus('⚠️ Inserisci l\'indirizzo del server.', true);
            return false;
        }
        showStatus('🔌 Connessione al server...');
        try {
            await net.connect(url);
            showStatus('✅ Connesso al server.');
            return true;
        } catch (err) {
            showStatus('❌ Impossibile connettersi: ' + err.message, true);
            return false;
        }
    }

    async function handleCreateRoom() {
        $('mpCreateBtn').disabled = true;
        const ok = await ensureConnected();
        if (!ok) { $('mpCreateBtn').disabled = false; return; }
        net.createRoom();
    }

    async function handleJoinRoom() {
        const code = ($('mpJoinCode').value || '').trim().toUpperCase();
        if (code.length !== 5) {
            showStatus('⚠️ Il codice deve avere 5 caratteri.', true);
            return;
        }
        $('mpJoinBtn').disabled = true;
        const ok = await ensureConnected();
        if (!ok) { $('mpJoinBtn').disabled = false; return; }
        net.joinRoom(code);
    }

    net.on('room-created', (msg) => {
        $('mpRoomCodeValue').textContent = msg.code;
        $('mpRoomCodeBox').style.display = '';
        showStatus('🕐 Stanza creata! Condividi il codice e attendi il tuo avversario...');
    });

    net.on('room-ready', (msg) => {
        showStatus('⚔️ Avversario trovato! Il duello sta per iniziare...');
        setTimeout(() => startMultiplayerDuel(msg.youStart), 600);
    });

    net.on('error', (msg) => {
        showStatus('❌ ' + (msg.message || 'Si è verificato un errore.'), true);
        $('mpCreateBtn').disabled = false;
        $('mpJoinBtn').disabled = false;
    });

    // Persa la connessione MENTRE si è ancora in lobby (non in partita: a
    // partita avviata questo stesso evento è gestito da js/multiplayer.js,
    // caricato solo a quel punto — vedi net.on('disconnected', ...) lì).
    // js/network.js prova da sé a riconnettersi (vedi 'reconnecting' qui
    // sotto) se avevamo già una stanza — mostriamo l'errore definitivo e
    // riabilitiamo i pulsanti SOLO se quel tentativo fallisce del tutto o
    // non è nemmeno partito (nessuna stanza ancora creata/raggiunta).
    net.on('disconnected', () => {
        if (window.MULTIPLAYER_MODE) return;
        showStatus('❌ Connessione al server persa.', true);
        $('mpCreateBtn').disabled = false;
        $('mpJoinBtn').disabled = false;
    });

    net.on('reconnecting', (attempt) => {
        if (window.MULTIPLAYER_MODE) return;
        showStatus(`🔌 Connessione persa, tentativo di riconnessione (${attempt})...`, true);
    });

    net.on('reconnected', () => {
        if (window.MULTIPLAYER_MODE) return;
        showStatus('✅ Riconnesso, in attesa del tuo avversario...');
    });

    net.on('reconnect-failed', () => {
        if (window.MULTIPLAYER_MODE) return;
        showStatus('❌ Impossibile riconnettersi al server.', true);
        $('mpCreateBtn').disabled = false;
        $('mpJoinBtn').disabled = false;
    });

    // ============================================================
    // Avvio del duello dopo l'accoppiamento in stanza
    // ============================================================
    async function startMultiplayerDuel(youStart) {
        window.MULTIPLAYER_MODE = true;
        window.MP_startingRole = youStart ? 'player' : 'bot';
        window.MP_broadcast = (action) => net.sendAction(action);

        const lobbyScreen = $('mpLobbyScreen');
        if (lobbyScreen) lobbyScreen.remove();

        await loadDuelArena();
    }

    /**
     * Scarica yugioh_game.html — l'UNICA fonte per com'è fatta l'arena di
     * duello (CSS, campo, mano, modali...) — ed esegue in QUESTA pagina,
     * in ordine, esattamente quello che yugioh_game.html eseguirebbe da
     * sé: prima il CSS dell'arena, poi il suo markup, poi i suoi script
     * (nello stesso ordine relativo in cui compaiono nel file, inline ed
     * esterni inclusi — l'ordine conta: es. duel-engine.js deve caricare
     * prima di card-effects.js). In fondo aggiunge anche js/multiplayer.js,
     * che yugioh_game.html non include più da sé (serve solo qui, per
     * applicare le mosse remote dell'avversario — vedi quel file).
     */
    async function loadDuelArena() {
        const res = await fetch('yugioh_game.html');
        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');

        const arenaStyle = doc.querySelector('head style');
        if (arenaStyle) {
            const styleEl = document.createElement('style');
            styleEl.textContent = arenaStyle.textContent;
            document.head.appendChild(styleEl);
        }

        // Markup dell'arena: un elenco esplicito (non "tutto il body tranne
        // la lobby") — così se in futuro yugioh_game.html aggiunge nuovi
        // elementi di root nel body, basta aggiungerli qui, senza dipendere
        // da cosa NON prendere.
        const mount = $('arenaMount');
        ['rotateDeviceOverlay', 'tributePrompt', 'attack-arrow-svg', 'activateModal', 'surrenderModal', 'playerInfo'].forEach((id) => {
            const el = doc.getElementById(id);
            if (el) mount.appendChild(document.importNode(el, true));
        });
        const gameContainer = doc.querySelector('.game-container');
        if (gameContainer) mount.appendChild(document.importNode(gameContainer, true));

        // Script dell'arena (inline ed esterni), nello stesso ordine del
        // file originale — un inline eseguito troppo presto (es. quello che
        // avvia la musica, che si aspetta initAudioManager già definita da
        // js/audio-manager.js) romperebbe la pagina.
        const bodyScripts = Array.from(doc.querySelectorAll('body script'));
        for (const original of bodyScripts) {
            if (original.src) {
                await loadScriptSequential(original.getAttribute('src'));
            } else {
                const inline = document.createElement('script');
                inline.textContent = original.textContent;
                document.body.appendChild(inline);
            }
        }
        await loadScriptSequential('js/multiplayer.js');
    }

    function loadScriptSequential(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = () => reject(new Error(`Impossibile caricare ${src}`));
            document.body.appendChild(script);
        });
    }

    // ============================================================
    // Bootstrap
    // ============================================================
    initLobbyUI();
})();
