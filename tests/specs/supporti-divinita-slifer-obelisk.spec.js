module.exports = {
    name: 'Supporti Divinita: Attacco Forza del Tuono e Pugno del Fato',
    async run(t) {
        const result = await t.evaluate(() => {
            const copy = (id, uid) => ({ ...cardDatabase.find((card) => card.id === id), uid });
            const slot = (card) => ({ card, position: 'attack', isFaceDown: false });

            resetGameState();
            gameState.currentPlayer = 'bot';
            gameState.phase = 'main1';
            gameState.cannotBeTargetedBySpellsUids = {};
            const slifer = copy(31, 'slifer-test');
            const thunderforce = copy(1271, 'thunderforce-test');
            const vittimaA = copy(104, 'thunder-victim-a');
            const vittimaB = copy(110, 'thunder-victim-b');
            const coperta = copy(4, 'thunder-facedown');
            gameState.botMonsterField[0] = slot(slifer);
            gameState.playerMonsterField[0] = slot(vittimaA);
            gameState.playerMonsterField[1] = slot(vittimaB);
            gameState.playerMonsterField[2] = { ...slot(coperta), isFaceDown: true, position: 'defense' };
            gameState.botDeck = [copy(4, 'draw-a'), copy(4, 'draw-b'), copy(4, 'draw-c')];
            const thunderDef = DuelEngine.getDefinition(1271);
            const thunderCanActivate = thunderDef.canActivate(DuelEngine.makeContext('bot', { card: thunderforce }));
            thunderDef.activate(DuelEngine.makeContext('bot', { card: thunderforce }));
            const thunderResult = {
                canActivate: thunderCanActivate,
                faceUpDestroyed: !gameState.playerMonsterField[0] && !gameState.playerMonsterField[1],
                faceDownSurvives: !!gameState.playerMonsterField[2],
                drewTwo: gameState.botHand.length === 2,
                oneAttacker: gameState.onlyOneAttackingMonsterFor.bot === true,
                oncePerTurn: !thunderDef.canActivate(DuelEngine.makeContext('bot', { card: thunderforce }))
            };

            resetGameState();
            gameState.currentPlayer = 'bot';
            gameState.phase = 'main1';
            gameState.cannotBeTargetedBySpellsUids = {};
            const obelisk = copy(30, 'obelisk-test');
            const fist = copy(1272, 'fist-test');
            const sameA = copy(104, 'barrel-a');
            const sameB = copy(104, 'barrel-b');
            const trap = copy(100, 'backrow-test');
            gameState.botMonsterField[0] = slot(obelisk);
            gameState.playerMonsterField[0] = slot(sameA);
            gameState.playerMonsterField[1] = slot(sameB);
            gameState.playerSTField[0] = { card: trap, isFaceDown: true };
            const fistDef = DuelEngine.getDefinition(1272);
            const fistCanActivate = fistDef.canActivate(DuelEngine.makeContext('bot', { card: fist }));
            fistDef.activate(DuelEngine.makeContext('bot', { card: fist }));
            const remaining = gameState.playerMonsterField.find((entry) => entry && entry.card.name === sameA.name);
            const fistResult = {
                canActivate: fistCanActivate,
                oneDestroyed: gameState.playerGraveyard.some((card) => card.uid === sameA.uid || card.uid === sameB.uid),
                sameNameNegated: !!remaining && DuelEngine.isMonsterCardEffectsNegated('player', remaining.card.uid),
                backrowDestroyed: !gameState.playerSTField[0],
                oncePerTurn: !fistDef.canActivate(DuelEngine.makeContext('bot', { card: fist }))
            };
            return { thunderResult, fistResult };
        });

        t.assert(Object.values(result.thunderResult).every(Boolean),
            `Attacco Forza del Tuono non rispetta tutto il testo: ${JSON.stringify(result.thunderResult)}`);
        t.assert(Object.values(result.fistResult).every(Boolean),
            `Pugno del Fato non rispetta tutto il testo: ${JSON.stringify(result.fistResult)}`);
    }
};
