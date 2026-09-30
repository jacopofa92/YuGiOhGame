module.exports = {
    name: 'Regno delle Ombre: ordine, avversari, nodi e raccordi narrativi coerenti',
    async run(t) {
        const audit = await t.evaluate(() => {
            const anime = storyCampaignsDatabase.find((campaign) => campaign.id === 'anime');
            const roster = new Set(characterDatabase.map((character) => character.id));
            const areas = anime.capitoli.map((chapter) => chapter.tappe[0]);
            const wanted = {
                'anime-area-prologo': ['anime-1-allenamento-solomon', 'anime-1-amichevole-joey', 'anime-1-amichevole-tristan', 'anime-1-amichevole-tea'],
                'anime-area-regno': ['anime-2-viaggio', 'anime-2-mai-primo', 'anime-2-notte', 'anime-2-paradox', 'anime-2-stelle', 'anime-2c-keith', 'anime-2c-joey'],
                'anime-area-battlecity1': ['anime-3-marik-molo', 'anime-3-sei-carte'],
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
                    if (node.kind === 'duel' && (!Array.isArray(node.dialogo) || node.dialogo.length < 2)) {
                        problems.push(`${node.id}: manca il dialogo fedele prima del combattimento`);
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

            const regno = areas.find((area) => area.id === 'anime-area-regno').tappe;
            const regnoIds = regno.map((node) => node.id);
            if (regnoIds.indexOf('anime-2-notte') + 1 !== regnoIds.indexOf('anime-2-panik')) {
                problems.push('Le Stelle di Mai deve introdurre direttamente Panik');
            }
            if (regnoIds.indexOf('anime-2-stelle') + 1 !== regnoIds.indexOf('anime-2-kaiba')) {
                problems.push('Il labirinto deve introdurre direttamente lo scontro con Kaiba');
            }
            const stelleMai = regno.find((node) => node.id === 'anime-2-notte');
            const labirinto = regno.find((node) => node.id === 'anime-2-stelle');
            if (!stelleMai.testo.join(' ').includes('Eliminatori di Pegasus')) {
                problems.push('Il raccordo di Panik non racconta il ruolo canonico dell’Eliminatore');
            }
            if (!labirinto.testo.join(' ').includes('Fratelli Paradosso')) {
                problems.push('Il raggiungimento delle dieci Stelle non cita il duello nel labirinto');
            }
            const finaleRegno = ['anime-2c-mai', 'anime-2c-keith', 'anime-2c-joey', 'anime-2-pegasus'];
            let finaleCursor = -1;
            finaleRegno.forEach((id) => {
                const index = regnoIds.indexOf(id);
                if (index <= finaleCursor) problems.push(`Finali del Regno fuori ordine: ${id}`);
                finaleCursor = index;
            });
            ['anime-1-nonno', 'anime-1-joey', 'anime-1-tristan', 'anime-1-tea', 'anime-6-gozaburo'].forEach((id) => {
                const node = areas.flatMap((area) => area.tappe).find((entry) => entry.id === id);
                if (!node || node.kind !== 'scene') problems.push(`${id}: uno scontro non avvenuto nella serie non deve essere un duello`);
            });
            const prologo = areas.find((area) => area.id === 'anime-area-prologo').tappe;
            const prologoIds = prologo.map((node) => node.id);
            const fra = (id, prima, dopo) => prologoIds.indexOf(id) > prologoIds.indexOf(prima)
                && prologoIds.indexOf(id) < prologoIds.indexOf(dopo);
            if (!fra('anime-1-allenamento-solomon', 'anime-1-scena', 'anime-1-nonno')) {
                problems.push('Il duello con Solomon deve stare fra Otto anni dopo e Le regole del nonno');
            }
            ['anime-1-amichevole-joey', 'anime-1-amichevole-tristan', 'anime-1-amichevole-tea'].forEach((id) => {
                if (!fra(id, 'anime-1-joey', 'anime-1-tristan')) problems.push(`${id}: amichevole fuori dal ramo richiesto`);
            });

            return { problems, scenes, migrations: anime.separazioni.map((entry) => entry.id) };
        });

        t.assert(audit.problems.length === 0, `Problemi nella campagna anime:\n${audit.problems.join('\n')}`);
        t.assert(audit.scenes >= 16, `La campagna deve avere raccordi narrativi sufficienti (${audit.scenes})`);
        [
            'regno-notte-isola', 'regno-dieci-stelle', 'regno-viaggio-nave', 'battle-city-finalisti',
            'regno-primo-duello-mai', 'regno-fratelli-paradosso', 'regno-finali-complete',
            'battle-city-duello-molo',
            'virtuale-anime-prigioniere', 'battle-city-promessa-joey',
            'battle-city-tre-dei', 'cerimoniale-nome-atem'
        ].forEach((id) => t.assert(audit.migrations.includes(id), `${id}: migrazione salvataggi mancante`));
    }
};
