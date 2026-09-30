module.exports = {
    name: 'Regno delle Ombre: ordine, avversari, nodi e raccordi narrativi coerenti',
    async run(t) {
        const audit = await t.evaluate(() => {
            const anime = storyCampaignsDatabase.find((campaign) => campaign.id === 'anime');
            const roster = new Set(characterDatabase.map((character) => character.id));
            const areas = anime.capitoli.map((chapter) => chapter.tappe[0]);
            const wanted = {
                'anime-area-regno': ['anime-2-notte', 'anime-2-stelle'],
                'anime-area-battlecity1': ['anime-3-sei-carte'],
                'anime-area-virtuale': ['anime-6-anime-prigioni'],
                'anime-area-battlecity2': ['anime-4b-amicizia', 'anime-4b-tre-dei'],
                'anime-area-cerimoniale': ['anime-9-nome']
            };
            const problems = [];
            let scenes = 0;

            areas.forEach((area) => {
                const width = area.mappa.larghezza;
                const height = area.mappa.altezza;
                const ids = area.tappe.map((node) => node.id);
                (wanted[area.id] || []).forEach((id) => {
                    if (!ids.includes(id)) problems.push(`${area.id}: manca ${id}`);
                });
                area.tappe.forEach((node) => {
                    if (node.x < 0 || node.x > width || node.y < 0 || node.y > height) {
                        problems.push(`${node.id}: coordinate fuori mappa (${node.x},${node.y})`);
                    }
                    if (node.kind === 'duel' && !roster.has(node.characterId)) {
                        problems.push(`${node.id}: avversario inesistente ${node.characterId}`);
                    }
                    if (node.kind === 'scene') {
                        scenes++;
                        if (!Array.isArray(node.testo) || node.testo.length < 2) problems.push(`${node.id}: scena troppo vuota`);
                    }
                });
            });

            const battle = areas.find((area) => area.id === 'anime-area-battlecity1').tappe.map((node) => node.id);
            const expectedBattle = ['anime-3-seeker', 'anime-3-espa', 'anime-3-strings', 'anime-3-arkana',
                'anime-3-lumis', 'anime-3-umbra', 'anime-3-bakura', 'anime-3-ishizu', 'anime-3-odion',
                'anime-3-sei-carte', 'anime-4-scena'];
            let cursor = -1;
            expectedBattle.forEach((id) => {
                const index = battle.indexOf(id);
                if (index <= cursor) problems.push(`Battle City fuori ordine: ${id}`);
                cursor = index;
            });

            const battleNodes = areas.find((area) => area.id === 'anime-area-battlecity1').tappe;
            const minDistance = battleNodes.slice(1).reduce((min, node, index) => {
                const previous = battleNodes[index];
                return Math.min(min, Math.hypot(node.x - previous.x, node.y - previous.y));
            }, Infinity);
            if (minDistance < 80) problems.push(`Nodi Battle City troppo sovrapposti: ${Math.round(minDistance)}px`);

            return { problems, scenes, migrations: anime.separazioni.map((entry) => entry.id) };
        });

        t.assert(audit.problems.length === 0, `Problemi nella campagna anime:\n${audit.problems.join('\n')}`);
        t.assert(audit.scenes >= 16, `La campagna deve avere raccordi narrativi sufficienti (${audit.scenes})`);
        [
            'regno-notte-isola', 'regno-dieci-stelle', 'battle-city-finalisti',
            'virtuale-anime-prigioniere', 'battle-city-promessa-joey',
            'battle-city-tre-dei', 'cerimoniale-nome-atem'
        ].forEach((id) => t.assert(audit.migrations.includes(id), `${id}: migrazione salvataggi mancante`));
    }
};
