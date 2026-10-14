const audit = require('../../tools/audit-supporti-occhi-rossi.js');

module.exports = {
    standalone: true,
    name: 'Audit supporti Occhi Rossi: varianti confrontabili a 40 carte',
    async run(t) {
        const base = audit.joeyHard();
        const variants = audit.varianti(base);
        const count = (deck) => deck.main.reduce((sum, entry) => sum + entry.qty, 0);
        t.assert(variants.length === 16, 'Servono baseline, 12 varianti singole e 3 pacchetti');
        t.assert(variants.every((variant) => count(variant.deck) === 40), 'Ogni variante deve restare a 40 carte');
        t.assert(variants.every((variant) => variant.deck.main.find((entry) => entry.id === 12)?.qty === 3),
            'Le tre copie del Drago Nero Occhi Rossi non devono essere sacrificate dai tagli');
        t.assert(variants.find((variant) => variant.nome === 'pacchettox3').carte.length === 12,
            'Il caso massimo deve contenere tre copie di ciascuno dei quattro supporti');
    }
};
