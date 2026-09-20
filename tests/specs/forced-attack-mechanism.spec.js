// gameState.mustAttackTargetUidsFor (id 199 Movimento d'Onda Diffuso: un
// mostro deve attaccare ogni nemico una volta ciascuno) — meccanismo
// condiviso riusato anche da id 88 Arciere delle Amazzoni, quindi protegge
// entrambe le carte insieme. Verifica sia il blocco "non puoi uscire dalla
// Battle Phase finché non hai attaccato tutti" sia lo sblocco corretto una
// volta soddisfatto.
module.exports = {
    name: 'Obbligo d\'attacco condiviso (mustAttackTargetUidsFor / id 199)',
    async run(t) {
        // Questo test piazza mostri e risolve attacchi manipolando
        // gameState direttamente: va prima lasciata assestare la cascata
        // di transizione fase del caricamento (Draw -> Standby -> Main
        // Phase 1), che freezeNaturalGameLoop NON ferma — congela solo le
        // decisioni autonome del bot (vedi tests/README.md, "Un'insidia
        // reale già presa in questa suite"). Sotto il carico della suite
        // completa quella cascata arrivava in mezzo e il primo attacco non
        // risultava registrato: il test falliva solo in `npm test`, mai da
        // solo (3 volte su 3 verde in isolamento). Si aspetta il segnale
        // VERO di fine cascata — la fase che si ferma su 'main1' — come
        // già fanno graveyard-search-real-choice e
        // lod-helpoemer-graveyard-battle-phase-end.
        // (`gameState` è una `let` globale: esiste ma NON è una proprietà
        // di window, quindi va controllata con typeof.)
        await t.page.waitForFunction(() => typeof gameState !== 'undefined' && gameState.phase === 'main1', null, { timeout: 15000 });

        const t1 = await t.evaluate(() => {
            const wave = { ...cardDatabase.find((c) => c.id === 199), uid: 'wave-1' };
            const caster = { ...cardDatabase.find((c) => c.type === 'monster' && c.race === 'Incantatore' && c.level >= 7), uid: 'caster-1' };
            caster.attack = 9999;
            const enemy1 = { ...cardDatabase.find((c) => c.type === 'monster' && c.id !== 199), uid: 'enemy-1', attack: 100, defense: 100 };
            const enemy2 = { ...cardDatabase.find((c) => c.type === 'monster' && c.id !== 199), uid: 'enemy-2', attack: 100, defense: 100 };
            gameState.playerLP = 8000;
            gameState.botLP = 999999;
            gameState.gameOver = false;
            gameState.playerMonsterField = [{ card: caster, position: 'attack', isFaceDown: false, hasAttacked: false }, null, null, null, null];
            gameState.botMonsterField = [{ card: enemy1, position: 'attack', isFaceDown: false, hasAttacked: false }, { card: enemy2, position: 'attack', isFaceDown: false, hasAttacked: false }, null, null, null];
            const def = DuelEngine.getDefinition(199);
            const ctx = DuelEngine.makeContext('player', { card: wave });
            const can = def.canActivate(ctx);
            def.activate(ctx);
            return { can, mustAttackSet: Array.from(gameState.mustAttackTargetUidsFor['caster-1'] || []) };
        });
        t.assert(t1.can, '199 deve poter attivarsi con le condizioni date');
        t.assert(t1.mustAttackSet.length === 2, `199 deve imporre l'obbligo verso entrambi i nemici (ottenuto ${JSON.stringify(t1.mustAttackSet)})`);

        const t2 = await t.evaluate(() => {
            gameState.phase = 'battle';
            gameState.currentPlayer = 'player';
            gameState.turn = 5;
            const before = gameState.phase;
            handlePhaseStepperClick('main2');
            return gameState.phase === before;
        });
        t.assert(t2, 'Senza aver attaccato tutti i nemici, non si deve poter uscire dalla Battle Phase');

        // Prima di OGNI attacco si azzera una transizione di fase rimasta
        // in volo e si riafferma fase/turno. freezeNaturalGameLoop ferma
        // le decisioni autonome del bot, NON una cascata già programmata:
        // fra un passo e l'altro di questo spec può scattare e portare
        // gameState.phase fuori da 'battle', e allora resolveAttack esce
        // subito chiamando comunque il proprio onComplete — l'obbligo
        // d'attacco non viene mai aggiornato e il test fallisce, ma SOLO
        // sotto il carico della suite completa. È la stessa correzione
        // già applicata a battle-resolution.spec.js.
        const t3 = await t.evaluate(() => new Promise((resolve) => {
            if (typeof clearPhaseTransitionTimeout === 'function') clearPhaseTransitionTimeout();
            gameState.phase = 'battle';
            gameState.currentPlayer = 'player';
            resolveAttack('player', 0, 0, () => {
                const remaining = Array.from(gameState.mustAttackTargetUidsFor['caster-1'] || []);
                gameState.phase = 'battle';
                handlePhaseStepperClick('main2');
                resolve({ remaining, stillBlocked: gameState.phase === 'battle' });
            });
        }));
        t.assert(t3.remaining.length === 1 && t3.remaining[0] === 'enemy-2', `Dopo il primo attacco deve restare solo enemy-2 (ottenuto ${JSON.stringify(t3.remaining)})`);
        t.assert(t3.stillBlocked, 'Con un nemico ancora da attaccare, l\'uscita dalla Battle Phase deve restare bloccata');

        await t.page.waitForTimeout(1500);
        const t4 = await t.evaluate(() => new Promise((resolve) => {
            if (typeof clearPhaseTransitionTimeout === 'function') clearPhaseTransitionTimeout();
            gameState.phase = 'battle';
            gameState.currentPlayer = 'player';
            resolveAttack('player', 0, 1, () => {
                gameState.phase = 'battle';
                handlePhaseStepperClick('main2');
                resolve(gameState.phase === 'main2');
            });
        }));
        t.assert(t4, 'Dopo aver attaccato entrambi i nemici, si deve poter finalmente uscire dalla Battle Phase');
    }
};
