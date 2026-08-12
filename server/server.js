/**
 * server.js — Server di Stanze per Yu-Gi-Oh! Duel Arena (Multiplayer)
 * =====================================================================
 * Server WebSocket "puro", scritto solo con moduli nativi di Node.js
 * (http, crypto, net) — NESSUNA dipendenza esterna, quindi non serve
 * "npm install" prima di avviarlo.
 *
 * Cosa fa:
 *   1) Espone un endpoint WebSocket (stessa porta dell'HTTP, upgrade).
 *   2) Gestisce un sistema di STANZE identificate da un codice a 5
 *      caratteri: un giocatore crea una stanza, l'altro la raggiunge
 *      con il codice, e da quel momento il server fa da "postino":
 *      inoltra ogni messaggio di gioco da un giocatore all'altro,
 *      senza mai calcolare la logica della partita (che resta
 *      interamente lato client, in js/multiplayer.js).
 *
 * Avvio:
 *   node server.js
 *   (di default ascolta su 0.0.0.0:8787 — personalizzabile con la
 *   variabile d'ambiente PORT, es: PORT=3000 node server.js)
 *
 * Per giocare via Internet con un amico, questo processo deve essere
 * raggiungibile pubblicamente: o lo esegui su un servizio come
 * Render / Railway / Fly.io / Glitch (gratuiti), oppure lo esegui in
 * locale e usi un tunnel (es. ngrok/Cloudflare Tunnel) per esporlo.
 * Per giocare sulla stessa rete locale (stessa Wi-Fi), basta l'IP
 * locale della macchina che lo esegue.
 */

const http = require('http');
const crypto = require('crypto');

const PORT = process.env.PORT || 8787;
const WS_MAGIC = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const ROOM_CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // niente caratteri ambigui (0/O, 1/I/L)
const ROOM_TTL_MS = 30 * 60 * 1000; // le stanze inutilizzate scadono dopo 30 minuti

/** @type {Map<string, { players: Set<import('http').IncomingMessage['socket']>, createdAt: number }>} */
const rooms = new Map();

function generateRoomCode() {
    let code;
    do {
        code = Array.from({ length: 5 }, () => ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)]).join('');
    } while (rooms.has(code));
    return code;
}

// ============================================================
// Framing WebSocket minimale (solo testo, RFC 6455)
// ============================================================

function encodeFrame(payloadStr) {
    const payload = Buffer.from(payloadStr, 'utf8');
    const len = payload.length;
    let header;

    if (len < 126) {
        header = Buffer.alloc(2);
        header[0] = 0x81; // FIN + opcode testo
        header[1] = len;
    } else if (len < 65536) {
        header = Buffer.alloc(4);
        header[0] = 0x81;
        header[1] = 126;
        header.writeUInt16BE(len, 2);
    } else {
        header = Buffer.alloc(10);
        header[0] = 0x81;
        header[1] = 127;
        header.writeBigUInt64BE(BigInt(len), 2);
    }

    return Buffer.concat([header, payload]);
}

/**
 * Decodifica in modo incrementale i frame WebSocket presenti in un
 * buffer. Ritorna { messages: string[], rest: Buffer } — i messaggi
 * completi trovati e i byte residui (frame incompleto) da tenere
 * in coda per la prossima ricezione.
 */
function decodeFrames(buffer) {
    const messages = [];
    let offset = 0;

    while (true) {
        if (buffer.length - offset < 2) break;

        const byte1 = buffer[offset];
        const byte2 = buffer[offset + 1];
        const opcode = byte1 & 0x0f;
        const masked = (byte2 & 0x80) !== 0;
        let payloadLen = byte2 & 0x7f;
        let cursor = offset + 2;

        if (payloadLen === 126) {
            if (buffer.length - cursor < 2) break;
            payloadLen = buffer.readUInt16BE(cursor);
            cursor += 2;
        } else if (payloadLen === 127) {
            if (buffer.length - cursor < 8) break;
            payloadLen = Number(buffer.readBigUInt64BE(cursor));
            cursor += 8;
        }

        let maskKey = null;
        if (masked) {
            if (buffer.length - cursor < 4) break;
            maskKey = buffer.slice(cursor, cursor + 4);
            cursor += 4;
        }

        if (buffer.length - cursor < payloadLen) break; // frame incompleto, aspetta altri dati

        let payload = buffer.slice(cursor, cursor + payloadLen);
        if (masked) {
            const unmasked = Buffer.alloc(payloadLen);
            for (let i = 0; i < payloadLen; i++) {
                unmasked[i] = payload[i] ^ maskKey[i % 4];
            }
            payload = unmasked;
        }

        if (opcode === 0x8) {
            messages.push(null); // segnale di chiusura
        } else if (opcode === 0x1) {
            messages.push(payload.toString('utf8'));
        }
        // opcode 0x9 (ping) / 0xA (pong) ignorati: i browser gestiscono da soli il keepalive

        offset = cursor + payloadLen;
    }

    return { messages, rest: buffer.slice(offset) };
}

