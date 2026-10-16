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

            resetGameState();
            const bossFromPoly = copy(1265, 'boss-poly');
            gameState.botExtraDeck = [bossFromPoly];
            gameState.botHand = [copy(1, 'poly-blue-1'), copy(1, 'poly-blue-2'), copy(1262, 'poly-alt-hand')];
            const alternativeInHandIsNotFusionName = !DuelEngine.getFusableExtraDeckMonsters('bot')
                .some((entry) => entry.card.uid === bossFromPoly.uid);
            gameState.botHand.pop();
            gameState.botMonsterField[0] = { card: copy(1262, 'poly-alt-field'), position: 'attack', isFaceDown: false };
            const alternativeOnFieldIsFusionName = DuelEngine.getFusableExtraDeckMonsters('bot')
                .some((entry) => entry.card.uid === bossFromPoly.uid);

            resetGameState();
            gameState.phase = 'main1';
            const ultimateFusion = copy(1264, 'ultimate-fusion');
            const ultimateBoss = copy(1265, 'ultimate-boss');
            const graveMaterial = copy(1, 'grave-material');
            const handMaterial = copy(1, 'hand-material');
            const fieldAlternative = copy(1262, 'field-alternative');
            gameState.botExtraDeck = [ultimateBoss];
            gameState.botDeck = [copy(3, 'deck-filler')];
            gameState.botDeckCount = 1;
            gameState.botGraveyard = [graveMaterial];
            gameState.botHand = [handMaterial];
            gameState.botMonsterField[0] = { card: fieldAlternative, position: 'attack', isFaceDown: false };
            gameState.playerMonsterField[0] = { card: copy(3, 'uf-target-1'), position: 'attack', isFaceDown: false };
            gameState.playerMonsterField[1] = { card: copy(4, 'uf-target-facedown'), position: 'defense', isFaceDown: true };
            const ultimateFusionDef = DuelEngine.getDefinition(1264);
            const ultimateFusionCtx = DuelEngine.makeContext('bot', { card: ultimateFusion, zone: 'hand' });
            const ultimateFusionReady = ultimateFusionDef.canActivate(ultimateFusionCtx);
            const oldFusionFx = window.FX;
            window.FX = null;
            ultimateFusionDef.activate(ultimateFusionCtx);
            window.FX = oldFusionFx;
            const ultimateFusionSummons = gameState.botMonsterField.some((s) => s && s.card.uid === ultimateBoss.uid);
            const materialsReturnToDeck = [graveMaterial, handMaterial, fieldAlternative]
                .every((material) => gameState.botDeck.some((card) => card.uid === material.uid));
            const ultimateFusionDestroysFaceUpOnly = !gameState.playerMonsterField[0]
                && !!gameState.playerMonsterField[1];
            const bossRemembersAlternative = ultimateBoss._fusionSummonedWithAlternative === true;

            gameState.playerMonsterField[1] = null;
            gameState.playerMonsterField[0] = { card: copy(3, 'boss-target-1'), position: 'attack', isFaceDown: false };
            gameState.playerMonsterField[2] = { card: copy(4, 'boss-target-2'), position: 'attack', isFaceDown: false };
            gameState.playerSTField[0] = { card: copy(607, 'boss-target-3'), isFaceDown: true };
            const ultimateBossDef = DuelEngine.getDefinition(1265);
            const ultimateBossCtx = DuelEngine.makeContext('bot', { card: ultimateBoss, zone: 'monster', index: 0 });
            ultimateBossDef.activate(ultimateBossCtx);
            DuelEngine.recomputeStaticEffects();
            const bossDestroysThree = !gameState.playerMonsterField[0]
                && !gameState.playerMonsterField[2] && !gameState.playerSTField[0];
            const bossCannotAttack = gameState.cannotAttackUids[ultimateBoss.uid] === true;

            resetGameState();
            const protectedBoss = copy(1265, 'protected-boss');
            gameState.botMonsterField[0] = { card: protectedBoss, position: 'attack', isFaceDown: false };
            DuelEngine.recomputeStaticEffects();
            const bossTargetBlocked = !DuelEngine.makeContext('player', { card: copy(4, 'opponent-source') })
                .declareTarget('bot', 0).allowed;
            DuelEngine.makeContext('player', { card: copy(4, 'opponent-destroy') }).destroyMonster('bot', 0);
            const bossOpponentDestroyBlocked = !!gameState.botMonsterField[0];
            DuelEngine.makeContext('bot', { card: copy(7, 'own-destroy') }).destroyMonster('bot', 0);
            const bossOwnDestroyAllowed = !gameState.botMonsterField[0];

            return {
                melodyReady, melodyWorks, alternativeCanSummon, alternativeSummoned, revealedStaysInHand,
                alternativeOnField, alternativeOncePerTurn, alternativeDestroys, alternativeCannotAttack,
                trueLightSummons, trueLightProtects, trueLightPunishes, facedownDoesNotPunish,
                alternativeIsNotBlueEyesInHand, alternativeIsBlueEyesInGrave, trueLightSets,
                alternativeInHandIsNotFusionName, alternativeOnFieldIsFusionName, ultimateFusionReady,
                ultimateFusionSummons, materialsReturnToDeck, ultimateFusionDestroysFaceUpOnly,
                bossRemembersAlternative, bossDestroysThree, bossCannotAttack, bossTargetBlocked,
                bossOpponentDestroyBlocked, bossOwnDestroyAllowed
            };
        });
        Object.entries(result).forEach(([name, value]) => {
            t.assert(value, `${name} deve essere vero: ${JSON.stringify(result)}`);
        });
    }
};
