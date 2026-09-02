// resolveChain() deve aspettare che il pulse "carta a centro schermo"
// (~2s, FX.ACTIVATE_CENTER_DURATION_MS) sia DAVVERO finito prima di
// chiamare l'handler dell'effetto — altrimenti attivazione e risoluzione
// si accavallano invece di leggersi in due tempi separati (bug segnalato
// dall'utente e corretto in duel-engine.js/resolveChain). Qui si misura
// il tempo REALE trascorso, non solo lo stato finale: un test che
// controllasse solo "l'effetto alla fine è girato" non si accorgerebbe
// se tornasse a risolversi troppo presto.
module.exports = {
    name: 'Chain: il pulse di attivazione finisce prima che l\'effetto si risolva',
    async run(t) {
        await t.evaluate(() => {
            window.__resolveTimestamps = [];
            CardEffects.register(90101, {
                canActivate() { return true; },
                activate() { window.__resolveTimestamps.push(Date.now()); }
            });
            gameState.turn = 5;
            gameState.currentPlayer = 'player';
            gameState.playerHand = [{ id: 90101, uid: 'single-spell-1', name: 'Test Single Spell', type: 'spell', subtype: 'normal' }];
            gameState.playerGraveyard = [];
            gameState.botSTField = Array(5).fill(null);
            window.__activateStart = Date.now();
            DuelEngine.activateCard('player', 'hand', 0);
        });

        await t.page.waitForTimeout(500);
        const mid = await t.evaluate(() => window.__resolveTimestamps.length > 0);
        t.assert(!mid, 'A metà pulse (~500ms) l\'effetto non deve essere ancora risolto');

        await t.page.waitForTimeout(1800);
        const end = await t.evaluate(() => ({
            resolved: window.__resolveTimestamps.length > 0,
            delay: window.__resolveTimestamps[0] ? window.__resolveTimestamps[0] - window.__activateStart : null
        }));
        t.assert(end.resolved, 'Dopo ~2.3s l\'effetto deve essersi risolto');
        t.assert(end.delay >= 1800 && end.delay <= 2700, `Il ritardo deve essere vicino a 2000ms (ottenuto ${end.delay}ms)`);

        // Buco Nero (id 7): il vortice (effetto visivo secondario) deve
        // partire SUBITO dentro activate(ctx), senza un secondo ritardo
        // incollato sopra — resolveChain ha già aspettato il pulse prima
        // di chiamarlo.
        const darkHole = await t.evaluate(() => {
            return new Promise((resolve) => {
                let vortexDelay = null;
                const originalVortex = FX.playDarkHoleVortex;
                FX.playDarkHoleVortex = function (...args) {
                    vortexDelay = Date.now() - window.__dhStart;
                    FX.playDarkHoleVortex = originalVortex;
                    return originalVortex.apply(FX, args);
                };
                const enemy = { ...cardDatabase.find((c) => c.id === 4), uid: 'darkhole-target-1' };
                gameState.playerMonsterField = [null, null, null, null, null];
                gameState.botMonsterField = [{ card: enemy, position: 'attack', isFaceDown: false }, null, null, null, null];
                gameState.playerHand = [{ ...cardDatabase.find((c) => c.id === 7), uid: 'darkhole-1' }];
                gameState.playerGraveyard = [];
                gameState.botSTField = Array(5).fill(null);
                window.__dhStart = Date.now();
                DuelEngine.activateCard('player', 'hand', 0);
                const poll = () => {
                    if (!DuelEngine.isChainActive()) { resolve({ vortexDelay }); return; }
                    setTimeout(poll, 100);
                };
                setTimeout(poll, 100);
            });
        });
        t.assert(darkHole.vortexDelay !== null, 'Il vortice di Buco Nero deve essere partito');
        t.assert(darkHole.vortexDelay >= 1700 && darkHole.vortexDelay <= 2700, `Il vortice deve partire ~2000ms dopo l'attivazione, non subito né dopo ~4000ms (ottenuto ${darkHole.vortexDelay}ms)`);
    }
};
