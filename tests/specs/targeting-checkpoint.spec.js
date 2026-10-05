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

        // Gardna, testo vero: "una Magia che prende di mira questa carta
        // coperta (e nessun'altra carta)". Il limite riguarda i bersagli
        // della Magia, NON le altre carte coperte sul Terreno — la versione
        // precedente lo leggeva al contrario.
        const r5 = await t.evaluate(() => {
            const gardna = (uid) => ({ ...cardDatabase.find((c) => c.id === 115), uid });
            const magia = { ...cardDatabase.find((c) => c.type === 'spell'), uid: 'magia-g' };
            const trappola = { ...cardDatabase.find((c) => c.type === 'trap'), uid: 'trappola-g' };
            const out = {};
            // Con una Trappola coperta accanto: si protegge lo stesso, e si gira in Difesa scoperta.
            gameState.botMonsterField = [{ card: gardna('g-a'), position: 'defense', isFaceDown: true }, null, null, null, null];
            gameState.botSTField = [{ card: { ...trappola, uid: 'set-accanto' }, isFaceDown: true, setOnTurn: 0 }, null, null, null, null];
            const d1 = DuelEngine.makeContext('player', { card: magia }).declareTarget('bot', 0, { totalTargetCount: 1 });
            const s1 = gameState.botMonsterField[0];
            out.conTrappolaAccanto = { allowed: d1.allowed, scoperta: s1 && !s1.isFaceDown, difesa: s1 && s1.position === 'defense' };
            // Magia con DUE bersagli: non la nega.
            gameState.botMonsterField = [{ card: gardna('g-b'), position: 'defense', isFaceDown: true }, null, null, null, null];
            gameState.botSTField = [null, null, null, null, null];
            const d2 = DuelEngine.makeContext('player', { card: magia }).declareTarget('bot', 0, { totalTargetCount: 2 });
            out.dueBersagli = { allowed: d2.allowed, ancoraCoperta: gameState.botMonsterField[0].isFaceDown };
            // Una Trappola non è una Magia: nessuna reazione.
            const d3 = DuelEngine.makeContext('player', { card: trappola }).declareTarget('bot', 0, { totalTargetCount: 1 });
            out.trappola = d3.allowed;
            // Scoperta: nessuna reazione.
            gameState.botMonsterField = [{ card: gardna('g-c'), position: 'defense', isFaceDown: false }, null, null, null, null];
            out.scopertaGia = DuelEngine.makeContext('player', { card: magia }).declareTarget('bot', 0, { totalTargetCount: 1 }).allowed;
            return out;
        });
        t.assert(r5.conTrappolaAccanto.allowed === false && r5.conTrappolaAccanto.scoperta && r5.conTrappolaAccanto.difesa,
            `Gardna nega la Magia anche con un'altra carta coperta sul suo Terreno, e si gira scoperta in Difesa: ${JSON.stringify(r5.conTrappolaAccanto)}`);
        t.assert(r5.dueBersagli.allowed === true && r5.dueBersagli.ancoraCoperta,
            `Gardna non nega una Magia che prende di mira anche altre carte: ${JSON.stringify(r5.dueBersagli)}`);
        t.assert(r5.trappola === true, 'Gardna non reagisce a una Trappola');
        t.assert(r5.scopertaGia === true, 'Gardna scoperta non reagisce');

        // Seconda clausola, in una battaglia vera: attaccata e sopravvissuta,
        // a fine Damage Step passa in Posizione di Attacco.
        const r6 = await t.evaluate(() => new Promise((ok) => {
            const gardna = { ...cardDatabase.find((c) => c.id === 115), uid: 'g-battaglia' };
            const attaccante = { ...cardDatabase.find((c) => c.type === 'monster' && !c.effect && c.attack === 1800), uid: 'att-g' };
            gameState.currentPlayer = 'player';
            gameState.phase = 'battle';
            gameState.playerLP = 8000;
            gameState.botLP = 8000;
            gameState.playerMonsterField = [{ card: attaccante, position: 'attack', isFaceDown: false, hasAttacked: false }, null, null, null, null];
            gameState.botMonsterField = [{ card: gardna, position: 'defense', isFaceDown: true }, null, null, null, null];
            gameState.botSTField = [null, null, null, null, null];
            resolveAttack('player', 0, 0, () => {
                const s = gameState.botMonsterField[0];
                ok({ inCampo: !!s && s.card.uid === 'g-battaglia', posizione: s && s.position, scoperta: s && !s.isFaceDown });
            });
        }));
        t.assert(r6.inCampo && r6.posizione === 'attack' && r6.scoperta,
            `Gardna attaccata e sopravvissuta passa in Posizione di Attacco: ${JSON.stringify(r6)}`);
    }
};
