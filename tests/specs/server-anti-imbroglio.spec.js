// Il relay Multiplayer rifiuta le azioni che un client onesto non manderebbe
// mai: tipo sconosciuto, indici assurdi, mosse da turno fuori dal proprio
// turno, un turno "rubato". Funzione pura di server/server.js, nessun
// browser e nessuna rete. Le regole del duello restano ai client.
//
// Il caso "uno che risponde con una Trappola sul turno altrui" è nella
// lista dei permessi apposta: bloccarlo romperebbe il gioco vero.
const { validateGameAction } = require('../../server/server.js');

module.exports = {
    standalone: true,
    name: 'Server Multiplayer: rifiuta azioni fuori turno, sconosciute o con indici assurdi',
    async run(t) {
        const A = 'giocatoreA';
        const B = 'giocatoreB';
        const room = () => ({ turn: null });
        const ok = (r, id, a, msg) => t.assert(validateGameAction(r, id, a) === null, msg);
        const no = (r, id, a, msg) => t.assert(typeof validateGameAction(r, id, a) === 'string', msg);

        // Forma
        no(room(), A, { kind: 'regala-carte' }, 'Un tipo di azione sconosciuto va rifiutato');
        no(room(), A, { kind: 'summon', slotIndex: 99 }, 'Un indice di zona fuori scala va rifiutato');
        no(room(), A, { kind: 'summon', slotIndex: 1.5 }, 'Un indice non intero va rifiutato');
        no(room(), A, { kind: 'tribute', indices: 'tutti' }, 'Gli indici devono essere un array');
        no(room(), A, { kind: 'phase', name: 'turno-extra' }, 'Una fase sconosciuta va rifiutata');

        // Il turno lo apre chi manda per primo una fase, e le mosse sono sue.
        const r = room();
        ok(r, A, { kind: 'phase', name: 'draw' }, 'La prima fase definisce chi è di turno');
        ok(r, A, { kind: 'summon', slotIndex: 0 }, 'Chi è di turno può Evocare');
        no(r, B, { kind: 'summon', slotIndex: 1 }, 'Chi non è di turno non può Evocare');
        no(r, B, { kind: 'attack', attackerIndex: 0, targetIndex: null }, 'Chi non è di turno non può attaccare');
        no(r, B, { kind: 'spelltrap', slotIndex: 0 }, 'Chi non è di turno non può calare una carta');
        no(r, B, { kind: 'phase', name: 'draw' }, 'Non si ruba il turno finché l\'altro non ha chiuso');
        no(r, B, { kind: 'phase', name: 'main1' }, 'Non si avanza di fase nel turno altrui');

        // Ciò che NON è legato al turno passa sempre.
        ok(r, B, { kind: 'chain-response' }, 'Rispondere in Catena è lecito fuori turno');
        ok(r, B, { kind: 'activate' }, 'Attivare una Trappola sul turno altrui è lecito');
        ok(r, B, { kind: 'card-choice', uid: null }, 'La scelta di un bersaglio non è legata al turno');
        ok(r, B, { kind: 'state-push' }, 'La fotografia di stato non è legata al turno');
        ok(r, B, { kind: 'request-resync' }, 'Il resync non è legato al turno');

        // Passaggio di turno regolare.
        ok(r, A, { kind: 'phase', name: 'end' }, 'Chi è di turno può chiudere');
        no(r, A, { kind: 'phase', name: 'main1' }, 'Dopo l\'end non si ricomincia lo stesso turno');
        ok(r, B, { kind: 'phase', name: 'draw' }, 'Chiuso il turno di A, B può aprire il suo');
        ok(r, B, { kind: 'summon', slotIndex: 0 }, 'Ora B è di turno');
        no(r, A, { kind: 'attack', attackerIndex: 0 }, 'E A non lo è più');

        // Una rivincita nella stessa stanza riparte da zero.
        ok(r, B, { kind: 'game-over' }, 'La fine del duello azzera il turno');
        const nuovo = validateGameAction(r, A, { kind: 'phase', name: 'draw' });
        t.assert(nuovo === null, 'Dopo la fine del duello chi comincia il successivo può essere chiunque');
    }
};
