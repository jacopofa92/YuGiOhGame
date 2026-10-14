module.exports = {
    name: 'Supporti Mago Nero: primo pacchetto moderno',
    async run(t) {
        const result = await t.evaluate(() => {
            const copy = (id, uid) => ({ ...cardDatabase.find((c) => c.id === id), uid });

            resetGameState();
            const rod = copy(1254, 'rod');
            const knives = copy(474, 'knives');
            gameState.botDeck = [knives];
            gameState.botDeckCount = 1;
            DuelEngine.getDefinition(1254).onSummon(DuelEngine.makeContext('bot', {
                card: rod, summonedCard: rod, summonedVia: 'normal'
            }));
            const rodSearches = gameState.botHand.some((c) => c.uid === knives.uid);

            resetGameState();
            gameState.currentPlayer = 'player';
            const graveRod = copy(1254, 'grave-rod');
            const tribute = copy(188, 'spellcaster-tribute');
            const activatedTrap = copy(1252, 'activated-trap');
            gameState.botGraveyard = [graveRod];
            gameState.botMonsterField[0] = { card: tribute, position: 'attack', isFaceDown: false };
            const graveCtx = DuelEngine.makeContext('bot', {
                card: graveRod, zone: 'graveyard', activatedCard: activatedTrap, activatedOwner: 'bot'
            });
            const rodGraveReady = DuelEngine.getDefinition(1254).canActivateOnCardActivatedWhileInGraveyard(graveCtx);
            DuelEngine.getDefinition(1254).onCardActivatedWhileInGraveyard(graveCtx);
            const rodReturns = gameState.botHand.some((c) => c.uid === graveRod.uid)
                && gameState.botGraveyard.some((c) => c.uid === tribute.uid)
                && !gameState.botMonsterField[0];

            resetGameState();
            const circle = copy(1255, 'circle');
            const darkMagician = copy(2, 'dm-deck');
            const fillerA = copy(3, 'filler-a');
            const fillerB = copy(4, 'filler-b');
            gameState.botDeck = [fillerA, fillerB, darkMagician];
            gameState.botDeckCount = 3;
            gameState.botSTField[0] = { card: circle, isFaceDown: false };
            const circleDef = DuelEngine.getDefinition(1255);
            const circleCtx = DuelEngine.makeContext('bot', { card: circle, zone: 'st', index: 0 });
            circleDef.activate(circleCtx);
            const circleSearches = gameState.botHand.some((c) => c.uid === darkMagician.uid)
                && gameState.botDeck.length === 2;
            const summoned = copy(2, 'dm-field');
            const enemy = copy(3, 'enemy');
            gameState.botMonsterField[0] = { card: summoned, position: 'attack', isFaceDown: false };
            gameState.playerMonsterField[0] = { card: enemy, position: 'attack', isFaceDown: false };
            DuelEngine.recomputeStaticEffects();
            circleDef.onAnySpecialSummon(DuelEngine.makeContext('bot', {
                card: circle, zone: 'st', index: 0, summonedCard: summoned
            }));
            const circleBanishes = !gameState.playerMonsterField[0]
                && gameState.playerBanished.some((c) => c.uid === enemy.uid);

            resetGameState();
            const soul = copy(1256, 'soul');
            const protectedDm = copy(2, 'protected-dm');
            const raigeki = copy(4, 'enemy-effect');
            gameState.botSTField[0] = { card: soul, isFaceDown: false };
            gameState.botMonsterField[0] = { card: protectedDm, position: 'attack', isFaceDown: false };
            DuelEngine.recomputeStaticEffects();
            DuelEngine.makeContext('player', { card: raigeki }).destroyMonster('bot', 0);
            const soulProtects = !!gameState.botMonsterField[0];
            gameState.botSTField[0] = null;
            gameState.botGraveyard.push(soul);
            DuelEngine.getDefinition(1256).onSentToGraveyardFromField(DuelEngine.makeContext('bot', { card: soul }));
            const soulPunishes = !gameState.botMonsterField[0]
                && gameState.botGraveyard.some((c) => c.uid === protectedDm.uid);

            return { rodSearches, rodGraveReady, rodReturns, circleSearches, circleBanishes, soulProtects, soulPunishes };
        });
        Object.entries(result).forEach(([name, value]) => t.assert(value, `${name} deve essere vero: ${JSON.stringify(result)}`));
    }
};
