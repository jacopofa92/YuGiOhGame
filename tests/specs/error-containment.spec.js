// Se una singola carta ha un bug e il suo activate()/static() lancia
// un'eccezione, il resto del motore deve continuare a funzionare — una
// Chain con un link rotto deve comunque chiudersi (non restare bloccata
// per sempre con isChainActive() sempre true), e una carta con uno
// static() rotto non deve impedire agli ALTRI mostri in campo di
// applicare il proprio. safeCallCardHandler (duel-engine.js) esiste
// apposta per questo — vedi il punto 2 dell'audit architetturale.
module.exports = {
    name: 'Una carta con un bug non blocca il resto del motore',
    async run(t) {
        const chainResult = await t.evaluate(() => new Promise((resolve) => {
            CardEffects.register(90301, {
                canActivate() { return true; },
                activate() { throw new Error('Bug di prova in una carta'); }
            });
            gameState.turn = 5;
            gameState.currentPlayer = 'player';
            gameState.playerHand = [{ id: 90301, uid: 'broken-spell-1', name: 'Carta Rotta di Prova', type: 'spell', subtype: 'normal' }];
            gameState.playerGraveyard = [];
            gameState.botSTField = Array(5).fill(null);
            const activated = DuelEngine.activateCard('player', 'hand', 0);
            const start = Date.now();
            const poll = () => {
                if (!DuelEngine.isChainActive() || Date.now() - start > 10000) {
                    resolve({ activated, chainClosedProperly: !DuelEngine.isChainActive() });
                    return;
                }
                setTimeout(poll, 100);
            };
            setTimeout(poll, 100);
        }));
        t.assert(chainResult.activated, 'L\'attivazione della carta rotta deve comunque essere accettata (il bug è nell\'effetto, non nell\'attivazione)');
        t.assert(chainResult.chainClosedProperly, 'La Chain deve chiudersi comunque, anche se l\'effetto della carta rotta lancia un\'eccezione');

        const staticResult = await t.evaluate(() => {
            CardEffects.register(90302, {
                static() { throw new Error('Bug di prova in uno static()'); }
            });
            const brokenMonster = { ...cardDatabase.find((c) => c.id === 4), id: 90302, uid: 'broken-static-1' };
            const healthyMonster = { ...cardDatabase.find((c) => c.id === 5), uid: 'healthy-1' };
            gameState.playerMonsterField = [{ card: brokenMonster, position: 'attack', isFaceDown: false }, { card: healthyMonster, position: 'attack', isFaceDown: false }, null, null, null];
            gameState.atkDefBonus = {};
            // recomputeStaticEffects gira dentro updateUI() — chiamarla
            // NON deve lanciare fuori dalla pagina nonostante il mostro rotto.
            updateUI();
            return { pageStillResponsive: true };
        });
        t.assert(staticResult.pageStillResponsive, 'updateUI() deve completare anche con un mostro il cui static() lancia un\'eccezione');
    }
};
