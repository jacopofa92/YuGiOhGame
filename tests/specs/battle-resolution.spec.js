// Le 6 combinazioni base di risoluzione battaglia (attacco vince/perde/
// pareggia, contro Difesa distrutta/rimbalzata, attacco diretto) restano
// corrette — il cuore del motore, il primo a rompersi se qualcosa nella
// catena resolveAttack/resolveBattleDamage viene toccato per sbaglio.
module.exports = {
    name: 'Risoluzione battaglia: le 6 combinazioni base',
    async run(t) {
        async function runCase(setupFn, checkFn) {
            await t.evaluate(setupFn);
            await t.evaluate(() => { gameState.phase = 'battle'; });
            // resolveBattleDamage gira dentro un setTimeout(500) annidato in resolveAttack.
            await t.page.waitForTimeout(1200);
            return t.evaluate(checkFn);
        }

        const r1 = await runCase(() => {
            const strong = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck), attack: 3000, defense: 0, uid: 'atk1' };
            const weak = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck), attack: 500, defense: 0, uid: 'def1' };
            gameState.playerMonsterField = [{ card: strong, position: 'attack', isFaceDown: false, hasAttacked: false }, null, null, null, null];
            gameState.botMonsterField = [{ card: weak, position: 'attack', isFaceDown: false, hasAttacked: false }, null, null, null, null];
            window.__lpBefore = gameState.botLP;
            resolveAttack('player', 0, 0, () => {});
        }, () => ({ targetGone: gameState.botMonsterField[0] === null, lpDropped: gameState.botLP < window.__lpBefore, attackerStillThere: !!gameState.playerMonsterField[0] }));
        t.assert(r1.targetGone, '1: il difensore più debole deve essere distrutto');
        t.assert(r1.lpDropped, '1: i LP del difensore devono scendere');
        t.assert(r1.attackerStillThere, '1: l\'attaccante più forte deve sopravvivere');

        const r2 = await runCase(() => {
            const weak = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck), attack: 500, defense: 0, uid: 'atk2' };
            const strong = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck), attack: 3000, defense: 0, uid: 'def2' };
            gameState.playerMonsterField = [{ card: weak, position: 'attack', isFaceDown: false, hasAttacked: false }, null, null, null, null];
            gameState.botMonsterField = [{ card: strong, position: 'attack', isFaceDown: false, hasAttacked: false }, null, null, null, null];
            window.__lpBefore = gameState.playerLP;
            resolveAttack('player', 0, 0, () => {});
        }, () => ({ attackerGone: gameState.playerMonsterField[0] === null, lpDropped: gameState.playerLP < window.__lpBefore, targetStillThere: !!gameState.botMonsterField[0] }));
        t.assert(r2.attackerGone, '2: l\'attaccante più debole deve essere distrutto');
        t.assert(r2.lpDropped, '2: i LP dell\'attaccante devono scendere');
        t.assert(r2.targetStillThere, '2: il difensore più forte deve sopravvivere');

        const r3 = await runCase(() => {
            const a = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck), attack: 1500, defense: 0, uid: 'atk3' };
            const b = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck), attack: 1500, defense: 0, uid: 'def3' };
            gameState.playerMonsterField = [{ card: a, position: 'attack', isFaceDown: false, hasAttacked: false }, null, null, null, null];
            gameState.botMonsterField = [{ card: b, position: 'attack', isFaceDown: false, hasAttacked: false }, null, null, null, null];
            resolveAttack('player', 0, 0, () => {});
        }, () => ({ attackerGone: gameState.playerMonsterField[0] === null, targetGone: gameState.botMonsterField[0] === null }));
        t.assert(r3.attackerGone && r3.targetGone, '3: un pareggio deve distruggere entrambi i mostri');

        const r4 = await runCase(() => {
            const strong = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck), attack: 3000, defense: 0, uid: 'atk4' };
            const weakDef = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck), attack: 0, defense: 500, uid: 'def4' };
            gameState.playerMonsterField = [{ card: strong, position: 'attack', isFaceDown: false, hasAttacked: false }, null, null, null, null];
            gameState.botMonsterField = [{ card: weakDef, position: 'defense', isFaceDown: false, hasAttacked: false }, null, null, null, null];
            window.__lpBefore = gameState.botLP;
            resolveAttack('player', 0, 0, () => {});
        }, () => ({ targetGone: gameState.botMonsterField[0] === null, lpUnchanged: gameState.botLP === window.__lpBefore, attackerStillThere: !!gameState.playerMonsterField[0] }));
        t.assert(r4.targetGone, '4: il difensore in Difesa più debole deve essere distrutto');
        t.assert(r4.lpUnchanged, '4: nessun danno da battaglia contro un mostro in Difesa distrutto');
        t.assert(r4.attackerStillThere, '4: l\'attaccante deve sopravvivere');

        const r5 = await runCase(() => {
            const weak = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck), attack: 500, defense: 0, uid: 'atk5' };
            const strongDef = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck), attack: 0, defense: 3000, uid: 'def5' };
            gameState.playerMonsterField = [{ card: weak, position: 'attack', isFaceDown: false, hasAttacked: false }, null, null, null, null];
            gameState.botMonsterField = [{ card: strongDef, position: 'defense', isFaceDown: false, hasAttacked: false }, null, null, null, null];
            window.__lpBefore = gameState.playerLP;
            resolveAttack('player', 0, 0, () => {});
        }, () => ({ attackerStillThere: !!gameState.playerMonsterField[0], targetStillThere: !!gameState.botMonsterField[0], lpDropped: gameState.playerLP < window.__lpBefore }));
        t.assert(r5.attackerStillThere && r5.targetStillThere, '5: nessuno dei due deve essere distrutto quando la Difesa vince');
        t.assert(r5.lpDropped, '5: l\'attaccante deve comunque subire danno da rimbalzo');

        const r6 = await runCase(() => {
            const strong = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck), attack: 1000, defense: 0, uid: 'atk6' };
            gameState.playerMonsterField = [{ card: strong, position: 'attack', isFaceDown: false, hasAttacked: false }, null, null, null, null];
            gameState.botMonsterField = [null, null, null, null, null];
            window.__lpBefore = gameState.botLP;
            resolveAttack('player', 0, -1, () => {});
        }, () => ({ lpDropped: gameState.botLP < window.__lpBefore, attackerStillThere: !!gameState.playerMonsterField[0] }));
        t.assert(r6.lpDropped, '6: un attacco diretto deve infliggere danno');
        t.assert(r6.attackerStillThere, '6: l\'attaccante deve sopravvivere a un attacco diretto');
    }
};
