// I 3 Dei Egizi (Obelisk id 30, Slifer id 31, Ra id 472): statistiche di
// base corrette (in particolare Slifer, storicamente sbagliato: 0/0, non
// una base fissa sommata al bonus per carte in mano), i due floodgate
// condivisi (blocksActivationsOnOwnNormalSummon, cannotBeTargetedByCardEffects
// — quest'ultimo SOLO su Obelisk/Ra, non su Slifer), e il pagamento LP di
// Ra come vera scelta del giocatore (non più automatico).
module.exports = {
    name: 'I 3 Dei Egizi: statistiche, floodgate e scelta LP di Ra',
    async run(t) {
        const stats = await t.evaluate(() => ({
            obelisk: { attack: cardDatabase.find((c) => c.id === 30).attack, defense: cardDatabase.find((c) => c.id === 30).defense, vanilla: !!cardDatabase.find((c) => c.id === 30).vanilla },
            slifer: { attack: cardDatabase.find((c) => c.id === 31).attack, defense: cardDatabase.find((c) => c.id === 31).defense, vanilla: !!cardDatabase.find((c) => c.id === 31).vanilla },
            ra: { attack: cardDatabase.find((c) => c.id === 472).attack, defense: cardDatabase.find((c) => c.id === 472).defense, vanilla: !!cardDatabase.find((c) => c.id === 472).vanilla }
        }));
        t.assert(stats.obelisk.attack === 4000 && stats.obelisk.defense === 4000, 'Obelisk deve essere 4000/4000');
        t.assert(stats.slifer.attack === 0 && stats.slifer.defense === 0, 'Slifer deve essere 0/0 di base (il bonus è solo nell\'effetto)');
        t.assert(stats.ra.attack === 0 && stats.ra.defense === 0, 'Ra deve essere 0/0 di base');
        t.assert(!stats.obelisk.vanilla && !stats.slifer.vanilla && !stats.ra.vanilla, 'Nessuno dei 3 Dei Egizi deve essere marcato vanilla: hanno un\'implementazione reale');

        const sliferBonus = await t.evaluate(() => {
            const slifer = { ...cardDatabase.find((c) => c.id === 31), uid: 'slifer-1' };
            gameState.playerHand = [{ ...cardDatabase.find((c) => c.id === 4) }, { ...cardDatabase.find((c) => c.id === 5) }, { ...cardDatabase.find((c) => c.id === 6) }];
            gameState.atkDefBonus = {};
            const ctx = DuelEngine.makeContext('player', { card: slifer });
            DuelEngine.getDefinition(31).static(ctx);
            return DuelEngine.getEffectiveAtk(slifer);
        });
        t.assert(sliferBonus === 3000, `Slifer con 3 carte in mano deve avere 3000 ATK effettivo, non sommato a una base sbagliata (ottenuto ${sliferBonus})`);

        const flags = await t.evaluate(() => ({
            obeliskBlocks: !!DuelEngine.getDefinition(30).blocksActivationsOnOwnNormalSummon,
            sliferBlocks: !!DuelEngine.getDefinition(31).blocksActivationsOnOwnNormalSummon,
            raBlocks: !!DuelEngine.getDefinition(472).blocksActivationsOnOwnNormalSummon,
            obeliskImmune: !!DuelEngine.getDefinition(30).cannotBeTargetedByCardEffects,
            sliferImmune: !!DuelEngine.getDefinition(31).cannotBeTargetedByCardEffects,
            raImmune: !!DuelEngine.getDefinition(472).cannotBeTargetedByCardEffects
        }));
        t.assert(flags.obeliskBlocks && flags.sliferBlocks && flags.raBlocks, 'Tutti e 3 devono bloccare le risposte alla propria Evocazione Normale');
        t.assert(flags.obeliskImmune, 'Obelisk deve essere immune al targeting da effetti Carta');
        t.assert(!flags.sliferImmune, 'Slifer NON deve essere immune al targeting (il testo reale non lo prevede)');
        t.assert(!flags.raImmune, 'Ra NON deve essere immune al targeting (a differenza di Obelisk, il testo reale non lo prevede)');

        // Ra: il pagamento LP è una VERA scelta (card._raPayLp), non automatico.
        const raChoice = await t.evaluate(() => {
            const ra = { ...cardDatabase.find((c) => c.id === 472), uid: 'ra-lp-1' };
            ra._raPayLp = false;
            gameState.playerLP = 8000;
            const ctx = DuelEngine.makeContext('player', { summonedCard: ra, summonedVia: 'normal' });
            DuelEngine.getDefinition(472).onSummon(ctx);
            return { lpUnchangedOnDecline: gameState.playerLP === 8000 };
        });
        t.assert(raChoice.lpUnchangedOnDecline, 'Se il giocatore rifiuta (_raPayLp:false), i LP di Ra non devono cambiare');
    }
};
