// Le transizioni di zona devono produrre un fantasma leggibile anche se lo
// stato viene aggiornato subito dopo. Protegge ritorno in mano, scarto,
// ricerca dal Deck e bando: quattro percorsi condivisi da molte carte.
module.exports = {
    name: 'Transizioni carta: mano, Cimitero, Deck e zona bandite sono animate',
    async run(t) {
        const result = await t.evaluate(async () => {
            const make = (id, uid) => ({ ...cardDatabase.find((c) => c.id === id), uid });
            gameState.playerMonsterField = [{ card: make(4, 'move-field'), position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.playerHand = [make(5, 'move-discard')];
            gameState.playerDeck = [make(6, 'move-search')];
            gameState.playerGraveyard = [];
            gameState.playerBanished = [];
            gameState.playerDeckCount = 1;
            updateUI();
            await new Promise((resolve) => setTimeout(resolve, 80));

            const counts = [];
            DuelEngine.actions.returnMonsterToHand('player', 0);
            counts.push(document.querySelectorAll('.fx-card-travel').length);

            DuelEngine.actions.discardChosenFromHand.call({ owner: 'player' }, 'player', 0);
            counts.push(document.querySelectorAll('.fx-card-travel').length);

            DuelEngine.actions.searchDeckToHand('player', (c) => c.uid === 'move-search', 1);
            counts.push(document.querySelectorAll('.fx-card-travel').length);

            const banishedIndex = gameState.playerHand.findIndex((c) => c.uid === 'move-search');
            const [banished] = gameState.playerHand.splice(banishedIndex, 1);
            DuelEngine.actions.banish('player', banished);
            counts.push(document.querySelectorAll('.fx-card-travel').length);
            return { counts, hand: gameState.playerHand.map((c) => c.uid), grave: gameState.playerGraveyard.map((c) => c.uid), banished: gameState.playerBanished.map((c) => c.uid) };
        });
        t.assert(result.counts.every((n, i) => n >= i + 1), `Ogni passaggio deve aggiungere un fantasma: ${result.counts.join(', ')}`);
        t.assert(result.grave.includes('move-discard'), 'Lo scarto deve comunque arrivare al Cimitero');
        t.assert(result.hand.includes('move-field'), 'Il mostro deve comunque tornare in mano');
        t.assert(result.banished.includes('move-search'), 'Il bando deve comunque raggiungere la zona bandite');
    }
};
