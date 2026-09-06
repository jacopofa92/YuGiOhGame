// Diciassettesima ondata: coppia Great Dezard / Fushioh Richie (id
// 1129-1130), evoluzione a stadi. Riusa il già esistente
// def.onDestroysMonsterByBattle (dodicesima ondata) per il contatore di
// Great Dezard, e lo stesso pattern "Ignition auto-flip-a-faccia-in-giù"
// già usato da Mummia dall'Ascia Gigante (id 1071) per Fushioh Richie.
// La clausola "annulla+distruggi Magie/Trappole che bersagliano questa
// carta" (identica su entrambe) è una SEMPLIFICAZIONE dichiarata (vedi
// missingEffectNote in cards.json) e non è testata qui.
module.exports = {
    name: 'Diciassettesima ondata: Great Dezard / Fushioh Richie, evoluzione a stadi (id 1129-1130)',
    async run(t) {
        // Great Dezard (1129): il contatore sale ad ogni distruzione in
        // battaglia; sotto 2 non può tributarsi, a 2 sì.
        const dezardUnlockResult = await t.evaluate(() => {
            const dezard = { ...cardDatabase.find((c) => c.id === 1129), uid: 'dezard-1' };
            const prey1 = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck), uid: 'prey-1' };
            const prey2 = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck), uid: 'prey-2' };
            const richie = { ...cardDatabase.find((c) => c.id === 1130) };
            gameState.playerMonsterField = [{ card: dezard, position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.playerHand = [richie];
            gameState.phase = 'main1';
            gameState.currentPlayer = 'player';

            const ctxBefore = DuelEngine.makeContext('player', { card: dezard, index: 0, zone: 'monster' });
            const canBeforeAnyDestruction = DuelEngine.getDefinition(1129).canActivate(ctxBefore);

            DuelEngine.getDefinition(1129).onDestroysMonsterByBattle(DuelEngine.makeContext('player', { card: dezard, destroyedCard: prey1, destroyedCardOwner: 'bot', destroyedWasAttackPosition: true }));
            const canAfterOneDestruction = DuelEngine.getDefinition(1129).canActivate(DuelEngine.makeContext('player', { card: dezard, index: 0, zone: 'monster' }));

            DuelEngine.getDefinition(1129).onDestroysMonsterByBattle(DuelEngine.makeContext('player', { card: dezard, destroyedCard: prey2, destroyedCardOwner: 'bot', destroyedWasAttackPosition: true }));
            const canAfterTwoDestructions = DuelEngine.getDefinition(1129).canActivate(DuelEngine.makeContext('player', { card: dezard, index: 0, zone: 'monster' }));

            return { canBeforeAnyDestruction, canAfterOneDestruction, canAfterTwoDestructions };
        });
        t.assert(!dezardUnlockResult.canBeforeAnyDestruction, 'Great Dezard non deve poter tributarsi senza aver ancora distrutto nulla in battaglia');
        t.assert(!dezardUnlockResult.canAfterOneDestruction, 'Great Dezard non deve poter tributarsi dopo una sola distruzione in battaglia');
        t.assert(dezardUnlockResult.canAfterTwoDestructions, 'Great Dezard deve poter tributarsi dopo 2 distruzioni in battaglia');

        // L'attivazione vera: tributa Great Dezard, Special Summon Fushioh Richie dalla mano, nello slot liberato dal tributo.
        const dezardActivateResult = await t.evaluate(() => {
            const dezard = { ...cardDatabase.find((c) => c.id === 1129), uid: 'dezard-2' };
            dezard._battleDestructionCount = 2;
            const richie = { ...cardDatabase.find((c) => c.id === 1130), uid: 'richie-fromhand-1' };
            gameState.playerMonsterField = [{ card: dezard, position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.playerHand = [richie];
            gameState.playerGraveyard = [];
            gameState.phase = 'main1';
            gameState.currentPlayer = 'player';
            const ctx = DuelEngine.makeContext('player', { card: dezard, index: 0, zone: 'monster' });
            DuelEngine.getDefinition(1129).activate(ctx);
            return {
                dezardInGraveyard: gameState.playerGraveyard.some((c) => c.uid === 'dezard-2'),
                richieOnFieldSlot0: gameState.playerMonsterField[0] && gameState.playerMonsterField[0].card.uid === 'richie-fromhand-1',
                handEmpty: gameState.playerHand.length === 0
            };
        });
        t.assert(dezardActivateResult.dezardInGraveyard, 'Great Dezard tributato deve finire nel Cimitero');
        t.assert(dezardActivateResult.richieOnFieldSlot0, 'Fushioh Richie deve essere Special Summonato esattamente nello slot liberato da Great Dezard');
        t.assert(dezardActivateResult.handEmpty, 'Fushioh Richie deve essere rimosso dalla mano dopo il Special Summon');

        // Fushioh Richie (1130): non può essere Evocata Normalmente.
        const richieCannotNormalSummon = await t.evaluate(() => !!DuelEngine.getDefinition(1130).cannotNormalSummon);
        t.assert(richieCannotNormalSummon, 'Fushioh Richie non deve poter essere Evocata Normalmente');

        // Ignition: si gira a faccia in giù in Difesa, una volta per turno.
        const richieSelfFlipResult = await t.evaluate(() => {
            const richie = { ...cardDatabase.find((c) => c.id === 1130), uid: 'richie-flip-1' };
            gameState.playerMonsterField = [{ card: richie, position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.phase = 'main1';
            gameState.currentPlayer = 'player';
            const ctx = DuelEngine.makeContext('player', { card: richie, index: 0, zone: 'monster' });
            const canFlipDown = DuelEngine.getDefinition(1130).canActivate(ctx);
            DuelEngine.getDefinition(1130).activate(ctx);
            const slot = gameState.playerMonsterField[0];
            const canFlipDownAgainSameTurn = DuelEngine.getDefinition(1130).canActivate(DuelEngine.makeContext('player', { card: richie, index: 0, zone: 'monster' }));
            return {
                canFlipDown,
                isFaceDownNow: slot.isFaceDown,
                positionNow: slot.position,
                canFlipDownAgainSameTurn
            };
        });
        t.assert(richieSelfFlipResult.canFlipDown, 'Fushioh Richie scoperta deve poter attivare l\'Ignition per girarsi a faccia in giù');
        t.assert(richieSelfFlipResult.isFaceDownNow && richieSelfFlipResult.positionNow === 'defense', 'Dopo l\'attivazione deve essere a faccia in giù in Posizione di Difesa');
        t.assert(!richieSelfFlipResult.canFlipDownAgainSameTurn, 'Non deve poter usare di nuovo l\'Ignition nello stesso turno (una volta per turno)');

        // onFlip: quando torna scoperta, Special Summon 1 mostro Zombie dal Cimitero (se presente).
        const richieFlipUpWithZombieResult = await t.evaluate(() => {
            const richie = { ...cardDatabase.find((c) => c.id === 1130), uid: 'richie-flipup-1' };
            const zombie = { ...cardDatabase.find((c) => c.type === 'monster' && c.race === 'Zombie' && c.id !== 1130 && !c.extraDeck), uid: 'zombie-grave-1' };
            gameState.playerMonsterField = [{ card: richie, position: 'defense', isFaceDown: false }, null, null, null, null];
            gameState.playerGraveyard = [zombie];
            const ctx = DuelEngine.makeContext('player', { card: richie, slotIndex: 0 });
            DuelEngine.getDefinition(1130).onFlip(ctx);
            return {
                zombieOnField: gameState.playerMonsterField.some((s) => s && s.card.uid === 'zombie-grave-1'),
                zombieRemovedFromGrave: !gameState.playerGraveyard.some((c) => c.uid === 'zombie-grave-1')
            };
        });
        t.assert(richieFlipUpWithZombieResult.zombieOnField, 'Quando Fushioh Richie torna scoperta deve Special Summonare 1 mostro Zombie dal Cimitero');
        t.assert(richieFlipUpWithZombieResult.zombieRemovedFromGrave, 'Il mostro Zombie Special Summonato deve essere rimosso dal Cimitero');

        const richieFlipUpNoZombieResult = await t.evaluate(() => {
            const richie = { ...cardDatabase.find((c) => c.id === 1130), uid: 'richie-flipup-2' };
            const nonZombie = { ...cardDatabase.find((c) => c.type === 'monster' && c.race !== 'Zombie' && !c.extraDeck), uid: 'nonzombie-grave-1' };
            gameState.playerMonsterField = [{ card: richie, position: 'defense', isFaceDown: false }, null, null, null, null];
            gameState.playerGraveyard = [nonZombie];
            const ctx = DuelEngine.makeContext('player', { card: richie, slotIndex: 0 });
            DuelEngine.getDefinition(1130).onFlip(ctx);
            return { fieldUnchanged: gameState.playerMonsterField.filter((s) => s).length === 1 };
        });
        t.assert(richieFlipUpNoZombieResult.fieldUnchanged, 'NON deve Special Summonare nulla se non c\'è alcun mostro Zombie nel Cimitero');
    }
};
