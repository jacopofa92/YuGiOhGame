/**
 * multiplayer.js — Relay delle mosse remote DURANTE un Duello Multiplayer
 * già avviato.
 * ---------------------------------------------------------------
 * Questo file si occupa SOLO di ricevere le mosse dell'avversario via rete
 * e applicarle al lato "bot" locale (stessa convenzione già usata dal
 * motore di gioco per la modalità contro l'IA: ognuno vede sé stesso come
 * "player" e l'altro come "bot"), riusando dove possibile le stesse
 * funzioni di rendering/effetti già presenti nel gioco (incluso
 * botExecuteAttack di bot.js per la risoluzione delle battaglie).
 *
 * La LOBBY (creazione/adesione a una stanza, in attesa di un avversario)
 * vive altrove — vedi js/multiplayer/mp-lobby.js, caricato da multiplayer.html — che è
 * anche chi carica QUESTO file, e solo DOPO che la stanza si è riempita:
 * a quel punto window.MULTIPLAYER_MODE/MP_startingRole/MP_broadcast sono
 * già stati impostati, e window.DuelNetwork ha già una connessione aperta
 * (la stessa usata per la lobby: nessuna riconnessione, nessuna pagina
 * nuova — vedi js/multiplayer/mp-lobby.js per il perché).
 */
