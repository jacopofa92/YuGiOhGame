// Decima ondata prima serie: 9 Mostri Effetto minori (id 1084-1092).
// Verifica il parametro `position` esteso su reviveFromGraveyardWithCountdown
// (Melma Rediviva) e il riuso di infrastruttura già esistente
// (dealDamage, takeControl permanente, destroyTargetedMonster,
// changePosition, grantTemporaryAtkDefBonus, onSpecialSummon no-op).
module.exports = {
    name: 'Decima ondata prima serie: rinascita ritardata in Difesa, controllo permanente, cambio Posizione (id 1084-1092)',
    async run(t) {
        // Minar (1084): scartato da effetto avversario -> 1000 danni. Da effetto proprio -> nessun danno.
        const minarResult = await t.evaluate(() => {
            const minar1 = { ...cardDatabase.find((c) => c.id === 1084), uid: 'minar-1' };
            gameState.botLP = 8000;
            DuelEngine.getDefinition(1084).onSentToGraveyardFromHand(DuelEngine.makeContext('player', { card: minar1, discardedByOwner: 'bot' }));
            const lpAfterOpponentDiscard = gameState.botLP;

            const minar2 = { ...cardDatabase.find((c) => c.id === 1084), uid: 'minar-2' };
            DuelEngine.getDefinition(1084).onSentToGraveyardFromHand(DuelEngine.makeContext('player', { card: minar2, discardedByOwner: 'player' }));
            return { lpAfterOpponentDiscard: lpAfterOpponentDiscard, lpAfterSelfDiscard: gameState.botLP };
        });
        t.assert(minarResult.lpAfterOpponentDiscard === 7000, `Minar deve infliggere 1000 danni se scartato da un effetto avversario (attesi 7000, rilevati ${minarResult.lpAfterOpponentDiscard})`);
        t.assert(minarResult.lpAfterSelfDiscard === 7000, 'Minar NON deve infliggere danno se scartato da un proprio effetto');

        // Mushroom Man #2 (1085): -300 LP ad ogni propria Standby Phase; Ignition in End Phase per passare il controllo pagando 500 LP, PERMANENTEMENTE.
        const mushroomResult = await t.evaluate(() => {
            const mushroom = { ...cardDatabase.find((c) => c.id === 1085), uid: 'mushroom-1' };
            gameState.playerLP = 8000;
            DuelEngine.getDefinition(1085).onStandbyPhase(DuelEngine.makeContext('player', { card: mushroom }));
            const lpAfterStandby = gameState.playerLP;

            gameState.playerMonsterField = [{ card: mushroom, position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.botMonsterField = [null, null, null, null, null];
            gameState.phase = 'end';
            gameState.currentPlayer = 'player';
            const ctx = DuelEngine.makeContext('player', { card: mushroom, index: 0 });
            const canActivate = DuelEngine.getDefinition(1085).canActivate(ctx);
            DuelEngine.getDefinition(1085).activate(ctx);
            const lpAfterTransfer = gameState.playerLP;
            const controlPassed = gameState.botMonsterField.some((s) => s && s.card.uid === 'mushroom-1') && !gameState.playerMonsterField.some((s) => s && s.card.uid === 'mushroom-1');
            // processTemporaryControlReturns (chiamata ad ogni cambio turno) NON deve riportarlo indietro: il controllo è permanente, mai registrato in gameState.temporaryControls.
            DuelEngine.processTemporaryControlReturns();
            const stillWithBotAfterTurn = gameState.botMonsterField.some((s) => s && s.card.uid === 'mushroom-1');
            return { lpAfterStandby: lpAfterStandby, canActivate: canActivate, lpAfterTransfer: lpAfterTransfer, controlPassed: controlPassed, stillWithBotAfterTurn: stillWithBotAfterTurn };
        });
        t.assert(mushroomResult.lpAfterStandby === 7700, `Mushroom Man #2 deve far perdere 300 LP alla propria Standby Phase (attesi 7700, rilevati ${mushroomResult.lpAfterStandby})`);
        t.assert(mushroomResult.canActivate, 'Mushroom Man #2 deve potersi attivare nella propria End Phase con LP sufficienti');
        t.assert(mushroomResult.lpAfterTransfer === 7200, `Mushroom Man #2 deve far pagare 500 LP per il trasferimento (attesi 7200, rilevati ${mushroomResult.lpAfterTransfer})`);
        t.assert(mushroomResult.controlPassed, 'Il controllo deve passare al bot');
        t.assert(mushroomResult.stillWithBotAfterTurn, 'Il controllo deve restare permanentemente al bot (non era mai stato registrato come temporaneo)');

        // Newdoria (1086): distrutta in battaglia -> distrugge 1 mostro a scelta sul Terreno.
        const newdoriaResult = await t.evaluate(() => {
            const newdoria = { ...cardDatabase.find((c) => c.id === 1086), uid: 'newdoria-1' };
            const target = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck), uid: 'newdoria-target' };
            gameState.playerMonsterField = [null, null, null, null, null];
            gameState.botMonsterField = [{ card: target, position: 'attack', isFaceDown: false }, null, null, null, null];
            window.DuelEngineUI = null;
            const ctx = DuelEngine.makeContext('player', { card: newdoria, destroyedByOpponentCard: cardDatabase.find((c) => c.type === 'monster') });
            DuelEngine.getDefinition(1086).onDestroy(ctx);
            return !gameState.botMonsterField.some((s) => s && s.card.uid === 'newdoria-target');
        });
        t.assert(newdoriaResult, 'Newdoria deve distruggere il mostro bersaglio quando distrutta in battaglia');

        // Nuvia la Malvagia (1087): si autodistrugge se Evocata Normalmente, sopravvive se Special Summonata; malus ATK proporzionale ai mostri avversari.
        const nuviaResult = await t.evaluate(() => {
            const nuviaNormal = { ...cardDatabase.find((c) => c.id === 1087), uid: 'nuvia-normal' };
            gameState.playerMonsterField = [{ card: nuviaNormal, position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.playerGraveyard = [];
            const ctxNormal = DuelEngine.makeContext('player', { card: nuviaNormal });
            DuelEngine.getDefinition(1087).onSummon(ctxNormal);
            const destroyedOnNormal = !gameState.playerMonsterField.some((s) => s && s.card.uid === 'nuvia-normal');

            const nuviaSpecial = { ...cardDatabase.find((c) => c.id === 1087), uid: 'nuvia-special' };
            const specialHandler = DuelEngine.getDefinition(1087).onSpecialSummon;
            gameState.playerMonsterField = [{ card: nuviaSpecial, position: 'attack', isFaceDown: false }, null, null, null, null];
            if (typeof specialHandler === 'function') specialHandler(DuelEngine.makeContext('player', { card: nuviaSpecial }));
            const survivedSpecial = gameState.playerMonsterField.some((s) => s && s.card.uid === 'nuvia-special');

            const oppMonster = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck), uid: 'nuvia-opp-1' };
            gameState.botMonsterField = [{ card: oppMonster, position: 'attack', isFaceDown: false }, null, null, null, null];
            DuelEngine.recomputeStaticEffects();
            const atkWithOneOpponent = DuelEngine.getEffectiveAtk(nuviaSpecial);
            return { destroyedOnNormal: destroyedOnNormal, survivedSpecial: survivedSpecial, atkWithOneOpponent: atkWithOneOpponent };
        });
        t.assert(nuviaResult.destroyedOnNormal, 'Nuvia la Malvagia deve autodistruggersi se Evocata Normalmente');
        t.assert(nuviaResult.survivedSpecial, 'Nuvia la Malvagia NON deve autodistruggersi se Special Summonata');
        t.assert(nuviaResult.atkWithOneOpponent === 1800, `Nuvia la Malvagia deve perdere 200 ATK per ogni mostro avversario (attesi 2000-200=1800, rilevati ${nuviaResult.atkWithOneOpponent})`);

        // Cavaliere Pinguino (1088): mandata al Cimitero dal Deck per un mill avversario -> rimescola Cimitero+Deck.
        const penguinResult = await t.evaluate(() => {
            const filler = cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck);
            const penguin = { ...cardDatabase.find((c) => c.id === 1088), uid: 'penguin-1' };
            gameState.playerDeck = [{ ...filler, uid: 'deck-remain-1' }];
            gameState.playerGraveyard = [{ ...filler, uid: 'grave-1' }, { ...filler, uid: 'grave-2' }];
            const ctx = DuelEngine.makeContext('player', { card: penguin, milledByOwner: 'bot' });
            DuelEngine.getDefinition(1088).onSentToGraveyardFromDeck(ctx);
            return { deckSize: gameState.playerDeck.length, graveyardEmpty: gameState.playerGraveyard.length === 0 };
        });
        t.assert(penguinResult.deckSize === 3, `Cavaliere Pinguino deve fondere Cimitero e Deck in un nuovo Deck (attesi 3, rilevati ${penguinResult.deckSize})`);
        t.assert(penguinResult.graveyardEmpty, 'Il Cimitero deve svuotarsi dopo la fusione');

        // Melma Rediviva (1089): distrutta in battaglia -> paga 1000 LP, rinasce coperta in Posizione di Difesa alla propria prossima Standby Phase.
        const revivalJamResult = await t.evaluate(() => {
            const jam = { ...cardDatabase.find((c) => c.id === 1089), uid: 'jam-1' };
            gameState.playerLP = 8000;
            gameState.playerGraveyard = [jam];
            gameState.playerMonsterField = [null, null, null, null, null];
            gameState.delayedGraveyardRevivals = [];
            const ctx = DuelEngine.makeContext('player', { card: jam, destroyedByOpponentCard: cardDatabase.find((c) => c.type === 'monster') });
            DuelEngine.getDefinition(1089).onDestroy(ctx);
            const lpAfterCost = gameState.playerLP;
            const removedFromGrave = !gameState.playerGraveyard.some((c) => c.uid === 'jam-1');
            DuelEngine.processDelayedGraveyardRevivals('player');
            const revivedSlot = gameState.playerMonsterField.find((s) => s && s.card.uid === 'jam-1');
            return { lpAfterCost: lpAfterCost, removedFromGrave: removedFromGrave, revivedFaceUpDefense: !!revivedSlot && !revivedSlot.isFaceDown && revivedSlot.position === 'defense' };
        });
        t.assert(revivalJamResult.lpAfterCost === 7000, `Melma Rediviva deve pagare 1000 LP (attesi 7000, rilevati ${revivalJamResult.lpAfterCost})`);
        t.assert(revivalJamResult.removedFromGrave, 'Melma Rediviva deve lasciare il Cimitero in attesa di rinascere');
        t.assert(revivalJamResult.revivedFaceUpDefense, 'Melma Rediviva deve rinascere scoperta in Posizione di Difesa (non Attacco) alla Standby Phase del proprio controllore');

        // Guardiano Reale (1090): Ignition una volta per turno per coprirsi; guadagna 300 ATK/DEF fino a fine turno quando Evocato Flip.
        const royalKeeperResult = await t.evaluate(() => {
            const keeper = { ...cardDatabase.find((c) => c.id === 1090), uid: 'keeper-1' };
            gameState.playerMonsterField = [{ card: keeper, position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.phase = 'main1';
            gameState.currentPlayer = 'player';
            const ctx = DuelEngine.makeContext('player', { card: keeper, index: 0 });
            const canActivateBefore = DuelEngine.getDefinition(1090).canActivate(ctx);
            DuelEngine.getDefinition(1090).activate(ctx);
            const flippedToDefense = gameState.playerMonsterField[0].isFaceDown && gameState.playerMonsterField[0].position === 'defense';

            const flipCtx = DuelEngine.makeContext('player', { card: keeper, index: 0 });
            DuelEngine.getDefinition(1090).onFlip(flipCtx);
            DuelEngine.recomputeStaticEffects();
            return { canActivateBefore: canActivateBefore, flippedToDefense: flippedToDefense, atk: DuelEngine.getEffectiveAtk(keeper), def: DuelEngine.getEffectiveDef(keeper) };
        });
        t.assert(royalKeeperResult.canActivateBefore, 'Guardiano Reale deve poter attivare la propria Ignition');
        t.assert(royalKeeperResult.flippedToDefense, 'Guardiano Reale deve coprirsi in Posizione di Difesa');
        t.assert(royalKeeperResult.atk === 1900 && royalKeeperResult.def === 2000, `Guardiano Reale deve guadagnare 300 ATK/DEF quando Evocato Flip (attesi 1900/2000, rilevati ${royalKeeperResult.atk}/${royalKeeperResult.def})`);

        // Ryu-Kishin Pagliaccio (1091): quando Evocata (Normale o Special), cambia la Posizione di Battaglia di 1 mostro scoperto.
        const ryuKishinResult = await t.evaluate(() => {
            const clown = { ...cardDatabase.find((c) => c.id === 1091), uid: 'clown-1' };
            const target = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck), uid: 'clown-target' };
            gameState.playerMonsterField = [{ card: clown, position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.botMonsterField = [{ card: target, position: 'attack', isFaceDown: false }, null, null, null, null];
            window.DuelEngineUI = null;
            const ctx = DuelEngine.makeContext('player', { card: clown });
            DuelEngine.getDefinition(1091).onSummon(ctx);
            return gameState.botMonsterField[0].position === 'defense';
        });
        t.assert(ryuKishinResult, 'Ryu-Kishin Pagliaccio deve cambiare la Posizione di Battaglia del mostro bersaglio');

        // Senju delle Mille Mani (1092): quando Evocata Normalmente/Flip, aggiunge 1 Mostro Rituale dal Deck alla mano. NON scatta con la Special Summon.
        const senjuResult = await t.evaluate(() => {
            const senju = { ...cardDatabase.find((c) => c.id === 1092), uid: 'senju-1' };
            const ritual = cardDatabase.find((c) => c.type === 'monster' && c.category === 'ritual');
            gameState.playerDeck = [{ ...ritual, uid: 'ritual-deck-1' }];
            gameState.playerHand = [];
            const ctx = DuelEngine.makeContext('player', { card: senju });
            DuelEngine.getDefinition(1092).onSummon(ctx);
            const addedToHand = gameState.playerHand.some((c) => c.uid === 'ritual-deck-1');

            gameState.playerDeck = [{ ...ritual, uid: 'ritual-deck-2' }];
            gameState.playerHand = [];
            const specialHandler = DuelEngine.getDefinition(1092).onSpecialSummon;
            if (typeof specialHandler === 'function') specialHandler(DuelEngine.makeContext('player', { card: senju }));
            const notAddedOnSpecial = gameState.playerHand.length === 0;
            return { addedToHand: addedToHand, notAddedOnSpecial: notAddedOnSpecial };
        });
        t.assert(senjuResult.addedToHand, 'Senju delle Mille Mani deve aggiungere 1 Mostro Rituale alla mano quando Evocata Normalmente');
        t.assert(senjuResult.notAddedOnSpecial, 'Senju delle Mille Mani NON deve aggiungere nulla se Special Summonata (onSpecialSummon è un no-op)');
    }
};
