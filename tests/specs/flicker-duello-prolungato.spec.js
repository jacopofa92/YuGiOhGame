// Regressione del flicker progressivo: un campo/mano pieni e immutati non
// devono ricreare immagini e carte a ogni updateUI, nemmeno dopo che
// caricamenti, compressione titoli o FX hanno modificato il DOM vivo.
module.exports = {
    name: 'Duello prolungato: 80 ridisegni conservano tutte le carte ferme',
    async run(t) {
        const esito = await t.evaluate(async () => {
            const mostri = cardDatabase.filter((c) => c.type === 'monster' && !c.extraDeck).slice(0, 10);
            const magie = cardDatabase.filter((c) => c.type !== 'monster').slice(0, 10);
            const copia = (c, uid) => Object.assign({}, c, { uid });
            gameState.playerMonsterField = mostri.slice(0, 5).map((c, i) => ({ card: copia(c, `fp-pm-${i}`), position: i % 2 ? 'defense' : 'attack', isFaceDown: false, hasAttacked: false, canChangePosition: true }));
            gameState.botMonsterField = mostri.slice(5, 10).map((c, i) => ({ card: copia(c, `fp-bm-${i}`), position: i % 2 ? 'attack' : 'defense', isFaceDown: false, hasAttacked: false, canChangePosition: true }));
            gameState.playerSTField = magie.slice(0, 5).map((c, i) => ({ card: copia(c, `fp-ps-${i}`), isFaceDown: i % 2 === 0, setOnTurn: 0 }));
            gameState.botSTField = magie.slice(5, 10).map((c, i) => ({ card: copia(c, `fp-bs-${i}`), isFaceDown: i % 2 !== 0, setOnTurn: 0 }));
            gameState.playerHand = mostri.slice(0, 5).map((c, i) => copia(c, `fp-ph-${i}`));
            gameState.botHand = mostri.slice(5, 10).map((c, i) => copia(c, `fp-bh-${i}`));
            updateUI();
            await new Promise((resolve) => setTimeout(resolve, 150));
            updateUI();

            const uids = [...document.querySelectorAll('#playerFieldBoard .card[data-uid], #botFieldBoard .card[data-uid], #playerHand .card[data-uid]')]
                .map((el) => el.dataset.uid);
            const originali = new Map(uids.map((uid) => [uid, document.querySelector(`.card[data-uid="${CSS.escape(uid)}"]`)]));
            originali.forEach((el) => {
                el.classList.add('has-image');
                const nome = el.querySelector('.card-name-text');
                if (nome) nome.style.transform = 'scaleX(0.81)';
            });
            for (let i = 0; i < 80; i++) updateUI();
            const conservate = uids.filter((uid) => document.querySelector(`.card[data-uid="${CSS.escape(uid)}"]`) === originali.get(uid)).length;
            return { totale: uids.length, conservate, viaggiResidui: document.querySelectorAll('.fx-card-travel').length };
        });
        t.assert(esito.totale >= 20, `La prova deve riempire davvero il duello: trovate ${esito.totale} carte`);
        t.assert(esito.conservate === esito.totale, `Dopo 80 ridisegni sono sopravvissute ${esito.conservate}/${esito.totale} carte ferme`);
        t.assert(esito.viaggiResidui === 0, `Nessun fantasma FX deve accumularsi: ${esito.viaggiResidui}`);
    }
};
