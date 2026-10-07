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
            limiteDuelli: 1,
            output: null
        });
        assert(report.risultati.length === 1, 'Il filtro deve produrre una sola coppia deck/difficoltà');
        const r = report.risultati[0];
        assert(r.deckId === 'starter_sdy_yugi' && r.difficolta === 'facile', JSON.stringify(r));
        assert(r.duelliTotali === 1 && r.tentativi === 1, `Lo smoke test deve simulare esattamente un tentativo: ${JSON.stringify(r)}`);
        assert(Number.isFinite(r.turni) && Number.isFinite(r.tempoVirtualeSecondi) && Number.isFinite(r.tempoRealeMs),
            `Il report deve misurare turni, tempo virtuale e tempo reale: ${JSON.stringify(r)}`);
    }
};
