// declaredTargeting (nuovo campo dichiarativo generico, card-effects.js):
// permette a una carta reattiva sulla Chain di sapere COSA sta per
// bersagliare l'attivazione in cima, PRIMA che si risolva davvero.
// Verifica le 3 Trappole Contatore che ne dipendono: Campo di Riryoku
// (636, Magia -> esattamente 1 mostro), La Perla del Drago (652,
// Trappola -> 1 mostro Drago), Scudo Magico Tipo-8 (689, doppia
// modalità: gratis se il bersaglio combacia, altrimenti a costo).
module.exports = {
    name: 'declaredTargeting: Campo di Riryoku (636), La Perla del Drago (652), Scudo Magico Tipo-8 (689)',
    async run(t) {
        // 636 deve rispondere a una Magia che dichiara "1 mostro" (id 69,
        // Stop Difesa) ma NON a una Magia senza declaredTargeting (id 397,
        // Scelta Dolorosa: pesca 5 e scegline 1, non bersaglia un mostro).
        const r1 = await t.evaluate(() => {
            const riryoku = { ...cardDatabase.find((c) => c.id === 636), uid: 'riryoku-1' };
            const stopDefense = { ...cardDatabase.find((c) => c.id === 69), uid: 'stopdef-1' };
            const paintedDesires = { ...cardDatabase.find((c) => c.id === 397), uid: 'painted-1' };
            const ctx = DuelEngine.makeContext('player', { card: riryoku });

            gameState.chain = { active: true, links: [{ owner: 'bot', card: stopDefense, handlerName: 'activate', def: DuelEngine.getDefinition(69), ctx: {} }] };
            const canVsTargeted = DuelEngine.getDefinition(636).canActivate(ctx);

            gameState.chain = { active: true, links: [{ owner: 'bot', card: paintedDesires, handlerName: 'activate', def: DuelEngine.getDefinition(397), ctx: {} }] };
            const canVsUndeclared = DuelEngine.getDefinition(636).canActivate(ctx);

            return { canVsTargeted, canVsUndeclared };
        });
        t.assert(r1.canVsTargeted === true, 'Campo di Riryoku deve poter rispondere a una Magia che bersaglia esattamente 1 mostro (Stop Difesa)');
        t.assert(r1.canVsUndeclared === false, 'Campo di Riryoku NON deve poter rispondere a una Magia senza declaredTargeting verificabile (Scelta Dolorosa)');

        // 652 deve rispondere a una Trappola che bersaglia 1 mostro Drago
        // (id 496, Ala del Tiranno) ma non a una Trappola generica.
        const r2 = await t.evaluate(() => {
            const pearl = { ...cardDatabase.find((c) => c.id === 652), uid: 'pearl-1' };
            const tyrantWing = { ...cardDatabase.find((c) => c.id === 496), uid: 'tyrantwing-1' };
            const genericTrap = { ...cardDatabase.find((c) => c.id === 10), uid: 'generictrap-1' }; // Cilindro Magico: non bersaglia un mostro
            gameState.playerHand = [{ ...cardDatabase.find((c) => c.type === 'monster'), uid: 'discardfodder-1' }];
            const ctx = DuelEngine.makeContext('player', { card: pearl });

            gameState.chain = { active: true, links: [{ owner: 'bot', card: tyrantWing, handlerName: 'activate', def: DuelEngine.getDefinition(496), ctx: {} }] };
            const canVsDragon = DuelEngine.getDefinition(652).canActivate(ctx);

            gameState.chain = { active: true, links: [{ owner: 'bot', card: genericTrap, handlerName: 'activate', def: DuelEngine.getDefinition(10), ctx: {} }] };
            const canVsGeneric = DuelEngine.getDefinition(652).canActivate(ctx);

            return { canVsDragon, canVsGeneric };
        });
        t.assert(r2.canVsDragon === true, 'La Perla del Drago deve poter rispondere a una Trappola che bersaglia 1 mostro Drago (Ala del Tiranno)');
        t.assert(r2.canVsGeneric === false, 'La Perla del Drago NON deve poter rispondere a una Trappola generica che non bersaglia un mostro Drago');

        // 689: modalità gratuita (nessuno scarto) contro una Magia a
        // bersaglio singolo, modalità a costo (scarta 1 Magia) altrimenti.
        const r3 = await t.evaluate(() => {
            const shield = { ...cardDatabase.find((c) => c.id === 689), uid: 'shield-1' };
            const stopDefense2 = { ...cardDatabase.find((c) => c.id === 69), uid: 'stopdef-2' };
            const spareSpell = { ...cardDatabase.find((c) => c.type === 'spell'), uid: 'sparespell-1' };
            gameState.playerHand = [spareSpell];
            gameState.playerGraveyard = [];

            gameState.chain = { active: true, links: [{ owner: 'bot', card: stopDefense2, handlerName: 'activate', def: DuelEngine.getDefinition(69), ctx: {}, negated: false }] };
            const ctx = DuelEngine.makeContext('player', { card: shield });
            DuelEngine.getDefinition(689).activate(ctx);
            const freeModeUsed = gameState.chain.links[0].negated === true && gameState.playerHand.some((c) => c.uid === 'sparespell-1');

            const paintedDesires2 = { ...cardDatabase.find((c) => c.id === 397), uid: 'painted-2' };
            gameState.chain = { active: true, links: [{ owner: 'bot', card: paintedDesires2, handlerName: 'activate', def: DuelEngine.getDefinition(397), ctx: {}, negated: false }] };
            const ctx2 = DuelEngine.makeContext('player', { card: shield });
            DuelEngine.getDefinition(689).activate(ctx2);
            const costModeUsed = gameState.chain.links[0].negated === true && !gameState.playerHand.some((c) => c.uid === 'sparespell-1') && gameState.playerGraveyard.some((c) => c.uid === 'sparespell-1');

            return { freeModeUsed, costModeUsed };
        });
        t.assert(r3.freeModeUsed, 'Scudo Magico Tipo-8 deve annullare GRATIS (senza scartare) una Magia che bersaglia 1 mostro');
        t.assert(r3.costModeUsed, 'Scudo Magico Tipo-8 deve invece scartare 1 Magia per annullarne una senza declaredTargeting verificabile');
    }
};
