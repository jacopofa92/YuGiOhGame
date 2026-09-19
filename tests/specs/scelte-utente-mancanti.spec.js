// Carte che il testo dice "scegli" ma che sceglievano da sole.
// =====================================================================
// Stessa famiglia già chiusa per il Deck (deck-search-real-choice) e per
// il Cimitero (graveyard-search-real-choice), qui per le altre due zone
// rimaste: la PROPRIA MANO e il TERRENO.
//
// Segnalato dall'utente su Richiamo della Mummia (id 670): "non fa
// selezionare la carta che voglio evocare, va lei da sola in autonomia".
// Un audit incrociato (testo della carta in data/cards.json che promette
// una scelta + implementazione che fa un findIndex su una zona) ha
// trovato la stessa forma in decine di carte; questo spec sorveglia le
// due meccaniche condivise che le servono tutte:
//   - chooseCardFromHand (nuovo): scegli 1 carta della tua mano da
//     GIOCARE, senza scartarla — la sorella mancante di
//     offerHandDiscardChoice, che invece la manda al Cimitero;
//   - chooseFieldMonsterTarget (già esistente): scegli 1 mostro sul
//     Terreno, qui applicato alle carte che prendevano "il primo
//     scoperto" della fila avversaria.
//
// In entrambi i casi il test sceglie deliberatamente il SECONDO
// candidato: è l'unico modo di distinguere una scelta vera da un
// auto-pick che, con un solo candidato, darebbe lo stesso risultato.
module.exports = {
    name: 'Carte con una scelta promessa dal testo: la scelta è del giocatore (Richiamo della Mummia 670, Cambio di Cuore 147, Scatola Mistica 388)',
    async run(t) {
        // --- Richiamo della Mummia: quale Zombie Evocare dalla mano ----
        const mummiaSetup = await t.evaluate(() => {
            const mummia = { ...cardDatabase.find((c) => c.id === 670), uid: 'mummia' };
            const zombi = cardDatabase.filter((c) => c.type === 'monster' && c.race === 'Zombie' && !c.extraDeck);
            const z1 = { ...zombi[0], uid: 'ZOMBIE-1' };
            const z2 = { ...zombi[1], uid: 'ZOMBIE-2' };
            gameState.playerMonsterField = [null, null, null, null, null];
            gameState.playerHand = [z1, z2];
            gameState.usedOncePerTurnEffect = {};
            mummia._mummyCallOnField = true; // già scoperta in campo
            gameState.playerSTField[0] = { card: mummia, isFaceDown: false, setOnTurn: 0 };
            const ctx = DuelEngine.makeContext('player', { card: mummia, zone: 'st', index: 0 });
            DuelEngine.getDefinition(670).activate(ctx);
            return {
                modalOpen: document.getElementById('cardListPickerModal').classList.contains('open'),
                zombiDiversi: z1.id !== z2.id
            };
        });
        t.assert(mummiaSetup.zombiDiversi, 'Preparazione: servono due Zombie DIVERSI, o la scelta non sarebbe distinguibile');
        t.assert(mummiaSetup.modalOpen,
            'Richiamo della Mummia con 2 Zombie in mano deve APRIRE un picker: prima Evocava il primo trovato con hand.findIndex');

        const vociMummia = await t.page.locator('#cardListPickerRow .card-list-item').count();
        t.assert(vociMummia === 2, `Il picker deve mostrare tutti e 2 gli Zombie (rilevati ${vociMummia})`);
        await t.page.locator('#cardListPickerRow .card-list-item').nth(1).click();
        await t.page.waitForTimeout(200);
        const dopoMummia = await t.evaluate(() => ({
            campo: gameState.playerMonsterField.filter(Boolean).map((s) => s.card.uid),
            mano: gameState.playerHand.map((c) => c.uid)
        }));
        t.assert(dopoMummia.campo.includes('ZOMBIE-2'),
            `Deve arrivare in campo ESATTAMENTE lo Zombie scelto (ZOMBIE-2), non il primo della mano (in campo: ${JSON.stringify(dopoMummia.campo)})`);
        t.assert(dopoMummia.mano.length === 1 && dopoMummia.mano[0] === 'ZOMBIE-1',
            `In mano deve restare l'altro Zombie (rilevato: ${JSON.stringify(dopoMummia.mano)})`);

        // --- Cambio di Cuore: quale mostro avversario rubare -----------
        const cuoreSetup = await t.evaluate(() => {
            const mostri = cardDatabase.filter((c) => c.type === 'monster' && !c.extraDeck && (c.level || 4) <= 4);
            gameState.botMonsterField = [
                { card: { ...mostri[0], uid: 'SUO-1' }, position: 'attack', isFaceDown: false, hasAttacked: false, canChangePosition: false },
                { card: { ...mostri[1], uid: 'SUO-2' }, position: 'attack', isFaceDown: false, hasAttacked: false, canChangePosition: false },
                null, null, null
            ];
            gameState.playerMonsterField = [null, null, null, null, null];
            const cambio = { ...cardDatabase.find((c) => c.id === 147), uid: 'cambio-di-cuore' };
            const ctx = DuelEngine.makeContext('player', { card: cambio, zone: 'st', index: 0 });
            DuelEngine.getDefinition(147).activate(ctx);
            return { modalOpen: document.getElementById('cardListPickerModal').classList.contains('open') };
        });
        t.assert(cuoreSetup.modalOpen,
            'Cambio di Cuore con 2 mostri avversari scoperti deve APRIRE un picker: prima rubava il primo della fila');

        const vociCuore = await t.page.locator('#cardListPickerRow .card-list-item').count();
        t.assert(vociCuore === 2, `Il picker deve mostrare tutti e 2 i mostri avversari (rilevati ${vociCuore})`);
        await t.page.locator('#cardListPickerRow .card-list-item').nth(1).click();
        await t.page.waitForTimeout(250);
        const dopoCuore = await t.evaluate(() => ({
            mio: gameState.playerMonsterField.filter(Boolean).map((s) => s.card.uid),
            suo: gameState.botMonsterField.filter(Boolean).map((s) => s.card.uid)
        }));
        t.assert(dopoCuore.mio.includes('SUO-2'),
            `Deve passare sotto il mio controllo ESATTAMENTE il mostro scelto (SUO-2), non il primo (mio campo: ${JSON.stringify(dopoCuore.mio)})`);
        t.assert(dopoCuore.suo.includes('SUO-1'),
            `L'altro mostro deve restare all'avversario (suo campo: ${JSON.stringify(dopoCuore.suo)})`);

        // --- Scatola Mistica: DUE scelte in sequenza -------------------
        // Il caso più delicato della migrazione: i picker sono asincroni,
        // quindi la seconda scelta deve vivere DENTRO la callback della
        // prima. Sbagliando, o si aprono due liste insieme o la seconda
        // non si apre affatto.
        await t.evaluate(() => {
            const mostri = cardDatabase.filter((c) => c.type === 'monster' && !c.extraDeck && (c.level || 4) <= 4);
            const slot = (card, uid) => ({ card: { ...card, uid }, position: 'attack', isFaceDown: false, hasAttacked: false, canChangePosition: false });
            gameState.botMonsterField = [slot(mostri[0], 'BOX-SUO-1'), slot(mostri[1], 'BOX-SUO-2'), null, null, null];
            gameState.playerMonsterField = [slot(mostri[2], 'BOX-MIO-1'), slot(mostri[3], 'BOX-MIO-2'), null, null, null];
            const scatola = { ...cardDatabase.find((c) => c.id === 388), uid: 'scatola-mistica' };
            const ctx = DuelEngine.makeContext('player', { card: scatola, zone: 'st', index: 0 });
            DuelEngine.getDefinition(388).activate(ctx);
        });
        await t.page.waitForSelector('#cardListPickerModal.open', { timeout: 5000 });
        await t.page.locator('#cardListPickerRow .card-list-item').nth(1).click();
        // La SECONDA lista deve aprirsi da sola subito dopo la prima.
        await t.page.waitForTimeout(250);
        const secondaApertura = await t.evaluate(
            () => document.getElementById('cardListPickerModal').classList.contains('open')
        );
        t.assert(secondaApertura, 'Scatola Mistica deve aprire la SECONDA scelta (quale mostro cedere) dopo la prima');
        await t.page.locator('#cardListPickerRow .card-list-item').nth(1).click();
        await t.page.waitForTimeout(300);
        const dopoScatola = await t.evaluate(() => ({
            mio: gameState.playerMonsterField.filter(Boolean).map((s) => s.card.uid),
            suo: gameState.botMonsterField.filter(Boolean).map((s) => s.card.uid)
        }));
        t.assert(!dopoScatola.suo.includes('BOX-SUO-2'),
            `Deve essere distrutto il mostro avversario SCELTO (BOX-SUO-2) (suo campo: ${JSON.stringify(dopoScatola.suo)})`);
        t.assert(dopoScatola.suo.includes('BOX-MIO-2'),
            `Deve passare all'avversario il mio mostro SCELTO (BOX-MIO-2) (suo campo: ${JSON.stringify(dopoScatola.suo)})`);
        t.assert(dopoScatola.mio.includes('BOX-MIO-1'),
            `L'altro mio mostro deve restare a me (mio campo: ${JSON.stringify(dopoScatola.mio)})`);

        // --- Il bot non deve vedere nessun picker ----------------------
        // La sua auto-scelta resta quella di sempre: cambiarla renderebbe
        // il turno del bot dipendente da un click che nessuno farà mai.
        const bot = await t.evaluate(() => {
            const mummia = { ...cardDatabase.find((c) => c.id === 670), uid: 'mummia-bot' };
            const zombi = cardDatabase.filter((c) => c.type === 'monster' && c.race === 'Zombie' && !c.extraDeck);
            gameState.botMonsterField = [null, null, null, null, null];
            gameState.botHand = [{ ...zombi[0], uid: 'BOT-Z1' }, { ...zombi[1], uid: 'BOT-Z2' }];
            gameState.usedOncePerTurnEffect = {};
            mummia._mummyCallOnField = true;
            const ctx = DuelEngine.makeContext('bot', { card: mummia, zone: 'st', index: 0 });
            DuelEngine.getDefinition(670).activate(ctx);
            return {
                modalOpen: document.getElementById('cardListPickerModal').classList.contains('open'),
                campo: gameState.botMonsterField.filter(Boolean).length,
                mano: gameState.botHand.length
            };
        });
        t.assert(!bot.modalOpen, 'Il bot non deve mai far comparire un picker: sceglie da solo, come sempre');
        t.assert(bot.campo === 1 && bot.mano === 1, `Il bot deve comunque Evocare 1 Zombie dalla mano (campo ${bot.campo}, mano ${bot.mano})`);
    }
};
