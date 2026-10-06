// Guardrail del rework acquisizione: deck non cumulativi e traguardo Ra.
const path = require('path');

module.exports = {
    name: 'Acquisizione carte: deck non cumulativi e requisiti composti di Ra',
    standalone: true,
    async run({ browser, assert }) {
        const root = path.join(__dirname, '..', '..').replace(/\\/g, '/');
        const context = await browser.newContext({ serviceWorkers: 'block' });
        await context.addInitScript(() => { localStorage.clear(); window.AUTH_GATE_SKIP = true; });
        const page = await context.newPage();
        try {
            await page.goto('file:///' + root + '/negozio.html');
            await page.waitForFunction(() => !!(window.CardAcquisition && window.SaveManager));
            const result = await page.evaluate(() => {
                SaveManager.createNew('Tester');
                const id = 1050;
                SaveManager.addOwnedCards(id, 1);
                SaveManager.addOwnedCardsFromDeck({ main: [{ id, qty: 1 }], extra: [] });
                const dopoDeckUno = SaveManager.getOwnedCount(id);
                SaveManager.addOwnedCardsFromDeck({ main: [{ id, qty: 2 }], extra: [] });
                const dopoDeckDue = SaveManager.getOwnedCount(id);

                CardAcquisition.onStoryProgress('anime', 'difficile', ['battlecity2'], false);
                for (let i = 0; i < 40; i++) {
                    CardAcquisition.onDuelWin({
                        difficulty: 'Difficile', opponentId: 'marik',
                        lpLost: i < 10 ? 2000 : 2500, playerLP: i < 10 ? 6000 : 5500
                    });
                }
                for (let i = 0; i < 3; i++) CardAcquisition.onTournamentWin('battleCity', 'Difficile');
                CardAcquisition.onStoryProgress('anime', 'difficile', ['battlecity1'], false);
                for (let i = 0; i < 29; i++) CardAcquisition.onDuelWin({
                    difficulty: 'Difficile', opponentId: 'strings', playerLP: i === 0 ? 4000 : 3000, lpLost: 4000
                });
                const sliferA29 = SaveManager.getOwnedCount(31);
                CardAcquisition.onDuelWin({ difficulty: 'Difficile', opponentId: 'strings', playerLP: 3000, lpLost: 5000 });
                return {
                    dopoDeckUno, dopoDeckDue, ra: SaveManager.getOwnedCount(472),
                    sliferA29, sliferA30: SaveManager.getOwnedCount(31),
                    rates: CardAcquisition.RULES.exodiaRates
                };
            });
            assert(result.dopoDeckUno === 1, 'Un deck con 1 copia non deve sommare un doppione');
            assert(result.dopoDeckDue === 2, 'Un deck con 2 copie deve portare il possesso da 1 a 2');
            assert(result.ra === 1, 'Ra deve arrivare dopo 40 Marik (10 controllate), capitolo e 3 tornei difficili');
            assert(result.sliferA29 === 0 && result.sliferA30 === 1,
                'Slifer deve arrivare esattamente alla 30ª vittoria difficile contro Strings');
            assert(result.rates.Facile === 0.0015 && result.rates.Medio === 0.0045 && result.rates.Difficile === 0.009,
                'Le probabilità Exodia devono essere triplicate');
        } finally {
            await context.close();
        }
    }
};
