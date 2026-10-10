// Dopo il giro 3D di un Flip Summon la casella deve tornare una carta
// NORMALE. Segnalato dall'utente: passando col mouse sopra una carta appena
// scoperta, la carta spariva. Il giro (CardRenderer.playFlipReveal) viene
// costruito DOPO l'ultimo ridisegno del Terreno, quindi restava lì; il
// sollevamento al passaggio del mouse aggiunge un filtro, che appiattisce il
// 3D e nasconde entrambe le facce. Ora a fine giro il Terreno si ridisegna.
module.exports = {
    name: 'Flip Summon: finito il giro la carta torna normale (niente carta che sparisce al passaggio del mouse)',
    async run(t) {
        await t.evaluate(() => {
            const card = Object.assign({}, cardDatabase.find((c) => c.id === 4), { uid: 'prova-flip-summon' });
            gameState.currentPlayer = 'player';
            gameState.phase = 'main1';
            gameState.turn = 3;
            gameState.playerMonsterField = [{ card, position: 'defense', isFaceDown: true, hasAttacked: false, canChangePosition: true }, null, null, null, null];
            updateUI();
            changeMonsterPosition(0);
        });
        const durante = await t.evaluate(() => !!document.querySelector('#playerFieldBoard .field-slot[data-index="0"][data-type="monster"] .card-flip-outer'));
        t.assert(durante, 'Il Flip Summon deve mostrare il giro 3D della carta');
        await t.page.waitForFunction(() => {
            const slot = document.querySelector('#playerFieldBoard .field-slot[data-index="0"][data-type="monster"]');
            return slot && !slot.querySelector('.card-flip-outer') && !!slot.querySelector('.card:not(.face-down)');
        }, null, { timeout: 4000 });
        const finale = await t.evaluate(() => {
            const slot = document.querySelector('#playerFieldBoard .field-slot[data-index="0"][data-type="monster"]');
            return { giro: !!slot.querySelector('.card-flip-outer'), carta: !!slot.querySelector('.card[data-uid="prova-flip-summon"]') };
        });
        t.assert(!finale.giro && finale.carta, `Finito il giro la casella contiene la carta normale: ${JSON.stringify(finale)}`);
    }
};
