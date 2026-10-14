module.exports = {
    name: 'Supporti Occhi Blu: Melodia, Alternativo e Luce Autentica',
    async run(t) {
        const result = await t.evaluate(() => {
            const copy = (id, uid) => ({ ...cardDatabase.find((c) => c.id === id), uid });

            resetGameState();
            const melody = copy(1261, 'melody');
            const cost = copy(3, 'cost');
            const blueEyes = copy(1, 'blue-eyes-deck');
            const alternativeDeck = copy(1262, 'alternative-deck');
            const invalidDragon = { ...copy(1, 'invalid-dragon'), attack: 2900 };
            gameState.botHand = [melody, cost];
            gameState.botDeck = [invalidDragon, blueEyes, alternativeDeck];
            gameState.botDeckCount = 3;
            const melodyDef = DuelEngine.getDefinition(1261);
            const melodyCtx = DuelEngine.makeContext('bot', { card: melody, zone: 'hand' });
            const melodyReady = melodyDef.canActivate(melodyCtx);
            melodyDef.activate(melodyCtx);
            const melodyWorks = gameState.botGraveyard.some((c) => c.uid === cost.uid)
                && gameState.botHand.some((c) => c.uid === blueEyes.uid)
                && gameState.botHand.some((c) => c.uid === alternativeDeck.uid)
                && gameState.botDeck.length === 1 && gameState.botDeck[0].uid === invalidDragon.uid;

            resetGameState();
            const revealed = copy(1, 'revealed');
            const alternative = copy(1262, 'alternative');
            gameState.botHand = [alternative, revealed];
            const alternativeCanSummon = DuelEngine.canSpecialSummonFromHand('bot', 0);
            const alternativeSummoned = DuelEngine.trySpecialSummonFromHand('bot', 0);
            const revealedStaysInHand = gameState.botHand.some((c) => c.uid === revealed.uid);
            const alternativeOnField = gameState.botMonsterField.some((s) => s && s.card.uid === alternative.uid);
            const secondAlternative = copy(1262, 'alternative-2');
            gameState.botHand.push(secondAlternative);
            const alternativeOncePerTurn = !DuelEngine.canSpecialSummonFromHand('bot', gameState.botHand.indexOf(secondAlternative));

            const enemy = copy(3, 'enemy');
            gameState.playerMonsterField[0] = { card: enemy, position: 'attack', isFaceDown: false };
            const alternativeDef = DuelEngine.getDefinition(1262);
            const alternativeCtx = DuelEngine.makeContext('bot', { card: alternative, zone: 'monster', index: 0 });
            alternativeDef.activate(alternativeCtx);
            DuelEngine.recomputeStaticEffects();
            const alternativeDestroys = !gameState.playerMonsterField[0];
            const alternativeCannotAttack = gameState.cannotAttackUids[alternative.uid] === true;

            resetGameState();
            const trueLight = copy(1263, 'true-light');
            const graveBlueEyes = copy(1, 'grave-blue-eyes');
            const enemyEffect = copy(4, 'enemy-effect');
            gameState.botSTField[0] = { card: trueLight, isFaceDown: false };
            gameState.botGraveyard = [graveBlueEyes];
            const trueLightDef = DuelEngine.getDefinition(1263);
            const trueLightCtx = DuelEngine.makeContext('bot', { card: trueLight, zone: 'st', index: 0 });
            trueLightDef.activate(trueLightCtx);
            const trueLightSummons = gameState.botMonsterField.some((s) => s && s.card.uid === graveBlueEyes.uid);
            DuelEngine.recomputeStaticEffects();
            const targetCheck = DuelEngine.makeContext('player', { card: enemyEffect }).declareTarget('bot', 0);
            const trueLightProtects = targetCheck && targetCheck.allowed === false;
            gameState.botSTField[0] = null;
            gameState.botGraveyard.push(trueLight);
            trueLightDef.onSentToGraveyardFromField(DuelEngine.makeContext('bot', {
                card: trueLight, wasFaceDown: false
            }));
            const trueLightPunishes = !gameState.botMonsterField.some(Boolean);

            resetGameState();
            const facedownTrueLight = copy(1263, 'facedown-true-light');
            const survivor = copy(1, 'survivor');
            gameState.botMonsterField[0] = { card: survivor, position: 'attack', isFaceDown: false };
            trueLightDef.onSentToGraveyardFromField(DuelEngine.makeContext('bot', {
                card: facedownTrueLight, wasFaceDown: true
            }));
            const facedownDoesNotPunish = !!gameState.botMonsterField[0];

            resetGameState();
            const handOnlyLight = copy(1263, 'hand-only-light');
            gameState.botSTField[0] = { card: handOnlyLight, isFaceDown: false };
            gameState.botHand = [copy(1262, 'alternative-in-hand')];
            const alternativeIsNotBlueEyesInHand = !trueLightDef.canActivate(
                DuelEngine.makeContext('bot', { card: handOnlyLight, zone: 'st', index: 0 })
            );
            gameState.botHand = [];
            gameState.botGraveyard = [copy(1262, 'alternative-in-grave')];
            const alternativeIsBlueEyesInGrave = trueLightDef.canActivate(
                DuelEngine.makeContext('bot', { card: handOnlyLight, zone: 'st', index: 0 })
            );

            resetGameState();
            const setLight = copy(1263, 'set-light');
            const melodyToSet = {
                ...copy(1261, 'melody-to-set'),
                name: 'Supporto Occhi Blu di prova',
                effect: 'Aggiungi 1 "Drago Bianco Occhi Blu" dal Deck alla mano.',
                mentionsNames: ['Drago Bianco Occhi Blu']
            };
            gameState.botSTField[0] = { card: setLight, isFaceDown: false };
            gameState.botDeck = [melodyToSet];
            gameState.botDeckCount = 1;
            const setCtx = DuelEngine.makeContext('bot', { card: setLight, zone: 'st', index: 0 });
            trueLightDef.activate(setCtx);
            const trueLightSets = gameState.botSTField.some((s) => s && s.card.uid === melodyToSet.uid && s.isFaceDown);

            return {
                melodyReady, melodyWorks, alternativeCanSummon, alternativeSummoned, revealedStaysInHand,
                alternativeOnField, alternativeOncePerTurn, alternativeDestroys, alternativeCannotAttack,
                trueLightSummons, trueLightProtects, trueLightPunishes, facedownDoesNotPunish,
                alternativeIsNotBlueEyesInHand, alternativeIsBlueEyesInGrave, trueLightSets
            };
        });
        Object.entries(result).forEach(([name, value]) => {
            t.assert(value, `${name} deve essere vero: ${JSON.stringify(result)}`);
        });
    }
};
