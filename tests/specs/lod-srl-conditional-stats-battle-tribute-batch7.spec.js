// Settima ondata prima serie: 7 Mostri Effetto minori (id 1060-1066).
// Verifica il nuovo tracker generico gameState.battleDestroyedThisTurnFor
// (Sentinella Cremisi) e il riuso di infrastruttura già esistente
// (gameState.atkDefBonus, returnSpellTrapToHand, onStandbyPhase,
// requiresLifePointsToAttack, ctx.destroyTargetedMonster).
module.exports = {
    name: 'Settima ondata prima serie: statistiche condizionali, tributo su distruzione in battaglia (id 1060-1066)',
    async run(t) {
        // Insetto dalle 8 Chele (1060): ATK/DEF diventano 1000 senza altri Insetti; restano 2000/2000 con un altro Insetto in campo.
        const arsenalBugResult = await t.evaluate(() => {
            const bug = { ...cardDatabase.find((c) => c.id === 1060), uid: 'bug-1' };
            const otherInsect = { ...cardDatabase.find((c) => c.type === 'monster' && c.race === 'Insetto' && c.id !== 1060), uid: 'insect-2' };
            gameState.playerMonsterField = [{ card: bug, position: 'attack', isFaceDown: false }, null, null, null, null];
            DuelEngine.recomputeStaticEffects();
            const atkAlone = DuelEngine.getEffectiveAtk(bug);
            const defAlone = DuelEngine.getEffectiveDef ? DuelEngine.getEffectiveDef(bug) : null;

            gameState.playerMonsterField = [{ card: bug, position: 'attack', isFaceDown: false }, { card: otherInsect, position: 'attack', isFaceDown: false }, null, null, null];
            DuelEngine.recomputeStaticEffects();
            const atkWithOther = DuelEngine.getEffectiveAtk(bug);
            return { atkAlone: atkAlone, defAlone: defAlone, atkWithOther: atkWithOther };
        });
        t.assert(arsenalBugResult.atkAlone === 1000, `Insetto dalle 8 Chele senza altri Insetti deve avere ATK 1000 (rilevato ${arsenalBugResult.atkAlone})`);
        if (arsenalBugResult.defAlone !== null) t.assert(arsenalBugResult.defAlone === 1000, `Insetto dalle 8 Chele senza altri Insetti deve avere DEF 1000 (rilevata ${arsenalBugResult.defAlone})`);
        t.assert(arsenalBugResult.atkWithOther === 2000, `Insetto dalle 8 Chele con un altro Insetto in campo deve restare a 2000 ATK (rilevato ${arsenalBugResult.atkWithOther})`);

        // Shock di Byser (1061): quando Evocata, fa tornare in mano OGNI carta coperta di ENTRAMBI i lati.
        const byserShockResult = await t.evaluate(() => {
            const byser = { ...cardDatabase.find((c) => c.id === 1061), uid: 'byser-1' };
            const filler = cardDatabase.find((c) => c.type === 'spell' || c.type === 'trap');
            gameState.playerSTField = [{ card: { ...filler, uid: 'p-st-1' }, isFaceDown: true }, null, null, null, null];
            gameState.botSTField = [{ card: { ...filler, uid: 'b-st-1' }, isFaceDown: true }, null, null, null, null];
            gameState.playerHand = [];
            gameState.botHand = [];
            const ctx = DuelEngine.makeContext('player', { card: byser });
            DuelEngine.getDefinition(1061).onSummon(ctx);
            return {
                playerStCleared: !gameState.playerSTField.some((s) => s),
                botStCleared: !gameState.botSTField.some((s) => s),
                playerHandHas: gameState.playerHand.some((c) => c.uid === 'p-st-1'),
                botHandHas: gameState.botHand.some((c) => c.uid === 'b-st-1')
            };
        });
        t.assert(byserShockResult.playerStCleared && byserShockResult.botStCleared, 'Shock di Byser deve svuotare la zona Magia/Trappola coperta di ENTRAMBI i lati');
        t.assert(byserShockResult.playerHandHas && byserShockResult.botHandHas, 'Le carte coperte devono tornare nella mano del rispettivo proprietario');

        // Sparajongler Esplosivo (1062): attivabile SOLO in Standby Phase, si tributa e distrugge 2 mostri con ATK <= 1000.
        const blastJugglerResult = await t.evaluate(() => {
            const juggler = { ...cardDatabase.find((c) => c.id === 1062), uid: 'juggler-1' };
            const weak1 = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck), uid: 'weak-1', attack: 500 };
            const weak2 = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck), uid: 'weak-2', attack: 1000 };
            const strong = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck), uid: 'strong-1', attack: 2000 };
            gameState.playerMonsterField = [{ card: juggler, position: 'attack', isFaceDown: false }, { card: weak1, position: 'attack', isFaceDown: false }, null, null, null];
            gameState.botMonsterField = [{ card: weak2, position: 'attack', isFaceDown: false }, { card: strong, position: 'attack', isFaceDown: false }, null, null, null];
            gameState.phase = 'main1';
            gameState.currentPlayer = 'player';
            const ctxWrongPhase = DuelEngine.makeContext('player', { card: juggler, index: 0 });
            const canActivateWrongPhase = DuelEngine.getDefinition(1062).canActivate(ctxWrongPhase);

            gameState.phase = 'standby';
            window.DuelEngineUI = null;
            const ctx = DuelEngine.makeContext('player', { card: juggler, index: 0 });
            const canActivateStandby = DuelEngine.getDefinition(1062).canActivate(ctx);
            DuelEngine.getDefinition(1062).activate(ctx);
            return {
                canActivateWrongPhase: canActivateWrongPhase,
                canActivateStandby: canActivateStandby,
                jugglerTributed: !gameState.playerMonsterField.some((s) => s && s.card.uid === 'juggler-1'),
                weak1Destroyed: !gameState.playerMonsterField.some((s) => s && s.card.uid === 'weak-1'),
                weak2Destroyed: !gameState.botMonsterField.some((s) => s && s.card.uid === 'weak-2'),
                strongSurvived: gameState.botMonsterField.some((s) => s && s.card.uid === 'strong-1')
            };
        });
        t.assert(!blastJugglerResult.canActivateWrongPhase, 'Sparajongler Esplosivo NON deve attivarsi fuori dalla propria Standby Phase');
        t.assert(blastJugglerResult.canActivateStandby, 'Sparajongler Esplosivo deve attivarsi nella propria Standby Phase');
        t.assert(blastJugglerResult.jugglerTributed, 'Sparajongler Esplosivo deve tributarsi');
        t.assert(blastJugglerResult.weak1Destroyed && blastJugglerResult.weak2Destroyed, 'Deve distruggere ENTRAMBI i mostri con ATK 1000 o meno (di entrambi i lati)');
        t.assert(blastJugglerResult.strongSurvived, 'Il mostro con ATK 2000 deve sopravvivere (fuori condizione)');

        // Sentinella Cremisi (1063): si tributa per rimandare in fondo al Deck un mostro distrutto in battaglia questo turno.
        const crimsonSentryResult = await t.evaluate(() => {
            const sentry = { ...cardDatabase.find((c) => c.id === 1063), uid: 'sentry-1' };
            const fallen = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck), uid: 'fallen-1' };
            gameState.playerMonsterField = [{ card: sentry, position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.playerGraveyard = [fallen];
            gameState.playerDeck = [];
            gameState.battleDestroyedThisTurnFor = { player: [fallen], bot: [] };
            gameState.phase = 'main1';
            gameState.currentPlayer = 'player';
            window.DuelEngineUI = null;
            const ctx = DuelEngine.makeContext('player', { card: sentry, index: 0 });
            const canActivate = DuelEngine.getDefinition(1063).canActivate(ctx);
            DuelEngine.getDefinition(1063).activate(ctx);
            return {
                canActivate: canActivate,
                sentryTributed: !gameState.playerMonsterField.some((s) => s && s.card.uid === 'sentry-1'),
                fallenBackInDeck: gameState.playerDeck.length === 1 && gameState.playerDeck[0].uid === 'fallen-1',
                fallenRemovedFromGrave: !gameState.playerGraveyard.some((c) => c.uid === 'fallen-1')
            };
        });
        t.assert(crimsonSentryResult.canActivate, 'Sentinella Cremisi deve potersi attivare se ha un mostro distrutto in battaglia questo turno nel Cimitero');
        t.assert(crimsonSentryResult.sentryTributed, 'Sentinella Cremisi deve tributarsi');
        t.assert(crimsonSentryResult.fallenBackInDeck, 'Il mostro caduto in battaglia deve tornare nel Deck');
        t.assert(crimsonSentryResult.fallenRemovedFromGrave, 'Il mostro caduto in battaglia deve lasciare il Cimitero');

        // Nota: l'azzeramento di gameState.battleDestroyedThisTurnFor ad
        // ogni changeTurn() non è testato direttamente qui — changeTurn è
        // una delle funzioni resa no-op da freezeNaturalGameLoop() nella
        // harness (vedi tests/README.md, "un'insidia reale già presa in
        // questa suite"), quindi chiamarla da un test non eserciterebbe
        // il vero reset. Segue lo stesso identico schema "per il resto
        // del turno" già usato da ~10 altri flag in changeTurn()
        // (game-flow.js), nessuno dei quali ha un test dedicato al reset.

        // Sirena Curatrice (1064) / Fata Danzante (1065): guadagno LP alla propria Standby Phase.
        const standbyLifeGainResult = await t.evaluate(() => {
            const mermaid = { ...cardDatabase.find((c) => c.id === 1064), uid: 'mermaid-1' };
            const fairyAttack = { ...cardDatabase.find((c) => c.id === 1065), uid: 'fairy-1' };
            const fairyDefense = { ...cardDatabase.find((c) => c.id === 1065), uid: 'fairy-2' };
            gameState.playerLP = 8000;
            const mermaidCtx = DuelEngine.makeContext('player', { card: mermaid, slot: { position: 'attack' } });
            DuelEngine.getDefinition(1064).onStandbyPhase(mermaidCtx);
            const lpAfterMermaid = gameState.playerLP;

            const fairyAttackCtx = DuelEngine.makeContext('player', { card: fairyAttack, slot: { position: 'attack' } });
            DuelEngine.getDefinition(1065).onStandbyPhase(fairyAttackCtx);
            const lpAfterFairyAttackPosition = gameState.playerLP;

            const fairyDefenseCtx = DuelEngine.makeContext('player', { card: fairyDefense, slot: { position: 'defense' } });
            DuelEngine.getDefinition(1065).onStandbyPhase(fairyDefenseCtx);
            return { lpAfterMermaid: lpAfterMermaid, lpAfterFairyAttackPosition: lpAfterFairyAttackPosition, lpAfterFairyDefense: gameState.playerLP };
        });
        t.assert(standbyLifeGainResult.lpAfterMermaid === 8800, `Sirena Curatrice deve far guadagnare 800 LP (attesi 8800, rilevati ${standbyLifeGainResult.lpAfterMermaid})`);
        t.assert(standbyLifeGainResult.lpAfterFairyAttackPosition === 8800, 'Fata Danzante in Posizione di Attacco NON deve far guadagnare LP');
        t.assert(standbyLifeGainResult.lpAfterFairyDefense === 9800, `Fata Danzante in Posizione di Difesa deve far guadagnare 1000 LP (attesi 9800, rilevati ${standbyLifeGainResult.lpAfterFairyDefense})`);

        // Elfa Oscura (1066): riusa requiresLifePointsToAttack (nessun codice nuovo, solo verifica del flag dichiarato).
        const darkElfFlag = await t.evaluate(() => DuelEngine.getDefinition(1066).requiresLifePointsToAttack === 1000);
        t.assert(darkElfFlag, 'Elfa Oscura deve dichiarare requiresLifePointsToAttack: 1000');
    }
};
