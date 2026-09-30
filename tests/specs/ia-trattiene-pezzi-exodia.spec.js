// I cinque pezzi di Exodia valgono soltanto riuniti in mano. Il test passa
// dalla facciata BotAI e copre quindi anche Facile, che usa l'IA Media.
module.exports = {
    name: 'IA: a ogni difficoltà trattiene in mano tutti i pezzi di Exodia',
    async run(t) {
        const result = await t.evaluate(() => {
            const ids = [11, 41, 42, 43, 44];
            const clone = (id, suffix) => Object.assign(
                {}, cardDatabase.find((card) => card.id === id),
                { uid: `exodia-${id}-${suffix}` }
            );
            const safeSource = cardDatabase.find((card) => card.id === 109);
            const outcomes = {};

            ['easy', 'medium', 'hard'].forEach((difficulty) => {
                gameState.botDifficulty = difficulty;
                gameState.botHand = ids.map((id) => clone(id, difficulty))
                    .concat([Object.assign({}, safeSource, { uid: `safe-${difficulty}` })]);
                gameState.botMonsterField = [null, null, null, null, null];
                gameState.playerMonsterField = [null, null, null, null, null];
                gameState.hasNormalSummoned = false;
                const choice = BotAI.chooseSummon(gameState);
                outcomes[difficulty] = choice && choice.card ? choice.card.id : null;
            });

            gameState.botDifficulty = 'hard';
            gameState.botHand = ids.map((id) => clone(id, 'only'));
            gameState.botMonsterField = [null, null, null, null, null];
            const onlyExodia = BotAI.chooseSummon(gameState);
            return { outcomes, onlyExodia: onlyExodia && onlyExodia.card && onlyExodia.card.id };
        });

        ['easy', 'medium', 'hard'].forEach((difficulty) => {
            t.assert(result.outcomes[difficulty] === 109,
                `${difficulty}: deve scegliere il mostro normale e trattenere Exodia (scelta ${result.outcomes[difficulty]})`);
        });
        t.assert(!result.onlyExodia,
            `Con soli pezzi di Exodia deve rinunciare all'Evocazione (scelta ${result.onlyExodia})`);
    }
};
