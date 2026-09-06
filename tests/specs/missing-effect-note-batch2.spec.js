// Seconda ondata di chiusura dei "missingEffectNote": id 496 (Ala del
// Tiranno) e 1039 (Saggio della Frontiera). Un test per meccanismo.
module.exports = {
    name: 'Chiusura missingEffectNote — batch 2: autodistruzione dopo un attacco, protezione dai propri Guerrieri contro le Magie (id 496/1039)',
    async run(t) {
        // Ala del Tiranno (496): si autodistrugge in End Phase SOLO se il mostro equipaggiato ha attaccato un mostro (non direttamente) in questo turno.
        const wingResult = await t.evaluate(() => {
            const wing = { ...cardDatabase.find((c) => c.id === 496), uid: 'wing-1' };
            const dragon = { ...cardDatabase.find((c) => c.type === 'monster' && c.race === 'Drago' && !c.extraDeck), uid: 'dragon-1' };
            wing.equippedToOwner = 'player';
            wing.equippedToIndex = 0;
            gameState.playerMonsterField = [{ card: dragon, position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.playerSTField = [{ card: wing, isFaceDown: false }, null, null, null, null];
            gameState.playerGraveyard = [];
            gameState.attackedMonsterUidsThisTurn = new Set();

            const ctxNoAttack = DuelEngine.makeContext('player', { card: wing, index: 0, zone: 'st' });
            DuelEngine.getDefinition(496).onEndPhase(ctxNoAttack);
            const survivesWithoutAttack = gameState.playerSTField.some((s) => s && s.card.uid === 'wing-1');

            gameState.attackedMonsterUidsThisTurn.add('dragon-1');
            const ctxAfterAttack = DuelEngine.makeContext('player', { card: wing, index: 0, zone: 'st' });
            DuelEngine.getDefinition(496).onEndPhase(ctxAfterAttack);
            const destroyedAfterAttack = !gameState.playerSTField.some((s) => s && s.card.uid === 'wing-1');
            const inGraveyard = gameState.playerGraveyard.some((c) => c.uid === 'wing-1');
            return { survivesWithoutAttack, destroyedAfterAttack, inGraveyard };
        });
        t.assert(wingResult.survivesWithoutAttack, 'Ala del Tiranno NON deve autodistruggersi se il mostro equipaggiato non ha attaccato un mostro in questo turno');
        t.assert(wingResult.destroyedAfterAttack, 'Ala del Tiranno deve autodistruggersi in End Phase se il mostro equipaggiato ha attaccato un mostro in questo turno');
        t.assert(wingResult.inGraveyard, 'Ala del Tiranno distrutta deve finire nel Cimitero');

        // Il tracker deve popolarsi con un vero attacco (resolveAttack), non solo a mano.
        const trackerResult = await t.evaluate(() => {
            return new Promise((resolve) => {
                const attacker = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck), uid: 'tracker-attacker-1' };
                const defender = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck), uid: 'tracker-defender-1', defense: 99999 };
                gameState.playerMonsterField = [{ card: attacker, position: 'attack', isFaceDown: false, hasAttacked: false }, null, null, null, null];
                gameState.botMonsterField = [{ card: defender, position: 'defense', isFaceDown: false }, null, null, null, null];
                gameState.attackedMonsterUidsThisTurn = new Set();
                resolveAttack('player', 0, 0, () => {
                    resolve(gameState.attackedMonsterUidsThisTurn.has('tracker-attacker-1'));
                });
            });
        });
        t.assert(trackerResult, 'gameState.attackedMonsterUidsThisTurn deve registrare un vero attacco (via resolveAttack) contro un mostro');

        // Saggio della Frontiera (1039): nega/blocca solo Magie che bersagliano un PROPRIO Guerriero, non un Guerriero avversario né un bersaglio non-Guerriero.
        const wisemanOwnWarriorResult = await t.evaluate(() => {
            const wiseman = { ...cardDatabase.find((c) => c.id === 1039), uid: 'wiseman-1' };
            const ownWarrior = { ...cardDatabase.find((c) => c.type === 'monster' && c.race === 'Guerriero' && !c.extraDeck), uid: 'own-warrior-1' };
            const spellSource = { ...cardDatabase.find((c) => c.type === 'spell'), uid: 'spell-1' };
            gameState.playerMonsterField = [{ card: wiseman, position: 'attack', isFaceDown: false }, { card: ownWarrior, position: 'attack', isFaceDown: false }, null, null, null];
            const sourceCtx = DuelEngine.makeContext('bot', { card: spellSource });
            const result = sourceCtx.declareTarget('player', 1, { totalTargetCount: 1 });
            return result.allowed;
        });
        t.assert(!wisemanOwnWarriorResult, 'Saggio della Frontiera deve bloccare una Magia avversaria che bersaglia il proprio Guerriero');

        const wisemanEnemyWarriorResult = await t.evaluate(() => {
            const wiseman = { ...cardDatabase.find((c) => c.id === 1039), uid: 'wiseman-2' };
            const enemyWarrior = { ...cardDatabase.find((c) => c.type === 'monster' && c.race === 'Guerriero' && !c.extraDeck), uid: 'enemy-warrior-1' };
            const spellSource = { ...cardDatabase.find((c) => c.type === 'spell'), uid: 'spell-2' };
            gameState.playerMonsterField = [{ card: wiseman, position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.botMonsterField = [{ card: enemyWarrior, position: 'attack', isFaceDown: false }, null, null, null, null];
            const sourceCtx = DuelEngine.makeContext('player', { card: spellSource });
            const result = sourceCtx.declareTarget('bot', 0, { totalTargetCount: 1 });
            return result.allowed;
        });
        t.assert(wisemanEnemyWarriorResult, 'Saggio della Frontiera NON deve proteggere un Guerriero AVVERSARIO (protegge solo i propri)');

        const wisemanTrapResult = await t.evaluate(() => {
            const wiseman = { ...cardDatabase.find((c) => c.id === 1039), uid: 'wiseman-3' };
            const ownWarrior = { ...cardDatabase.find((c) => c.type === 'monster' && c.race === 'Guerriero' && !c.extraDeck), uid: 'own-warrior-2' };
            const trapSource = { ...cardDatabase.find((c) => c.type === 'trap'), uid: 'trap-1' };
            gameState.playerMonsterField = [{ card: wiseman, position: 'attack', isFaceDown: false }, { card: ownWarrior, position: 'attack', isFaceDown: false }, null, null, null];
            const sourceCtx = DuelEngine.makeContext('bot', { card: trapSource });
            const result = sourceCtx.declareTarget('player', 1, { totalTargetCount: 1 });
            return result.allowed;
        });
        t.assert(wisemanTrapResult, 'Saggio della Frontiera NON deve bloccare una Trappola (protegge solo dalle Magie)');
    }
};
