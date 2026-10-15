const { kaibaHard, varianti } = require('../../tools/audit-supporti-occhi-blu.js');

module.exports = {
    name: 'Audit supporti Occhi Blu: varianti confrontabili a 40 carte',
    async run(t) {
        const variants = varianti(kaibaHard());
        t.assert(variants.length === 23, `attese 23 varianti, trovate ${variants.length}`);
        variants.forEach((variant) => {
            const total = variant.deck.main.reduce((sum, entry) => sum + entry.qty, 0);
            t.assert(total === 40, `${variant.nome}: Main Deck da ${total} carte invece di 40`);
            variant.deck.main.forEach((entry) => {
                t.assert(entry.qty >= 1 && entry.qty <= 3, `${variant.nome}: quantita' non valida per id ${entry.id}`);
            });
            variant.deck.extra.forEach((entry) => {
                t.assert(entry.qty >= 1 && entry.qty <= 3, `${variant.nome}: quantita' Extra non valida per id ${entry.id}`);
            });
            [1, 510, 513, 515, 30, 353, 578].forEach((id) => {
                t.assert(variant.deck.main.some((entry) => entry.id === id), `${variant.nome}: nucleo Kaiba perso, id ${id}`);
            });
        });
    }
};
