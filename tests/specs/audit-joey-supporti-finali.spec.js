'use strict';

const audit = require('../../tools/audit-joey-supporti-finali.js');

module.exports = {
    standalone: true,
    name: 'Audit finale Joey: varianti Occhi Rossi conservano nucleo anime e azzardo',
    async run(t) {
        const v = audit.varianti();
        const conta = (deck, id, zona = 'main') => ((deck[zona] || []).find((c) => Number(c.id) === id) || {}).qty || 0;
        const totale = (deck) => deck.main.reduce((n, c) => n + c.qty, 0);
        Object.entries(v).forEach(([nome, deck]) => t.assert(totale(deck) === 40, `${nome}: Main Deck da 40 carte`));
        [12, 17, 879, 28, 273, 445, 425, 255, 232, 38].forEach((id) => {
            t.assert(conta(v.pietraSpirito, id) === conta(v.precedente, id), `Il nucleo Joey ${id} deve restare invariato`);
        });
        [58, 84, 473].forEach((id) => {
            t.assert(conta(v.pietraSpirito, id, 'extra') === conta(v.precedente, id, 'extra'), `La Fusione anime ${id} deve restare invariata`);
        });
        t.assert(conta(v.precedente, 256) === 1 && conta(v.precedente, 1253) === 0,
            'La baseline storica deve avere Garoozis e nessun Drago Metallo Nero');
        t.assert(conta(v.pubblicato, 256) === 0 && conta(v.pubblicato, 1253) === 1,
            'La lista pubblicata deve sostituire Garoozis con Drago Metallo Nero');
        t.assert(conta(v.pietraSpirito, 1250) === 1 && conta(v.pietraSpirito, 1252) === 1,
            'La variante di riciclo deve avere Pietra e Spirito');
    }
};
