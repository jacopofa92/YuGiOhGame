'use strict';

const audit = require('../../tools/audit-pegasus-supporti-finali.js');

module.exports = {
    standalone: true,
    name: 'Audit finale Pegasus: supporti Toon conservano Abbandonato e Mille Occhi',
    async run(t) {
        const v = audit.varianti();
        const conta = (deck, id, zona = 'main') => ((deck[zona] || []).find((c) => Number(c.id) === id) || {}).qty || 0;
        const totale = (deck) => deck.main.reduce((n, c) => n + c.qty, 0);
        Object.entries(v).forEach(([nome, deck]) => t.assert(totale(deck) === 40, `${nome}: Main Deck da 40 carte`));
        [416, 475, 38, 116, 487, 482, 485].forEach((id) => {
            t.assert(conta(v.toonLeggero, id) === conta(v.pubblicato, id), `Il nucleo Pegasus ${id} deve restare invariato`);
        });
        t.assert(conta(v.toonLeggero, 476, 'extra') === conta(v.pubblicato, 476, 'extra'),
            'Restrizione dai Mille Occhi deve restare nell’Extra Deck');
        t.assert(conta(v.regnoSingolo, 1266) === 1, 'La variante minima deve avere un Regno Toon');
        t.assert(conta(v.toonLeggero, 1266) === 1 && conta(v.toonLeggero, 1267) === 1 && conta(v.toonLeggero, 1268) === 1,
            'Il pacchetto leggero deve avere un esemplare per supporto');
    }
};
