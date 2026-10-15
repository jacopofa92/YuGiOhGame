'use strict';

const audit = require('../../tools/audit-yami-supporti-finali.js');

module.exports = {
    standalone: true,
    name: 'Audit finale Yami Yugi: il candidato prudente conserva i nuclei anime',
    async run(t) {
        const v = audit.varianti();
        const conta = (deck, id, zona = 'main') => ((deck[zona] || []).find((c) => Number(c.id) === id) || {}).qty || 0;
        const totale = (deck) => deck.main.reduce((n, c) => n + c.qty, 0);
        t.assert(totale(v.pubblicato) === 40 && totale(v.prudente) === 40,
            'Baseline e candidato devono avere 40 carte');
        [2, 188, 20, 532, 533, 22, 31, 854].forEach((id) => {
            t.assert(conta(v.prudente, id) === conta(v.pubblicato, id), `Il nucleo anime ${id} deve restare invariato`);
        });
        t.assert(conta(v.prudente, 1254) === 2 && conta(v.prudente, 1255) === 1 && conta(v.prudente, 1256) === 1,
            'Il pacchetto prudente deve essere 2 Bastoni, 1 Cerchio e 1 Anima');
        t.assert(conta(v.prudente, 1260, 'extra') === 1,
            'I Maghi Neri deve entrare in una sola copia nell’Extra Deck candidato');
    }
};
