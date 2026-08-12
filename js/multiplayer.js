/**
 * multiplayer.js — Orchestratore del Duello Multiplayer.
 * ---------------------------------------------------------------
 * Attivo SOLO quando la pagina viene aperta con ?mode=multiplayer
 * (altrimenti questo intero file è un no-op silenzioso, e la modalità
 * "Duello Demo" contro il Bot continua a funzionare esattamente come
 * prima, invariata).
 *
 * Principio di funzionamento: ogni client vede SEMPRE se stesso come
 * "player" e l'avversario come "bot" — è la stessa convenzione già
 * usata dal motore di gioco per la modalità contro l'IA. Le azioni
 * che io compio passano dalle normali funzioni di actions.js (che le
 * applicano già al lato "player") e vengono anche inoltrate in rete;
 * i messaggi in arrivo dall'avversario vengono applicati al lato
 * "bot" locale, riusando dove possibile le stesse funzioni di
 * rendering/effetti già presenti nel gioco (incluso botExecuteAttack
 * di bot.js per la risoluzione delle battaglie).
 */
(function () {
    'use strict';

    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') !== 'multiplayer') return;

    window.MULTIPLAYER_DEFER_INIT = true;

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

    net.on('opponent-left', () => {
        if (!window.MULTIPLAYER_MODE) return;
        if (typeof addToLog === 'function') addToLog('⚠️ Il tuo avversario si è disconnesso dalla partita.');
        showOpponentLeftBanner();
    });

    net.on('disconnected', () => {
        if (window.MULTIPLAYER_MODE && typeof addToLog === 'function') {
            addToLog('⚠️ Connessione al server persa.');
        }
    });

    net.on('game-action', (msg) => applyRemoteAction(msg.action));

    // ============================================================
    // Avvio del duello dopo l'accoppiamento in stanza
    // ============================================================
    function startMultiplayerDuel(youStart) {
        window.MULTIPLAYER_MODE = true;
        window.MP_startingRole = youStart ? 'player' : 'bot';
        window.MP_broadcast = (action) => net.sendAction(action);

        const lobby = $('mpLobbyOverlay');
        if (lobby) lobby.classList.remove('open');

        const botHeader = document.querySelector('#botInfo h3');
        if (botHeader) botHeader.textContent = '🧑 Avversario';

        initGame();
        setupPhaseStepper();
    }

    function showOpponentLeftBanner() {
        if (document.getElementById('mpOpponentLeftBanner')) return;
        const banner = document.createElement('div');
        banner.id = 'mpOpponentLeftBanner';
        banner.className = 'mp-opponent-left-banner';
        banner.innerHTML = `
            <span>⚠️ Il tuo avversario si è disconnesso dalla partita.</span>
            <a href="index.html">Torna al Menu</a>
        `;
        document.body.appendChild(banner);
    }

    // ============================================================
    // Applicazione delle azioni remote (mosse dell'avversario)
    // ============================================================
    function applyRemoteAction(action) {
        if (!action || !window.MULTIPLAYER_MODE) return;
        window.MP_applyingRemote = true;
        try {
            switch (action.kind) {
                case 'phase': applyRemotePhase(action.name); break;
                case 'summon': applyRemoteSummon(action); break;
                case 'tribute': applyRemoteTribute(action); break;
                case 'position': applyRemotePosition(action); break;
                case 'spelltrap': applyRemoteSpellTrap(action); break;
                case 'attack': applyRemoteAttack(action); break;
                default: break;
            }
        } finally {
            window.MP_applyingRemote = false;
        }
    }

    function applyRemotePhase(name) {
        switch (name) {
            case 'draw': enterDrawPhase(false); break;
            case 'standby': enterStandbyPhase(false); break;
            case 'main1': enterMainPhase1(); break;
            case 'battle': enterBattlePhase(); break;
            case 'main2': enterMainPhase2(); break;
            case 'end': enterEndPhase(); break;
            default: break;
        }
    }

    function applyRemoteSummon(action) {
        const { card, slotIndex, position } = action;
        if (gameState.botHand.length > 0) gameState.botHand.pop(); // consuma una carta segnaposto
        gameState.botMonsterField[slotIndex] = { card, position, isFaceDown: position === 'defense', hasAttacked: false, canChangePosition: false };
        gameState.hasNormalSummoned = true;
        addToLog(position === 'attack' ? `🧑 L'avversario ha Evocato ${card.name}!` : '🧑 L\'avversario ha Posizionato un mostro.');
        updateUI();
        setTimeout(() => {
            triggerFieldImpact('bot', slotIndex, 'monster');
            showPositionEffect('bot', slotIndex, position);
            if (window.FX) {
                const cardEl = document.querySelector(`#botFieldBoard .field-slot[data-index="${slotIndex}"] .card`);
                FX.playSummonCircle(cardEl);
            }
        }, 30);
    }

    function applyRemoteTribute(action) {
        const { indices } = action;
        addToLog('🔻 L\'avversario sacrifica dei mostri per un\'Evocazione Tributo...');
        indices.forEach((idx) => {
            const cardEl = document.querySelector(`#botFieldBoard .field-slot[data-owner="bot"][data-type="monster"][data-index="${idx}"] .card`);
            if (cardEl && window.FX) FX.playTributeSacrifice(cardEl);
        });
        setTimeout(() => {
            indices.forEach((idx) => {
                const slot = gameState.botMonsterField[idx];
                if (slot) {
                    gameState.botGraveyard.push(slot.card);
                    gameState.botMonsterField[idx] = null;
                }
            });
            updateUI();
        }, 700);
    }

    function applyRemotePosition(action) {
        const { slotIndex, position } = action;
        const slot = gameState.botMonsterField[slotIndex];
        if (!slot) return;
        slot.position = position;
        if (position === 'attack') slot.isFaceDown = false;
        slot.canChangePosition = false;
        addToLog(`🧑 L'avversario ha cambiato ${slot.card.name} in Posizione di ${position}.`);
        updateUI();
        setTimeout(() => showPositionEffect('bot', slotIndex, position), 60);
    }

    function applyRemoteSpellTrap(action) {
        const { card, slotIndex } = action;
        if (gameState.botHand.length > 0) gameState.botHand.pop();
        gameState.botSTField[slotIndex] = { card, isFaceDown: true };
        addToLog('🧑 L\'avversario ha piazzato una carta coperta sul Terreno.');
        updateUI();
    }

    function applyRemoteAttack(action) {
        const { attackerIndex, targetIndex } = action;
        if (typeof botExecuteAttack === 'function') botExecuteAttack(attackerIndex, targetIndex);
    }

    // ============================================================
    // Bootstrap
    // ============================================================
    initLobbyUI();
    const lobby = $('mpLobbyOverlay');
    if (lobby) lobby.classList.add('open');
})();
