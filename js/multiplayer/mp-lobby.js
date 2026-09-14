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

    let sonoHost = false;
    let codiceStanza = null;
    let configRicevuta = null;
    let iniziIoInAttesa = null;
    let timerAttesaConfig = null;
    let duelloGiaAvviato = false;

    // Scelte correnti: RANDOM finché non si tocca nulla.
    const scelta = { field: window.ArenaOptions.RANDOM, music: window.ArenaOptions.RANDOM, origin: 'yu-gi-oh' };

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
        costruisciSelettori();
        mostraSchermata('attesa');
        // Solo ORA le scatole hanno una larghezza vera: finché la sala era
        // nascosta ogni misura valeva zero, e nessun nome sarebbe mai
        // risultato troppo lungo da far scorrere.
        if (setupMazzi) setupMazzi.refresh();
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
        const nota = $('mpSetupNote');
        if (nota) {
            nota.textContent = sonoHost
                ? 'Le scegli tu: valgono per entrambi i duellanti'
                : 'Le sceglie chi ha creato la stanza';
        }
        // Al primo giro i selettori non esistono ancora: il montaggio
        // riceve comunque readOnly (vedi costruisciSelettori).
        if (setupArena) setupArena.setReadOnly(!sonoHost);
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
    // Selettori di mazzo, arena e musica
    // ------------------------------------------------------------
    // Il markup e il comportamento vengono da js/ui/duel-setup.js, lo
    // stesso componente usato prima di un Duello Libero. Qui restano
    // solo le due cose VERE di questa schermata: il mazzo sta in un
    // riquadro a parte da arena e musica, perché hanno un padrone
    // diverso (il mazzo è personale, arena e musica le decide chi ha
    // creato la stanza), e per l'ospite le seconde sono in sola lettura.
    //
    // Il mazzo non si trasmette e non ha bisogno di alcun canale: il
    // motore costruisce il mazzo del giocatore da
    // SaveManager.getActiveDeck() (vedi initGame in
    // js/engine/game-flow.js) e in Multiplayer ogni client gestisce solo
    // il proprio lato.
    // ============================================================
    let setupArena = null;
    let setupMazzi = null;

    function costruisciSelettori() {
        if (setupArena) return;
        setupMazzi = window.DuelSetup.mount($('mpDecks'), {
            decks: true,
            arena: false,
            deckLabel: false, // l'intestazione ce l'ha già il riquadro qui sopra

            onDeckChange: (mazzo) => showStatus(`🃏 Duellerai con "${mazzo.name}".`)
        });
        setupArena = window.DuelSetup.mount($('mpSetupMount'), {
            readOnly: !sonoHost,
            initial: scelta,
            onChange: (sel) => {
                scelta.field = sel.field;
                scelta.music = sel.music;
                scelta.origin = sel.origin;
                avvisaSeMazzoNonAmmesso(sel.origin);
            },
            onPreviewBlocked: () => showStatus('🔇 Il browser ha bloccato l\'anteprima: tocca lo schermo e riprova.', true)
        });
    }

    /**
     * Il mazzo in uso rispetta la regola sulle carte ammesse? Qui NON si
     * blocca nulla: la stanza è già formata, e impedire la partenza da un
     * solo lato lascerebbe l'altro ad aspettare un duello che non comincia
     * mai. Si avvisa, e finché si è in sala il mazzo si può ancora
     * cambiare — il selettore è lì sopra. All'host l'avviso arriva quando
     * SCEGLIE la regola, cioè quando ha tutto il tempo di rimediare;
     * all'ospite quando la regola gli arriva.
     */
    function avvisaSeMazzoNonAmmesso(provenienza) {
        if (!window.DeckLegality) return;
        const fuori = DeckLegality.mazzoCorrenteNonAmmesso(provenienza);
        if (fuori.length === 0) return;
        const elenco = fuori.slice(0, 3).join(', ');
        const altre = fuori.length - Math.min(3, fuori.length);
        showStatus(`⚠️ Il tuo mazzo contiene ${fuori.length} cart${fuori.length === 1 ? 'a' : 'e'} non ammess${fuori.length === 1 ? 'a' : 'e'} da questa regola (${elenco}${altre > 0 ? ` e altre ${altre}` : ''}): cambia mazzo qui sopra.`, true);
    }

    function fermaAnteprima() {
        if (window.DuelSetup) window.DuelSetup.stopPreview();
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
                music: window.ArenaOptions.risolviTraccia(scelta.music),
                // Quali carte sono ammesse è una REGOLA, non un gusto:
                // deve valere identica per i due mazzi, quindi viaggia con
                // il resto invece di essere decisa da ciascuno per sé.
                origin: scelta.origin
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
        avvisaSeMazzoNonAmmesso(azione.origin);
        if (iniziIoInAttesa !== null) {
            if (timerAttesaConfig) { clearTimeout(timerAttesaConfig); timerAttesaConfig = null; }
            avviaPartenza(iniziIoInAttesa);
        }
    });

    /** L'ospite vede evidenziate, in sola lettura, le scelte dell'host. */
    function mostraSceltaRicevuta(config) {
        if (setupArena) setupArena.showSelection(config);
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
            music: window.ArenaOptions.risolviTraccia(scelta.music),
            origin: scelta.origin
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
        // Anche la regola sulle carte ammesse, non solo l'ambientazione:
        // è l'ultimo istante in cui l'ospite può accorgersi con che cosa
        // si duella. Due righe di TESTO, mai innerHTML: il nome di una
        // provenienza inventata dal giocatore (crea-carta.html) è testo
        // libero suo, e arriva per giunta dalla rete.
        const riepilogo = overlay.querySelector('.mp-countdown-arena');
        const rigaArena = document.createElement('div');
        rigaArena.textContent = `🏟️ ${window.ArenaOptions.nomeCampo(config.field)} · 🎵 ${window.ArenaOptions.nomeTraccia(config.music)}`;
        const rigaCarte = document.createElement('div');
        rigaCarte.textContent = `🗂️ ${window.DuelSetup.originLabel(config.origin)}`;
        riepilogo.append(rigaArena, rigaCarte);

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
        // Stesso parametro del Duello Libero: js/duel-session.js lo legge
        // come `allowedOrigin` e BLOCCA davvero un mazzo che non lo
        // rispetta. Ogni client controlla il proprio mazzo contro la
        // regola condivisa — limite dichiarato: se il mazzo dell'ospite
        // non è ammesso se ne accorge solo qui, a stanza già formata.
        if (config.origin) params.set('origin', config.origin);
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
                const src = original.getAttribute('src');
                // Uno script che questa pagina ha GIÀ caricato non va
                // eseguito una seconda volta: i file di questo progetto
                // dichiarano `const` al primo livello, e una seconda
                // esecuzione è un SyntaxError che azzera l'intero file
                // ("Identifier ... has already been declared"). La lobby
                // carica per conto suo alcuni di questi script (cards-db.js
                // per l'elenco delle provenienze, deck-box.js per le
                // scatole), quindi il caso non è teorico.
                if (document.querySelector(`script[src="${src}"]`)) continue;
                await loadScriptSequential(src);
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
