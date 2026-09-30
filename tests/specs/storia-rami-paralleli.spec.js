const path = require('path');

module.exports = {
    name: 'Storia anime: i duelli paralleli si diramano senza avanzare Yugi',
    standalone: true,
    async run({ browser, assert }) {
        const root = path.join(__dirname, '..', '..');
        const context = await browser.newContext({ serviceWorkers: 'block' });
        await context.addInitScript(() => { window.AUTH_GATE_SKIP = true; });
        const page = await context.newPage();
        await page.goto('file:///' + root.replace(/\\/g, '/') + '/storia.html');
        await page.waitForFunction(() => !!(window.StoryProgress && window.SaveManager));

        const result = await page.evaluate(() => {
            if (!SaveManager.hasSave()) SaveManager.createNew('Tester');
            const campaign = StoryProgress.getCampaign('anime');
            const stamps = (campaign.separazioni || []).map((entry) => entry.id);
            const outer = StoryProgress.getTappe('anime');
            const areaIndex = outer.findIndex((entry) => entry.id === 'anime-area-regno');
            SaveManager.setStoryState('anime', {
                completate: areaIndex,
                finita: false,
                premiata: false,
                sotto: { 'anime-area-regno': 3 },
                laterali: {},
                separazioni: stamps
            });

            const before = StoryProgress.getProveConStato('anime', 'anime-area-regno');
            const side = before.find((entry) => entry.id === 'anime-2-mai-primo');
            const main = before.find((entry) => entry.stato === 'corrente');
            const url = StoryProgress.urlDuello('anime', side, {
                torneoId: 'anime-area-regno', laterale: side.id
            });
            sessionStorage.setItem('ygoLastDuelOutcome', JSON.stringify({
                mode: 'story', campaignId: 'anime', torneoId: 'anime-area-regno',
                lateraleId: side.id, playerWon: true, opponentId: side.characterId
            }));
            const consumed = StoryProgress.consumaEsitoDuello('anime');
            const saved = SaveManager.getStoryState('anime');
            const after = StoryProgress.getProveConStato('anime', 'anime-area-regno')
                .find((entry) => entry.id === side.id);
            return {
                sideState: side.stato,
                mainId: main && main.id,
                url: url,
                consumed: consumed,
                below: saved.sotto['anime-area-regno'],
                marked: !!saved.laterali['anime-area-regno:' + side.id],
                afterState: after.stato
            };
        });

        assert(result.sideState === 'disponibile', `Il ramo di Joey deve sbloccarsi: ${JSON.stringify(result)}`);
        assert(result.mainId === 'anime-2-mako', `Il percorso principale deve restare su Yugi/Mako: ${JSON.stringify(result)}`);
        assert(/laterale=anime-2-mai-primo/.test(result.url), 'L’URL deve identificare il duello laterale');
        assert(result.consumed.laterale === true && result.consumed.avanzato === false,
            `Il ritorno laterale non deve avanzare la trama: ${JSON.stringify(result)}`);
        assert(result.below === 3, `Il contatore principale non deve cambiare: ${JSON.stringify(result)}`);
        assert(result.marked && result.afterState === 'fatta', `La vittoria laterale deve restare salvata: ${JSON.stringify(result)}`);
        await context.close();
    }
};
