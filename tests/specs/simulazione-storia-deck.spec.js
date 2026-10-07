// Smoke test dell'audit di bilanciamento: usa una sola tappa per non
// trasformare la suite mirata nella matrice completa (che si lancia a mano).
const { simulaMatrice } = require('../../tools/simula-storia-deck.js');

module.exports = {
    standalone: true,
    name: 'Simulazione Storia per deck: produce tentativi, turni e tempi',
    async run({ assert }) {
        const report = await simulaMatrice({
            deck: 'starter_sdy_yugi',
            difficolta: 'facile',
            tentativi: 1,
            turni: 40,
            seme: 9100,
            iaGiocatore: 'hard',
            limiteDuelli: 1,
            output: null
        });
        assert(report.risultati.length === 1, 'Il filtro deve produrre una sola coppia deck/difficoltà');
        const r = report.risultati[0];
        assert(r.deckId === 'starter_sdy_yugi' && r.difficolta === 'facile', JSON.stringify(r));
        assert(r.duelliTotali === 1 && r.tentativi === 1, `Lo smoke test deve simulare esattamente un tentativo: ${JSON.stringify(r)}`);
        assert(Number.isFinite(r.turni) && Number.isFinite(r.tempoVirtualeSecondi) && Number.isFinite(r.tempoRealeMs),
            `Il report deve misurare turni, tempo virtuale e tempo reale: ${JSON.stringify(r)}`);

        // Dragon's Roar ha meno di 40 RIGHE ma 40 copie complessive: è il
        // caso che impedisce di tornare per sbaglio al conteggio distinto.
        const structure = await simulaMatrice({
            deck: 'structure_sd1_dragons_roar', difficolta: 'facile',
            tentativi: 1, turni: 40, seme: 9200, iaGiocatore: 'hard', limiteDuelli: 1, output: null
        });
        assert(structure.risultati.length === 1
            && structure.risultati[0].deckId === 'structure_sd1_dragons_roar',
        'La matrice deve includere anche gli Structure con meno di 40 carte distinte ma 40 copie totali');
    }
};
