/**
 * network.js — Client di rete per il Multiplayer di Duel Arena.
 * ---------------------------------------------------------------
 * Wrapper leggero sopra il WebSocket nativo del browser: gestisce la
 * connessione al server di stanze (server/server.js), la creazione o
 * l'ingresso in una stanza tramite codice, e l'invio/ricezione delle
 * azioni di gioco. Puramente additivo: non tocca gameState né la
 * logica di gioco, espone solo eventi tramite window.DuelNetwork.
 *
 * RICONNESSIONE AUTOMATICA (Fase "Multiplayer Avanzato"): se la
 * connessione cade in modo INASPETTATO (non per una leaveRoom()/close()
 * volontaria) mentre siamo dentro una stanza, questo modulo riprova da
 * solo a ristabilirla — vedi tryAutoReconnect più sotto — e, se ci
 * riesce, manda 'rejoin-room' con lo stesso playerId assegnato dal
 * server (vedi server/server.js) per tornare nella STESSA stanza invece
 * di finire in una nuova. Copre il caso comune di una disconnessione
 * breve con la scheda del browser rimasta aperta (Wi-Fi che sfarfalla,
 * laptop in sospensione) — NON la chiusura vera della scheda, dopo la
 * quale questo stato in memoria è comunque perso (limite dichiarato,
 * vedi il commento in cima a server/server.js).
 *
 * Eventi aggiuntivi esposti oltre a quelli "grezzi" del server
 * (room-created, room-ready, game-action, error, opponent-left, ecc.):
 *   reconnecting(attempt)  — tentativo di riconnessione in corso
 *   reconnected()          — riconnessione riuscita, si è tornati nella stanza
 *   reconnect-failed()     — tutti i tentativi esauriti, riconnessione abbandonata
 */
(function () {
    'use strict';

    const RECONNECT_DELAYS_MS = [1000, 2000, 4000, 8000];

    function createNetworkClient() {
        let ws = null;
        let lastUrl = null;
        let roomCode = null;
        let playerId = null;
        let intentionalClose = false;
        let reconnectTimer = null;
        const listeners = {};

        function on(event, callback) {
            (listeners[event] = listeners[event] || []).push(callback);
        }

        function emit(event, payload) {
            (listeners[event] || []).forEach((cb) => {
                try { cb(payload); } catch (err) { console.error('Errore handler rete:', err); }
            });
        }

        /** Apre un WebSocket "nudo" verso `url` — usata sia per la prima connessione (connect) sia per ogni tentativo di riconnessione, senza duplicare la gestione degli eventi. */
        function openSocket(url) {
            return new Promise((resolve, reject) => {
                let settled = false;
                let socket;
                try {
                    socket = new WebSocket(url);
                } catch (err) {
                    reject(err);
                    return;
                }

                const timeoutId = setTimeout(() => {
                    if (!settled) {
                        settled = true;
                        try { socket.close(); } catch (e) { /* noop */ }
                        reject(new Error('Timeout di connessione al server.'));
                    }
                }, 6000);

                socket.addEventListener('open', () => {
                    if (settled) return;
                    settled = true;
                    clearTimeout(timeoutId);
                    resolve(socket);
                });

                socket.addEventListener('error', () => {
                    if (settled) return;
                    settled = true;
                    clearTimeout(timeoutId);
                    reject(new Error('Impossibile connettersi al server.'));
                });

                socket.addEventListener('message', (event) => {
                    let msg;
                    try {
                        msg = JSON.parse(event.data);
                    } catch (err) {
                        return;
                    }
                    if (msg.type === 'room-created' || msg.type === 'room-ready') {
                        if (msg.playerId) playerId = msg.playerId;
                        if (msg.code) roomCode = msg.code;
                    }
                    emit(msg.type, msg);
                });

                socket.addEventListener('close', () => {
                    emit('disconnected');
                    if (!intentionalClose && roomCode && playerId) {
                        tryAutoReconnect();
                    }
                });
            });
        }

        function connect(url) {
            intentionalClose = false;
            lastUrl = url;
            return openSocket(url).then((socket) => { ws = socket; });
        }

        /**
         * Riprova a ristabilire la connessione con un backoff crescente
         * (RECONNECT_DELAYS_MS) e, appena riconnesso, manda 'rejoin-room'
         * per tornare nella stessa stanza — vedi il commento in testa al
         * file. Si ferma da sola se `intentionalClose` diventa true nel
         * frattempo (leaveRoom()/close() chiamati mentre un tentativo è
         * già in corso).
         */
        function tryAutoReconnect(attempt) {
            attempt = attempt || 0;
            if (reconnectTimer) return; // un ciclo di riconnessione è già in corso
            if (attempt >= RECONNECT_DELAYS_MS.length) {
                emit('reconnect-failed');
                return;
            }
            emit('reconnecting', attempt + 1);
            reconnectTimer = setTimeout(() => {
                reconnectTimer = null;
                if (intentionalClose) return;
                openSocket(lastUrl).then((socket) => {
                    ws = socket;
                    const savedCode = roomCode;
                    const savedPlayerId = playerId;
                    const onRejoined = () => { off('rejoined', onRejoined); off('error', onRejoinError); emit('reconnected'); };
                    const onRejoinError = () => { off('rejoined', onRejoined); off('error', onRejoinError); emit('reconnect-failed'); };
                    on('rejoined', onRejoined);
                    on('error', onRejoinError);
                    send({ type: 'rejoin-room', code: savedCode, playerId: savedPlayerId });
                }).catch(() => {
                    tryAutoReconnect(attempt + 1);
                });
            }, RECONNECT_DELAYS_MS[attempt]);
        }

        /** Rimuove un singolo handler registrato con `on` — serve solo internamente, per non accumulare i listener temporanei di tryAutoReconnect ad ogni tentativo. */
        function off(event, callback) {
            if (!listeners[event]) return;
            listeners[event] = listeners[event].filter((cb) => cb !== callback);
        }

        function send(obj) {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify(obj));
            }
        }

        function createRoom() {
            send({ type: 'create-room' });
        }

        function joinRoom(code) {
            send({ type: 'join-room', code });
        }

        function sendAction(action) {
            send({ type: 'game-action', action });
        }

        function leaveRoom() {
            intentionalClose = true;
            if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
            send({ type: 'leave-room' });
            roomCode = null;
            playerId = null;
        }

        function close() {
            intentionalClose = true;
            if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
            if (ws) ws.close();
        }

        /**
         * SOLO PER TEST/DEBUG — non richiamata da nessun'altra parte del
         * gioco: chiude il socket vero SENZA marcarlo come intenzionale,
         * per simulare una caduta di connessione reale (a differenza di
         * close()/leaveRoom() qui sopra) e verificare che tryAutoReconnect
         * scatti davvero. Utile perché i simulatori di rete offline dei
         * browser/Playwright spesso non chiudono per davvero il socket,
         * si limitano a bloccare il traffico finché non torna online.
         */
        function _simulateUnexpectedDisconnect() {
            if (ws) ws.close();
        }

        return { connect, on, createRoom, joinRoom, sendAction, leaveRoom, close, _simulateUnexpectedDisconnect };
    }

    window.DuelNetwork = createNetworkClient();
})();
