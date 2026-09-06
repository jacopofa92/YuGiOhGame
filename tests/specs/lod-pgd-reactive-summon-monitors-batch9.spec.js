// Nona ondata prima serie: 9 Mostri Effetto minori (id 1075-1083).
// Verifica i meccanismi genuinamente nuovi: divieto PERMANENTE di
// Special Summon (Jowgen), il monitor condiviso "qualunque Evocazione"
// (Tigre Re Wanghu/Kotodama, def.onAnyNormalOrFlipSummon/onAnySpecialSummon)
// e il nuovo gameState.virtualUmiPresent (Ninfa dell'Acqua) — oltre al
// riuso di infrastruttura già esistente (cannotAttackUids,
// battleDestroyedThisTurnFor, banishFromGraveyard).
module.exports = {
    name: 'Nona ondata prima serie: divieto permanente, monitor di Evocazione, Umi virtuale (id 1075-1083)',
    async run(t) {
        // Jowgen lo Spiritualista (1075): distrugge i mostri Special Summonati e vieta la Special Summon PER SEMPRE (anche dopo che Jowgen lascia il campo).
        const jowgenResult = await t.evaluate(() => {
            const filler = cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck);
            const jowgen = { ...cardDatabase.find((c) => c.id === 1075), uid: 'jowgen-1' };
            const specialSummoned = { ...filler, uid: 'special-1' };
            const normalSummoned = { ...filler, uid: 'normal-1' };
            gameState.playerHand = [{ ...filler, uid: 'hand-1' }];
            gameState.playerMonsterField = [
                { card: jowgen, position: 'attack', isFaceDown: false },
                { card: specialSummoned, position: 'attack', isFaceDown: false, wasSpecialSummoned: true },
                { card: normalSummoned, position: 'attack', isFaceDown: false },
                null, null
            ];
            const ctx = DuelEngine.makeContext('player', { card: jowgen, index: 0 });
            const canActivate = DuelEngine.getDefinition(1075).canActivate(ctx);
            DuelEngine.getDefinition(1075).activate(ctx);
            const discarded = gameState.playerHand.length === 0;
            const specialSummonedDestroyed = !gameState.playerMonsterField.some((s) => s && s.card.uid === 'special-1');
            const normalSummonedSurvived = gameState.playerMonsterField.some((s) => s && s.card.uid === 'normal-1');
            const banFlagSet = gameState.specialSummonsPermanentlyBannedForBothSides === true;
            // Jowgen lascia il campo: il divieto deve restare comunque attivo.
            gameState.playerMonsterField[0] = null;
            const testMonster = { ...filler, uid: 'blocked-after-jowgen-gone' };
            const summonStillBlocked = DuelEngine.actions.specialSummon('bot', testMonster, 0, 'attack') === false;
            return { canActivate: canActivate, discarded: discarded, specialSummonedDestroyed: specialSummonedDestroyed, normalSummonedSurvived: normalSummonedSurvived, banFlagSet: banFlagSet, summonStillBlocked: summonStillBlocked };
        });
        t.assert(jowgenResult.canActivate, 'Jowgen deve potersi attivare con almeno 1 carta in mano');
        t.assert(jowgenResult.discarded, 'Jowgen deve scartare 1 carta a caso');
        t.assert(jowgenResult.specialSummonedDestroyed, 'Jowgen deve distruggere il mostro Special Summonato');
        t.assert(jowgenResult.normalSummonedSurvived, 'Jowgen NON deve distruggere il mostro Evocato Normalmente');
        t.assert(jowgenResult.banFlagSet, 'Jowgen deve impostare il divieto permanente di Special Summon');
        t.assert(jowgenResult.summonStillBlocked, 'Il divieto deve restare attivo anche dopo che Jowgen lascia il campo (effetto permanente, non legato alla presenza sul campo)');
        // Reset per non contaminare gli altri test di questa stessa pagina.
        await t.evaluate(() => { gameState.specialSummonsPermanentlyBannedForBothSides = false; });

        // Invito al Sonno Oscuro (1076): quando Evocata Normalmente, blocca l'attacco di 1 mostro avversario finché resta scoperta. NON scatta con la Special Summon.
        const invitationResult = await t.evaluate(() => {
            const invitation = { ...cardDatabase.find((c) => c.id === 1076), uid: 'invitation-1' };
            const oppMonster = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck), uid: 'opp-1', attack: 1500 };
            gameState.playerMonsterField = [{ card: invitation, position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.botMonsterField = [{ card: oppMonster, position: 'attack', isFaceDown: false }, null, null, null, null];
            window.DuelEngineUI = null;
            const ctx = DuelEngine.makeContext('player', { card: invitation });
            DuelEngine.getDefinition(1076).onSummon(ctx);
            DuelEngine.recomputeStaticEffects();
            const blockedAfterNormalSummon = !!gameState.cannotAttackUids['opp-1'];

            const invitation2 = { ...cardDatabase.find((c) => c.id === 1076), uid: 'invitation-2' };
            const ctxSpecial = DuelEngine.makeContext('player', { card: invitation2 });
            const specialHandler = DuelEngine.getDefinition(1076).onSpecialSummon;
            if (typeof specialHandler === 'function') specialHandler(ctxSpecial);
            const lockedBySpecial = !!invitation2.lockedAttackBanTargetUid;
            return { blockedAfterNormalSummon: blockedAfterNormalSummon, lockedBySpecial: lockedBySpecial };
        });
        t.assert(invitationResult.blockedAfterNormalSummon, 'Invito al Sonno Oscuro deve impedire l\'attacco del mostro scelto dopo un\'Evocazione Normale');
        t.assert(!invitationResult.lockedBySpecial, 'Invito al Sonno Oscuro NON deve scegliere un bersaglio se Special Summonata (onSpecialSummon è un no-op)');

        // Tigre Re Wanghu (1077): distrugge un mostro con ATK <= 1400 appena Evocato/Special Summonato, ignora quelli più forti.
        const wanghuResult = await t.evaluate(() => {
            const wanghu = { ...cardDatabase.find((c) => c.id === 1077), uid: 'wanghu-1' };
            const weak = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck), uid: 'weak-summon', attack: 1000 };
            const strong = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck), uid: 'strong-summon', attack: 2000 };
            gameState.playerMonsterField = [{ card: wanghu, position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.botMonsterField = [{ card: weak, position: 'attack', isFaceDown: false }, { card: strong, position: 'attack', isFaceDown: false }, null, null, null];
            const ctx = DuelEngine.makeContext('player', { card: wanghu, summonedCard: weak });
            DuelEngine.getDefinition(1077).onAnyNormalOrFlipSummon(ctx);
            const weakDestroyed = !gameState.botMonsterField.some((s) => s && s.card.uid === 'weak-summon');

            const ctxStrong = DuelEngine.makeContext('player', { card: wanghu, summonedCard: strong });
            DuelEngine.getDefinition(1077).onAnySpecialSummon(ctxStrong);
            const strongSurvived = gameState.botMonsterField.some((s) => s && s.card.uid === 'strong-summon');
            return { weakDestroyed: weakDestroyed, strongSurvived: strongSurvived };
        });
        t.assert(wanghuResult.weakDestroyed, 'Tigre Re Wanghu deve distruggere un mostro con ATK 1400 o meno appena Evocato');
        t.assert(wanghuResult.strongSurvived, 'Tigre Re Wanghu NON deve distruggere un mostro con ATK oltre 1400');

        // Kotodama (1078): distrugge un mostro appena Evocato/girato scoperto se un ALTRO con lo stesso nome è già scoperto sul Terreno.
        const kotodamaResult = await t.evaluate(() => {
            const kotodama = { ...cardDatabase.find((c) => c.id === 1078), uid: 'kotodama-1' };
            const original = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck), uid: 'dup-original' };
            const duplicate = { ...original, uid: 'dup-new' };
            gameState.playerMonsterField = [{ card: kotodama, position: 'attack', isFaceDown: false }, { card: original, position: 'attack', isFaceDown: false }, null, null, null];
            gameState.botMonsterField = [{ card: duplicate, position: 'attack', isFaceDown: false }, null, null, null, null];
            const ctx = DuelEngine.makeContext('player', { card: kotodama, summonedCard: duplicate });
            DuelEngine.getDefinition(1078).onAnyNormalOrFlipSummon(ctx);
            return !gameState.botMonsterField.some((s) => s && s.card.uid === 'dup-new');
        });
        t.assert(kotodamaResult, 'Kotodama deve distruggere un mostro appena arrivato con lo stesso nome di un altro già scoperto');

        // Kycoo Distruttore di Fantasmi (1080): banisce fino a 2 mostri dal Cimitero avversario quando infligge danno da battaglia.
        const kycooResult = await t.evaluate(() => {
            const kycoo = { ...cardDatabase.find((c) => c.id === 1080), uid: 'kycoo-1' };
            const filler = cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck);
            gameState.botGraveyard = [{ ...filler, uid: 'gy-1' }, { ...filler, uid: 'gy-2' }, { ...filler, uid: 'gy-3' }];
            gameState.botBanished = [];
            const ctx = DuelEngine.makeContext('player', { card: kycoo, opponent: 'bot' });
            DuelEngine.getDefinition(1080).onDealsBattleDamage(ctx);
            return { graveyardRemaining: gameState.botGraveyard.length, banishedCount: gameState.botBanished.length };
        });
        t.assert(kycooResult.graveyardRemaining === 1, `Kycoo deve bandire 2 dei 3 mostri dal Cimitero avversario (rimasti attesi 1, rilevati ${kycooResult.graveyardRemaining})`);
        t.assert(kycooResult.banishedCount === 2, `2 mostri devono finire banditi (rilevati ${kycooResult.banishedCount})`);

        // Pantera Signora (1081): stesso schema di Sentinella Cremisi ma in CIMA al Deck.
        const ladyPantherResult = await t.evaluate(() => {
            const panther = { ...cardDatabase.find((c) => c.id === 1081), uid: 'panther-1' };
            const fallen = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck), uid: 'panther-fallen' };
            gameState.playerMonsterField = [{ card: panther, position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.playerGraveyard = [fallen];
            gameState.playerDeck = [];
            gameState.battleDestroyedThisTurnFor = { player: [fallen], bot: [] };
            gameState.phase = 'main1';
            gameState.currentPlayer = 'player';
            window.DuelEngineUI = null;
            const ctx = DuelEngine.makeContext('player', { card: panther, index: 0 });
            DuelEngine.getDefinition(1081).activate(ctx);
            return gameState.playerDeck.length === 1 && gameState.playerDeck[0].uid === 'panther-fallen';
        });
        t.assert(ladyPantherResult, 'Pantera Signora deve rimandare il mostro caduto in CIMA al Deck (fine dell\'array)');

        // Ninfa dell'Acqua (1082): rende il Terreno "virtualmente Umi" per Guerriero degli Abissi (1068), solo se nessun Field Spell è attivo.
        const maidenResult = await t.evaluate(() => {
            const maiden = { ...cardDatabase.find((c) => c.id === 1082), uid: 'maiden-1' };
            const deepseaWarrior = { ...cardDatabase.find((c) => c.id === 1068), uid: 'deepsea-virtual-1' };
            gameState.playerMonsterField = [{ card: maiden, position: 'attack', isFaceDown: false }, { card: deepseaWarrior, position: 'attack', isFaceDown: false }, null, null, null];
            gameState.playerFieldSpell = null;
            gameState.botFieldSpell = null;
            DuelEngine.recomputeStaticEffects();
            const immuneWithoutFieldSpell = !!gameState.cannotBeTargetedBySpellsUids['deepsea-virtual-1'];

            const otherFieldSpell = cardDatabase.find((c) => c.type === 'spell' && c.subtype === 'field' && c.id !== 497);
            gameState.botFieldSpell = { card: { ...otherFieldSpell, uid: 'other-fs-1' }, isFaceDown: false };
            DuelEngine.recomputeStaticEffects();
            const immuneWithOtherFieldSpell = !!gameState.cannotBeTargetedBySpellsUids['deepsea-virtual-1'];
            return { immuneWithoutFieldSpell: immuneWithoutFieldSpell, immuneWithOtherFieldSpell: immuneWithOtherFieldSpell };
        });
        t.assert(maidenResult.immuneWithoutFieldSpell, 'Ninfa dell\'Acqua deve rendere il Terreno virtualmente Umi (Guerriero degli Abissi immune alle Magie) senza alcun Field Spell attivo');
        t.assert(!maidenResult.immuneWithOtherFieldSpell, 'Ninfa dell\'Acqua NON deve applicarsi se un ALTRO Field Spell è attivo sul Terreno');

        // Fata Isterica (1083): tributa 2 mostri propri (inclusa se stessa) per guadagnare 1000 LP.
        const hystericFairyResult = await t.evaluate(() => {
            const fairy = { ...cardDatabase.find((c) => c.id === 1083), uid: 'hysteric-1' };
            const ally = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck), uid: 'hysteric-ally' };
            gameState.playerMonsterField = [{ card: fairy, position: 'attack', isFaceDown: false }, { card: ally, position: 'attack', isFaceDown: false }, null, null, null];
            gameState.playerLP = 8000;
            gameState.phase = 'main1';
            gameState.currentPlayer = 'player';
            window.DuelEngineUI = null;
            const ctx = DuelEngine.makeContext('player', { card: fairy, index: 0 });
            const canActivate = DuelEngine.getDefinition(1083).canActivate(ctx);
            DuelEngine.getDefinition(1083).activate(ctx);
            return { canActivate: canActivate, lp: gameState.playerLP, fieldEmpty: gameState.playerMonsterField.every((s) => !s) };
        });
        t.assert(hystericFairyResult.canActivate, 'Fata Isterica deve potersi attivare con almeno 2 mostri propri');
        t.assert(hystericFairyResult.lp === 9000, `Fata Isterica deve far guadagnare 1000 LP (attesi 9000, rilevati ${hystericFairyResult.lp})`);
        t.assert(hystericFairyResult.fieldEmpty, 'Fata Isterica deve tributare ENTRAMBI i mostri (incluso se stessa)');
    }
};
