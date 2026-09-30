// Più raccordi narrativi nelle campagne non belliche, senza perdere il
// punto raggiunto dai salvataggi creati prima dell'inserimento.
// =====================================================================
const path = require('path');

module.exports = {
    name: 'Storie: nuovi intermezzi non-WW1 e migrazione del progresso',
    standalone: true,
    async run({ browser, assert }) {
        const root = path.join(__dirname, '..', '..');
        const url = 'file:///' + path.join(root, 'storia.html').replace(/\\/g, '/');
        const context = await browser.newContext({ viewport: { width: 1200, height: 900 }, serviceWorkers: 'block' });
        await context.addInitScript(() => { window.AUTH_GATE_SKIP = true; });
        const page = await context.newPage();

        const nuovi = {
            anime: ['anime-1-quarta-carta', 'anime-3-tavola-scena'],
            forbiddenMemories: ['fm-2-presagio', 'fm-5-settimo-oggetto', 'fm-7-porta'],
            freedom: ['freedom-2-girato', 'freedom-3-radio', 'freedom-4-riflesso', 'freedom-4-incoronazione']
        };

        try {
            await page.goto(url + '?campaign=anime');
            await page.waitForFunction(() => !!(window.StoryProgress && window.storyCampaignsDatabase));

            const audit = await page.evaluate((idsPerCampagna) => {
                const flatten = (campaign) => campaign.capitoli.flatMap((chapter) => chapter.tappe)
                    .flatMap((step) => step.tappe || [step]);
                const result = {};
                Object.keys(idsPerCampagna).forEach((campaignId) => {
                    const campaign = storyCampaignsDatabase.find((entry) => entry.id === campaignId);
                    const all = flatten(campaign);
                    result[campaignId] = idsPerCampagna[campaignId].map((id) => {
                        const step = all.find((entry) => entry.id === id);
                        const index = all.findIndex((entry) => entry.id === id);
                        return {
                            id,
                            kind: step && step.kind,
                            lines: step && Array.isArray(step.testo) ? step.testo.length : 0,
                            next: index >= 0 && all[index + 1] ? all[index + 1].id : null
                        };
                    });
                });
                const ww1 = storyCampaignsDatabase.find((entry) => entry.id === 'ww1');
                result.ww1HasNewIds = flatten(ww1).some((step) => Object.values(idsPerCampagna).flat().includes(step.id));
                return result;
            }, nuovi);

            Object.keys(nuovi).forEach((campaignId) => {
                audit[campaignId].forEach((step) => {
                    assert(step.kind === 'scene', `${step.id} deve esistere come nodo scene`);
                    assert(step.lines >= 4, `${step.id} deve essere un vero intermezzo, non una sola didascalia`);
                });
            });
            assert(!audit.ww1HasNewIds, 'La Grande Guerra non deve ricevere questi nuovi intermezzi');

            const raccordi = {
                'anime-1-quarta-carta': 'anime-1-kaiba-scena',
                'anime-3-tavola-scena': 'anime-3-seeker',
                'fm-2-presagio': 'fm-2-scena',
                'fm-5-settimo-oggetto': 'fm-5-scena',
                'fm-7-porta': 'fm-7-darknite',
                'freedom-2-girato': 'freedom-2-scena',
                'freedom-3-radio': 'freedom-3-scena',
                'freedom-4-riflesso': 'freedom-4-scena',
                'freedom-4-incoronazione': 'freedom-4-giacobbo'
            };
            Object.values(audit).flat().filter((step) => step && step.id).forEach((step) => {
                assert(step.next === raccordi[step.id],
                    `${step.id} deve raccordarsi a ${raccordi[step.id]}, trovato ${step.next}`);
            });

            const migration = await page.evaluate((newIds) => {
                const current = StoryProgress.getTappe('forbiddenMemories');
                const historic = current.filter((step) => !newIds.includes(step.id));
                const oldDarkniteIndex = historic.findIndex((step) => step.id === 'fm-7-darknite');
                SaveManager.setStoryState('forbiddenMemories', {
                    completate: oldDarkniteIndex,
                    finita: false,
                    premiata: false,
                    sotto: {},
                    separazioni: []
                });
                const progress = StoryProgress.getProgress('forbiddenMemories');
                return {
                    currentId: StoryProgress.getTappe('forbiddenMemories')[progress.completate].id,
                    stampsAfterRead: (SaveManager.getStoryState('forbiddenMemories').separazioni || []).length
                };
            }, nuovi.forbiddenMemories);

            assert(migration.currentId === 'fm-7-porta',
                `Un vecchio salvataggio prima di DarkNite deve trovare il nuovo raccordo, non saltare altrove: ${migration.currentId}`);
            assert(migration.stampsAfterRead === 0,
                'Leggere e migrare il progresso deve restare privo di scritture collaterali');
        } finally {
            await context.close();
        }
    }
};
