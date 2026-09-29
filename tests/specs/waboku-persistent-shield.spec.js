module.exports = {
    name: 'Waboku: barriera persistente fino a End Phase o distruzione',
    async run(t) {
        const activated = await t.evaluate(() => {
            const waboku = { ...cardDatabase.find((c) => c.id === 503), uid: 'waboku-shield-test' };
            window.__wabokuTestCard = waboku;
            gameState.phase = 'main1';
            gameState.currentPlayer = 'player';
            gameState.noBattleDamageFor = {};
            gameState.noBattleDestructionFor = {};
            gameState.wabokuProtectionUidFor = {};
            DuelEngine.getDefinition(503).activate(DuelEngine.makeContext('player', { card: waboku }));
            updateUI();
            const shield = document.querySelector('#playerFieldBoard .waboku-field-shield');
            return {
                shield: !!shield,
                layers: shield ? shield.children.length : 0,
                botShield: !!document.querySelector('#botFieldBoard .waboku-field-shield'),
                noDamage: gameState.noBattleDamageFor.player === true,
                noDestruction: gameState.noBattleDestructionFor.player === true
            };
        });
        t.assert(activated.shield && activated.layers >= 7 && !activated.botShield,
            'La barriera completa deve comparire soltanto dietro il Terreno protetto');
        t.assert(activated.noDamage && activated.noDestruction,
            'Il visuale deve corrispondere a una protezione Waboku realmente attiva');

        const destroyed = await t.evaluate(() => {
            DuelEngine.getDefinition(503).onSTDestroyed(
                DuelEngine.makeContext('player', { card: window.__wabokuTestCard })
            );
            updateUI();
            return {
                shield: !!document.querySelector('#playerFieldBoard .waboku-field-shield'),
                noDamage: !!gameState.noBattleDamageFor.player,
                noDestruction: !!gameState.noBattleDestructionFor.player
            };
        });
        t.assert(!destroyed.shield && !destroyed.noDamage && !destroyed.noDestruction,
            'Distruggere la copia sorgente deve dissolvere barriera e protezione');

        const atEnd = await t.evaluate(() => {
            const waboku = { ...cardDatabase.find((c) => c.id === 503), uid: 'waboku-end-test' };
            DuelEngine.getDefinition(503).activate(DuelEngine.makeContext('player', { card: waboku }));
            updateUI();
            const before = !!document.querySelector('#playerFieldBoard .waboku-field-shield');
            enterEndPhase();
            return {
                before,
                after: !!document.querySelector('#playerFieldBoard .waboku-field-shield'),
                noDamage: !!gameState.noBattleDamageFor.player,
                noDestruction: !!gameState.noBattleDestructionFor.player
            };
        });
        t.assert(atEnd.before && !atEnd.after && !atEnd.noDamage && !atEnd.noDestruction,
            'All ingresso in End Phase lo scudo di Waboku deve sparire immediatamente');
    }
};
