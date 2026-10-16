module.exports = {
    name: 'Supporti Occhi Rossi: primo pacchetto moderno',
    async run(t) {
        const result = await t.evaluate(() => {
            const copy = (id, uid) => ({ ...cardDatabase.find((c) => c.id === id), uid });

            resetGameState();
            gameState.currentPlayer = 'bot';
            gameState.phase = 'main1';
            const stone = copy(1250, 'stone-field');
            const redEyes = copy(12, 'red-eyes-deck');
            gameState.botMonsterField[0] = { card: stone, position: 'attack', isFaceDown: false };
            gameState.botDeck = [redEyes];
            gameState.botDeckCount = 1;
            const stoneDef = DuelEngine.getDefinition(1250);
            const stoneCtx = DuelEngine.makeContext('bot', { card: stone, zone: 'monster', index: 0 });
            const stoneReady = stoneDef.canActivate(stoneCtx);
            stoneDef.activate(stoneCtx);
            const stoneSummons = gameState.botMonsterField.some((s) => s && s.card.uid === redEyes.uid)
                && gameState.botGraveyard.some((c) => c.uid === stone.uid)
                && !stoneDef.canActivateFromGraveyardMainPhase(DuelEngine.makeContext('bot', { card: stone, zone: 'graveyard' }));

            resetGameState();
            gameState.currentPlayer = 'bot';
            gameState.phase = 'main1';
            const insight = copy(1251, 'insight');
            const insightCost = copy(12, 'insight-cost');
            const spiritSearch = copy(1252, 'spirit-search');
            gameState.botDeck = [insightCost, spiritSearch];
            gameState.botDeckCount = 2;
            const insightDef = DuelEngine.getDefinition(1251);
            const insightCtx = DuelEngine.makeContext('bot', { card: insight, zone: 'hand', index: 0 });
            const insightReady = insightDef.canActivate(insightCtx);
            insightDef.activate(insightCtx);
            const insightWorks = gameState.botGraveyard.some((c) => c.uid === insightCost.uid)
                && gameState.botHand.some((c) => c.uid === spiritSearch.uid)
                && gameState.botDeckCount === 0
                && !insightDef.canActivate(insightCtx);

            resetGameState();
            gameState.currentPlayer = 'bot';
            gameState.phase = 'main1';
            const spirit = copy(1252, 'spirit');
            const revive = copy(12, 'revive');
            gameState.botGraveyard = [revive];
            const spiritDef = DuelEngine.getDefinition(1252);
            const spiritCtx = DuelEngine.makeContext('bot', { card: spirit, zone: 'st', index: 0 });
            const spiritReady = spiritDef.canActivate(spiritCtx);
            spiritDef.activate(spiritCtx);
            const spiritWorks = gameState.botMonsterField.some((s) => s && s.card.uid === revive.uid)
                && !gameState.botGraveyard.some((c) => c.uid === revive.uid);

            resetGameState();
            DuelEngine.recomputeStaticEffects();
            const metal = copy(1253, 'metal');
            const target = copy(12, 'metal-target');
            gameState.botMonsterField[0] = { card: target, position: 'attack', isFaceDown: false };
            gameState.botSTField[0] = { card: metal, isFaceDown: false };
            const metalDef = DuelEngine.getDefinition(1253);
            const metalCtx = DuelEngine.makeContext('bot', { card: metal, zone: 'st', index: 0 });
            metalDef.activate(metalCtx);
            DuelEngine.recomputeStaticEffects();
            const metalEquips = metal.equippedToUid === target.uid && DuelEngine.getEffectiveAtk(target) === 3000;
            gameState.botDeck = [copy(1252, 'metal-search')];
            gameState.botDeckCount = 1;
            gameState.botGraveyard.push(metal);
            metalDef.onSentToGraveyardFromField(metalCtx);
            const metalSearches = gameState.botHand.some((c) => c.uid === 'metal-search');

            return { stoneReady, stoneSummons, insightReady, insightWorks, spiritReady, spiritWorks, metalEquips, metalSearches };
        });
        Object.entries(result).forEach(([name, value]) => t.assert(value, `${name} deve essere vero: ${JSON.stringify(result)}`));
    }
};
