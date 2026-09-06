// Sesta ondata prima serie: 14 Mostri Effetto minori (id 1046-1059).
// Verifica i meccanismi genuinamente nuovi: il nuovo hook condiviso
// def.onControlChangedToOpponent (Ameba/Griggle), il nuovo store
// generico gameState.pendingStandbyAtkBuffs (Tuorlo Mucoso), e il riuso
// di infrastruttura già esistente (ctx.destroyedByOpponentCard,
// ctx.discardedByOwner, gameState.directAttackAllowedUids,
// instantlyDestroysFaceDownDefender) applicato a queste carte.
module.exports = {
    name: 'Sesta ondata prima serie: cambio controllo, buff a Standby ritardato, distruzione in battaglia (id 1046-1059)',
    async run(t) {
        // Ameba (1046): infligge 2000 danni quando il SUO controllo passa
        // all'avversario, una volta sola finché resta scoperta.
        const amebaResult = await t.evaluate(() => {
            const ameba = { ...cardDatabase.find((c) => c.id === 1046), uid: 'ameba-1' };
            gameState.playerMonsterField = [{ card: ameba, position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.botMonsterField = [null, null, null, null, null];
            gameState.playerLP = 8000;
            const firstSwap = DuelEngine.actions.takeControl('bot', 'player', 0, false);
            const lpAfterFirst = gameState.playerLP;
            // Rimanda la carta al player e ripete il cambio controllo: il
            // secondo swap NON deve infliggere altri 2000 danni (once-only).
            DuelEngine.actions.takeControl('player', 'bot', 0, false);
            DuelEngine.actions.takeControl('bot', 'player', 0, false);
            return { firstSwap: firstSwap, lpAfterFirst: lpAfterFirst, lpAfterSecondSwap: gameState.playerLP };
        });
        t.assert(amebaResult.firstSwap, 'Il primo cambio di controllo di Ameba deve riuscire');
        t.assert(amebaResult.lpAfterFirst === 6000, `Ameba deve infliggere 2000 danni al vecchio controllore al primo cambio (LP attesi 6000, rilevati ${amebaResult.lpAfterFirst})`);
        t.assert(amebaResult.lpAfterSecondSwap === 6000, 'Ameba NON deve infliggere altri 2000 danni a un secondo cambio di controllo (effetto usabile una sola volta)');

        // Griggle (1047): stesso hook, ma guadagna 3000 LP il NUOVO controllore.
        const griggleResult = await t.evaluate(() => {
            const griggle = { ...cardDatabase.find((c) => c.id === 1047), uid: 'griggle-1' };
            gameState.playerMonsterField = [{ card: griggle, position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.botMonsterField = [null, null, null, null, null];
            gameState.botLP = 8000;
            DuelEngine.actions.takeControl('bot', 'player', 0, false);
            return gameState.botLP;
        });
        t.assert(griggleResult === 11000, `Griggle deve far guadagnare 3000 LP al NUOVO controllore (attesi 11000, rilevati ${griggleResult})`);

        // Serpente Elettrico (1048): scartato da un effetto Carta
        // dell'AVVERSARIO -> pesca 2. Scartato da un effetto proprio -> nessuna pesca.
        const electricSnakeResult = await t.evaluate(() => {
            const filler = cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck);
            const snake1 = { ...cardDatabase.find((c) => c.id === 1048), uid: 'snake-1' };
            gameState.playerDeck = [{ ...filler, uid: 'deck-1' }, { ...filler, uid: 'deck-2' }];
            gameState.playerHand = [];
            const ctxOpp = DuelEngine.makeContext('player', { card: snake1, discardedByOwner: 'bot' });
            DuelEngine.getDefinition(1048).onSentToGraveyardFromHand(ctxOpp);
            const drawnByOpponentDiscard = gameState.playerHand.length;

            const snake2 = { ...cardDatabase.find((c) => c.id === 1048), uid: 'snake-2' };
            gameState.playerHand = [];
            const ctxSelf = DuelEngine.makeContext('player', { card: snake2, discardedByOwner: 'player' });
            DuelEngine.getDefinition(1048).onSentToGraveyardFromHand(ctxSelf);
            return { drawnByOpponentDiscard: drawnByOpponentDiscard, drawnBySelfDiscard: gameState.playerHand.length };
        });
        t.assert(electricSnakeResult.drawnByOpponentDiscard === 2, `Serpente Elettrico deve pescare 2 carte se scartato da un effetto avversario (rilevate ${electricSnakeResult.drawnByOpponentDiscard})`);
        t.assert(electricSnakeResult.drawnBySelfDiscard === 0, 'Serpente Elettrico NON deve pescare se scartato da un proprio effetto');

        // La Fanciulla Infelice (1049): distrutta in battaglia -> Battle Phase termina subito.
        // Distrutta da un effetto Carta -> nessun effetto.
        const unhappyMaidenResult = await t.evaluate(() => {
            const maiden = { ...cardDatabase.find((c) => c.id === 1049), uid: 'maiden-1' };
            const attacker = cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck);
            gameState.phase = 'battle';
            const ctxBattle = DuelEngine.makeContext('player', { card: maiden, destroyedByOpponentCard: attacker });
            DuelEngine.getDefinition(1049).onDestroy(ctxBattle);
            const phaseAfterBattleDestroy = gameState.phase;

            gameState.phase = 'battle';
            const ctxEffect = DuelEngine.makeContext('player', { card: maiden });
            DuelEngine.getDefinition(1049).onDestroy(ctxEffect);
            return { phaseAfterBattleDestroy: phaseAfterBattleDestroy, phaseAfterEffectDestroy: gameState.phase };
        });
        t.assert(unhappyMaidenResult.phaseAfterBattleDestroy !== 'battle', 'La Fanciulla Infelice distrutta in battaglia deve terminare subito la Battle Phase');
        t.assert(unhappyMaidenResult.phaseAfterEffectDestroy === 'battle', 'La Fanciulla Infelice distrutta da un effetto Carta NON deve terminare la Battle Phase');

        // Drago della Truppa (1050): distrutto in battaglia -> Special Summon un'altra copia dal Deck.
        const troopDragonResult = await t.evaluate(() => {
            const dragon = { ...cardDatabase.find((c) => c.id === 1050), uid: 'troop-1' };
            const copy = { ...cardDatabase.find((c) => c.id === 1050), uid: 'troop-deck-copy' };
            gameState.playerDeck = [copy];
            gameState.playerMonsterField = [null, null, null, null, null];
            const ctx = DuelEngine.makeContext('player', { card: dragon, destroyedByOpponentCard: cardDatabase.find((c) => c.type === 'monster') });
            DuelEngine.getDefinition(1050).onDestroy(ctx);
            return gameState.playerMonsterField.some((s) => s && s.card.uid === 'troop-deck-copy');
        });
        t.assert(troopDragonResult, 'Drago della Truppa deve Special Summonare un\'altra copia dal Deck quando distrutto in battaglia');

        // Momonga Agile (1051): distrutto in battaglia -> +1000 LP e Special Summon TUTTE le copie nel Deck, coperte in Difesa.
        const momongaResult = await t.evaluate(() => {
            const momonga = { ...cardDatabase.find((c) => c.id === 1051), uid: 'momonga-1' };
            const copy1 = { ...cardDatabase.find((c) => c.id === 1051), uid: 'momonga-deck-1' };
            const copy2 = { ...cardDatabase.find((c) => c.id === 1051), uid: 'momonga-deck-2' };
            gameState.playerDeck = [copy1, copy2];
            gameState.playerMonsterField = [null, null, null, null, null];
            gameState.playerLP = 8000;
            const ctx = DuelEngine.makeContext('player', { card: momonga, destroyedByOpponentCard: cardDatabase.find((c) => c.type === 'monster') });
            DuelEngine.getDefinition(1051).onDestroy(ctx);
            const slot1 = gameState.playerMonsterField.find((s) => s && s.card.uid === 'momonga-deck-1');
            const slot2 = gameState.playerMonsterField.find((s) => s && s.card.uid === 'momonga-deck-2');
            return { lp: gameState.playerLP, bothSummoned: !!slot1 && !!slot2, bothFaceDownDefense: !!slot1 && slot1.isFaceDown && slot1.position === 'defense' && !!slot2 && slot2.isFaceDown && slot2.position === 'defense' };
        });
        t.assert(momongaResult.lp === 9000, `Momonga Agile deve far guadagnare 1000 LP (attesi 9000, rilevati ${momongaResult.lp})`);
        t.assert(momongaResult.bothSummoned, 'Momonga Agile deve Special Summonare ENTRAMBE le copie nel Deck');
        t.assert(momongaResult.bothFaceDownDefense, 'Le copie Special Summonate devono essere coperte e in Posizione di Difesa');

        // Des Lacooda (1052): Ignition una volta per turno per coprirsi; onFlip pesca 1.
        const desLacoodaResult = await t.evaluate(() => {
            const filler = cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck);
            const lacooda = { ...cardDatabase.find((c) => c.id === 1052), uid: 'lacooda-1' };
            gameState.playerMonsterField = [{ card: lacooda, position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.phase = 'main1';
            gameState.currentPlayer = 'player';
            gameState.turn = 1;
            const ctx = DuelEngine.makeContext('player', { card: lacooda, index: 0 });
            const canActivateBefore = DuelEngine.getDefinition(1052).canActivate(ctx);
            DuelEngine.getDefinition(1052).activate(ctx);
            const flippedToDefense = gameState.playerMonsterField[0].isFaceDown && gameState.playerMonsterField[0].position === 'defense';
            const canActivateAgainSameTurn = DuelEngine.getDefinition(1052).canActivate(ctx);

            gameState.playerDeck = [{ ...filler, uid: 'lacooda-deck-1' }];
            gameState.playerHand = [];
            const flipCtx = DuelEngine.makeContext('player', { card: lacooda, index: 0 });
            DuelEngine.getDefinition(1052).onFlip(flipCtx);
            return { canActivateBefore: canActivateBefore, flippedToDefense: flippedToDefense, canActivateAgainSameTurn: canActivateAgainSameTurn, drewOnFlip: gameState.playerHand.length };
        });
        t.assert(desLacoodaResult.canActivateBefore, 'Des Lacooda deve poter attivare la propria Ignition nella propria Main Phase');
        t.assert(desLacoodaResult.flippedToDefense, 'Des Lacooda deve mettersi coperta in Posizione di Difesa');
        t.assert(!desLacoodaResult.canActivateAgainSameTurn, 'Des Lacooda NON deve poter riattivare la stessa Ignition due volte nello stesso turno');
        t.assert(desLacoodaResult.drewOnFlip === 1, 'Des Lacooda deve pescare 1 carta quando Evocata Flip');

        // Attacco diretto incondizionato: Cavallo dell'Incubo (1053), Servitore del Catabolismo (1056), Tuorlo Mucoso (1058).
        const directAttackResult = await t.evaluate(() => {
            const horse = { ...cardDatabase.find((c) => c.id === 1053), uid: 'horse-1' };
            const servant = { ...cardDatabase.find((c) => c.id === 1056), uid: 'servant-1' };
            const yolk = { ...cardDatabase.find((c) => c.id === 1058), uid: 'yolk-1' };
            gameState.playerMonsterField = [{ card: horse, position: 'attack', isFaceDown: false }, { card: servant, position: 'attack', isFaceDown: false }, { card: yolk, position: 'attack', isFaceDown: false }, null, null];
            gameState.botMonsterField = [null, null, null, null, null];
            DuelEngine.recomputeStaticEffects();
            return {
                horse: !!gameState.directAttackAllowedUids['horse-1'],
                servant: !!gameState.directAttackAllowedUids['servant-1'],
                yolk: !!gameState.directAttackAllowedUids['yolk-1']
            };
        });
        t.assert(directAttackResult.horse, 'Cavallo dell\'Incubo deve poter attaccare direttamente');
        t.assert(directAttackResult.servant, 'Servitore del Catabolismo deve poter attaccare direttamente');
        t.assert(directAttackResult.yolk, 'Tuorlo Mucoso deve poter attaccare direttamente');

        // Samurai Sasuke (1055): riusa instantlyDestroysFaceDownDefender (id 398/718).
        const sasukeFlag = await t.evaluate(() => DuelEngine.getDefinition(1055).instantlyDestroysFaceDownDefender === true);
        t.assert(sasukeFlag, 'Samurai Sasuke deve dichiarare instantlyDestroysFaceDownDefender: true');

        // Tirapiedi Alato (1054): si tributa, dà +700/+700 a 1 mostro Demone scoperto.
        const wingedMinionResult = await t.evaluate(() => {
            const minion = { ...cardDatabase.find((c) => c.id === 1054), uid: 'minion-1' };
            const fiend = { ...cardDatabase.find((c) => c.type === 'monster' && c.race === 'Demone' && !c.extraDeck), uid: 'fiend-1', attack: 1000, defense: 1000 };
            gameState.playerMonsterField = [{ card: minion, position: 'attack', isFaceDown: false }, { card: fiend, position: 'attack', isFaceDown: false }, null, null, null];
            gameState.playerGraveyard = [];
            window.DuelEngineUI = null;
            const ctx = DuelEngine.makeContext('player', { card: minion, index: 0 });
            DuelEngine.getDefinition(1054).activate(ctx);
            return { atk: fiend.attack, def: fiend.defense, minionTributed: !gameState.playerMonsterField.some((s) => s && s.card.uid === 'minion-1') };
        });
        t.assert(wingedMinionResult.atk === 1700 && wingedMinionResult.def === 1700, `Tirapiedi Alato deve dare +700 ATK/DEF al mostro Demone bersaglio (rilevati ATK ${wingedMinionResult.atk}/DEF ${wingedMinionResult.def})`);
        t.assert(wingedMinionResult.minionTributed, 'Tirapiedi Alato deve tributarsi');

        // Nave di Yomi (1057): distrutta in battaglia -> distrugge il mostro che l'ha distrutta.
        const yomiShipResult = await t.evaluate(() => {
            const ship = { ...cardDatabase.find((c) => c.id === 1057), uid: 'ship-1' };
            const attacker = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck), uid: 'attacker-1' };
            gameState.botMonsterField = [{ card: attacker, position: 'attack', isFaceDown: false }, null, null, null, null];
            const ctx = DuelEngine.makeContext('player', { card: ship, destroyedByOpponentCard: attacker });
            DuelEngine.getDefinition(1057).onDestroy(ctx);
            return !gameState.botMonsterField.some((s) => s && s.card.uid === 'attacker-1');
        });
        t.assert(yomiShipResult, 'Nave di Yomi deve distruggere il mostro che l\'ha distrutta in battaglia');

        // Tuorlo Mucoso (1058): infligge danno diretto -> +1000 ATK, ma SOLO alla PROPRIA prossima Standby Phase.
        const mucusYolkResult = await t.evaluate(() => {
            const yolk = { ...cardDatabase.find((c) => c.id === 1058), uid: 'yolk-2', attack: 0 };
            gameState.playerMonsterField = [{ card: yolk, position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.pendingStandbyAtkBuffs = [];
            const ctx = DuelEngine.makeContext('player', { card: yolk, targetIndex: -1 });
            DuelEngine.getDefinition(1058).onDealsBattleDamage(ctx);
            const atkBeforeStandby = yolk.attack;
            // Standby Phase del BOT: non deve ancora applicarsi (è "la TUA prossima", non quella dell'avversario).
            DuelEngine.processPendingStandbyAtkBuffs('bot');
            const atkAfterOpponentStandby = yolk.attack;
            // Standby Phase del PLAYER (il vero controllore): ora sì.
            DuelEngine.processPendingStandbyAtkBuffs('player');
            return { atkBeforeStandby: atkBeforeStandby, atkAfterOpponentStandby: atkAfterOpponentStandby, atkAfterOwnStandby: yolk.attack };
        });
        t.assert(mucusYolkResult.atkBeforeStandby === 0, 'Tuorlo Mucoso non deve guadagnare ATK immediatamente dopo il danno da battaglia');
        t.assert(mucusYolkResult.atkAfterOpponentStandby === 0, 'Tuorlo Mucoso NON deve guadagnare ATK alla Standby Phase dell\'AVVERSARIO');
        t.assert(mucusYolkResult.atkAfterOwnStandby === 1000, `Tuorlo Mucoso deve guadagnare 1000 ATK alla PROPRIA prossima Standby Phase (rilevati ${mucusYolkResult.atkAfterOwnStandby})`);
    }
};
