// Regressione trovata dall'audit dei duellanti: questo seme porta Il
// Guardiano Affidabile a risolversi mentre sul Terreno esiste uno slot di
// transito senza `card`. Prima della correzione l'effetto veniva saltato con
// un TypeError; il motore senza testa rende il caso esatto riproducibile.
const { giocaPartita } = require('../../tools/duello-senza-testa.js');

module.exports = {
    name: 'I bonus temporanei ignorano slot in transito privi di carta',
    async run(t) {
        const risultato = await giocaPartita({
            avversario: 'panik',
            livello: 'easy',
            giocatore: 'yamiYugi',
            livelloGiocatore: 'hard',
            seme: 91012,
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
