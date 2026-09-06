// Quattordicesima ondata prima serie: 4 Mostri Effetto minori (id 1118-1121).
// Verifica soprattutto il nuovo def.destroysSelfIfLinkedMonsterMissing
// (recomputeStaticEffects, duel-engine.js — mutazione diretta, MAI
// ctx.destroyMonster, stesso motivo della pulizia degli Equip con
// bersaglio non più valido) e il riuso di def.damageStepBonus (già
// esistente, generico per attaccante O difensore).
module.exports = {
    name: 'Quattordicesima ondata prima serie: negazione condizionata, mostro agganciato, bonus damage step, autodistruzione reattiva (id 1118-1121)',
    async run(t) {
        // Sovrano Oscuro Ha Des (1118): nega gli effetti di un mostro distrutto in battaglia da un Demone del proprio controllore, non da un mostro qualunque.
        // Battaglia REALE via resolveAttack (non un fireTrigger sintetico):
        // il codice nuovo vive dentro fireOnDestroy, una funzione interna
        // di actions.js mai chiamata direttamente da fuori — stesso schema
        // già usato da tests/specs/battle-resolution.spec.js.
        const darkRulerResult = await t.evaluate(() => {
            return new Promise((resolve) => {
                const ruler = { ...cardDatabase.find((c) => c.id === 1118), uid: 'ruler-1' };
                const fiendAttacker = { ...cardDatabase.find((c) => c.type === 'monster' && c.race === 'Demone' && c.id !== 1118), uid: 'fiend-attacker-1', attack: 3000, defense: 0 };
                const flipPrey = { ...cardDatabase.find((c) => c.id === 23), uid: 'ruler-prey-1', attack: 100, defense: 0 };
                gameState.playerMonsterField = [{ card: ruler, position: 'attack', isFaceDown: false }, { card: fiendAttacker, position: 'attack', isFaceDown: false, hasAttacked: false }, null, null, null];
                gameState.botMonsterField = [{ card: flipPrey, position: 'attack', isFaceDown: false, hasAttacked: false }, null, null, null, null];
                gameState.phase = 'battle';
                DuelEngine.recomputeStaticEffects();
                const negatesFor = gameState.negatesFiendBattleKillsFor.player;
                gameState.monsterEffectsNegatedUidsFor = { player: new Set(), bot: new Set() };
                gameState.negatedEffectsForeverUids = new Set();
                resolveAttack('player', 1, 0, () => {
                    resolve({ negatesFor: negatesFor, negatedByFiend: gameState.negatedEffectsForeverUids.has('ruler-prey-1') });
                });
            });
        });

        const darkRulerNonFiendResult = await t.evaluate(() => {
            return new Promise((resolve) => {
                // Sovrano Oscuro Ha Des resta presente e attivo qui: la
                // sola differenza rispetto al blocco sopra è la Razza
                // dell'attaccante, per isolare davvero il discriminatore
                // "era un Demone o no" invece di confondere "nessun
                // Sovrano Oscuro Ha Des sul Terreno" con "attaccante non
                // Demone".
                const ruler = { ...cardDatabase.find((c) => c.id === 1118), uid: 'ruler-2' };
                const nonFiendAttacker = { ...cardDatabase.find((c) => c.type === 'monster' && c.race !== 'Demone' && !c.extraDeck), uid: 'nonfiend-attacker-1', attack: 3000, defense: 0 };
                const flipPrey2 = { ...cardDatabase.find((c) => c.id === 23), uid: 'ruler-prey-2', attack: 100, defense: 0 };
                gameState.playerMonsterField = [{ card: ruler, position: 'attack', isFaceDown: false }, { card: nonFiendAttacker, position: 'attack', isFaceDown: false, hasAttacked: false }, null, null, null];
                gameState.botMonsterField = [{ card: flipPrey2, position: 'attack', isFaceDown: false, hasAttacked: false }, null, null, null, null];
                gameState.phase = 'battle';
                DuelEngine.recomputeStaticEffects();
                gameState.negatedEffectsForeverUids = new Set();
                resolveAttack('player', 1, 0, () => {
                    resolve({ negatedByNonFiend: gameState.negatedEffectsForeverUids.has('ruler-prey-2') });
                });
            });
        });
        darkRulerResult.negatedByNonFiend = darkRulerNonFiendResult.negatedByNonFiend;
        t.assert(darkRulerResult.negatesFor, 'Sovrano Oscuro Ha Des deve attivare gameState.negatesFiendBattleKillsFor per il proprio controllore');
        t.assert(darkRulerResult.negatedByFiend, 'Deve negare per sempre gli effetti di un mostro distrutto in battaglia da un proprio Demone');
        t.assert(!darkRulerResult.negatedByNonFiend, 'NON deve negare gli effetti se il distruttore non era un Demone');

        // Gradius' Option (1119): Special Summon scegliendo Gradius; ATK/DEF identici a Gradius; si autodistrugge se Gradius lascia il Terreno.
        const gradiusOptionResult = await t.evaluate(() => {
            const option = { ...cardDatabase.find((c) => c.id === 1119), uid: 'option-1' };
            const gradius = { ...cardDatabase.find((c) => c.id === 274), uid: 'gradius-1' };
            gameState.playerHand = [option];
            gameState.playerMonsterField = [{ card: gradius, position: 'attack', isFaceDown: false }, null, null, null, null];
            const canSummon = DuelEngine.canSpecialSummonFromHand('player', 0);
            const summoned = DuelEngine.trySpecialSummonFromHand('player', 0);
            const optionSlot = gameState.playerMonsterField.find((s) => s && s.card.uid === 'option-1');
            DuelEngine.recomputeStaticEffects();
            const atkMatchesGradius = DuelEngine.getEffectiveAtk(optionSlot.card) === DuelEngine.getEffectiveAtk(gradius);
            const defMatchesGradius = DuelEngine.getEffectiveDef(optionSlot.card) === DuelEngine.getEffectiveDef(gradius);

            // Gradius lascia il Terreno: Gradius' Option deve autodistruggersi al prossimo render.
            gameState.playerMonsterField[0] = null;
            DuelEngine.recomputeStaticEffects();
            const optionDestroyedAfterGradiusGone = !gameState.playerMonsterField.some((s) => s && s.card.uid === 'option-1');
            return { canSummon: canSummon, summoned: summoned, atkMatchesGradius: atkMatchesGradius, defMatchesGradius: defMatchesGradius, optionDestroyedAfterGradiusGone: optionDestroyedAfterGradiusGone };
        });
        t.assert(gradiusOptionResult.canSummon, 'Gradius\' Option deve poter Special Summonarsi con Gradius scoperto sul Terreno');
        t.assert(gradiusOptionResult.summoned, 'Gradius\' Option deve riuscire a Special Summonarsi');
        t.assert(gradiusOptionResult.atkMatchesGradius && gradiusOptionResult.defMatchesGradius, 'ATK e DEF di Gradius\' Option devono essere identici a quelli di Gradius');
        t.assert(gradiusOptionResult.optionDestroyedAfterGradiusGone, 'Gradius\' Option deve autodistruggersi quando Gradius lascia il Terreno');

        // Il Cacciatore dalle 7 Armi (1120): dichiara il Tipo più diffuso tra i mostri avversari; +1000 ATK SOLO durante il calcolo dei danni contro quel Tipo.
        const hunterResult = await t.evaluate(() => {
            const hunter = { ...cardDatabase.find((c) => c.id === 1120), uid: 'hunter-1', attack: 1000 };
            const oppDragon1 = { ...cardDatabase.find((c) => c.type === 'monster' && c.race === 'Drago' && !c.extraDeck), uid: 'opp-dragon-1' };
            const oppDragon2 = { ...cardDatabase.find((c) => c.type === 'monster' && c.race === 'Drago' && !c.extraDeck), uid: 'opp-dragon-2' };
            const oppWarrior = { ...cardDatabase.find((c) => c.type === 'monster' && c.race === 'Guerriero' && !c.extraDeck), uid: 'opp-warrior-1' };
            gameState.botMonsterField = [{ card: oppDragon1, position: 'attack', isFaceDown: false }, { card: oppDragon2, position: 'attack', isFaceDown: false }, { card: oppWarrior, position: 'attack', isFaceDown: false }, null, null];
            const ctx = DuelEngine.makeContext('player', { card: hunter });
            DuelEngine.getDefinition(1120).onSummon(ctx);
            const declaredRace = hunter.declaredRace;

            const bonusVsDragon = DuelEngine.getDefinition(1120).damageStepBonus({ card: hunter, opponentCard: oppDragon1, role: 'attacker', owner: 'player' });
            const bonusVsWarrior = DuelEngine.getDefinition(1120).damageStepBonus({ card: hunter, opponentCard: oppWarrior, role: 'attacker', owner: 'player' });
            return { declaredRace: declaredRace, bonusVsDragonAtk: bonusVsDragon.atk, bonusVsWarriorAtk: bonusVsWarrior.atk };
        });
        t.assert(hunterResult.declaredRace === 'Drago', `Il Cacciatore dalle 7 Armi deve dichiarare il Tipo più diffuso (Drago, rilevato "${hunterResult.declaredRace}")`);
        t.assert(hunterResult.bonusVsDragonAtk === 1000, `Deve guadagnare 1000 ATK in battaglia contro un mostro del Tipo dichiarato (rilevati ${hunterResult.bonusVsDragonAtk})`);
        t.assert(hunterResult.bonusVsWarriorAtk === 0, 'NON deve guadagnare ATK contro un Tipo diverso da quello dichiarato');

        // Thunder Nyan Nyan (1121): si autodistrugge quando un mostro non-LUCE entra sul proprio Terreno.
        const thunderNyanResult = await t.evaluate(() => {
            const nyan = { ...cardDatabase.find((c) => c.id === 1121), uid: 'nyan-1' };
            const lightMonster = { ...cardDatabase.find((c) => c.type === 'monster' && c.attribute === 'LUCE' && !c.extraDeck), uid: 'nyan-light-1' };
            gameState.playerMonsterField = [{ card: nyan, position: 'attack', isFaceDown: false }, { card: lightMonster, position: 'attack', isFaceDown: false }, null, null, null];
            const ctxLight = DuelEngine.makeContext('player', { card: nyan });
            DuelEngine.getDefinition(1121).onAnyNormalOrFlipSummon(ctxLight);
            const survivesWithOnlyLight = gameState.playerMonsterField.some((s) => s && s.card.uid === 'nyan-1');

            const darkMonster = { ...cardDatabase.find((c) => c.type === 'monster' && c.attribute === 'OSCURITÀ' && !c.extraDeck), uid: 'nyan-dark-1' };
            gameState.playerMonsterField = [{ card: nyan, position: 'attack', isFaceDown: false }, { card: darkMonster, position: 'attack', isFaceDown: false }, null, null, null];
            const ctxDark = DuelEngine.makeContext('player', { card: nyan });
            DuelEngine.getDefinition(1121).onAnySpecialSummon(ctxDark);
            const destroyedWithNonLight = !gameState.playerMonsterField.some((s) => s && s.card.uid === 'nyan-1');
            return { survivesWithOnlyLight: survivesWithOnlyLight, destroyedWithNonLight: destroyedWithNonLight };
        });
        t.assert(thunderNyanResult.survivesWithOnlyLight, 'Thunder Nyan Nyan NON deve autodistruggersi se controlla solo mostri LUCE');
        t.assert(thunderNyanResult.destroyedWithNonLight, 'Thunder Nyan Nyan deve autodistruggersi quando controlla un mostro non-LUCE');
    }
};
