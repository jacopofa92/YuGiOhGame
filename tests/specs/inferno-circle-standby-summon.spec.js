// Cerchio degli Inferi (id 498), clausola ricorrente: "una volta per
// turno, durante la Standby Phase: OGNI giocatore può Special Summon 1
// mostro dal proprio Cimitero, ignorandone le condizioni di Evocazione,
// ma bandiscilo quando lascia il campo". Verifica onStandbyPhase (per
// il controllore) + onOpponentStandbyPhase (per l'avversario, "ogni
// giocatore" include entrambi i lati) e il nuovo
// redirectToBanishIfFlagged (duel-engine.js) da 3 percorsi diversi:
// distruzione (destroyMonster), Sacrificio (notifySacrificedForTribute),
// ritorno in mano (returnMonsterToHand).
module.exports = {
    name: 'Cerchio degli Inferi: Special Summon ricorrente in Standby Phase per entrambi i lati, bandita quando lascia il Terreno (id 498)',
    async run(t) {
        // 1) onStandbyPhase: il CONTROLLORE special-summona dal proprio Cimitero.
        const r1 = await t.evaluate(() => {
            const circle = { ...cardDatabase.find((c) => c.id === 498), uid: 'circle-1' };
            const corpse = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck), uid: 'corpse-1' };
            gameState.playerSTField = [{ card: circle, isFaceDown: false, setOnTurn: gameState.turn - 1 }, null, null, null, null];
            gameState.playerMonsterField = [null, null, null, null, null];
            gameState.playerGraveyard = [corpse];
            const ctx = DuelEngine.makeContext('player', { card: circle });
            DuelEngine.getDefinition(498).onStandbyPhase(ctx);
            const slot = gameState.playerMonsterField.find((s) => s && s.card.uid === 'corpse-1');
            return { summoned: !!slot, flagged: slot ? !!slot.card.mustBanishOnLeavingField : false, graveEmpty: gameState.playerGraveyard.length === 0 };
        });
        t.assert(r1.summoned, 'onStandbyPhase deve Special Summonare 1 mostro dal Cimitero del controllore');
        t.assert(r1.flagged, 'Il mostro Special Summonato deve portare il flag mustBanishOnLeavingField');
        t.assert(r1.graveEmpty, 'Il mostro deve lasciare il Cimitero');

        // 2) onOpponentStandbyPhase: durante la Standby Phase del BOT,
        // Cerchio degli Inferi (controllato dal player) fa summonare
        // anche il BOT dal SUO proprio Cimitero ("ogni giocatore").
        const r2 = await t.evaluate(() => {
            const circle = { ...cardDatabase.find((c) => c.id === 498), uid: 'circle-2' };
            const corpse = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck), uid: 'corpse-2' };
            gameState.playerSTField = [{ card: circle, isFaceDown: false, setOnTurn: gameState.turn - 1 }, null, null, null, null];
            gameState.botMonsterField = [null, null, null, null, null];
            gameState.botGraveyard = [corpse];
            // onOpponentStandbyPhase riceve ctx.owner = controllore (player) e
            // ctx.standbyOwner = chi vive la fase (bot) — stessa forma di makeContext
            // usata da firePhaseTrigger (duel-engine.js) per questo hook.
            const ctx = DuelEngine.makeContext('player', { card: circle, standbyOwner: 'bot' });
            DuelEngine.getDefinition(498).onOpponentStandbyPhase(ctx);
            const slot = gameState.botMonsterField.find((s) => s && s.card.uid === 'corpse-2');
            return { summoned: !!slot, graveEmpty: gameState.botGraveyard.length === 0 };
        });
        t.assert(r2.summoned, "Cerchio degli Inferi deve far Special Summonare anche l'avversario dal SUO Cimitero, durante la SUA Standby Phase");
        t.assert(r2.graveEmpty, 'Il Cimitero del bot deve perdere il mostro appena Special Summonato');

        // 3) Redirect alla Zona Bandite: distruzione da effetto Carta.
        const r3 = await t.evaluate(() => {
            const flagged = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck), uid: 'flagged-3', mustBanishOnLeavingField: true };
            gameState.playerMonsterField = [{ card: flagged, position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.playerGraveyard = [];
            gameState.playerBanished = [];
            const ctx = DuelEngine.makeContext('bot', {});
            ctx.destroyMonster('player', 0);
            return {
                inBanished: gameState.playerBanished.some((c) => c.uid === 'flagged-3'),
                inGraveyard: gameState.playerGraveyard.some((c) => c.uid === 'flagged-3')
            };
        });
        t.assert(r3.inBanished, 'Un mostro col flag deve finire bandito, non nel Cimitero, quando viene distrutto');
        t.assert(!r3.inGraveyard, 'Non deve restare (nemmeno temporaneamente in modo osservabile) nel Cimitero');

        // 4) Redirect: Sacrificio per Evocazione Tributo.
        const r4 = await t.evaluate(() => {
            const flagged = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck), uid: 'flagged-4', mustBanishOnLeavingField: true };
            gameState.playerGraveyard = [flagged];
            gameState.playerBanished = [];
            DuelEngine.notifySacrificedForTribute('player', flagged);
            return {
                inBanished: gameState.playerBanished.some((c) => c.uid === 'flagged-4'),
                inGraveyard: gameState.playerGraveyard.some((c) => c.uid === 'flagged-4')
            };
        });
        t.assert(r4.inBanished, 'Un mostro col flag, appena sacrificato (già in Cimitero), deve essere spostato in Zona Bandite');
        t.assert(!r4.inGraveyard, 'Non deve restare nel Cimitero dopo il redirect');

        // 5) Redirect: ritorno in mano.
        const r5 = await t.evaluate(() => {
            const flagged = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck), uid: 'flagged-5', mustBanishOnLeavingField: true };
            gameState.playerMonsterField = [{ card: flagged, position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.playerHand = [];
            gameState.playerBanished = [];
            DuelEngine.actions.returnMonsterToHand('player', 0);
            return {
                inBanished: gameState.playerBanished.some((c) => c.uid === 'flagged-5'),
                inHand: gameState.playerHand.some((c) => c.uid === 'flagged-5')
            };
        });
        t.assert(r5.inBanished, 'Un mostro col flag deve finire bandito invece che tornare in mano');
        t.assert(!r5.inHand, 'Non deve mai raggiungere davvero la mano');

        // 6) Una volta per turno: un secondo tentativo nello stesso turno,
        // stesso beneficiario, non deve produrre un secondo Special Summon.
        const r6 = await t.evaluate(() => {
            const circle = { ...cardDatabase.find((c) => c.id === 498), uid: 'circle-6' };
            const corpseA = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck), uid: 'corpseA-6' };
            const corpseB = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck), uid: 'corpseB-6' };
            gameState.playerSTField = [{ card: circle, isFaceDown: false, setOnTurn: gameState.turn - 1 }, null, null, null, null];
            gameState.playerMonsterField = [null, null, null, null, null];
            gameState.playerGraveyard = [corpseA, corpseB];
            const ctx = DuelEngine.makeContext('player', { card: circle });
            DuelEngine.getDefinition(498).onStandbyPhase(ctx);
            DuelEngine.getDefinition(498).onStandbyPhase(ctx);
            return gameState.playerMonsterField.filter((s) => s).length;
        });
        t.assert(r6 === 1, `Nello stesso turno deve scattare una sola volta per beneficiario (letti ${r6} mostri sul campo)`);
    }
};
