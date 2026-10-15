const path = require('path');

module.exports = {
    name: 'Supporti moderni: prima copia tematica, rarità e limiti economici',
    standalone: true,
    async run({ browser, assert }) {
        const root = path.join(__dirname, '..', '..').replace(/\\/g, '/');
        const context = await browser.newContext({ serviceWorkers: 'block' });
        await context.addInitScript(() => { localStorage.clear(); window.AUTH_GATE_SKIP = true; });
        const page = await context.newPage();
        try {
            await page.goto('file:///' + root + '/negozio.html');
            await page.waitForFunction(() => !!(window.CardAcquisition && window.CardRarity && window.SaveManager));
            const result = await page.evaluate(() => {
                SaveManager.createNew('Audit supporti moderni');
                const ids = Array.from({ length: 24 }, (_, index) => 1250 + index);
                const lockedBefore = ids.every((id) => !CardAcquisition.isSignatureUnlocked(id));
                const expectedRarity = {
                    super: [1250, 1252, 1253, 1254, 1259, 1261, 1268],
                    ultra: [1251, 1255, 1256, 1257, 1258, 1263, 1264, 1266, 1267, 1269],
                    legendary: [1260, 1262, 1265, 1270, 1271, 1272, 1273]
                };
                const wrongRarities = Object.entries(expectedRarity).flatMap(([rarity, list]) =>
                    list.filter((id) => CardRarity.of(id) !== rarity).map((id) => ({ id, rarity: CardRarity.of(id), expected: rarity })));

                SaveManager.setChallengeProgress('carta-joey-occhi-rossi-50', { count: 50, completed: true });
                SaveManager.setChallengeProgress('carta-pegasus-toon-50', { count: 50, completed: true });
                SaveManager.setChallengeProgress('carta-kaiba-drago-bianco-50', { count: 50, completed: true });
                SaveManager.setChallengeProgress('carta-kaiba-drago-bianco-100', { count: 100, completed: true });
                SaveManager.setChallengeProgress('carta-yugi-mago-nero-50', { count: 50, completed: true });
                SaveManager.setChallengeProgress('carta-yugi-mago-nero-100', { count: 100, completed: true });
                SaveManager.setCardAcquisitionState({
                    claimed: {},
                    completedChapters: { regno: true, battlecity1: true, battlecity2: true },
                    completedChaptersByDifficulty: {}, unlockedPacks: {}, exodiaPity: 0,
                    counters: { sliferStringsHard: 40, raMarikHard: 50 }
                });
                SaveManager.addOwnedCards(30, 1);
                SaveManager.addOwnedCards(31, 1);
                SaveManager.addOwnedCards(472, 1);
                CardAcquisition.checkMilestones();

                const firstCopies = ids.map((id) => SaveManager.getOwnedCount(id));
                const allUnlocked = ids.every((id) => CardAcquisition.isSignatureUnlocked(id));
                ids.forEach((id) => SaveManager.addOwnedCards(id, 5));
                const caps = ids.map((id) => ({ id, owned: SaveManager.getOwnedCount(id), cap: CardAcquisition.copyCapFor(id) }));
                const noSource = ids.filter((id) => !CardAcquisition.sourceFor(id) || !CardAcquisition.progressFor(id));
                return { lockedBefore, wrongRarities, firstCopies, allUnlocked, caps, noSource };
            });

            assert(result.lockedBefore, 'I supporti moderni non devono entrare nei pool prima della prima copia');
            assert(result.wrongRarities.length === 0, `Rarità errate: ${JSON.stringify(result.wrongRarities)}`);
            assert(result.firstCopies.every((count) => count === 1) && result.allUnlocked,
                `Ogni impresa deve distribuire una sola prima copia: ${JSON.stringify(result.firstCopies)}`);
            assert(result.caps.every((entry) => entry.owned === entry.cap),
                `Le acquisizioni devono rispettare i limiti 1/2: ${JSON.stringify(result.caps)}`);
            assert(result.noSource.length === 0, `Supporti senza fonte/progresso in Cartoteca: ${result.noSource.join(', ')}`);
        } finally {
            await context.close();
        }
    }
};
