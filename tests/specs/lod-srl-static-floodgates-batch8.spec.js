// Ottava ondata prima serie: 8 Mostri Effetto minori (id 1067-1074).
// Verifica il nuovo tracker gameState.spellsSentToGraveyardByOpponentThisTurnFor
// (Guardiana delle Fate) e il riuso di infrastruttura già esistente
// (gameState.cannotBeTargetedBySpellsUids/cannotAttackUids/atkDefBonus,
// slot.extraAttackGranted, onDealsBattleDamage).
module.exports = {
    name: 'Ottava ondata prima serie: floodgate statici, immunità condizionale, tributo su Magia distrutta (id 1067-1074)',
    async run(t) {
        // Scassinatori Scorpioni Oscuri (1067): infligge danno da battaglia -> manda 1 Magia dal Deck avversario al suo Cimitero.
        const burglarsResult = await t.evaluate(() => {
            const burglars = { ...cardDatabase.find((c) => c.id === 1067), uid: 'burglars-1' };
            const spellInDeck = cardDatabase.find((c) => c.type === 'spell');
            gameState.botDeck = [{ ...spellInDeck, uid: 'bot-spell-1' }];
            gameState.botGraveyard = [];
            const ctx = DuelEngine.makeContext('player', { card: burglars, opponent: 'bot' });
            DuelEngine.getDefinition(1067).onDealsBattleDamage(ctx);
            return { deckEmpty: gameState.botDeck.length === 0, inGraveyard: gameState.botGraveyard.some((c) => c.uid === 'bot-spell-1') };
        });
        t.assert(burglarsResult.deckEmpty, 'Scassinatori Scorpioni Oscuri deve rimuovere la Magia dal Deck avversario');
        t.assert(burglarsResult.inGraveyard, 'La Magia rimossa deve finire nel Cimitero avversario');

        // Guerriero degli Abissi (1068): immune al targeting delle Magie SOLO se "Umi" è scoperta.
        const deepseaWarriorResult = await t.evaluate(() => {
            const warrior = { ...cardDatabase.find((c) => c.id === 1068), uid: 'deepsea-1' };
            const umi = cardDatabase.find((c) => c.id === 497);
            gameState.playerMonsterField = [{ card: warrior, position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.playerFieldSpell = null;
            gameState.botFieldSpell = null;
            DuelEngine.recomputeStaticEffects();
            const immuneWithoutUmi = !!gameState.cannotBeTargetedBySpellsUids['deepsea-1'];

            gameState.playerFieldSpell = { card: { ...umi, uid: 'umi-1' }, isFaceDown: false };
            DuelEngine.recomputeStaticEffects();
            const immuneWithUmi = !!gameState.cannotBeTargetedBySpellsUids['deepsea-1'];
            return { immuneWithoutUmi: immuneWithoutUmi, immuneWithUmi: immuneWithUmi };
        });
        t.assert(!deepseaWarriorResult.immuneWithoutUmi, 'Guerriero degli Abissi NON deve essere immune alle Magie senza Umi');
        t.assert(deepseaWarriorResult.immuneWithUmi, 'Guerriero degli Abissi deve essere immune al targeting delle Magie con Umi scoperta');

        // Guardiana delle Fate (1069): si tributa per rimandare in fondo al Deck una Magia mandata al Cimitero da un effetto avversario.
        const fairyGuardianResult = await t.evaluate(() => {
            const guardian = { ...cardDatabase.find((c) => c.id === 1069), uid: 'guardian-1' };
            const lostSpell = { ...cardDatabase.find((c) => c.type === 'spell'), uid: 'lost-spell-1' };
            gameState.playerMonsterField = [{ card: guardian, position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.playerGraveyard = [lostSpell];
            gameState.playerDeck = [];
            gameState.spellsSentToGraveyardByOpponentThisTurnFor = { player: [lostSpell], bot: [] };
            gameState.phase = 'main1';
            gameState.currentPlayer = 'player';
            window.DuelEngineUI = null;
            const ctx = DuelEngine.makeContext('player', { card: guardian, index: 0 });
            const canActivate = DuelEngine.getDefinition(1069).canActivate(ctx);
            DuelEngine.getDefinition(1069).activate(ctx);
            return {
                canActivate: canActivate,
                guardianTributed: !gameState.playerMonsterField.some((s) => s && s.card.uid === 'guardian-1'),
                spellBackInDeck: gameState.playerDeck.length === 1 && gameState.playerDeck[0].uid === 'lost-spell-1',
                spellRemovedFromGrave: !gameState.playerGraveyard.some((c) => c.uid === 'lost-spell-1')
            };
        });
        t.assert(fairyGuardianResult.canActivate, 'Guardiana delle Fate deve potersi attivare con una Magia idonea nel Cimitero');
        t.assert(fairyGuardianResult.guardianTributed, 'Guardiana delle Fate deve tributarsi');
        t.assert(fairyGuardianResult.spellBackInDeck, 'La Magia deve tornare nel Deck');
        t.assert(fairyGuardianResult.spellRemovedFromGrave, 'La Magia deve lasciare il Cimitero');

        // Assalitore Lampo (1070): -400 ATK/DEF per ogni carta in mano.
        const flashAssailantResult = await t.evaluate(() => {
            const filler = cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck);
            const assailant = { ...cardDatabase.find((c) => c.id === 1070), uid: 'assailant-1' };
            gameState.playerMonsterField = [{ card: assailant, position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.playerHand = [{ ...filler, uid: 'h1' }, { ...filler, uid: 'h2' }, { ...filler, uid: 'h3' }];
            DuelEngine.recomputeStaticEffects();
            return { atk: DuelEngine.getEffectiveAtk(assailant), def: DuelEngine.getEffectiveDef(assailant) };
        });
        t.assert(flashAssailantResult.atk === 800, `Assalitore Lampo con 3 carte in mano deve avere 2000-1200=800 ATK (rilevato ${flashAssailantResult.atk})`);
        t.assert(flashAssailantResult.def === 800, `Assalitore Lampo con 3 carte in mano deve avere 2000-1200=800 DEF (rilevata ${flashAssailantResult.def})`);

        // Mummia dall'Ascia Gigante (1071): Ignition una volta per turno per coprirsi.
        const giantAxeMummyResult = await t.evaluate(() => {
            const mummy = { ...cardDatabase.find((c) => c.id === 1071), uid: 'mummy-1' };
            gameState.playerMonsterField = [{ card: mummy, position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.phase = 'main1';
            gameState.currentPlayer = 'player';
            const ctx = DuelEngine.makeContext('player', { card: mummy, index: 0 });
            const canActivateBefore = DuelEngine.getDefinition(1071).canActivate(ctx);
            DuelEngine.getDefinition(1071).activate(ctx);
            const flippedToDefense = gameState.playerMonsterField[0].isFaceDown && gameState.playerMonsterField[0].position === 'defense';
            const canActivateAgain = DuelEngine.getDefinition(1071).canActivate(ctx);
            return { canActivateBefore: canActivateBefore, flippedToDefense: flippedToDefense, canActivateAgain: canActivateAgain };
        });
        t.assert(giantAxeMummyResult.canActivateBefore, 'Mummia dall\'Ascia Gigante deve poter attivare la propria Ignition');
        t.assert(giantAxeMummyResult.flippedToDefense, 'Mummia dall\'Ascia Gigante deve coprirsi in Posizione di Difesa');
        t.assert(!giantAxeMummyResult.canActivateAgain, 'Mummia dall\'Ascia Gigante NON deve poter riattivare la stessa Ignition due volte nello stesso turno');

        // Tartaruga Gora (1072): blocca l'attacco dei mostri con ATK >= 1900 di ENTRAMBI i lati.
        const goraTurtleResult = await t.evaluate(() => {
            const turtle = { ...cardDatabase.find((c) => c.id === 1072), uid: 'turtle-1' };
            const strongOwn = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck), uid: 'strong-own', attack: 1900 };
            const strongOpp = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck), uid: 'strong-opp', attack: 2000 };
            const weakOpp = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck), uid: 'weak-opp', attack: 1000 };
            gameState.playerMonsterField = [{ card: turtle, position: 'attack', isFaceDown: false }, { card: strongOwn, position: 'attack', isFaceDown: false }, null, null, null];
            gameState.botMonsterField = [{ card: strongOpp, position: 'attack', isFaceDown: false }, { card: weakOpp, position: 'attack', isFaceDown: false }, null, null, null];
            DuelEngine.recomputeStaticEffects();
            return {
                ownBlocked: !!gameState.cannotAttackUids['strong-own'],
                oppBlocked: !!gameState.cannotAttackUids['strong-opp'],
                weakOppFree: !gameState.cannotAttackUids['weak-opp']
            };
        });
        t.assert(goraTurtleResult.ownBlocked, 'Tartaruga Gora deve bloccare anche un proprio mostro con ATK 1900+');
        t.assert(goraTurtleResult.oppBlocked, 'Tartaruga Gora deve bloccare un mostro avversario con ATK 1900+');
        t.assert(goraTurtleResult.weakOppFree, 'Tartaruga Gora NON deve bloccare un mostro con ATK sotto 1900');

        // Ala Grigia (1073): scarta 1 carta per ottenere un secondo attacco questo turno.
        const grayWingResult = await t.evaluate(() => {
            const filler = cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck);
            const wing = { ...cardDatabase.find((c) => c.id === 1073), uid: 'wing-1' };
            gameState.playerMonsterField = [{ card: wing, position: 'attack', isFaceDown: false, extraAttackGranted: false }, null, null, null, null];
            gameState.playerHand = [{ ...filler, uid: 'wing-hand-1' }];
            gameState.phase = 'main1';
            gameState.currentPlayer = 'player';
            const ctx = DuelEngine.makeContext('player', { card: wing, index: 0 });
            const canActivate = DuelEngine.getDefinition(1073).canActivate(ctx);
            DuelEngine.getDefinition(1073).activate(ctx);
            return {
                canActivate: canActivate,
                discarded: gameState.playerHand.length === 0,
                extraAttackGranted: gameState.playerMonsterField[0].extraAttackGranted === true
            };
        });
        t.assert(grayWingResult.canActivate, 'Ala Grigia deve potersi attivare nella propria Main Phase 1 con almeno 1 carta in mano');
        t.assert(grayWingResult.discarded, 'Ala Grigia deve scartare 1 carta');
        t.assert(grayWingResult.extraAttackGranted, 'Ala Grigia deve ottenere un secondo attacco questo turno (slot.extraAttackGranted)');

        // Hoshiningen (1074): +500 ATK a tutti i mostri LUCE, -400 ATK a tutti i mostri OSCURITÀ, di entrambi i lati.
        const hoshiningenResult = await t.evaluate(() => {
            const hoshi = { ...cardDatabase.find((c) => c.id === 1074), uid: 'hoshi-1' };
            const lightMonster = { ...cardDatabase.find((c) => c.type === 'monster' && c.attribute === 'LUCE' && !c.extraDeck), uid: 'light-1', attack: 1000 };
            const darkMonster = { ...cardDatabase.find((c) => c.type === 'monster' && c.attribute === 'OSCURITÀ' && !c.extraDeck), uid: 'dark-1', attack: 1000 };
            gameState.playerMonsterField = [{ card: hoshi, position: 'attack', isFaceDown: false }, { card: lightMonster, position: 'attack', isFaceDown: false }, null, null, null];
            gameState.botMonsterField = [{ card: darkMonster, position: 'attack', isFaceDown: false }, null, null, null, null];
            DuelEngine.recomputeStaticEffects();
            return { lightAtk: DuelEngine.getEffectiveAtk(lightMonster), darkAtk: DuelEngine.getEffectiveAtk(darkMonster), hoshiOwnAtk: DuelEngine.getEffectiveAtk(hoshi) };
        });
        t.assert(hoshiningenResult.lightAtk === 1500, `Il mostro LUCE deve guadagnare 500 ATK (attesi 1500, rilevati ${hoshiningenResult.lightAtk})`);
        t.assert(hoshiningenResult.darkAtk === 600, `Il mostro OSCURITÀ deve perdere 400 ATK (attesi 600, rilevati ${hoshiningenResult.darkAtk})`);
        t.assert(hoshiningenResult.hoshiOwnAtk === 1000, `Hoshiningen stessa è LUCE, deve guadagnare 500 ATK (attesi 500+500=1000, rilevati ${hoshiningenResult.hoshiOwnAtk})`);
    }
};
