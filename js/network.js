/**
 * network.js — Client di rete per il Multiplayer di Duel Arena.
 * ---------------------------------------------------------------
 * Wrapper leggero sopra il WebSocket nativo del browser: gestisce la
 * connessione al server di stanze (server/server.js), la creazione o
 * l'ingresso in una stanza tramite codice, e l'invio/ricezione delle
 * azioni di gioco. Puramente additivo: non tocca gameState né la
 * logica di gioco, espone solo eventi tramite window.DuelNetwork.
 */
(function () {
    'use strict';

    function createNetworkClient() {
        let ws = null;
        const listeners = {};

        function on(event, callback) {
            (listeners[event] = listeners[event] || []).push(callback);
        }

        function emit(event, payload) {
            (listeners[event] || []).forEach((cb) => {
                try { cb(payload); } catch (err) { console.error('Errore handler rete:', err); }
            });
        }

        function connect(url) {
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
                    ws = socket;
                    resolve();
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
                    emit(msg.type, msg);
                });

                socket.addEventListener('close', () => {
                    emit('disconnected');
                });
            });
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
            send({ type: 'leave-room' });
        }

        function close() {
            if (ws) ws.close();
        }

        return { connect, on, createRoom, joinRoom, sendAction, leaveRoom, close };
    }

    window.DuelNetwork = createNetworkClient();
})();
