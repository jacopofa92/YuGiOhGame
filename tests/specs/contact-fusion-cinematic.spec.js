module.exports = {
    name: 'Fusione senza Polimerizzazione: X/Y convergono prima del Cannone Drago',
    freeze: false,
    async run(t) {
        const start = await t.evaluate(() => {
            const make = (id, uid) => ({ ...cardDatabase.find((c) => c.id === id), uid });
            const slot = (card) => ({ card, position: 'attack', isFaceDown: false, hasAttacked: false, canChangePosition: false });
            const fillerTemplate = cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck && ![510, 513].includes(c.id));
            gameState.playerMonsterField = [
                slot({ ...fillerTemplate, uid: 'contact-filler-0' }),
                slot(make(510, 'contact-x')),
                slot({ ...fillerTemplate, uid: 'contact-filler-2' }),
                slot(make(513, 'contact-y')),
                slot({ ...fillerTemplate, uid: 'contact-filler-4' })
            ];
            gameState.playerExtraDeck = [make(511, 'contact-xy')];
            gameState.playerBanished = [];
            const option = DuelEngine.getBanishFusableExtraDeckMonsters('player')[0];
            window.__contactSummonFxAt = null;
            const original = FX.playMonsterSummonEffect;
            FX.playMonsterSummonEffect = function () {
                window.__contactSummonFxAt = performance.now();
                return original.apply(this, arguments);
            };
            window.__contactStartedAt = performance.now();
            const ok = DuelEngine.banishFusionSummon('player', option.extraDeckIndex, option.materialFieldIndices);
            return {
                ok,
                chosen: option.materialFieldIndices,
                materialsVisual: document.querySelectorAll('.fx-fusion-material').length,
                scene: !!document.querySelector('.fx-fusion-scene'),
                cinematic: FX.isCinematicPlaying(),
                summonedFx: window.__contactSummonFxAt !== null,
                banishedIds: gameState.playerBanished.map((c) => c.id).sort(),
                resultOnField: gameState.playerMonsterField.some((s) => s && s.card.id === 511),
                occupied: gameState.playerMonsterField.filter(Boolean).length
            };
        });

        t.assert(start.ok && start.chosen.join(',') === '1,3',
            'Cannone Testa X e Testa di Drago Y scoperti devono essere i materiali scelti');
        t.assert(start.materialsVisual === 2 && start.scene && start.cinematic,
            'Anche senza Polimerizzazione i due materiali devono convergere nella cinematica');
        t.assert(start.banishedIds.join(',') === '510,513' && !start.resultOnField && start.occupied === 3,
            'I materiali devono essere banditi subito ma Cannone Drago XY deve restare fuori dal campo durante il vortice');
        t.assert(!start.summonedFx,
            'L animazione di Evocazione del risultato non deve partire insieme alla convergenza');

        await new Promise((resolve) => setTimeout(resolve, 3300));
        const end = await t.evaluate(() => ({
            scene: !!document.querySelector('.fx-fusion-scene'),
            resultSlot: gameState.playerMonsterField.findIndex((s) => s && s.card.id === 511),
            occupied: gameState.playerMonsterField.filter(Boolean).length,
            summonDelay: window.__contactSummonFxAt === null ? -1 : window.__contactSummonFxAt - window.__contactStartedAt
        }));
        t.assert(!end.scene && end.resultSlot === 1 && end.occupied === 4 && end.summonDelay >= 2850,
            'Dopo la convergenza Cannone Drago XY deve entrare nel primo slot liberato e avviare la sua Evocazione');
    }
};