(function () {
    'use strict';

    const net = window.DuelNetwork;

    // Ogni azione broadcastata porta con sé anche il checksum del PROPRIO
    // stato subito dopo averla eseguita — vedi applyRemoteAction più sotto,
    // che lo confronta col proprio per accorgersi di un disallineamento
    // (js/multiplayer/mp-lobby.js assegna window.MP_broadcast PRIMA di caricare questo
    // file, vedi loadDuelArena lì: qui lo avvolgiamo, non lo sostituiamo).
    const rawBroadcast = window.MP_broadcast;
    window.MP_broadcast = function (action) {
        // Il checksum è solo un extra diagnostico (vedi applyRemoteAction
        // più sotto): un suo errore non deve MAI impedire l'invio
        // dell'azione vera e propria, che resta la priorità assoluta.
        try {
            if (window.DuelEngine && typeof DuelEngine.computeStateChecksum === 'function') {
                action.checksum = DuelEngine.computeStateChecksum();
            }
        } catch (err) {
            console.warn('Impossibile calcolare il checksum anti-desync:', err);
        }
        rawBroadcast(action);
    };

    // ============================================================
    // Applicazione delle azioni remote (mosse dell'avversario)
    // ============================================================
    function applyRemoteAction(action) {
        if (!action || !window.MULTIPLAYER_MODE) return;
        // 'request-resync'/'state-sync' non sono mosse di gioco (non
        // toccano gameState.player*, solo gameState.bot*): restano FUORI
        // dal blocco MP_applyingRemote qui sotto, che serve solo a evitare
        // che le mosse VERE ribroadcastino se stesse all'avversario.
        if (action.kind === 'request-resync') { sendStateResync(); return; }
        if (action.kind === 'state-sync') { applyStateResync(action.state); return; }
        window.MP_applyingRemote = true;
        try {
            switch (action.kind) {
                case 'phase': applyRemotePhase(action.name); break;
                case 'summon': applyRemoteSummon(action); break;
                case 'tribute': applyRemoteTribute(action); break;
                case 'position': applyRemotePosition(action); break;
                case 'spelltrap': applyRemoteSpellTrap(action); break;
                case 'attack': applyRemoteAttack(action); break;
                case 'activate': applyRemoteActivate(action); break;
                default: break;
            }
        } finally {
            window.MP_applyingRemote = false;
        }
        // Anti-desync: ogni mossa in arrivo porta anche il checksum dello
        // stato del MITTENTE subito dopo averla applicata (vedi il
        // wrapping di MP_broadcast più sotto) — se il MIO checksum, appena
        // ricalcolato, non combacia, i due lati si sono disallineati
        // (es. lo stesso rischio nella Chain già segnalato in
        // maxChainRounds()/duel-engine.js) e chiedo subito un resync
        // invece di proseguire silenziosamente storto.
        if (action.checksum && window.DuelEngine && typeof DuelEngine.computeStateChecksum === 'function') {
            if (DuelEngine.computeStateChecksum() !== action.checksum) {
                addToLog('⚠️ Stato del duello non allineato con l\'avversario: richiedo un aggiornamento...');
                requestStateResync();
            }
        }
    }

    // ============================================================
    // Resync di stato pubblico (Multiplayer Avanzato) — usato sia dopo una
    // riconnessione (vedi net.on('reconnected', ...) più sotto) sia su un
    // disallineamento rilevato dal checksum qui sopra. Vedi
    // DuelEngine.serializePublicState in js/engine/duel-engine.js per cosa viene
    // davvero trasmesso (mai il contenuto della mano, solo il conteggio).
    // ============================================================

    function requestStateResync() {
        if (window.MP_broadcast) window.MP_broadcast({ kind: 'request-resync' });
    }

    function sendStateResync() {
        if (!window.DuelEngine || typeof DuelEngine.serializePublicState !== 'function') return;
        window.MP_broadcast({ kind: 'state-sync', state: DuelEngine.serializePublicState('player') });
    }

    function applyStateResync(state) {
        if (!state) return;
        window.MP_applyingRemote = true;
        try {
            gameState.botMonsterField = state.monsterField;
            gameState.botSTField = state.stField;
            gameState.botFieldSpell = state.fieldSpell;
            gameState.botGraveyard = state.graveyard;
            // Mano: solo il conteggio è mai stato trasmesso — ricostruita
            // con segnaposto, mai col contenuto vero (stesso spirito di
            // applyRemoteSummon/applyRemoteSpellTrap qui sotto, che
            // consumano un segnaposto da gameState.botHand invece di
            // conoscerne il contenuto).
            gameState.botHand = Array.from({ length: state.handCount }, (_, i) => ({ id: -1, uid: `resync_${Date.now()}_${i}`, name: '???', type: 'monster' }));
            gameState.botLP = state.lp;
            gameState.turn = state.turn;
            gameState.phase = state.phase;
            gameState.currentPlayer = state.currentPlayer;
            addToLog('🔄 Stato del duello risincronizzato con l\'avversario.');
            updateUI();
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
                const cardEl = document.querySelector(`#botFieldBoard .field-slot[data-type="monster"][data-index="${slotIndex}"] .card`);
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
        gameState.botSTField[slotIndex] = { card, isFaceDown: true, setOnTurn: gameState.turn };
        addToLog('🧑 L\'avversario ha piazzato una carta coperta sul Terreno.');
        updateUI();
    }

    function applyRemoteAttack(action) {
        const { attackerIndex, targetIndex } = action;
        if (typeof botExecuteAttack === 'function') botExecuteAttack(attackerIndex, targetIndex);
    }

    /**
     * Replica sul lato "bot" locale l'attivazione di una carta fatta
     * dall'avversario reale. Come per le altre azioni remote, NON si
     * ritira nessun caso/scelta casuale qui: chi ha attivato la carta ha
     * già deciso/risolto tutto (es. quale mostro rianimare con Rinascita
     * del Mostro) e l'azione trasmessa porta già l'esito, in `action`
     * oltre a owner/cardId/zone/index — vedi DuelEngine.activateCard in
     * js/engine/duel-engine.js, che passa `extra` (l'esito) dentro il messaggio.
     */
    function applyRemoteActivate(action) {
        DuelEngine.activateCard('bot', action.zone, action.index, action);
    }

    /**
     * Un solo banner in cima allo schermo, riusato per tutti gli stati di
     * connessione del Multiplayer Avanzato (prima c'era solo lo stato
     * "avversario uscito", definitivo) — `permanent: true` aggiunge il
     * link al Menu (nessun ritorno automatico atteso), altrimenti il
     * banner è pensato per essere sostituito o rimosso a breve.
     */
    function showMpBanner(message, { permanent = false } = {}) {
        let banner = document.getElementById('mpConnectionBanner');
        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'mpConnectionBanner';
            banner.className = 'mp-opponent-left-banner';
            document.body.appendChild(banner);
        }
        banner.innerHTML = permanent
            ? `<span>${message}</span><a href="index.html">Torna al Menu</a>`
            : `<span>${message}</span>`;
    }

    function hideMpBanner() {
        const banner = document.getElementById('mpConnectionBanner');
        if (banner) banner.remove();
    }

    // --- Stato dell'AVVERSARIO (la sua connessione, non la nostra) ---
    net.on('opponent-left', () => {
        if (!window.MULTIPLAYER_MODE) return;
        if (typeof addToLog === 'function') addToLog('⚠️ Il tuo avversario si è disconnesso dalla partita.');
        showMpBanner('⚠️ Il tuo avversario si è disconnesso dalla partita.', { permanent: true });
    });

    net.on('opponent-disconnected', () => {
        if (!window.MULTIPLAYER_MODE) return;
        if (typeof addToLog === 'function') addToLog('🔌 Il tuo avversario ha perso la connessione, in attesa che torni...');
        showMpBanner('🔌 Il tuo avversario ha perso la connessione, in attesa che torni...');
    });

    net.on('opponent-reconnected', () => {
        if (!window.MULTIPLAYER_MODE) return;
        if (typeof addToLog === 'function') addToLog('✅ Il tuo avversario è tornato in partita!');
        showMpBanner('✅ Il tuo avversario è tornato in partita!');
        setTimeout(hideMpBanner, 3000);
    });

    // --- Stato della NOSTRA connessione (vedi js/multiplayer/network.js) ---
    net.on('reconnecting', (attempt) => {
        if (!window.MULTIPLAYER_MODE) return;
        if (typeof addToLog === 'function') addToLog(`🔌 Connessione persa, tentativo di riconnessione (${attempt})...`);
        showMpBanner(`🔌 Connessione persa, tentativo di riconnessione (${attempt})...`);
    });

    net.on('reconnected', () => {
        if (!window.MULTIPLAYER_MODE) return;
        if (typeof addToLog === 'function') addToLog('✅ Riconnesso! Aggiorno lo stato del duello...');
        showMpBanner('✅ Riconnesso! Aggiorno lo stato del duello...');
        setTimeout(hideMpBanner, 3000);
        // Potremmo aver perso azioni dell'avversario mentre eravamo
        // disconnessi: chiediamogli subito il suo stato pubblico attuale
        // (vedi DuelEngine.serializePublicState in js/engine/duel-engine.js).
        requestStateResync();
    });

    net.on('reconnect-failed', () => {
        if (!window.MULTIPLAYER_MODE) return;
        if (typeof addToLog === 'function') addToLog('❌ Impossibile riconnettersi al server.');
        showMpBanner('❌ Impossibile riconnettersi al server.', { permanent: true });
    });

    net.on('disconnected', () => {
        if (window.MULTIPLAYER_MODE && typeof addToLog === 'function') {
            addToLog('⚠️ Connessione al server persa.');
        }
    });

    net.on('game-action', (msg) => applyRemoteAction(msg.action));
})();
