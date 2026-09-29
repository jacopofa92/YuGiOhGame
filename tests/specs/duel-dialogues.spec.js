module.exports = {
    name: 'Duellanti: battute contestuali, personalità e balloon responsive',
    async run(t) {
        const data = await t.evaluate(async () => {
            const contexts = ['battleStart', 'victory', 'attack', 'turnStart', 'damaged', 'activate'];
            const profiles = DuelDialogues._profiles;
            const assignments = DuelDialogues._assignments;
            const missingAssignments = characterDatabase.filter((c) => !assignments[c.id]).map((c) => c.id);
            const malformedProfiles = Object.entries(profiles).filter(([, profile]) => (
                contexts.some((context) => !Array.isArray(profile[context]) || profile[context].length !== 3)
            )).map(([id]) => id);

            DuelDialogues.say('bot', 'attack', { force: true, text: 'Battuta di prova' });
            await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            const bubble = document.querySelector('#botInfo .duel-speech');
            const box = document.getElementById('botInfo').getBoundingClientRect();
            const rect = bubble.getBoundingClientRect();
            DuelSession.opponent.id = 'kaiba';
            const iconic = DuelDialogues.summon('bot', { name: 'Drago Bianco Occhi Blu' });
            return {
                missingAssignments,
                malformedProfiles,
                visible: bubble.classList.contains('is-visible'),
                text: bubble.textContent,
                nearAvatar: Math.abs(rect.right - box.right) < 8 && rect.top >= box.bottom,
                iconic,
                special: bubble.classList.contains('is-special'),
                role: bubble.getAttribute('role')
            };
        });

        t.assert(data.missingAssignments.length === 0,
            `Duellanti senza personalità: ${data.missingAssignments.join(', ')}`);
        t.assert(data.malformedProfiles.length === 0,
            `Profili senza tre frasi per contesto: ${data.malformedProfiles.join(', ')}`);
        t.assert(data.visible && data.nearAvatar && data.role === 'status',
            `Balloon avversario non valido: ${JSON.stringify(data)}`);
        t.assert(data.iconic && data.special && /Drago Bianco/.test(data.text),
            `La frase iconica di Kaiba non è obbligatoria: ${JSON.stringify(data)}`);
    }
};
