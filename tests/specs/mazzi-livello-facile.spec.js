// I tre mazzi di ogni Duellante (Facile / Normale / Difficile).
// =====================================================================
// Le regole dei livelli vivono in js/data/character-decks.js
// (REGOLE_PER_LIVELLO + validaMazzoPersonaggio), accanto ai mazzi: questo
// test le fa girare su OGNI mazzo di OGNI Duellante, così un mazzo che
// le viola — oggi o dopo una modifica a mano — non passa.
//
// Poi controlla uno per uno i punti che l'utente ha contestato alla
// versione precedente (che derivava Facile e Normale dal mazzo base con
// scambi automatici e produceva mazzi che nessuno avrebbe composto):
//   - "Armatura Sakuretsu x3 a Kaiba facile? Sei impazzito!" — nel Facile
//     al massimo UNA copia di una carta che distrugge mostri;
//   - "non hai messo carte difensive (spade rivelatrici ecc)";
//   - "troppi mostri da tributi" nel Facile di Kaiba;
//   - "non hai messo i mostri cannone X, Y a Kaiba normale/difficile";
//   - "Joey per esempio non ha Guerriero Celtico" — fedeltà al personaggio;
//   - "quelli della ww1 NON TOCCARLI" — restano congelati.
module.exports = {
    name: 'Mazzi dei Duellanti: regole dei tre livelli su tutto il roster',
    async run(t) {
        await t.page.waitForFunction(
            () => typeof characterDeckDatabase !== 'undefined' && typeof validaMazzoPersonaggio === 'function' && typeof cardDatabase !== 'undefined',
            null, { timeout: 20000 }
        );

        // --- Le regole, su ogni mazzo ---------------------------------
        const esito = await t.evaluate(() => {
            const perId = new Map(cardDatabase.map((c) => [c.id, c]));
            const problemi = [];
            let controllati = 0;
            Object.keys(characterDeckDatabase).forEach((id) => {
                const d = characterDeckDatabase[id];
                if (d.congelato) return;
                ['easy', 'medium', 'hard'].forEach((livello) => {
                    controllati++;
                    const r = validaMazzoPersonaggio(id, livello, d[livello], d.flagship, (x) => perId.get(x));
                    r.problemi.forEach((p) => problemi.push(`${id}[${livello}] ${p}`));
                });
                const q = (livello) => (d[livello].main.find((e) => e.id === d.flagship) || { qty: 0 }).qty;
                if (q('easy') !== q('medium') || q('medium') !== q('hard')) {
                    problemi.push(`${id}: la carta simbolo ha quantità diverse fra i livelli (${q('easy')}/${q('medium')}/${q('hard')})`);
                }
            });
            return { problemi, controllati };
        });
        t.assert(esito.controllati > 100, `Troppi pochi mazzi controllati (${esito.controllati})`);
        t.assert(esito.problemi.length === 0, `Mazzi che violano le regole dei livelli:\n${esito.problemi.join('\n')}`);

        // --- getCharacterDeck consegna il livello giusto ----------------
        const consegna = await t.evaluate(() => ({
            facile: getCharacterDeck('kaiba', 'easy') === characterDeckDatabase.kaiba.easy,
            normale: getCharacterDeck('kaiba', 'medium') === characterDeckDatabase.kaiba.medium,
            difficile: getCharacterDeck('kaiba', 'hard') === characterDeckDatabase.kaiba.hard,
            senzaLivello: getCharacterDeck('kaiba') === characterDeckDatabase.kaiba.medium,
            sconosciuto: getCharacterDeck('nessuno', 'easy')
        }));
        t.assert(consegna.facile && consegna.normale && consegna.difficile, 'getCharacterDeck non consegna il mazzo del livello richiesto');
        t.assert(consegna.senzaLivello, 'Senza livello deve tornare il Normale');
        t.assert(consegna.sconosciuto === null, 'Un Duellante senza mazzo deve tornare null');

        // --- I punti contestati, uno per uno ----------------------------
        const kaiba = await t.evaluate(() => {
            const d = characterDeckDatabase.kaiba;
            const q = (livello, id) => (d[livello].main.find((e) => e.id === id) || { qty: 0 }).qty;
            const qExtra = (livello, id) => (d[livello].extra.find((e) => e.id === id) || { qty: 0 }).qty;
            const tributi = d.easy.main.reduce((s, e) => {
                const c = cardDatabase.find((x) => x.id === e.id);
                return s + (c && c.type === 'monster' && c.level >= 5 ? e.qty : 0);
            }, 0);
            return {
                sakuretsuFacile: q('easy', 793),
                spadaFacile: q('easy', 8),
                tributiFacile: tributi,
                cannoniNormale: [510, 513, 515].every((id) => q('medium', id) > 0),
                cannoniDifficile: [510, 513, 515].every((id) => q('hard', id) > 0),
                xyzNormale: qExtra('medium', 512) > 0,
                xyzDifficile: qExtra('hard', 512) > 0,
                cannoniFacile: [510, 513, 515].some((id) => q('easy', id) > 0)
            };
        });
        t.assert(kaiba.sakuretsuFacile <= 1, `Kaiba Facile: ${kaiba.sakuretsuFacile} Armature Sakuretsu`);
        t.assert(kaiba.spadaFacile >= 1, 'Kaiba Facile deve avere la Spada Rivelatrice');
        t.assert(kaiba.tributiFacile <= 4, `Kaiba Facile: ${kaiba.tributiFacile} mostri da Tributo (massimo 4)`);
        t.assert(kaiba.cannoniNormale && kaiba.cannoniDifficile, 'Kaiba Normale/Difficile devono avere Cannone Testa X, Testa di Drago Y e Carro Armato Metallico Z');
        t.assert(kaiba.xyzNormale && kaiba.xyzDifficile, 'Kaiba Normale/Difficile devono avere il Cannone Drago XYZ nell\'Extra Deck');
        t.assert(!kaiba.cannoniFacile, 'I cannoni di Kaiba restano fuori dal Facile');

        const joey = await t.evaluate(() => ['easy', 'medium', 'hard']
            .filter((l) => characterDeckDatabase.joey[l].main.some((e) => [4, 20, 14, 22].includes(e.id))));
        t.assert(joey.length === 0, `Joey non usa carte di Yugi (Guerriero Celtico, Buster Blader, Gaia, Kuriboh): trovate in ${joey.join(', ')}`);

        // --- WW1: congelati ------------------------------------------
        const ww1 = await t.evaluate(() => Object.keys(characterDeckDatabase)
            .filter((k) => k.startsWith('ww1_'))
            .map((k) => ({ k, congelato: !!characterDeckDatabase[k].congelato })));
        t.assert(ww1.length === 6 && ww1.every((x) => x.congelato), `I mazzi della Grande Guerra devono restare congelati: ${JSON.stringify(ww1)}`);

        // --- Crediti anche contro un avversario Facile --------------------
        // Bug reale preso scrivendo il livello Facile: WIN_CREDITS non aveva
        // una voce 'Facile', e una lookup mancante vale 0 crediti, in silenzio.
        const crediti = await t.evaluate(() => window.Rewards ? Rewards.rulesSummary().find((r) => /[Dd]uello vinto/.test(r.titolo)) : null);
        t.assert(crediti && /\+\d+ crediti contro un avversario [Ff]acile/.test(crediti.testo),
            `Il duello vinto deve pagare qualcosa anche contro un avversario Facile: ${JSON.stringify(crediti)}`);
    }
};
