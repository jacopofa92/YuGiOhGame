const audit = require('../../tools/audit-supporti-mago-nero.js');

module.exports = {
    standalone: true,
    name: 'Audit supporti Mago Nero: varianti confrontabili a 40 carte',
    async run(t) {
        const base = audit.yamiYugiHard();
        const variants = audit.varianti(base);
        const count = (deck) => deck.main.reduce((sum, entry) => sum + entry.qty, 0);
        t.assert(variants.length === 13, 'Servono baseline, 9 varianti singole e 3 pacchetti');
        t.assert(variants.every((variant) => count(variant.deck) === 40), 'Ogni variante deve restare a 40 carte');
        t.assert(variants.every((variant) => variant.deck.main.find((entry) => entry.id === 2)?.qty === 1),
            'La copia canonica di Mago Nero non deve essere sacrificata dai tagli');
        t.assert(variants.every((variant) => variant.deck.main.find((entry) => entry.id === 31)?.qty === 1),
            'Slifer non deve essere sacrificato dai tagli');
        t.assert(variants.find((variant) => variant.nome === 'pacchettox3').carte.length === 9,
            'Il caso massimo deve contenere tre copie di ciascuno dei tre supporti');
    }
};
