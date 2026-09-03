// ctx.destroyTargetedMonster (duel-engine.js): combina declareTarget(...)
// + destroyMonster(...) in una sola chiamata, per il caso più comune
// "un effetto sceglie 1 mostro come bersaglio e lo distrugge" — nato per
// evitare che scrivendo una carta nuova ci si dimentichi la danza in due
// mosse (dichiara il bersaglio PRIMA, distruggilo DOPO), lasciando quella
// carta invisibile al checkpoint di targeting condiviso (Gran Scudo
// Gardna, Signore dei D., ecc.). Verifica che si comporti IDENTICO a
// declareTarget+destroyMonster scritti a mano: distruzione normale,
// bersaglio protetto (rifiutato), bersaglio ridiretto (Specchietto della
// Fata).
module.exports = {
    name: 'ctx.destroyTargetedMonster: distruzione normale, bersaglio protetto, bersaglio ridiretto',
    async run(t) {
        // 1) Caso normale: distrugge il bersaglio, torna { allowed: true, card }.
        const r1 = await t.evaluate(() => {
            const source = { ...cardDatabase.find((c) => c.type === 'spell'), uid: 'source-1' };
            const target = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck), uid: 'target-1' };
            gameState.botMonsterField = [{ card: target, position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.botGraveyard = [];
            const ctx = DuelEngine.makeContext('player', { card: source });
            const result = ctx.destroyTargetedMonster('bot', 0, { totalTargetCount: 1 });
            return {
                allowed: result.allowed,
                cardName: result.card ? result.card.name : null,
                expectedName: target.name,
                leftField: !gameState.botMonsterField.some((s) => s && s.card.uid === 'target-1'),
                inGraveyard: gameState.botGraveyard.some((c) => c.uid === 'target-1')
            };
        });
        t.assert(r1.allowed, 'Il caso normale deve essere permesso');
        t.assert(r1.cardName === r1.expectedName, `Deve tornare la carta effettivamente distrutta per il log — attesa "${r1.expectedName}", letta "${r1.cardName}"`);
        t.assert(r1.leftField, 'Il bersaglio deve lasciare il Terreno');
        t.assert(r1.inGraveyard, 'Il bersaglio deve finire nel Cimitero');

        // 2) Bersaglio protetto (es. Obelisk, id 30, cannotBeTargetedByCardEffects):
        // deve rifiutare senza distruggere nulla.
        const r2 = await t.evaluate(() => {
            const source2 = { ...cardDatabase.find((c) => c.type === 'spell'), uid: 'source-2' };
            const obelisk = { ...cardDatabase.find((c) => c.id === 30), uid: 'obelisk-2' };
            gameState.botMonsterField = [{ card: obelisk, position: 'attack', isFaceDown: false }, null, null, null, null];
            const ctx = DuelEngine.makeContext('player', { card: source2 });
            const result = ctx.destroyTargetedMonster('bot', 0, { totalTargetCount: 1 });
            return {
                allowed: result.allowed,
                card: result.card,
                stillOnField: gameState.botMonsterField.some((s) => s && s.card.uid === 'obelisk-2')
            };
        });
        t.assert(!r2.allowed, 'Un bersaglio immune al targeting (Obelisk) deve rifiutare la chiamata');
        t.assert(r2.card === null, 'Nessuna carta deve risultare distrutta quando il bersaglio si sottrae');
        t.assert(r2.stillOnField, 'Obelisk deve restare in campo');

        // 3) Bersaglio ridiretto (Specchietto della Fata, id 235): la carta
        // EFFETTIVAMENTE distrutta deve essere quella nuova, non quella
        // passata in ingresso. Specchietto della Fata reagisce dalla zona
        // ST del CONTROLLORE del bersaglio (protegge un proprio mostro),
        // non da quella di chi ha attivato la Magia — va quindi Set sullo
        // stesso lato del bersaglio originale (bot), mentre la Magia
        // attivante deve appartenere all'altro giocatore (canActivate di
        // id 235 richiede sourceOwner !== proprio owner).
        const r3 = await t.evaluate(() => {
            const source3 = { ...cardDatabase.find((c) => c.type === 'spell'), uid: 'source-3' };
            const fairyMirror = { ...cardDatabase.find((c) => c.id === 235), uid: 'mirror-3' };
            const originalTarget = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck && c.id !== 30 && c.id !== 31 && c.id !== 472), uid: 'original-3' };
            const redirectedTarget = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck && c.id !== 30 && c.id !== 31 && c.id !== 472), uid: 'redirected-3' };
            gameState.botSTField = [{ card: fairyMirror, isFaceDown: true, setOnTurn: gameState.turn - 1 }, null, null, null, null];
            gameState.playerMonsterField = [null, null, null, null, null];
            gameState.botMonsterField = [{ card: originalTarget, position: 'attack', isFaceDown: false }, { card: redirectedTarget, position: 'attack', isFaceDown: false }, null, null, null];
            gameState.botGraveyard = [];
            const ctx = DuelEngine.makeContext('player', { card: source3 });
            const result = ctx.destroyTargetedMonster('bot', 0, { totalTargetCount: 1 });
            return {
                allowed: result.allowed,
                destroyedName: result.card ? result.card.name : null,
                originalStillThere: gameState.botMonsterField.some((s) => s && s.card.uid === 'original-3'),
                redirectedDestroyed: !gameState.botMonsterField.some((s) => s && s.card.uid === 'redirected-3')
            };
        });
        t.assert(r3.allowed, 'Con un redirect valido, la chiamata deve restare permessa');
        t.assert(r3.originalStillThere, 'Il bersaglio ORIGINALE deve restare in campo (Specchietto della Fata lo ha sottratto)');
        t.assert(r3.redirectedDestroyed, 'Deve essere distrutto il bersaglio RIDIRETTO, non quello originale');
    }
};
