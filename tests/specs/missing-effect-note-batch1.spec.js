// Prima ondata di chiusura dei "missingEffectNote" (audit trasversale,
// non il backlog "prima serie"): id 1029, 902, 1041, 100. Un test per
// meccanismo, non uno per carta.
module.exports = {
    name: 'Chiusura missingEffectNote — batch 1: attacco diretto sotto controllo, LP dal Cimitero in Standby, bando post-battaglia, una volta per turno per nome (id 1029/902/1041/100)',
    async run(t) {
        // Fauci dell'Oscura Dipartita (1029): il mostro rubato può attaccare
        // direttamente finché sotto controllo, il permesso scade quando il
        // controllo torna al proprietario originale.
        const jowlsResult = await t.evaluate(() => {
            const jowls = { ...cardDatabase.find((c) => c.id === 1029), uid: 'jowls-1' };
            const prey = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck), uid: 'prey-1' };
            gameState.playerMonsterField = [{ card: jowls, position: 'defense', isFaceDown: true }, null, null, null, null];
            gameState.botMonsterField = [{ card: prey, position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.grantDirectAttackWhileControlledUids = null;
            const ctx = DuelEngine.makeContext('player', { card: jowls, slotIndex: 0 });
            DuelEngine.getDefinition(1029).onFlip(ctx);
            const stolenOnPlayerField = gameState.playerMonsterField.some((s) => s && s.card.uid === 'prey-1');
            DuelEngine.recomputeStaticEffects();
            const canAttackDirectlyWhileControlled = !!(gameState.directAttackAllowedUids && gameState.directAttackAllowedUids['prey-1']);
            DuelEngine.processTemporaryControlReturns();
            DuelEngine.recomputeStaticEffects();
            const canAttackDirectlyAfterReturn = !!(gameState.directAttackAllowedUids && gameState.directAttackAllowedUids['prey-1']);
            const backOnBotField = gameState.botMonsterField.some((s) => s && s.card.uid === 'prey-1');
            return { stolenOnPlayerField, canAttackDirectlyWhileControlled, canAttackDirectlyAfterReturn, backOnBotField };
        });
        t.assert(jowlsResult.stolenOnPlayerField, 'Fauci dell\'Oscura Dipartita deve rubare il mostro avversario sul proprio Terreno');
        t.assert(jowlsResult.canAttackDirectlyWhileControlled, 'Il mostro rubato deve poter attaccare direttamente finché è sotto controllo');
        t.assert(jowlsResult.backOnBotField, 'Il mostro deve tornare al proprietario originale a fine controllo temporaneo');
        t.assert(!jowlsResult.canAttackDirectlyAfterReturn, 'Il permesso di attacco diretto NON deve sopravvivere al ritorno del mostro al proprietario originale');

        // Darklord Marie (902): guadagna 200 LP alla propria Standby Phase, anche dal Cimitero.
        const marieResult = await t.evaluate(() => {
            const marie = { ...cardDatabase.find((c) => c.id === 902), uid: 'marie-1' };
            gameState.playerGraveyard = [marie];
            gameState.playerLP = 8000;
            DuelEngine.firePhaseTrigger('onStandbyPhase', 'player');
            return gameState.playerLP;
        });
        t.assert(marieResult === 8200, `Darklord Marie deve far guadagnare 200 LP dalla Standby Phase mentre è nel Cimitero (rilevati ${marieResult})`);

        // Demone Minore (1041): il mostro che distrugge in battaglia viene bandito, non lasciato nel Cimitero.
        const lesserFiendResult = await t.evaluate(() => {
            const fiend = { ...cardDatabase.find((c) => c.id === 1041), uid: 'fiend-1' };
            const prey = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck), uid: 'lf-prey-1' };
            gameState.botGraveyard = [prey];
            gameState.botBanished = [];
            const ctx = DuelEngine.makeContext('player', { card: fiend, destroyedCard: prey, destroyedCardOwner: 'bot', destroyedWasAttackPosition: true });
            DuelEngine.getDefinition(1041).onDestroysMonsterByBattle(ctx);
            return {
                inGraveyard: gameState.botGraveyard.some((c) => c.uid === 'lf-prey-1'),
                banished: gameState.botBanished.some((c) => c.uid === 'lf-prey-1')
            };
        });
        t.assert(!lesserFiendResult.inGraveyard, 'Il mostro distrutto da Demone Minore in battaglia non deve restare nel Cimitero');
        t.assert(lesserFiendResult.banished, 'Il mostro distrutto da Demone Minore in battaglia deve finire bandito');

        // Armatura Guida d'Attacco (100): "1 per turno" condiviso per NOME (card.id), non per copia (uid) — due copie diverse condividono il limite.
        const attackGuidanceResult = await t.evaluate(() => {
            gameState.usedOncePerTurnEffect = {};
            const armor1 = { ...cardDatabase.find((c) => c.id === 100), uid: 'armor-1' };
            const armor2 = { ...cardDatabase.find((c) => c.id === 100), uid: 'armor-2' };
            const canFirstUse = DuelEngine.getDefinition(100).canActivate(DuelEngine.makeContext('player', { card: armor1 }));
            const attacker = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck), uid: 'atk-1' };
            gameState.playerMonsterField = [null, null, null, null, null];
            gameState.botMonsterField = [{ card: attacker, position: 'attack', isFaceDown: false, hasAttacked: false }, null, null, null, null];
            const declareCtx = DuelEngine.makeContext('player', { card: armor1, attackerOwner: 'bot', attackerIndex: 0, cancelAttack: () => {} });
            DuelEngine.getDefinition(100).onAttackDeclare(declareCtx);
            const canSecondUseSameCard = DuelEngine.getDefinition(100).canActivate(DuelEngine.makeContext('player', { card: armor1 }));
            const canSecondUseOtherCopy = DuelEngine.getDefinition(100).canActivate(DuelEngine.makeContext('player', { card: armor2 }));
            gameState.usedOncePerTurnEffect = {};
            const canAfterTurnReset = DuelEngine.getDefinition(100).canActivate(DuelEngine.makeContext('player', { card: armor1 }));
            return { canFirstUse, canSecondUseSameCard, canSecondUseOtherCopy, canAfterTurnReset };
        });
        t.assert(attackGuidanceResult.canFirstUse, 'Armatura Guida d\'Attacco deve poter attivarsi la prima volta nel turno');
        t.assert(!attackGuidanceResult.canSecondUseSameCard, 'Non deve poter attivarsi una seconda volta nello stesso turno con la stessa copia');
        t.assert(!attackGuidanceResult.canSecondUseOtherCopy, 'Il limite "1 per turno" è per NOME: una seconda copia diversa non deve poter attivarsi nello stesso turno');
        t.assert(attackGuidanceResult.canAfterTurnReset, 'Il limite deve azzerarsi al cambio turno (usedOncePerTurnEffect resettato)');
    }
};
