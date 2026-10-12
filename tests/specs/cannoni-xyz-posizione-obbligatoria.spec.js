// Regressione congiunta per la famiglia X/Y/Z e per il secondo passaggio
// obbligatorio "scegli Attacco/Difesa" dopo aver già scelto un mostro.
const { openDuel, freezeNaturalGameLoop } = require('../helpers/harness');

module.exports = {
    name: 'Cannoni X/Y/Z e scelta Posizione obbligatoria',
    standalone: true,
    async run({ browser, assert }) {
        const context = await browser.newContext({ serviceWorkers: 'block' });
        const page = await context.newPage();
        try {
            await openDuel(page);
            await freezeNaturalGameLoop(page);

            const xyz = await page.evaluate(() => {
                const make = (id, uid) => ({ ...cardDatabase.find((c) => c.id === id), uid });
                const slot = (card) => ({ card, position: 'attack', isFaceDown: false, hasAttacked: false, canChangePosition: false });
                const empty = () => [null, null, null, null, null];
                gameState.currentPlayer = 'player';
                gameState.phase = 'main1';
                gameState.playerBanished = [];
                gameState.playerGraveyard = [];

                const defXY = DuelEngine.getDefinition(511);
                const defXYZ = DuelEngine.getDefinition(512);
                const dichiarazioni = {
                    xy: defXY.banishFusionMaterials.slice(),
                    xyz: defXYZ.banishFusionMaterials.slice(),
                    bloccoCimitero: !!defXY.cannotBeSpecialSummonedFromGraveyard && !!defXYZ.cannotBeSpecialSummonedFromGraveyard
                };

                // XY + Z non è la combinazione TCG di XYZ e non deve
                // comparire fra le opzioni disponibili.
                gameState.playerMonsterField = [slot(make(511, 'xy')), slot(make(515, 'z-a')), null, null, null];
                gameState.playerExtraDeck = [make(512, 'xyz-a')];
                const accettaXYpiuZ = DuelEngine.getBanishFusableExtraDeckMonsters('player').some((o) => o.card.id === 512);

                // X + Y + Z, anche a Terreno pieno, deve invece liberare
                // gli slot dei tre materiali e completare la combinazione.
                const filler = cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck && ![510, 513, 515].includes(c.id));
                gameState.playerMonsterField = [
                    slot(make(510, 'x')), slot(make(513, 'y')), slot(make(515, 'z')),
                    slot({ ...filler, uid: 'fill-a' }), slot({ ...filler, uid: 'fill-b' })
                ];
                gameState.playerExtraDeck = [make(512, 'xyz-b')];
                gameState.playerBanished = [];
                const opzione = DuelEngine.getBanishFusableExtraDeckMonsters('player')[0];
                const originale = FX.playFusionMaterialEffect;
                FX.playFusionMaterialEffect = (_materiali, _fusione, _owner, completa) => completa();
                const evocato = DuelEngine.banishFusionSummon('player', opzione.extraDeckIndex, opzione.materialFieldIndices);
                FX.playFusionMaterialEffect = originale;
                const combinazione = {
                    evocato,
                    materiali: opzione.materialFieldIndices,
                    banditi: gameState.playerBanished.map((c) => c.id).sort((a, b) => a - b),
                    risultato: gameState.playerMonsterField.filter(Boolean).map((s) => s.card.id)
                };

                // Il testo di entrambe vieta la rianimazione dal Cimitero.
                gameState.playerMonsterField = empty();
                const xyCimitero = make(511, 'xy-grave');
                gameState.playerGraveyard = [xyCimitero];
                const rianimato = DuelEngine.actions.specialSummon('player', xyCimitero, 0, 'attack', 'graveyard');
                const xyAncoraNelCimitero = gameState.playerGraveyard.some((c) => c.uid === xyCimitero.uid);

                // Y si deve poter staccare volontariamente in Main Phase.
                const x = make(510, 'x-union');
                const y = make(513, 'y-union');
                y.equippedToOwner = 'player'; y.equippedToIndex = 0; y.equippedToUid = x.uid;
                gameState.playerMonsterField = [slot(x), null, null, null, null];
                gameState.playerSTField = [{ card: y, isFaceDown: false }, null, null, null, null];
                gameState.usedIgnitionThisTurn = {};
                const yDef = DuelEngine.getDefinition(513);
                const yCtx = DuelEngine.makeContext('player', { card: y, zone: 'st', index: 0, slot: gameState.playerSTField[0] });
                const yPuoStaccarsi = yDef.canActivate(yCtx);
                yDef.activate(yCtx);
                const yStaccata = !gameState.playerSTField[0]
                    && gameState.playerMonsterField.some((s) => s && s.card.uid === y.uid);

                // Anche Z condivide lo stesso effetto Union di distacco.
                const zDetach = make(515, 'z-detach');
                zDetach.equippedToOwner = 'player'; zDetach.equippedToIndex = 0; zDetach.equippedToUid = x.uid;
                gameState.playerMonsterField = [slot(x), null, null, null, null];
                gameState.playerSTField = [{ card: zDetach, isFaceDown: false }, null, null, null, null];
                gameState.usedIgnitionThisTurn = {};
                const zDef = DuelEngine.getDefinition(515);
                const zCtx = DuelEngine.makeContext('player', { card: zDetach, zone: 'st', index: 0, slot: gameState.playerSTField[0] });
                const zPuoStaccarsi = zDef.canActivate(zCtx);
                zDef.activate(zCtx);
                const zStaccata = !gameState.playerSTField[0]
                    && gameState.playerMonsterField.some((s) => s && s.card.uid === zDetach.uid);

                // Z equipaggiato deve essere distrutto al posto di X.
                const zProt = make(515, 'z-protezione');
                zProt.equippedToOwner = 'player'; zProt.equippedToIndex = 0; zProt.equippedToUid = x.uid;
                gameState.playerMonsterField = [slot(x), null, null, null, null];
                gameState.playerSTField = [{ card: zProt, isFaceDown: false }, null, null, null, null];
                gameState.playerGraveyard = [];
                DuelEngine.actions.destroyMonster('player', 0, 'bot');
                const protezioneZ = !!gameState.playerMonsterField[0]
                    && !gameState.playerSTField[0]
                    && gameState.playerGraveyard.some((c) => c.uid === zProt.uid);

                return { dichiarazioni, accettaXYpiuZ, combinazione, rianimato, xyAncoraNelCimitero, yPuoStaccarsi, yStaccata, zPuoStaccarsi, zStaccata, protezioneZ };
            });

            assert(xyz.dichiarazioni.xy.join(',') === '510,513', 'XY deve richiedere X + Y');
            assert(xyz.dichiarazioni.xyz.join(',') === '510,513,515', 'XYZ deve richiedere direttamente X + Y + Z');
            assert(xyz.dichiarazioni.bloccoCimitero, 'XY e XYZ devono vietare la Special Summon dal Cimitero');
            assert(!xyz.accettaXYpiuZ, 'XY + Z non deve sostituire X + Y + Z');
            assert(xyz.combinazione.evocato && xyz.combinazione.materiali.join(',') === '0,1,2'
                && xyz.combinazione.banditi.join(',') === '510,513,515'
                && xyz.combinazione.risultato.includes(512),
            `La combinazione XYZ a campo pieno deve riuscire correttamente (${JSON.stringify(xyz.combinazione)})`);
            assert(!xyz.rianimato && xyz.xyAncoraNelCimitero, 'Cannone Drago XY non deve poter essere rianimato né sparire dal Cimitero');
            assert(xyz.yPuoStaccarsi && xyz.yStaccata, 'Testa di Drago Y deve potersi staccare volontariamente in Main Phase');
            assert(xyz.zPuoStaccarsi && xyz.zStaccata, 'Carro Armato Metallico Z deve potersi staccare volontariamente in Main Phase');
            assert(xyz.protezioneZ, 'Carro Armato Metallico Z deve essere distrutto al posto del mostro equipaggiato');

            const posizione = await page.evaluate(() => {
                const card = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck), uid: 'scelta-obbligatoria' };
                gameState.playerMonsterField = [null, null, null, null, null];
                gameState.playerGraveyard = [card];
                let callback = 0;
                DuelEngineUI.openPositionPicker(null, {
                    title: 'Attacco o Difesa?',
                    onSelect: (position) => {
                        callback++;
                        const index = gameState.playerGraveyard.findIndex((c) => c.uid === card.uid);
                        if (index !== -1) gameState.playerGraveyard.splice(index, 1);
                        DuelEngine.actions.specialSummon('player', card, 0, position, 'graveyard');
                    }
                });
                document.getElementById('quickPopoverCatcher').click();
                const dopoFuori = {
                    prompt: !!document.getElementById('quickPopover'),
                    callback,
                    nelCimitero: gameState.playerGraveyard.some((c) => c.uid === card.uid),
                    inCampo: gameState.playerMonsterField.some((s) => s && s.card.uid === card.uid)
                };
                document.getElementById('qpPositionDefense').click();
                return {
                    dopoFuori,
                    promptFinale: !!document.getElementById('quickPopover'),
                    callback,
                    slot: gameState.playerMonsterField.find((s) => s && s.card.uid === card.uid)
                };
            });
            assert(posizione.dopoFuori.prompt && posizione.dopoFuori.callback === 0
                && posizione.dopoFuori.nelCimitero && !posizione.dopoFuori.inCampo,
            'Cliccare fuori non deve chiudere né consumare la scelta obbligatoria della Posizione');
            assert(!posizione.promptFinale && posizione.callback === 1 && posizione.slot
                && posizione.slot.position === 'defense' && posizione.slot.isFaceDown,
            'Dopo il click fuori, scegliere Difesa deve comunque completare una sola Evocazione');
        } finally {
            await context.close();
        }
    }
};
