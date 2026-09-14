/**
 * mp-lobby.js — Lobby e Sala d'Attesa del Duello Multiplayer
 * (multiplayer.html)
 * ---------------------------------------------------------------
 * Tutto quello che succede PRIMA che il duello inizi: connettersi al
 * server di stanze (js/multiplayer/network.js), creare o raggiungere una
 * stanza con un codice a 5 caratteri, attendere l'avversario — e, nel
 * frattempo, scegliere arena e colonna sonora.
 *
 * DUE POSTI PER STANZA. Il limite non è imposto qui: il server rifiuta
 * il terzo ingresso ("La stanza è già piena", vedi server/server.js).
 * Questa pagina lo RENDE VISIBILE, con due posti duellante e un
 * contatore — prima l'attesa era una riga di testo e non si capiva se
 * stesse succedendo qualcosa.
 *
 * CHI SCEGLIE ARENA E MUSICA. Le sceglie chi ha creato la stanza, e
 * valgono per entrambi. Non è una preferenza personale come il volume:
 * è il luogo del duello, e i due devono vedere lo stesso. Le scelte
 * viaggiano sul canale delle azioni di gioco come `room-config`, un
 * istante prima di cominciare. Nota importante: "casuale" viene
 * RISOLTO in un valore vero prima di trasmetterlo (ArenaOptions.risolvi*)
 * — se ognuno dei due risolvesse il proprio, si ritroverebbero a duellare
 * in due arene diverse con due musiche diverse.
 *
 * COME ARRIVANO AL DUELLO. Non si naviga: la connessione WebSocket vive
 * in QUESTA pagina e un cambio pagina la perderebbe. loadDuelArena()
 * scarica il markup/CSS/script dell'arena da duelMonstersCore.html
 * (unica fonte per com'è fatto un duello) e li inserisce qui.
 */
