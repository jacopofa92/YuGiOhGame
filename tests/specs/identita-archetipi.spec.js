module.exports = {
    name: 'Identita archetipi e nomi assunti per supporti moderni',
    async run(t) {
        const result = await t.evaluate(() => {
            const { cardHasArchetype, cardHasEffectiveName } = CardEffectsShared;
            const card = (id) => cardDatabase.find((entry) => entry.id === id);
            CardEffects.register(99991, {
                archetypes: ['toon', 'custom-family'],
                treatedAsNames: ['Mago Nero']
            });
            const custom = { id: 99991, name: 'Illusionista Custom', type: 'monster' };
            const dataOnly = {
                id: 99992,
                name: 'Drago senza parola chiave',
                type: 'monster',
                archetypes: ['blue-eyes'],
                treatedAsNames: ['Drago Bianco Occhi Blu']
            };
            return {
                toonStorico: cardHasArchetype(card(481), 'toon'),
                toonFlag: cardHasArchetype(card(123), 'toon'),
                redEyesStorico: cardHasArchetype(card(12), 'red-eyes'),
                blueEyesStorico: cardHasArchetype(card(1), 'blue-eyes'),
                darkMagicianStorico: cardHasArchetype(card(2), 'dark-magician'),
                darkMagicianGirlTradotta: cardHasArchetype(card(188), 'dark-magician'),
                customDefinition: cardHasArchetype(custom, 'custom-family'),
                customToon: cardHasArchetype(custom, 'toon'),
                dataArchetype: cardHasArchetype(dataOnly, 'blue-eyes'),
                nomeAssuntoDefinizione: cardHasEffectiveName(custom, 'Mago Nero'),
                nomeAssuntoDati: cardHasEffectiveName(dataOnly, 'Drago Bianco Occhi Blu'),
                nessunFalsoPositivo: !cardHasArchetype(card(202), 'toon')
                    && !cardHasEffectiveName(card(2), 'Drago Bianco Occhi Blu')
            };
        });
        Object.entries(result).forEach(([name, value]) => {
            t.assert(value, `${name} deve essere vero: ${JSON.stringify(result)}`);
        });
    }
};
