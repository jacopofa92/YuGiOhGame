// Il database carte si carica, non è vuoto, e non genera errori JS solo
// caricando la pagina — il controllo più economico e più a monte di tutti:
// se questo fallisce, quasi certamente falliranno anche gli altri.
module.exports = {
    name: 'Il database carte si carica senza errori',
    freeze: false,
    async run(t) {
        const count = await t.evaluate(() => cardDatabase.length);
        t.assert(count > 800, `cardDatabase.length atteso > 800, trovato ${count}`);

        const dup = await t.evaluate(() => {
            const ids = cardDatabase.map((c) => c.id);
            return ids.length !== new Set(ids).size;
        });
        t.assert(!dup, 'cardDatabase contiene id duplicati');
    }
};
