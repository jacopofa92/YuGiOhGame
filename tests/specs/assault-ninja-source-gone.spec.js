// Regressione emersa dall'audit di Duke: con questo seme Ninja d'Assalto
// entra in Catena ma lascia il Terreno prima della risoluzione. L'effetto
// deve risolversi a vuoto, senza leggere lo slot nullo né pagare altri costi.
const { giocaPartita } = require('../../tools/duello-senza-testa.js');

module.exports = {
    name: "Ninja d'Assalto non esplode se la fonte lascia il Terreno",
    async run(t) {
        const risultato = await giocaPartita({
            avversario: 'duke',
            livello: 'easy',
            giocatore: 'yamiYugi',
            livelloGiocatore: 'hard',
            seme: 91009,
            turni: 80
        }, 0);

        t.assert(risultato.erroriCarte.length === 0,
            `nessun effetto deve essere saltato: ${risultato.erroriCarte.join(' | ')}`);
        t.assert(risultato.invarianti.length === 0,
            `nessun invariante deve rompersi: ${risultato.invarianti.join(' | ')}`);
        t.assert(risultato.esito === true || risultato.esito === false,
            'il duello riproducibile deve arrivare a un vincitore');
    }
};
