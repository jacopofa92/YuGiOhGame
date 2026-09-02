// Un Oceano Leggendario (id 79): oltre al bonus +200 ATK/DEF (già
// implementato prima), ogni mostro ACQUA deve essere considerato di
// Livello inferiore di 1 — sul Terreno E in mano, indipendentemente da
// chi controlla la Magia Terreno. Verifica getEffectiveLevel/
// getTributesRequired (cards-db.js) e il flag gameState.legendaryOceanActive
// (recomputeStaticEffects/duel-engine.js).
module.exports = {
    name: 'Un Oceano Leggendario riduce il Livello dei mostri ACQUA (id 79)',
    async run(t) {
        const r1 = await t.evaluate(() => {
            const suijin = cardDatabase.find((c) => c.id === 71); // ACQUA, Livello 7 -> normalmente 2 Tributi
            const tartaruga = cardDatabase.find((c) => c.id === 144); // ACQUA, Livello 5 -> normalmente 1 Tributo
            const before = {
                suijinTributes: getTributesRequired(suijin),
                tartarugaTributes: getTributesRequired(tartaruga),
                flagOff: gameState.legendaryOceanActive
            };

            const ocean = { ...cardDatabase.find((c) => c.id === 79), uid: 'ocean-1' };
            gameState.playerFieldSpell = { card: ocean, isFaceDown: false };
            gameState.botFieldSpell = null;
            gameState.playerMonsterField = [null, null, null, null, null];
            gameState.botMonsterField = [null, null, null, null, null];
            gameState.playerSTField = [null, null, null, null, null];
            gameState.botSTField = [null, null, null, null, null];
            DuelEngine.recomputeStaticEffects();

            // Un mostro ACQUA in MANO (mai stato sul Terreno) deve risultare
            // comunque ridotto: la riduzione di Livello non richiede di
            // scandire mano/Terreno, il flag globale copre "ovunque si trovi".
            const suijinInHandLevel = getEffectiveLevel(suijin);

            const after = {
                suijinTributes: getTributesRequired(suijin),
                tartarugaTributes: getTributesRequired(tartaruga),
                flagOn: gameState.legendaryOceanActive,
                suijinInHandLevel
            };

            // Disattiva di nuovo (Magia Terreno rimossa) e verifica che il
            // reset di recomputeStaticEffects tolga il floodgate.
            gameState.playerFieldSpell = null;
            DuelEngine.recomputeStaticEffects();
            const reset = { flagAfterRemoval: gameState.legendaryOceanActive, suijinTributesAfterRemoval: getTributesRequired(suijin) };

            return { before, after, reset };
        });

        t.assert(!r1.before.flagOff, 'Senza Un Oceano Leggendario in campo, il floodgate deve restare disattivo');
        t.assert(r1.before.suijinTributes === 2, 'Suijin (Livello 7) deve richiedere 2 Tributi senza Un Oceano Leggendario');
        t.assert(r1.before.tartarugaTributes === 1, 'Tartaruga Catapulta (Livello 5) deve richiedere 1 Tributo senza Un Oceano Leggendario');

        t.assert(r1.after.flagOn, 'Con Un Oceano Leggendario scoperto sul Terreno, il floodgate deve attivarsi');
        t.assert(r1.after.suijinTributes === 1, 'Suijin deve scendere a Livello 6 (1 Tributo) con Un Oceano Leggendario attivo');
        t.assert(r1.after.tartarugaTributes === 0, 'Tartaruga Catapulta deve scendere a Livello 4 (0 Tributi) con Un Oceano Leggendario attivo');
        t.assert(r1.after.suijinInHandLevel === 6, 'Un mostro ACQUA in mano deve risultare comunque di Livello ridotto (non solo sul Terreno)');

        t.assert(!r1.reset.flagAfterRemoval, 'Rimuovendo Un Oceano Leggendario, il floodgate deve disattivarsi al prossimo ricalcolo');
        t.assert(r1.reset.suijinTributesAfterRemoval === 2, 'Suijin deve tornare a richiedere 2 Tributi dopo la rimozione di Un Oceano Leggendario');
    }
};
