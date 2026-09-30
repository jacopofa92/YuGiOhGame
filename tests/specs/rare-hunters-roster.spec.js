const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'Rare Hunters: roster, mazzi, battute e presenza a Battle City',
    async run(t) {
        const ids = ['seeker', 'strings', 'lumis', 'umbra'];
        const data = await t.evaluate((wanted) => {
            const contexts = ['battleStart', 'victory', 'attack', 'turnStart', 'damaged', 'activate'];
            return wanted.map((id) => {
                const character = characterDatabase.find((entry) => entry.id === id);
                const deck = characterDeckDatabase[id];
                return {
                    id,
                    character: !!character,
                    placeholder: character && character.image === `images/characters/${id}.jpg`,
                    decks: !!deck && ['easy', 'medium', 'hard'].every((level) => deck[level].main.reduce((sum, card) => sum + card.qty, 0) === 40),
                    profile: !!DuelDialogues._assignments[id],
                    personal: !!DuelDialogues._personal && contexts.every((context) => DuelDialogues._personal[id][context].length === 3),
                    special: !!DuelDialogues._specials && Object.keys(DuelDialogues._specials[id] || {}).length > 0
                };
            });
        }, ids);

        data.forEach((entry) => {
            t.assert(entry.character && entry.placeholder, `${entry.id}: anagrafica/avatar placeholder mancante`);
            t.assert(entry.decks, `${entry.id}: servono tre mazzi completi da 40 carte`);
            t.assert(entry.profile && entry.personal, `${entry.id}: personalità o tre frasi per contesto mancanti`);
            t.assert(entry.special, `${entry.id}: frase di evocazione speciale mancante`);
        });

        const story = await t.evaluate((wanted) => {
            const anime = storyCampaignsDatabase.find((campaign) => campaign.id === 'anime');
            const chapter = anime.capitoli.find((entry) => entry.id === 'battlecity1');
            const area = chapter.tappe.find((entry) => entry.id === 'anime-area-battlecity1');
            const duels = area.tappe.filter((entry) => wanted.includes(entry.characterId));
            return {
                ids: duels.map((entry) => entry.characterId),
                dialogues: duels.every((entry) => Array.isArray(entry.dialogo) && entry.dialogo.length >= 2),
                migrations: anime.separazioni.filter((entry) => [
                    'battle-city-seeker', 'battle-city-strings', 'battle-city-maschere'
                ].includes(entry.id)).map((entry) => entry.id)
            };
        }, ids);
        t.assert(story.ids.join(',') === ids.join(','),
            `Ordine Rare Hunter incoerente nella Storia: ${story.ids.join(', ')}`);
        t.assert(story.dialogues, 'Ogni Rare Hunter deve avere un dialogo introduttivo nella Storia');
        t.assert(story.migrations.length === 3, 'Le nuove tappe di Battle City devono migrare i vecchi salvataggi');

        const battleCity = fs.readFileSync(path.join(process.cwd(), 'torneo-battle-city.html'), 'utf8');
        ids.forEach((id) => t.assert(
            new RegExp(`HUNTER_IDS[^;]+['\"]${id}['\"]`).test(battleCity),
            `${id}: non compare tra i Rare Hunter affrontabili a Battle City`
        ));
    }
};
