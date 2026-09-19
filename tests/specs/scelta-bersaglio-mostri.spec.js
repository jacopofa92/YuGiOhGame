// Carte che bersagliano 1 MOSTRO sul Terreno: la scelta è del giocatore.
// =====================================================================
// Sette carte prendevano il bersaglio da sole. Alcune con un'euristica
// perfino sensata — Libro della Luna girava il mostro con l'ATK più alto
// in Attacco, Assalto Sconsiderato potenziava il proprio più debole — ma
// "sensata" non è "scelta": su queste carte decidere il bersaglio È la
// carta.
//
// Il test verifica il caso che l'automatismo NON avrebbe mai prodotto:
// bersagliare un PROPRIO mostro con Libro della Luna (per salvarlo da un
// attacco, o per riarmare un effetto FLIP), cosa che la vecchia euristica
// — orientata al mostro avversario più forte — non faceva mai.
module.exports = {
    name: 'Scelta del bersaglio fra i mostri sul Terreno (875 Libro della Luna, 453 Cacciatore di Anime)',
    async run(t) {
        // --- 875 Libro della Luna: si sceglie un PROPRIO mostro --------
        const setupLuna = await t.evaluate(() => {
            const mostri = cardDatabase.filter((c) => c.type === 'monster' && !c.extraDeck);
            const forte = mostri.find((c) => c.attack >= 2000);
            const debole = mostri.find((c) => c.attack > 0 && c.attack <= 1200);
            const slot = (card, uid) => ({ card: { ...card, uid }, position: 'attack', isFaceDown: false, hasAttacked: false, canChangePosition: true });
            // Il mostro avversario è il PIÙ FORTE: è quello che la vecchia
            // euristica avrebbe scelto da sola, ogni volta.
            gameState.botMonsterField = [slot(forte, 'SUO-FORTE'), null, null, null, null];
            gameState.playerMonsterField = [slot(debole, 'MIO'), null, null, null, null];
            updateUI();
            const libro = { ...cardDatabase.find((c) => c.id === 875), uid: 'libro-luna' };
            DuelEngine.getDefinition(875).activate(
                DuelEngine.makeContext('player', { card: libro, zone: 'st', index: 0 })
            );
            return {
                modaleAperto: document.getElementById('cardListPickerModal').classList.contains('open'),
                candidati: document.querySelectorAll('#cardListPickerRow .card-list-item').length
            };
        });
        t.assert(setupLuna.modaleAperto && setupLuna.candidati === 2,
            `Libro della Luna deve far scegliere fra i mostri scoperti di ENTRAMBI i lati ` +
            `(modale: ${setupLuna.modaleAperto}, candidati: ${setupLuna.candidati})`);

        const indiceMio = await t.evaluate(() => {
            const voci = [...document.querySelectorAll('#cardListPickerRow .card-list-item')];
            return voci.findIndex((v) => v.querySelector('.card[data-uid="MIO"]'));
        });
        t.assert(indiceMio !== -1, 'Fra i candidati deve esserci anche il proprio mostro');
        await t.page.locator('#cardListPickerRow .card-list-item').nth(indiceMio).click();
        await t.page.waitForTimeout(250);

        const dopoLuna = await t.evaluate(() => {
            const mio = gameState.playerMonsterField[0];
            const suo = gameState.botMonsterField[0];
            return {
                mioCoperto: !!(mio && mio.isFaceDown && mio.position === 'defense'),
                suoIntatto: !!(suo && !suo.isFaceDown && suo.position === 'attack')
            };
        });
        t.assert(dopoLuna.mioCoperto,
            'Deve essere girato coperto il mostro SCELTO (il proprio), non quello che la vecchia euristica preferiva');
        t.assert(dopoLuna.suoIntatto,
            'Il mostro avversario non scelto deve restare scoperto e in Attacco');

        // --- 453 Cacciatore di Anime: 2 mostri avversari, si sceglie il
        // secondo (con uno solo, scelta vera e auto-pick coinciderebbero).
        const setupCacciatore = await t.evaluate(() => {
            const mostri = cardDatabase.filter((c) => c.type === 'monster' && !c.extraDeck);
            const slot = (card, uid) => ({ card: { ...card, uid }, position: 'attack', isFaceDown: false, hasAttacked: false, canChangePosition: true });
            gameState.botMonsterField = [slot(mostri[0], 'SUO-1'), slot(mostri[1], 'SUO-2'), null, null, null];
            gameState.playerMonsterField = [null, null, null, null, null];
            gameState.botLP = 8000;
            updateUI();
            const cacciatore = { ...cardDatabase.find((c) => c.id === 453), uid: 'cacciatore' };
            DuelEngine.getDefinition(453).activate(
                DuelEngine.makeContext('player', { card: cacciatore, zone: 'st', index: 0 })
            );
            return { candidati: document.querySelectorAll('#cardListPickerRow .card-list-item').length };
        });
        t.assert(setupCacciatore.candidati === 2,
            `Cacciatore di Anime deve mostrare entrambi i mostri avversari (rilevati ${setupCacciatore.candidati})`);
        await t.page.locator('#cardListPickerRow .card-list-item').nth(1).click();
        await t.page.waitForTimeout(250);

        const dopoCacciatore = await t.evaluate(() => ({
            rimasti: gameState.botMonsterField.filter(Boolean).map((s) => s.card.uid),
            sueLP: gameState.botLP
        }));
        t.assert(dopoCacciatore.rimasti.length === 1 && dopoCacciatore.rimasti[0] === 'SUO-1',
            `Deve essere distrutto ESATTAMENTE il mostro scelto (SUO-2), non il primo ` +
            `(rimasti: ${JSON.stringify(dopoCacciatore.rimasti)})`);
        t.assert(dopoCacciatore.sueLP === 9000,
            `L'avversario deve comunque guadagnare i 1000 Life Points previsti dal testo (LP: ${dopoCacciatore.sueLP})`);
    }
};
