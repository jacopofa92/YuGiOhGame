// ACTIONS.returnMonsterToHand (mostri) e il gancio onReturnedToHandSelf
// per le Magie/Trappole rimandate in mano da Turbine Gigante (id 262) —
// due meccanismi condivisi riusati da diverse carte (Criosfinge id 761,
// Amplificatore id 92, Festa Isterica id 790, Dispositivo di Evacuazione
// Forzata id 671): un singolo test qui protegge tutte insieme.
module.exports = {
    name: 'Meccanismi condivisi "torna in mano" (262/761/92/790/671)',
    async run(t) {
        // Turbine Gigante rimanda Amplificatore in mano -> il mostro equipaggiato (Jinzo) deve essere distrutto.
        const r1 = await t.evaluate(() => {
            const turbine = { ...cardDatabase.find((c) => c.id === 262), uid: 'turbine-1' };
            const amplifier = { ...cardDatabase.find((c) => c.id === 92), uid: 'amp-1' };
            const jinzo = { ...cardDatabase.find((c) => c.id === 17), uid: 'jinzo-1' };
            amplifier.equippedToUid = 'jinzo-1';
            amplifier.equippedToOwner = 'player';
            amplifier.equippedToIndex = 0;
            gameState.playerMonsterField = [{ card: jinzo, position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.playerSTField = [{ card: amplifier, isFaceDown: false, setOnTurn: gameState.turn }, null, null, null, null];
            gameState.playerHand = [];
            gameState.playerGraveyard = [];
            const ctx = DuelEngine.makeContext('player', { card: turbine });
            DuelEngine.getDefinition(262).activate(ctx);
            return {
                amplifierInHand: gameState.playerHand.some((c) => c.uid === 'amp-1'),
                jinzoDestroyed: !gameState.playerMonsterField.some((s) => s && s.card.uid === 'jinzo-1')
            };
        });
        t.assert(r1.amplifierInHand, 'Turbine Gigante deve rimandare Amplificatore in mano');
        t.assert(r1.jinzoDestroyed, 'Amplificatore rimandato in mano deve distruggere il mostro equipaggiato (onReturnedToHandSelf)');

        // Dispositivo di Evacuazione Forzata (671) rimanda un mostro nemico
        // in mano passando dal checkpoint di targeting -> Criosfinge (761)
        // reagisce, e un bersaglio immune (Obelisk) non può essere scelto.
        const r2 = await t.evaluate(() => {
            const device = { ...cardDatabase.find((c) => c.id === 671), uid: 'device-1' };
            const target = { ...cardDatabase.find((c) => c.id === 4), uid: 'target-1' };
            const criosfinge = { ...cardDatabase.find((c) => c.id === 761), uid: 'crio-1' };
            gameState.botMonsterField = [{ card: target, position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.playerMonsterField = [{ card: criosfinge, position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.botHand = [{ ...cardDatabase.find((c) => c.id === 5), uid: 'bh-1' }];
            gameState.botGraveyard = [];
            const ctx = DuelEngine.makeContext('player', { card: device });
            DuelEngine.getDefinition(671).activate(ctx);
            return {
                leftTheField: !gameState.botMonsterField.some((s) => s && s.card.uid === 'target-1'),
                // Criosfinge (761) scarta CASUALMENTE (Math.random, vedi
                // discardRandomFromHand in duel-engine.js — fedele al testo
                // reale della carta) 1 carta dalla mano del bot, che ora
                // contiene sia 'bh-1' (preesistente) sia 'target-1' (appena
                // tornato in mano da 671): può legittimamente toccare
                // proprio 'target-1'. Non si può quindi assumere che
                // 'target-1' resti in mano — solo che finisca in mano O al
                // Cimitero (mai perso, mai duplicato), e che una delle due
                // carte sia stata scartata.
                targetAccountedFor: gameState.botHand.some((c) => c.uid === 'target-1') !== gameState.botGraveyard.some((c) => c.uid === 'target-1'),
                botDiscardedByCriosfinge: gameState.botGraveyard.length === 1
            };
        });
        t.assert(r2.leftTheField, '671 deve rimuovere il mostro nemico dal Terreno');
        t.assert(r2.targetAccountedFor, 'Il mostro rimandato in mano da 671 deve finire in mano O al Cimitero (scarto casuale di Criosfinge), mai perso o duplicato');
        t.assert(r2.botDiscardedByCriosfinge, 'Criosfinge deve reagire al ritorno in mano causato da 671');

        const r3 = await t.evaluate(() => {
            const device2 = { ...cardDatabase.find((c) => c.id === 671), uid: 'device-2' };
            const obelisk = { ...cardDatabase.find((c) => c.id === 30), uid: 'obelisk-671-1' };
            gameState.botMonsterField = [{ card: obelisk, position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.playerMonsterField = [null, null, null, null, null];
            gameState.botHand = [];
            const ctx = DuelEngine.makeContext('player', { card: device2 });
            DuelEngine.getDefinition(671).activate(ctx);
            return gameState.botMonsterField.some((s) => s && s.card.uid === 'obelisk-671-1');
        });
        t.assert(r3, '671 non deve poter scegliere Obelisk come bersaglio (immune al targeting da effetti Carta)');
    }
};
