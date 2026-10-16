'use strict';

const audit = require('../../tools/audit-marik-ra-finale.js');

module.exports = {
    standalone: true,
    name: 'Audit finale Marik: varianti di Ra isolate e deck da 40 carte',
    async run(t) {
        const v = audit.varianti();
        const conta = (deck, id) => (deck.main.find((c) => Number(c.id) === id) || {}).qty || 0;
        const totale = (deck) => deck.main.reduce((n, c) => n + c.qty, 0);
        Object.entries(v).forEach(([nome, deck]) => {
            t.assert(totale(deck) === 40, `${nome}: Main Deck da 40 carte`);
            t.assert(conta(deck, 472) === 1, `${nome}: Ra deve restare in una copia`);
        });
        [1123, 559, 750, 216, 130, 450].forEach((id) => {
            t.assert(conta(v.cicloCompleto, id) === conta(v.precedente, id), `Il nucleo Marik ${id} deve restare invariato`);
        });
        t.assert(conta(v.precedente, 646) === 1 && conta(v.precedente, 1273) === 0,
            'La baseline storica deve avere Tempesta Pesante e nessun Canto Antico');
        t.assert(conta(v.pubblicato, 646) === 0 && conta(v.pubblicato, 1273) === 1,
            'La lista pubblicata deve sostituire Tempesta Pesante con Canto Antico');
        t.assert([1273, 1274, 1275, 1276].every((id) => conta(v.cicloCompleto, id) === 1),
            'Il ciclo completo deve contenere una copia di ogni supporto di Ra');
    }
};
