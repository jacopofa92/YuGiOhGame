module.exports = {
    name: 'Primitive supporti Divinita: non annullabile, Tributo aggiuntivo e statistiche originali',
    async run(t) {
        const result = await t.evaluate(() => {
            const copy = (id, uid) => ({ ...cardDatabase.find((card) => card.id === id), uid });

            resetGameState();
            const protectedSpell = copy(8, 'protected-spell');
            const normalSpell = copy(7, 'normal-spell');
            gameState.chain = {
                active: true,
                links: [{ owner: 'player', card: protectedSpell, def: { activationAndEffectCannotBeNegated: true }, negated: false }]
            };
            const protectedResult = DuelEngine.makeContext('bot', {}).negateActivation();
            const protectedStayedActive = gameState.chain.links[0].negated !== true;
            gameState.chain.links = [{ owner: 'player', card: normalSpell, def: {}, negated: false }];
            const normalResult = DuelEngine.makeContext('bot', {}).negateActivation();
            const normalWasNegated = gameState.chain.links[0].negated === true;

            resetGameState();
            const lowLevel = copy(4, 'low-level');
            const ra = copy(472, 'ra-quota');
            gameState.additionalTributeSummonFor = { player: true, bot: false };
            const bothInitiallyLegal = canUseNormalSummonQuota('player', lowLevel)
                && canUseNormalSummonQuota('player', ra);
            const firstQuota = consumeNormalSummonQuota('player', ra);
            const ordinaryStillAvailable = !gameState.hasNormalSummoned
                && canUseNormalSummonQuota('player', lowLevel)
                && !gameState.additionalTributeSummonFor.player;
            const secondQuota = consumeNormalSummonQuota('player', lowLevel);
            const noThirdSummon = gameState.hasNormalSummoned
                && !canUseNormalSummonQuota('player', lowLevel)
                && !canUseNormalSummonQuota('player', ra);

            resetGameState();
            const tribute = copy(1, 'tribute-blue-eyes');
            tribute.attack = 9999;
            tribute.defense = 1;
            const summonedRa = copy(472, 'ra-stats');
            gameState.playerMonsterField[0] = { card: tribute, position: 'attack', isFaceDown: false };
            gameState.playerHand = [summonedRa];
            eseguiTributo('player', { indici: [0], perCarta: summonedRa.uid, attesaMs: 0 }, { dopo() {} });
            const saved = summonedRa._tributedOriginalStats && summonedRa._tributedOriginalStats[0];
            const originalStatsSaved = !!saved && saved.id === 1 && saved.attack === 3000 && saved.defense === 2500;

            return {
                protectedResult, protectedStayedActive, normalResult, normalWasNegated,
                bothInitiallyLegal, firstQuota, ordinaryStillAvailable, secondQuota,
                noThirdSummon, originalStatsSaved
            };
        });

        t.assert(result.protectedResult === false && result.protectedStayedActive,
            `Una carta non annullabile deve rifiutare la negazione: ${JSON.stringify(result)}`);
        t.assert(result.normalResult === true && result.normalWasNegated,
            'La primitiva non deve rendere immuni le carte normali');
        t.assert(result.bothInitiallyLegal && result.firstQuota === 'additional-tribute'
            && result.ordinaryStillAvailable && result.secondQuota === 'normal' && result.noThirdSummon,
        `L'Evocazione Tributo aggiuntiva deve essere distinta dalla quota Normale: ${JSON.stringify(result)}`);
        t.assert(result.originalStatsSaved,
            `I Tributi devono conservare le statistiche originali, non quelle modificate: ${JSON.stringify(result)}`);
    }
};