// ============================================================
// Gestione stanze
// ============================================================

function sendJSON(socket, obj) {
    if (!socket || socket.destroyed) return;
    try {
        socket.write(encodeFrame(JSON.stringify(obj)));
    } catch (err) {
        // socket già chiuso: ignora
    }
}

function otherPlayer(room, socket) {
    for (const s of room.players) {
        if (s !== socket) return s;
    }
    return null;
}

function leaveRoom(socket) {
    if (!socket.roomCode) return;
    const room = rooms.get(socket.roomCode);
    if (!room) return;

    room.players.delete(socket);
    const peer = [...room.players][0];
    if (peer) {
        sendJSON(peer, { type: 'opponent-left' });
    }
    if (room.players.size === 0) {
        rooms.delete(socket.roomCode);
    }
    socket.roomCode = null;
}

function handleClientMessage(socket, raw) {
    let msg;
    try {
        msg = JSON.parse(raw);
    } catch (err) {
        sendJSON(socket, { type: 'error', message: 'Messaggio non valido.' });
        return;
    }

    switch (msg.type) {
        case 'create-room': {
            const code = generateRoomCode();
            rooms.set(code, { players: new Set([socket]), createdAt: Date.now() });
            socket.roomCode = code;
            sendJSON(socket, { type: 'room-created', code });
            break;
        }

        case 'join-room': {
            const code = (msg.code || '').toUpperCase().trim();
            const room = rooms.get(code);
            if (!room) {
                sendJSON(socket, { type: 'error', message: 'Stanza non trovata. Controlla il codice.' });
                return;
            }
            if (room.players.size >= 2) {
                sendJSON(socket, { type: 'error', message: 'La stanza è già piena.' });
                return;
            }
            room.players.add(socket);
            socket.roomCode = code;

            const players = [...room.players];
            // Il creatore della stanza (primo entrato) inizia per primo.
            players.forEach((s, index) => {
                sendJSON(s, { type: 'room-ready', code, youStart: index === 0 });
            });
            break;
        }

        case 'game-action': {
            if (!socket.roomCode) return;
            const room = rooms.get(socket.roomCode);
            if (!room) return;
            const peer = otherPlayer(room, socket);
            if (peer) sendJSON(peer, { type: 'game-action', action: msg.action });
            break;
        }

        case 'leave-room': {
            leaveRoom(socket);
            break;
        }

        default:
            break;
    }
}

// ============================================================
// Server HTTP + upgrade a WebSocket
// ============================================================

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Yu-Gi-Oh! Duel Arena — Server di Stanze attivo.\nConnettiti via WebSocket per giocare.');
});

server.on('upgrade', (req, socket) => {
    const key = req.headers['sec-websocket-key'];
    if (!key) {
        socket.destroy();
        return;
    }

    const acceptKey = crypto.createHash('sha1').update(key + WS_MAGIC).digest('base64');
    const responseHeaders = [
        'HTTP/1.1 101 Switching Protocols',
        'Upgrade: websocket',
        'Connection: Upgrade',
        `Sec-WebSocket-Accept: ${acceptKey}`,
        '\r\n'
    ].join('\r\n');
    socket.write(responseHeaders);

    socket.roomCode = null;
    let buffer = Buffer.alloc(0);

    socket.on('data', (chunk) => {
        buffer = Buffer.concat([buffer, chunk]);
        const { messages, rest } = decodeFrames(buffer);
        buffer = rest;
        for (const message of messages) {
            if (message === null) {
                socket.destroy();
                return;
            }
            handleClientMessage(socket, message);
        }
    });

    socket.on('close', () => leaveRoom(socket));
    socket.on('error', () => leaveRoom(socket));
});

// Pulizia periodica delle stanze abbandonate/scadute
const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [code, room] of rooms.entries()) {
        if (now - room.createdAt > ROOM_TTL_MS) {
            room.players.forEach((s) => sendJSON(s, { type: 'error', message: 'La stanza è scaduta per inattività.' }));
            rooms.delete(code);
        }
    }
}, 60 * 1000);
cleanupInterval.unref(); // non deve impedire la chiusura del processo (es. durante i test)

if (require.main === module) {
    server.listen(PORT, () => {
        console.log(`🎴 Server Duel Arena in ascolto sulla porta ${PORT}`);
        console.log(`   WebSocket endpoint: ws://<indirizzo-server>:${PORT}`);
    });
}

module.exports = { encodeFrame, decodeFrames, generateRoomCode, WS_MAGIC };
