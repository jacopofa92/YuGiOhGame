// Primo blocco del completamento TCG: 16 Fusioni dei primi sette set e
// i quattro materiali normali che mancavano davvero dal catalogo.
module.exports = {
    name: 'Prima serie TCG: 16 Fusioni storiche e materiali (1141-1160)',
    async run(t) {
        const data = await t.evaluate(() => {
            const materiali = {
                1141: [922, 913], 1142: [1062, 495], 1143: [909, 1157],
                1144: [940, 951], 1145: [1012, 944], 1146: [526, 905],
                1147: [444, 1158], 1148: [402, 923], 1149: [949, 946],
                1150: [918, 919], 1151: [929, 1159], 1152: [939, 948],
                1153: [661, 1053], 1154: [1010, 945], 1155: [504, 630],
                1156: [1098, 1160]
            };
            const fusioniValide = Object.entries(materiali).every(([id, ids]) => {
                const card = cardDatabase.find((c) => c.id === Number(id));
                const def = DuelEngine.getDefinition(Number(id));
                return card && card.extraDeck === true && def
                    && JSON.stringify(def.fusionMaterials) === JSON.stringify(ids)
                    && ids.every((materialId) => !!cardDatabase.find((c) => c.id === materialId));
            });

            const vanillaCorretti = [1157, 1158, 1159, 1160].every((id) => {
                const card = cardDatabase.find((c) => c.id === id);
                return card && card.vanilla === true && !DuelEngine.getDefinition(id);
            });

            // Una Fusione semplice deve essere trovata dal motore reale.
            const fusion = { ...cardDatabase.find((c) => c.id === 1143) };
            gameState.playerHand = [
                { ...cardDatabase.find((c) => c.id === 909), uid: 'firegrass-1143' },
                { ...cardDatabase.find((c) => c.id === 1157), uid: 'petit-dragon-1143' }
            ];
            gameState.playerExtraDeck = [fusion];
            gameState.playerMonsterField = [null, null, null, null, null];
            const fusable = DuelEngine.getFusableExtraDeckMonsters('player');

            // Mietitore dell'Incubo: protezione, attacco diretto e scarto.
            const reaperDef = DuelEngine.getDefinition(1153);
            const reaper = { ...cardDatabase.find((c) => c.id === 1153), uid: 'reaper-nightmare' };
            gameState.playerMonsterField = [{ card: reaper, position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.botHand = [{ ...cardDatabase.find((c) => c.id === 4), uid: 'discard-me' }];
            gameState.botGraveyard = [];
            gameState.directAttackAllowedUids = {};
            reaperDef.static(DuelEngine.makeContext('player', { card: reaper, index: 0 }));
            reaperDef.onDealsBattleDamage(DuelEngine.makeContext('player', { card: reaper, targetIndex: -1 }));

            // Ryu Senshi: almeno i due contratti reattivi devono essere registrati.
            const ryuDef = DuelEngine.getDefinition(1155);
            return {
                fusioniValide,
                vanillaCorretti,
                sempliceFondibile: fusable.some((f) => f.card.id === 1143),
                reaperProtetto: reaperDef.cannotBeDestroyedByBattle === true,
                reaperDiretto: gameState.directAttackAllowedUids[reaper.uid] === true,
                reaperScarta: gameState.botHand.length === 0 && gameState.botGraveyard.some((c) => c.uid === 'discard-me'),
                ryuRapido: ryuDef.canRespondAsQuickEffect === true,
                ryuBersaglio: typeof ryuDef.canReactToTargetDeclare === 'function' && typeof ryuDef.onCardEffectTargetDeclare === 'function'
            };
        });

        t.assert(data.fusioniValide, 'Ogni Fusione deve dichiarare due materiali realmente presenti');
        t.assert(data.vanillaCorretti, 'I quattro materiali normali devono restare vanilla senza handler');
        t.assert(data.sempliceFondibile, 'Drago Fuoconero deve essere trovato dal motore con i materiali in mano');
        t.assert(data.reaperProtetto && data.reaperDiretto && data.reaperScarta,
            'Mietitore dell Incubo deve proteggersi, attaccare direttamente e far scartare');
        t.assert(data.ryuRapido && data.ryuBersaglio,
            'Ryu Senshi deve avere negazione rapida delle Trappole e reazione alle Magie bersaglio');
    }
};
