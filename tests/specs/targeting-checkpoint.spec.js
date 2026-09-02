// declareCardEffectTarget (duel-engine.js): il checkpoint di targeting
// condiviso da ~64 carte diverse. Protegge in un colpo solo i 3 floodgate
// che vi si appoggiano — protectsRaceFromTargeting (Signore dei D., id
// 353), cannotBeTargetedByCardEffects (i 3 Dei Egizi), e
// cannotBeTargetedBySpells (Guardiano Kay'est, id 285, SOLO contro le
// Magie) — più una vera reazione (Gran Scudo Gardna, id 115).
module.exports = {
    name: 'Checkpoint di targeting condiviso: floodgate e reazioni',
    async run(t) {
        const r1 = await t.evaluate(() => {
            const obelisk = { ...cardDatabase.find((c) => c.id === 30), uid: 'obelisk-check-1' };
            gameState.botMonsterField = [{ card: obelisk, position: 'attack', isFaceDown: false }, null, null, null, null];
            const fakeTrap = { ...cardDatabase.find((c) => c.type === 'trap'), uid: 'faketrap-1' };
            const sourceCtx = DuelEngine.makeContext('player', { card: fakeTrap });
            return sourceCtx.declareTarget('bot', 0, { totalTargetCount: 1 }).allowed;
        });
        t.assert(!r1, 'Obelisk deve essere immune al targeting da QUALUNQUE fonte, anche una Trappola');

        const r2 = await t.evaluate(() => {
            const kayest = { ...cardDatabase.find((c) => c.id === 285), uid: 'kayest-check-1' };
            const fakeSpell = { ...cardDatabase.find((c) => c.type === 'spell'), uid: 'fakespell-1' };
            gameState.botMonsterField = [{ card: kayest, position: 'attack', isFaceDown: false }, null, null, null, null];
            const sourceCtx = DuelEngine.makeContext('player', { card: fakeSpell });
            return sourceCtx.declareTarget('bot', 0, { totalTargetCount: 1 }).allowed;
        });
        t.assert(!r2, 'Guardiano Kay\'est deve essere immune al targeting SOLO dalle Magie');

        const r3 = await t.evaluate(() => {
            const kayest2 = { ...cardDatabase.find((c) => c.id === 285), uid: 'kayest-check-2' };
            const fakeTrap2 = { ...cardDatabase.find((c) => c.type === 'trap'), uid: 'faketrap-2' };
            gameState.botMonsterField = [{ card: kayest2, position: 'attack', isFaceDown: false }, null, null, null, null];
            const sourceCtx = DuelEngine.makeContext('player', { card: fakeTrap2 });
            return sourceCtx.declareTarget('bot', 0, { totalTargetCount: 1 }).allowed;
        });
        t.assert(r3, 'Guardiano Kay\'est deve restare bersagliabile da una Trappola (l\'immunità copre solo le Magie)');

        // Gran Scudo Gardna (115): una Magia che lo bersaglia viene rifiutata, lui stesso resta in campo.
        const r4 = await t.evaluate(() => {
            const gardna = { ...cardDatabase.find((c) => c.id === 115), uid: 'gardna-1' };
            const fakeSpell2 = { ...cardDatabase.find((c) => c.type === 'spell'), uid: 'fakespell-2' };
            gameState.botMonsterField = [{ card: gardna, position: 'defense', isFaceDown: true }, null, null, null, null];
            const sourceCtx = DuelEngine.makeContext('player', { card: fakeSpell2 });
            const decl = sourceCtx.declareTarget('bot', 0, { totalTargetCount: 1 });
            return { allowed: decl.allowed, gardnaStillThere: gameState.botMonsterField.some((s) => s && s.card.uid === 'gardna-1') };
        });
        t.assert(!r4.allowed, 'Gran Scudo Gardna deve rifiutare di essere scelto come bersaglio da una Magia');
        t.assert(r4.gardnaStillThere, 'Gran Scudo Gardna deve restare in campo dopo aver rifiutato il targeting');
    }
};
