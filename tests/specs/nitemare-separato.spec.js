'use strict';

const path = require('path');

module.exports = {
    standalone: true,
    name: 'Forbidden Memories: Nitemare è separato da DarkNite',
    async run(t) {
        const radice = path.join(__dirname, '..', '..');
        const url = 'file:///' + path.join(radice, 'storia.html').replace(/\\/g, '/') + '?campaign=forbiddenMemories';
        const page = await t.browser.newPage();
        await page.addInitScript(() => { window.AUTH_GATE_SKIP = true; });
        await page.goto(url);
        await page.waitForFunction(() => !!(window.StoryProgress && window.storyCampaignsDatabase));
        const storia = await page.evaluate(() => {
            const campagna = storyCampaignsDatabase.find((c) => c.id === 'forbiddenMemories');
            const nodi = StoryProgress.getTappe('forbiddenMemories');
            const darkNite = nodi.find((n) => n.id === 'fm-7-darknite');
            const finale = nodi.find((n) => n.id === 'fm-7-finale-duello');
            return {
                finale: finale && finale.characterId,
                penultimo: darkNite && darkNite.characterId,
                personaggio: characterDatabase.find((c) => c.id === 'nitemare')
            };
        });
        const duello = await t.browser.newPage();
        await duello.addInitScript(() => { window.AUTH_GATE_SKIP = true; });
        await duello.goto('file:///' + path.join(radice, 'duelMonstersCore.html').replace(/\\/g, '/'));
        await duello.waitForFunction(() => typeof getCharacterDeck === 'function');
        const mazzi = await duello.evaluate(() => {
            const dark = getCharacterDeck('darkNite', 'hard');
            const nite = getCharacterDeck('nitemare', 'hard');
            return {
                darkTotale: deckListCount(dark.main),
                niteTotale: deckListCount(nite.main),
                stessaLista: dark === nite || dark.main === nite.main
            };
        });
        t.assert(storia.finale === 'nitemare', `Il duello finale deve usare Nitemare, trovato ${storia.finale}`);
        t.assert(storia.penultimo === 'darkNite', `Il duello precedente deve restare DarkNite, trovato ${storia.penultimo}`);
        t.assert(storia.personaggio && storia.personaggio.name === 'Nitemare', 'Nitemare deve esistere nel roster');
        t.assert(mazzi.darkTotale === 40 && mazzi.niteTotale === 40, 'Entrambi i boss devono partire con deck da 40 carte');
        t.assert(!mazzi.stessaLista, 'I deck DarkNite e Nitemare devono essere oggetti indipendenti');
        await page.close();
        await duello.close();
    }
};
