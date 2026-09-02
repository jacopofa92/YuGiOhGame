// Goblin fuori dalla Padella (id 821) e Malfunzionamento (id 822): la
// carta negata non deve mai duplicarsi (bug reale trovato e corretto:
// 821 rimandava in mano la Magia negata senza toglierla da dove si
// trovava già, lasciandola sia al Cimitero sia in mano). 822 deve
// rimettere la Trappola negata Set, non distruggerla.
module.exports = {
    name: 'Negazione (821/822): nessuna duplicazione, 822 rimette Set',
    async run(t) {
        const r1 = await t.evaluate(() => {
            const goblin = { ...cardDatabase.find((c) => c.id === 821), uid: 'goblin-1' };
            const enemySpell = { ...cardDatabase.find((c) => c.id === 7), uid: 'enemyspell-1' };
            gameState.playerGraveyard = [enemySpell];
            gameState.playerHand = [];
            gameState.chain = { active: true, links: [{ owner: 'player', card: enemySpell, handlerName: 'activate', def: DuelEngine.getDefinition(7), ctx: { zone: 'hand', index: 0 }, isManualActivation: true }] };
            const ctx = DuelEngine.makeContext('bot', { card: goblin });
            DuelEngine.getDefinition(821).activate(ctx);
            return {
                inGraveyard: gameState.playerGraveyard.filter((c) => c.uid === 'enemyspell-1').length,
                inHand: gameState.playerHand.filter((c) => c.uid === 'enemyspell-1').length
            };
        });
        t.assert(r1.inGraveyard === 0, '821: la Magia negata non deve restare nel Cimitero');
        t.assert(r1.inHand === 1, '821: la Magia negata deve finire in mano, una sola volta');

        const r2 = await t.evaluate(() => {
            const malfunction = { ...cardDatabase.find((c) => c.id === 822), uid: 'malfunction-1' };
            const enemyTrap = { ...cardDatabase.find((c) => c.id === 40), uid: 'enemytrap-1' };
            gameState.turn = 6;
            gameState.playerGraveyard = [enemyTrap];
            gameState.playerSTField = [null, null, null, null, null];
            gameState.chain = { active: true, links: [{ owner: 'player', card: enemyTrap, handlerName: 'activate', def: DuelEngine.getDefinition(40), ctx: { zone: 'st', index: 2 }, isManualActivation: true }] };
            const ctx = DuelEngine.makeContext('bot', { card: malfunction });
            DuelEngine.getDefinition(822).activate(ctx);
            const slot = gameState.playerSTField[2];
            return {
                inGraveyard: gameState.playerGraveyard.filter((c) => c.uid === 'enemytrap-1').length,
                backOnField: !!(slot && slot.card.uid === 'enemytrap-1'),
                isFaceDown: slot ? slot.isFaceDown : null
            };
        });
        t.assert(r2.inGraveyard === 0, '822: la Trappola negata non deve restare nel Cimitero');
        t.assert(r2.backOnField, '822: la Trappola deve tornare sul Terreno, nella sua casella originale');
        t.assert(r2.isFaceDown === true, '822: la Trappola deve tornare Set (coperta), non scoperta');
    }
};
