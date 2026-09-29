module.exports = {
    name: 'Fusione: i tre materiali convergono in 3D prima della cinematica del mostro',
    freeze: false,
    async run(t) {
        const start = await t.evaluate(() => {
            const blueEyesTemplate = cardDatabase.find((c) => c.id === 1);
            const ultimateTemplate = cardDatabase.find((c) => c.id === 29);
            const materials = [0, 1, 2].map((i) => ({ ...blueEyesTemplate, uid: 'fusion-blue-eyes-' + i }));
            const ultimate = { ...ultimateTemplate, uid: 'fusion-ultimate' };
            gameState.playerHand = materials;
            gameState.playerMonsterField = [null, null, null, null, null];
            gameState.playerExtraDeck = [ultimate];
            gameState.playerGraveyard = [];
            const option = DuelEngine.getFusableExtraDeckMonsters('player').find((v) => v.card.id === 29);
            window.__fusionSummonFxAt = null;
            const original = FX.playMonsterSummonEffect;
            FX.playMonsterSummonEffect = function () {
                window.__fusionSummonFxAt = performance.now();
                return original.apply(this, arguments);
            };
            window.__fusionStartedAt = performance.now();
            const ok = DuelEngine.actions.fusionSummon('player', option.extraDeckIndex, option.materialLocations);
            return {
                ok,
                materialsVisual: document.querySelectorAll('.fx-fusion-material').length,
                scene: !!document.querySelector('.fx-fusion-scene'),
                cinematic: FX.isCinematicPlaying(),
                summonAlreadyPlayed: window.__fusionSummonFxAt !== null,
                graveyard: gameState.playerGraveyard.length,
                fusionOnField: gameState.playerMonsterField.some((s) => s && s.card.id === 29)
            };
        });

        t.assert(start.ok && start.materialsVisual === 3 && start.scene && start.cinematic,
            'I tre Draghi Bianchi devono apparire nella cinematica 3D e bloccare l’avanzamento');
        t.assert(start.graveyard === 3 && !start.fusionOnField,
            'I materiali devono essere consumati, ma il Mostro Fusione non deve essere già sul campo durante il vortice');
        t.assert(!start.summonAlreadyPlayed,
            'La cinematica del Drago Bianco Definitivo non deve partire insieme ai materiali');

        await new Promise((resolve) => setTimeout(resolve, 3300));
        const end = await t.evaluate(() => ({
            scene: !!document.querySelector('.fx-fusion-scene'),
            summonDelay: window.__fusionSummonFxAt === null ? -1 : window.__fusionSummonFxAt - window.__fusionStartedAt,
            fusionOnField: gameState.playerMonsterField.some((s) => s && s.card.id === 29)
        }));
        t.assert(!end.scene && end.fusionOnField && end.summonDelay >= 2850,
            'Il mostro evocato deve iniziare la propria animazione solo dopo il collasso dei materiali');
    }
};