(function () {
    'use strict';

    const net = window.DuelNetwork;

    // L'indirizzo usato l'ultima volta CON SUCCESSO vince sul valore
    // predefinito scritto in multiplayer.html: chi sviluppa in locale non
    // deve riscrivere il proprio `ws://localhost:8787` ad ogni visita, e
    // chi non lo tocca mai continua a trovarsi il server pubblico già
    // pronto nel campo.
    const SERVER_URL_STORAGE_KEY = 'ygoMpServerUrl';
    const CONTO_ALLA_ROVESCIA_DA = 3;
    const PASSO_CONTO_MS = 750;
    // Quanto l'ospite aspetta le impostazioni dell'host prima di partire
    // comunque con le proprie: meglio un duello che comincia in un'arena
    // diversa da quella scelta che un duello che non comincia mai.
    const ATTESA_CONFIG_MS = 4000;
    const ANTEPRIMA_MAX_MS = 20000;

    let sonoHost = false;
    let codiceStanza = null;
    let configRicevuta = null;
    let iniziIoInAttesa = null;
    let timerAttesaConfig = null;
    let duelloGiaAvviato = false;

    // Scelte correnti: RANDOM finché non si tocca nulla.
    const scelta = { field: window.ArenaOptions.RANDOM, music: window.ArenaOptions.RANDOM };

    function $(id) { return document.getElementById(id); }

    function showStatus(text, isError) {
        const el = $('mpStatus');
        if (!el) return;
        el.textContent = text || '';
        el.classList.toggle('mp-status-error', !!isError);
    }

    function mostraSchermata(nome) {
        const lobby = $('mpLobby');
        if (lobby) lobby.dataset.schermata = nome;
    }

    // ============================================================
    // Fondale animato
    // ============================================================
    function creaGranelli() {
        const box = $('mpMotes');
        if (!box) return;
        // Posizioni e tempi decisi qui e non in CSS: venti granelli con la
        // stessa animazione partirebbero tutti insieme, e si vedrebbe.
        for (let i = 0; i < 18; i++) {
            const mote = document.createElement('div');
            mote.className = 'mp-mote';
            mote.style.left = (Math.random() * 100).toFixed(2) + '%';
            mote.style.animationDuration = (9 + Math.random() * 11).toFixed(1) + 's';
            mote.style.animationDelay = (-Math.random() * 14).toFixed(1) + 's';
            const scala = (0.6 + Math.random() * 1.2).toFixed(2);
            mote.style.transform = `scale(${scala})`;
            box.appendChild(mote);
        }
    }

    // ============================================================
    // Ingresso: scelta crea/entra, connessione
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
        $('mpCopyBtn').onclick = copiaCodice;
    }

    function copiaCodice() {
        const code = codiceStanza || '';
        if (!code) return;
        if (navigator.clipboard) {
            navigator.clipboard.writeText(code).then(() => showStatus('✅ Codice copiato negli appunti!'));
        }
        if (window.NativeHaptics) NativeHaptics.light();
    }

    function restoreSavedServerUrl() {
        try {
            const saved = localStorage.getItem(SERVER_URL_STORAGE_KEY);
            if (saved) $('mpServerUrl').value = saved;
        } catch (e) { /* localStorage negato (finestra privata): resta il predefinito */ }
    }

    function rememberServerUrl(url) {
        try { localStorage.setItem(SERVER_URL_STORAGE_KEY, url); } catch (e) { /* vedi sopra */ }
    }

    async function ensureConnected() {
        const typed = ($('mpServerUrl').value || '').trim();
        if (!typed) {
            showStatus('⚠️ Inserisci l\'indirizzo del server.', true);
            return false;
        }
        // Un indirizzo in chiaro da una pagina HTTPS verrebbe bloccato dal
        // browser: normalizeServerUrl lo promuove a wss://, e il campo
        // mostra la correzione invece di applicarla di nascosto.
        const url = net.normalizeServerUrl(typed);
        if (url !== typed) $('mpServerUrl').value = url;

        showStatus('🔌 Connessione al server...');
        try {
            await net.connect(url);
            rememberServerUrl(url);
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
        sonoHost = true;
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
        sonoHost = false;
        net.joinRoom(code);
    }

    // Il server pubblico è ospitato su un piano gratuito: dorme quando
    // nessuno gioca e ci mette circa un minuto a tornare su. Senza questo
    // messaggio l'attesa sembrerebbe un blocco.
    net.on('connect-waking', (info) => {
        showStatus(`😴 Il server si sta svegliando (tentativo ${info.attempt})... ci vuole fino a un minuto quando nessuno ha giocato per un po'. Resta in attesa.`);
    });

    // ============================================================
    // Sala d'attesa
    // ============================================================
    function entraInSala(code) {
        codiceStanza = code;
        mostraCodice(code);
        const nome = (window.SaveManager && SaveManager.getPlayerName && SaveManager.getPlayerName()) || 'Tu';
        $('mpSeatYouName').textContent = nome;
        $('mpSeatYouRole').textContent = sonoHost ? 'Padrone di casa' : 'Sfidante';
        aggiornaSetupPerRuolo();
        costruisciMazzi();
        costruisciArene();
        costruisciTracce();
        mostraSchermata('attesa');
    }

    function mostraCodice(code) {
        const tiles = $('mpCodeTiles');
        const testo = $('mpRoomCodeValue');
        if (testo) testo.textContent = code;
        if (!tiles) return;
        tiles.innerHTML = '';
        code.split('').forEach((ch, i) => {
            const tile = document.createElement('span');
            tile.className = 'mp-code-tile';
            tile.textContent = ch;
            tile.style.animationDelay = (i * 70) + 'ms';
            tiles.appendChild(tile);
        });
    }

    function aggiornaSetupPerRuolo() {
        const setup = $('mpSetup');
        const nota = $('mpSetupNote');
        if (!setup || !nota) return;
        setup.classList.toggle('mp-setup--ospite', !sonoHost);
        nota.textContent = sonoHost
            ? 'Le scegli tu: valgono per entrambi i duellanti'
            : 'Le sceglie chi ha creato la stanza';
    }

    function riempiPostoAvversario() {
        const posto = $('mpSeatOpponent');
        if (!posto) return;
        posto.classList.remove('mp-seat--empty');
        posto.classList.add('mp-seat--filled');
        $('mpSeatOppAvatar').textContent = '🧑';
        $('mpSeatOppName').textContent = 'Avversario';
        $('mpSeatOppRole').textContent = 'Pronto';
        $('mpOccupancy').textContent = '2';
        if (window.NativeHaptics) NativeHaptics.light();
    }

    // ============================================================
    // Scelta del proprio mazzo
    // ------------------------------------------------------------
    // Nessun canale nuovo e niente da trasmettere: il motore costruisce
    // il mazzo del giocatore da SaveManager.getActiveDeck() (vedi
    // initGame in js/engine/game-flow.js), e in Multiplayer ogni client
    // gestisce comunque solo il proprio lato. Scegliere qui significa
    // quindi impostare il mazzo corrente, lo stesso concetto — e lo
    // stesso campo salvato — della schermata Creazione Deck: la scelta
    // resta valida anche nei duelli successivi, come il giocatore si
    // aspetta dopo averla fatta una volta.
    // ============================================================
    function costruisciMazzi() {
        const box = $('mpDecks');
        if (!box || box.childElementCount > 0) return;
        const mazzi = (window.SaveManager && SaveManager.getDecks && SaveManager.getDecks()) || [];

        if (mazzi.length === 0) {
            box.innerHTML = '<div class="mp-decks-empty">Non hai ancora un mazzo tuo: si duella con un mazzo generato al momento.<br><a href="creazione-deck.html">Creane uno in Creazione Deck</a></div>';
            return;
        }

        const attivo = SaveManager.getActiveDeckId ? SaveManager.getActiveDeckId() : null;
        mazzi.forEach((mazzo) => {
            const el = document.createElement('div');
            el.className = 'mp-deck';
            el.setAttribute('role', 'button');
            el.setAttribute('tabindex', '0');
            el.dataset.deckId = mazzo.id;

            const conteggio = (mazzo.main || []).reduce((tot, v) => tot + (v.qty || 1), 0);
            // Sotto le 40 carte il mazzo non è legale: si può comunque
            // scegliere (il motore non lo rifiuta), ma va detto prima del
            // duello, non scoperto durante.
            const avviso = conteggio < 40 ? ' <span class="mp-deck-warn">⚠</span>' : '';
            el.innerHTML = (window.DeckBox ? DeckBox.markup({
                name: mazzo.name,
                color: mazzo.color || DeckBox.colorForId(mazzo.id)
            }) : '')
                + `<div class="mp-deck-meta">${conteggio} carte${avviso}</div>`;

            const seleziona = () => {
                if (!SaveManager.setActiveDeckId || !SaveManager.setActiveDeckId(mazzo.id)) return;
                segnaSelezione(box, '.mp-deck', mazzo.id, 'deckId');
                showStatus(`🃏 Duellerai con "${mazzo.name}".`);
                if (window.NativeHaptics) NativeHaptics.light();
            };
            el.onclick = seleziona;
            el.onkeydown = (ev) => {
                if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); seleziona(); }
            };
            box.appendChild(el);
        });
        segnaSelezione(box, '.mp-deck', attivo, 'deckId');
    }

    // ============================================================
    // Scelta di arena e musica
    // ============================================================
    function costruisciArene() {
        const box = $('mpFields');
        if (!box || box.childElementCount > 0) return;
        const casuale = document.createElement('button');
        casuale.type = 'button';
        casuale.className = 'mp-field mp-field--random';
        casuale.textContent = '🎲';
        casuale.title = 'Arena casuale';
        casuale.dataset.file = window.ArenaOptions.RANDOM;
        box.appendChild(casuale);

        window.ArenaOptions.FIELDS.forEach((campo) => {
            const el = document.createElement('button');
            el.type = 'button';
            el.className = 'mp-field';
            el.dataset.file = campo.file;
            el.style.backgroundImage = `url('${window.ArenaOptions.imageFor(campo.file)}')`;
            const nome = document.createElement('span');
            nome.className = 'mp-field-name';
            nome.textContent = campo.nome;
            el.appendChild(nome);
            box.appendChild(el);
        });

        box.querySelectorAll('.mp-field').forEach((el) => {
            el.onclick = () => {
                if (!sonoHost) return;
                scelta.field = el.dataset.file;
                segnaSelezione(box, '.mp-field', scelta.field);
                if (window.NativeHaptics) NativeHaptics.light();
            };
        });
        segnaSelezione(box, '.mp-field', scelta.field);
    }

    function costruisciTracce() {
        const box = $('mpTracks');
        if (!box || box.childElementCount > 0) return;

        const aggiungi = (file, nome, anteprimabile) => {
            // Riga come <div role="button"> e non <button>: dentro c'è un
            // secondo pulsante (l'anteprima), e un pulsante dentro un
            // pulsante è markup non valido — i browser lo "riparano"
            // spezzando l'annidamento, con risultati imprevedibili.
            const riga = document.createElement('div');
            riga.className = 'mp-track';
            riga.setAttribute('role', 'button');
            riga.setAttribute('tabindex', '0');
            riga.dataset.file = file;

            const etichetta = document.createElement('span');
            etichetta.className = 'mp-track-name';
            etichetta.textContent = nome;
            riga.appendChild(etichetta);

            if (anteprimabile) {
                const play = document.createElement('button');
                play.type = 'button';
                play.className = 'mp-preview';
                play.textContent = '▶';
                play.title = 'Ascolta un assaggio';
                play.onclick = (ev) => {
                    ev.stopPropagation(); // ascoltare non significa scegliere
                    alternaAnteprima(file, play);
                };
                riga.appendChild(play);
            }

            const seleziona = () => {
                if (!sonoHost) return;
                scelta.music = file;
                segnaSelezione(box, '.mp-track', scelta.music);
                if (window.NativeHaptics) NativeHaptics.light();
            };
            riga.onclick = seleziona;
            riga.onkeydown = (ev) => {
                if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); seleziona(); }
            };
            box.appendChild(riga);
        };

        aggiungi(window.ArenaOptions.RANDOM, '🎲 Casuale', false);
        window.ArenaOptions.TRACKS.forEach((t) => aggiungi(t.file, t.nome, true));
        segnaSelezione(box, '.mp-track', scelta.music);
    }

    /** `chiave` è il data-attribute che identifica l'opzione (default: il nome del file). */
    function segnaSelezione(box, selettore, valore, chiave) {
        const attributo = chiave || 'file';
        box.querySelectorAll(selettore).forEach((el) => {
            el.setAttribute('aria-pressed', String(el.dataset[attributo] === String(valore)));
        });
    }

    // --- Anteprima musicale ---------------------------------------
    // Un solo elemento audio condiviso: due anteprime insieme sarebbero
    // solo rumore. La musica della pagina viene messa in pausa e ripresa
    // dopo, altrimenti si sovrapporrebbe all'assaggio.
    let anteprima = null;
    let anteprimaBtn = null;
    let anteprimaStop = null;

    function musicaDiPagina() { return document.getElementById('bgMusicAudio'); }

    function fermaAnteprima() {
        if (anteprimaStop) { clearTimeout(anteprimaStop); anteprimaStop = null; }
        if (anteprima) { anteprima.pause(); anteprima = null; }
        if (anteprimaBtn) { anteprimaBtn.textContent = '▶'; anteprimaBtn.classList.remove('suona'); anteprimaBtn = null; }
        const bg = musicaDiPagina();
        if (bg && bg.paused) bg.play().catch(() => { /* l'autoplay può essere bloccato: non è un errore da mostrare */ });
    }

    function alternaAnteprima(file, btn) {
        const eraLoStesso = anteprimaBtn === btn;
        fermaAnteprima();
        if (eraLoStesso) return;

        const bg = musicaDiPagina();
        if (bg && !bg.paused) bg.pause();

        anteprima = new Audio(window.ArenaOptions.audioFor(file));
        anteprima.volume = 0.6;
        anteprimaBtn = btn;
        btn.textContent = '⏸';
        btn.classList.add('suona');
        anteprima.play().catch(() => {
            showStatus('🔇 Il browser ha bloccato l\'anteprima: tocca lo schermo e riprova.', true);
            fermaAnteprima();
        });
        anteprima.onended = fermaAnteprima;
        // Un assaggio, non l'ascolto integrale.
        anteprimaStop = setTimeout(fermaAnteprima, ANTEPRIMA_MAX_MS);
    }

    // ============================================================
    // Eventi di rete
    // ============================================================
    net.on('room-created', (msg) => {
        entraInSala(msg.code);
        showStatus('🕐 Condividi il codice e attendi il tuo avversario...');
    });

    net.on('room-ready', (msg) => {
        if (!codiceStanza) entraInSala(msg.code); // l'ospite arriva qui senza essere passato da 'room-created'
        riempiPostoAvversario();
        showStatus('⚔️ Avversario trovato!');

        if (sonoHost) {
            // Le scelte si risolvono ORA (un eventuale "casuale" diventa un
            // file preciso) e si trasmettono: da qui in poi i due lati
            // devono vedere la stessa arena e sentire la stessa musica.
            const config = {
                kind: 'room-config',
                field: window.ArenaOptions.risolviCampo(scelta.field),
                music: window.ArenaOptions.risolviTraccia(scelta.music)
            };
            net.sendAction(config);
            configRicevuta = config;
            avviaPartenza(msg.youStart);
            return;
        }

        iniziIoInAttesa = msg.youStart;
        if (configRicevuta) {
            avviaPartenza(msg.youStart);
        } else {
            showStatus('⚔️ Avversario trovato! Ricevo le impostazioni del duello...');
            timerAttesaConfig = setTimeout(() => avviaPartenza(iniziIoInAttesa), ATTESA_CONFIG_MS);
        }
    });

    // Le impostazioni viaggiano sullo stesso canale delle mosse. Ogni altra
    // azione riguarda il duello vero e la gestisce js/multiplayer/multiplayer.js,
    // caricato solo più avanti: qui si ignora tutto il resto.
    net.on('game-action', (msg) => {
        const azione = msg && msg.action;
        if (!azione || azione.kind !== 'room-config') return;
        configRicevuta = azione;
        mostraSceltaRicevuta(azione);
        if (iniziIoInAttesa !== null) {
            if (timerAttesaConfig) { clearTimeout(timerAttesaConfig); timerAttesaConfig = null; }
            avviaPartenza(iniziIoInAttesa);
        }
    });

    /** L'ospite vede evidenziate, in sola lettura, le scelte dell'host. */
    function mostraSceltaRicevuta(config) {
        const campi = $('mpFields');
        const tracce = $('mpTracks');
        if (campi) segnaSelezione(campi, '.mp-field', config.field);
        if (tracce) segnaSelezione(tracce, '.mp-track', config.music);
    }

    net.on('error', (msg) => {
        showStatus('❌ ' + (msg.message || 'Si è verificato un errore.'), true);
        $('mpCreateBtn').disabled = false;
        $('mpJoinBtn').disabled = false;
    });

    // Persa la connessione MENTRE si è ancora in lobby (non in partita: a
    // partita avviata questo stesso evento è gestito da js/multiplayer/multiplayer.js,
    // caricato solo a quel punto — vedi net.on('disconnected', ...) lì).
    // js/multiplayer/network.js prova da sé a riconnettersi (vedi 'reconnecting' qui
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
    // Partenza del duello
    // ============================================================
    function avviaPartenza(youStart) {
        if (duelloGiaAvviato) return;
        duelloGiaAvviato = true;
        fermaAnteprima();

        const config = configRicevuta || {
            field: window.ArenaOptions.risolviCampo(scelta.field),
            music: window.ArenaOptions.risolviTraccia(scelta.music)
        };
        contoAllaRovescia(config, () => startMultiplayerDuel(youStart, config));
    }

    function contoAllaRovescia(config, onDone) {
        const overlay = document.createElement('div');
        overlay.className = 'mp-countdown';
        overlay.innerHTML = '<div class="mp-countdown-inner">'
            + '<div class="mp-countdown-num"></div>'
            + '<div class="mp-countdown-label">Il duello sta per iniziare</div>'
            + '<div class="mp-countdown-arena"></div>'
            + '</div>';
        document.body.appendChild(overlay);
        const num = overlay.querySelector('.mp-countdown-num');
        overlay.querySelector('.mp-countdown-arena').textContent =
            `🏟️ ${window.ArenaOptions.nomeCampo(config.field)} · 🎵 ${window.ArenaOptions.nomeTraccia(config.music)}`;

        let n = CONTO_ALLA_ROVESCIA_DA;
        const passo = () => {
            if (n === 0) {
                overlay.remove();
                onDone();
                return;
            }
            num.textContent = String(n);
            // Riavvia l'animazione del numero: senza questo, dal secondo in
            // poi il testo cambierebbe senza alcun movimento.
            num.style.animation = 'none';
            void num.offsetWidth;
            num.style.animation = '';
            n--;
            setTimeout(passo, PASSO_CONTO_MS);
        };
        passo();
    }

    /**
     * Arena e musica scelte raggiungono il duello attraverso la query
     * string di QUESTA pagina: lo script in cima al <body> di
     * duelMonstersCore.html — che loadDuelArena() esegue qui sotto —
     * legge `?field=`/`?music=` da window.location. Impostarli qui invece
     * di inventare un canale nuovo significa usare lo stesso identico
     * meccanismo del Duello Libero, senza toccare l'arena.
     * Va fatto PRIMA di caricare l'arena, o quello script leggerebbe una
     * query string ancora vuota.
     */
    function applicaImpostazioniArena(config) {
        const params = new URLSearchParams(window.location.search);
        params.set('field', config.field);
        params.set('music', config.music);
        history.replaceState({}, '', window.location.pathname + '?' + params.toString());
        // Il fondale della lobby è su body::before ed è FISSO: resterebbe
        // davanti allo sfondo dell'arena, rendendo invisibile l'arena
        // appena scelta. Da qui in poi non serve più.
        document.body.classList.add('mp-in-duello');
    }

    async function startMultiplayerDuel(youStart, config) {
        window.MULTIPLAYER_MODE = true;
        window.MP_startingRole = youStart ? 'player' : 'bot';
        window.MP_broadcast = (action) => net.sendAction(action);

        applicaImpostazioniArena(config);

        const lobbyScreen = $('mpLobbyScreen');
        if (lobbyScreen) lobbyScreen.remove();

        await loadDuelArena();
    }

    /**
     * Scarica duelMonstersCore.html — l'UNICA fonte per com'è fatta l'arena di
     * duello (CSS, campo, mano, modali...) — ed esegue in QUESTA pagina,
     * in ordine, esattamente quello che duelMonstersCore.html eseguirebbe da
     * sé: prima il CSS dell'arena, poi il suo markup, poi i suoi script
     * (nello stesso ordine relativo in cui compaiono nel file, inline ed
     * esterni inclusi — l'ordine conta: es. duel-engine.js deve caricare
     * prima di card-effects.js). In fondo aggiunge anche js/multiplayer/multiplayer.js,
     * che duelMonstersCore.html non include più da sé (serve solo qui, per
     * applicare le mosse remote dell'avversario — vedi quel file).
     */
    async function loadDuelArena() {
        const res = await fetch('duelMonstersCore.html');
        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');

        const arenaStyle = doc.querySelector('head style');
        if (arenaStyle) {
            const styleEl = document.createElement('style');
            styleEl.textContent = arenaStyle.textContent;
            document.head.appendChild(styleEl);
        }

        // Markup dell'arena: un elenco esplicito (non "tutto il body tranne
        // la lobby") — così se in futuro duelMonstersCore.html aggiunge nuovi
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
        // js/audio/audio-manager.js) romperebbe la pagina.
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
        await loadScriptSequential('js/multiplayer/multiplayer.js');
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
    restoreSavedServerUrl();
    creaGranelli();
})();
