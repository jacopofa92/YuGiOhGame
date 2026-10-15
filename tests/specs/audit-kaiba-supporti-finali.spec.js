'use strict';

const audit = require('../../tools/audit-kaiba-supporti-finali.js');

module.exports = {
    standalone: true,
    name: 'Audit finale Kaiba: varianti moderne conservano Draghi, Obelisk e X/Y/Z',
    async run(t) {
        const v = audit.varianti();
        const conta = (deck, id, zona = 'main') => ((deck[zona] || []).find((c) => Number(c.id) === id) || {}).qty || 0;
        const totale = (deck) => deck.main.reduce((n, c) => n + c.qty, 0);
        Object.entries(v).forEach(([nome, deck]) => t.assert(totale(deck) === 40, `${nome}: Main Deck da 40 carte`));
        [1, 30, 353, 578, 510, 513, 515].forEach((id) => {
            t.assert(conta(v.completoLuce, id) === conta(v.pubblicato, id), `Il nucleo Kaiba ${id} deve restare invariato`);
        });
        t.assert(conta(v.luceSingola, 1263) === 1, 'La variante minima deve avere una Luce Autentica');
        t.assert(conta(v.completoLuce, 1261) === 1 && conta(v.completoLuce, 1262) === 1
            && conta(v.completoLuce, 1263) === 2 && conta(v.completoLuce, 1264) === 1,
        'Il pacchetto completo deve conservare le quantità prudenti');
        t.assert(conta(v.completoLuce, 1265, 'extra') === 1, 'Il boss moderno deve essere una singola copia Extra');
    }
};
