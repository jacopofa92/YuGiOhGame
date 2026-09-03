// Uovo Giurassico Miracoloso (id 808): "finché scoperta sul Terreno,
// questa carta non può essere bandita" — protegge SOLO dal bando "dal
// Terreno" (mostro), non dal Cimitero/mano/Deck. Verifica il nuovo
// blockBanishFromField (card-effects.js) sui 2 percorsi più concreti:
// bando permanente (Guerriero D.D. id 179, dopo una battaglia) e bando
// temporaneo (Buco Dimensionale id 201) — e conferma che un mostro
// NORMALE nello stesso identico scenario resta bandibile come prima
// (nessun over-blocking), e che il bando DAL CIMITERO di 808 stessa non
// è mai stato toccato (il testo protegge solo "sul Terreno").
module.exports = {
    name: "Uovo Giurassico Miracoloso non può essere bandita dal Terreno, ma resta bandibile altrove (id 808)",
    async run(t) {
        // 1) Guerriero D.D. (179): normalmente bandisce se stesso E il
        // mostro avversario dopo aver combattuto. Se l'avversario è 808,
        // deve restare sul Terreno invece di essere bandito.
        const r1 = await t.evaluate(() => {
            const ddWarrior = { ...cardDatabase.find((c) => c.id === 179), uid: 'ddwarrior-1' };
            const egg = { ...cardDatabase.find((c) => c.id === 808), uid: 'egg-1' };
            gameState.playerMonsterField = [{ card: ddWarrior, position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.botMonsterField = [{ card: egg, position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.playerBanished = [];
            gameState.botBanished = [];
            const ctx = DuelEngine.makeContext('player', { card: ddWarrior, opponentSurvived: true, opponentCard: egg });
            DuelEngine.getDefinition(179).onBattled(ctx);
            return {
                eggStillOnField: gameState.botMonsterField.some((s) => s && s.card.uid === 'egg-1'),
                eggBanished: gameState.botBanished.some((c) => c.uid === 'egg-1'),
                ddWarriorBanished: gameState.playerBanished.some((c) => c.uid === 'ddwarrior-1')
            };
        });
        t.assert(r1.eggStillOnField, "Uovo Giurassico Miracoloso deve restare sul Terreno, Guerriero D.D. non deve poterla bandire");
        t.assert(!r1.eggBanished, 'Non deve finire nella Zona Bandite');
        t.assert(r1.ddWarriorBanished, 'Guerriero D.D. deve comunque bandire SE STESSO normalmente (solo il bersaglio avversario è protetto)');

        // 2) Stesso scenario, ma con un mostro NORMALE al posto di 808:
        // deve essere bandito come sempre (nessun over-blocking).
        const r2 = await t.evaluate(() => {
            const ddWarrior2 = { ...cardDatabase.find((c) => c.id === 179), uid: 'ddwarrior-2' };
            const normalMonster = { ...cardDatabase.find((c) => c.type === 'monster' && c.id !== 808 && !c.extraDeck), uid: 'normal-2' };
            gameState.playerMonsterField = [{ card: ddWarrior2, position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.botMonsterField = [{ card: normalMonster, position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.botBanished = [];
            const ctx = DuelEngine.makeContext('player', { card: ddWarrior2, opponentSurvived: true, opponentCard: normalMonster });
            DuelEngine.getDefinition(179).onBattled(ctx);
            return gameState.botBanished.some((c) => c.uid === 'normal-2');
        });
        t.assert(r2, 'Un mostro NORMALE nello stesso scenario deve essere bandito normalmente');

        // 3) Buco Dimensionale (201, bando TEMPORANEO): 808 sola in campo
        // -> nessun bando, la carta resta al suo posto.
        const r3 = await t.evaluate(() => {
            const dimHole = { ...cardDatabase.find((c) => c.id === 201), uid: 'dimhole-3' };
            const egg3 = { ...cardDatabase.find((c) => c.id === 808), uid: 'egg-3' };
            gameState.playerMonsterField = [{ card: egg3, position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.playerBanished = [];
            const ctx = DuelEngine.makeContext('player', { card: dimHole });
            DuelEngine.getDefinition(201).activate(ctx);
            return {
                stillOnField: gameState.playerMonsterField.some((s) => s && s.card.uid === 'egg-3'),
                banished: gameState.playerBanished.some((c) => c.uid === 'egg-3')
            };
        });
        t.assert(r3.stillOnField, 'Buco Dimensionale non deve poter bandire temporaneamente Uovo Giurassico Miracoloso');
        t.assert(!r3.banished, 'Non deve finire (nemmeno temporaneamente) nella Zona Bandite');

        // 4) Il bando DAL CIMITERO di 808 stessa resta permesso: il testo
        // reale protegge solo "finché scoperta sul Terreno".
        const r4 = await t.evaluate(() => {
            const egg4 = { ...cardDatabase.find((c) => c.id === 808), uid: 'egg-4' };
            gameState.playerGraveyard = [egg4];
            gameState.playerBanished = [];
            const ctx = DuelEngine.makeContext('player', {});
            ctx.graveyard('player').splice(0, 1);
            ctx.banish('player', egg4);
            return gameState.playerBanished.some((c) => c.uid === 'egg-4');
        });
        t.assert(r4, 'Il bando dal Cimitero deve restare permesso: la protezione vale solo "finché scoperta sul Terreno"');
    }
};
