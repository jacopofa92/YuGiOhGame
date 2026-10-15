'use strict';

const { giocaPartita } = require('../../tools/duello-senza-testa.js');
const audit = require('../../tools/audit-strings-hard.js');

module.exports = {
    standalone: true,
    name: 'Audit Strings Hard: varianti isolate e telemetria Slifer',
    async run(t) {
        const varianti = audit.varianti();
        for (const [nome, deck] of Object.entries(varianti)) {
            t.assert(deck.main.reduce((n, c) => n + c.qty, 0) === 40, `${nome}: il Main Deck resta di 40 carte`);
            t.assert(deck.main.find((c) => c.id === 31).qty === 1, `${nome}: Slifer resta limitato a una copia`);
        }
        const partita = await giocaPartita({
            avversario: 'strings', giocatore: 'yamiYugi', livello: 'hard', livelloGiocatore: 'hard',
            turni: 40, seme: 173000, osservaBotIds: [31]
        }, 0);
        t.assert(Array.isArray(partita.evocatiBotIds), 'il simulatore espone separatamente le carte evocate dal bot');
        t.assert(partita.primaEvocazioneBot && typeof partita.primaEvocazioneBot === 'object', 'il simulatore espone la prima evocazione osservata');
    }
};
