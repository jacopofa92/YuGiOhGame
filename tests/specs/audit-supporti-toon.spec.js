const { pegasusHard, varianti } = require('../../tools/audit-supporti-toon.js');

module.exports = {
    name: 'Audit supporti Toon: varianti confrontabili e identita Pegasus preservata',
    async run(t) {
        const variants = varianti(pegasusHard());
        t.assert(variants.length === 13, `attese 13 varianti, trovate ${variants.length}`);
        variants.forEach((variant) => {
            const total = variant.deck.main.reduce((sum, entry) => sum + entry.qty, 0);
            t.assert(total === 40, `${variant.nome}: Main Deck da ${total} carte invece di 40`);
            variant.deck.main.forEach((entry) => {
                t.assert(entry.qty >= 1 && entry.qty <= 3, `${variant.nome}: quantita' non valida per id ${entry.id}`);
            });
            [123, 481, 483, 484, 486, 487, 482, 485, 416, 475, 38, 116, 466].forEach((id) => {
                t.assert(variant.deck.main.some((entry) => entry.id === id), `${variant.nome}: nucleo Pegasus perso, id ${id}`);
            });
            t.assert(variant.deck.extra.some((entry) => entry.id === 476), `${variant.nome}: Restrizione dai Mille Occhi assente`);
        });
    }
};
