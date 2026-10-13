// Un mostro coperto attaccato resta in Posizione di Difesa durante la
// distruzione: il keyframe non deve raddrizzarlo visivamente in Attacco.
module.exports = {
    name: 'Battaglia: un mostro coperto viene distrutto restando visivamente in Difesa',
    async run(t) {
        const esito = await t.evaluate(() => {
            const carta = Object.assign({}, cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck), {
                uid: 'difensore-coperto-test', defense: 100
            });
            gameState.botMonsterField = [{
                card: carta,
                position: 'defense',
                isFaceDown: true,
                hasAttacked: false
            }, null, null, null, null];
            updateUI();

            const prima = document.querySelector('#botFieldBoard .field-slot[data-type="monster"][data-index="0"] .card');
            const coperta = prima.classList.contains('face-down');
            const inDifesa = prima.classList.contains('defense-pos');
            triggerDestroyEffect('bot', 0, 'monster');

            return {
                coperta,
                inDifesa,
                staScomparendo: prima.classList.contains('destroying'),
                animazione: getComputedStyle(prima).animationName
            };
        });

        t.assert(esito.coperta && esito.inDifesa, `Preparazione reale coperta in Difesa: ${JSON.stringify(esito)}`);
        t.assert(esito.staScomparendo, 'Deve partire l’animazione di distruzione');
        t.assert(esito.animazione === 'destroyCardDefense', `La distruzione deve conservare la Difesa: ${JSON.stringify(esito)}`);
    }
};
