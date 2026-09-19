// Multiplayer: una moneta, un dado o un Token devono uscire UGUALI sui
// due client.
// =====================================================================
// Chi riceve un'attivazione RIFÀ l'effetto per conto proprio — è il
// modello di questo protocollo — e finché ogni effetto pescava da
// Math.random() le due copie ottenevano due numeri diversi.
//
// Misurato con due client veri PRIMA di scrivere il meccanismo, proprio
// con la carta usata qui: Mago del Tempo (id 28) lancia una moneta,
// Testa distrugge i mostri dell'AVVERSARIO, Croce i PROPRI. Un lato ha
// visto Croce e si è distrutto il campo, l'altro Testa e ha distrutto
// quello di fronte: lo stesso mostro era vivo su uno schermo e morto
// sull'altro. E il checksum non se n'era accorto — zero richieste di
// resync su entrambi i lati — perché la fotografia di stato che segue
// ogni attivazione rimette a posto solo il lato di CHI MANDA.
//
// COSA CONTROLLA, in ordine di quanto è severo:
//  A) il meccanismo: la stessa carta deve dare la stessa SEQUENZA di
//     sorteggi sui due client. Senza il meccanismo ctx.random() non
//     esiste proprio, quindi fallisce sempre;
//  B) i Token: nascono durante il duello, e con Date.now()+Math.random()
//     i due lati davano due uid diversi allo STESSO Token — da lì in poi
//     ogni scelta di bersaglio che viaggia per uid non lo ritrovava più
//     dall'altra parte. Anche questo fallisce praticamente sempre senza
//     il meccanismo;
//  C) la carta vera, dall'inizio alla fine: stessa moneta e stesso
//     checksum. È il sintomo misurato, ma da solo sarebbe un test debole
//     (senza il meccanismo indovina l'esito giusto una volta su due):
//     sta qui come prova end-to-end che una carta usi davvero il
//     meccanismo, non solo che il meccanismo esista.
const { startStaticServer, startRoomServer } = require('../helpers/local-servers');

module.exports = {
    name: 'Multiplayer: monete, dadi e Token escono uguali sui due client',
    standalone: true,
    async run({ browser, assert }) {
        const statics = await startStaticServer();
        const room = await startRoomServer();
        const context = await browser.newContext({ viewport: { width: 1280, height: 860 }, serviceWorkers: 'block' });
        const pageErrors = [];

        try {
            const openLobby = async (label) => {
                const page = await context.newPage();
                page.on('pageerror', (err) => pageErrors.push(`[${label}] ${err.message}`));
                await page.addInitScript(() => { window.AUTH_GATE_SKIP = true; window.DUEL_RPS_SKIP = true; });
                await page.goto(statics.origin + '/multiplayer.html', { waitUntil: 'load' });
                await page.waitForSelector('#mpCreateBtn');
                await page.waitForFunction(() => {
                    const el = document.getElementById('pageLoader');
                    return !el || el.classList.contains('page-loader-hidden');
                }, null, { timeout: 15000 });
                await page.evaluate(() => {
                    const avanzate = document.querySelector('.mp-advanced');
                    if (avanzate) avanzate.open = true;
                });
                await page.fill('#mpServerUrl', room.wsUrl);
                return page;
            };

            const pageA = await openLobby('A');
            const pageB = await openLobby('B');
            await pageA.click('#mpCreateBtn');
            await pageA.waitForFunction(() => {
                const el = document.getElementById('mpRoomCodeValue');
                return el && /^[A-Z0-9]{5}$/.test(el.textContent.trim());
            }, null, { timeout: 15000 });
            const code = (await pageA.textContent('#mpRoomCodeValue')).trim();
            await pageB.click('#mpTabJoin');
            await pageB.fill('#mpJoinCode', code);
            await pageB.click('#mpJoinBtn');
            await pageA.waitForSelector('#mpReadyBar:not([hidden])', { timeout: 20000 });
            await pageB.waitForSelector('#mpReadyBar:not([hidden])', { timeout: 20000 });
            await pageA.click('#mpReadyBtn');
            await pageB.click('#mpReadyBtn');

            const arenaReady = (page) => page.waitForFunction(
                () => window.MULTIPLAYER_MODE === true && typeof gameState !== 'undefined'
                    && typeof DuelEngine !== 'undefined' && Array.isArray(gameState.playerHand)
                    && gameState.playerHand.length >= 5,
                null, { timeout: 40000 }
            );
            await Promise.all([arenaReady(pageA), arenaReady(pageB)]);
            for (const page of [pageA, pageB]) {
                try { await page.click('.di-skip', { timeout: 4000 }); } catch (e) { /* nessuna intro */ }
            }

            const aStarts = await pageA.evaluate(() => window.MP_startingRole === 'player');
            const attore = aStarts ? pageA : pageB;      // attiva la carta
            const bersaglio = aStarts ? pageB : pageA;   // subisce l'effetto
            await attore.waitForFunction(
                () => gameState.phase === 'main1' && gameState.currentPlayer === 'player',
                null, { timeout: 25000 }
            );

            // Il seme contiene il turno: un confronto fatto mentre i due
            // lati sono a turni diversi sarebbe una bocciatura ingiusta.
            const [turnoA, turnoB] = await Promise.all([
                attore.evaluate(() => gameState.turn),
                bersaglio.evaluate(() => gameState.turn)
            ]);
            assert(turnoA === turnoB,
                `Preparazione: i due client devono essere allo stesso turno (${turnoA} contro ${turnoB})`);

            // --- A) stessa carta, stessa sequenza di sorteggi -----------
            // Un uid inventato apposta: così i contatori partono da zero
            // su entrambi i lati, com'è per una carta mai usata prima.
            const tiraDieciVolte = (page) => page.evaluate(() => {
                const ctx = DuelEngine.makeContext('player', { card: { uid: 'PROVA_SORTEGGIO' } });
                return Array.from({ length: 10 }, () => ctx.random());
            });
            const [serieA, serieB] = await Promise.all([tiraDieciVolte(attore), tiraDieciVolte(bersaglio)]);
            assert(serieA.length === 10 && serieA.every((n) => typeof n === 'number' && n >= 0 && n < 1),
                `ctx.random() deve dare dieci numeri in [0,1) (ottenuto: ${JSON.stringify(serieA)})`);
            assert(JSON.stringify(serieA) === JSON.stringify(serieB),
                `La stessa carta deve tirare gli stessi numeri sui due client:\n  qua: ${JSON.stringify(serieA)}\n  là:  ${JSON.stringify(serieB)}`);
            // Dieci numeri tutti uguali fra loro vorrebbe dire un
            // generatore fermo, non un generatore sincronizzato.
            assert(new Set(serieA).size >= 8,
                `I dieci sorteggi non devono ripetersi fra loro (ottenuto: ${JSON.stringify(serieA)})`);

            // --- B) due Token, stesso uid sui due client ---------------
            const creaToken = (page) => page.evaluate(() => {
                const ctx = DuelEngine.makeContext('player', { card: { uid: 'PROVA_TOKEN' } });
                return [ctx.newTokenUid('token'), ctx.newTokenUid('token')];
            });
            const [tokenA, tokenB] = await Promise.all([creaToken(attore), creaToken(bersaglio)]);
            assert(tokenA[0] !== tokenA[1],
                `Due Token nati insieme devono avere uid diversi FRA LORO (ottenuto: ${JSON.stringify(tokenA)})`);
            assert(JSON.stringify(tokenA) === JSON.stringify(tokenB),
                `Lo stesso Token deve avere lo stesso uid sui due client (qua ${JSON.stringify(tokenA)}, là ${JSON.stringify(tokenB)})`);

            // --- C) la carta vera, dall'inizio alla fine ---------------
            // Un mostro per lato e il Mago del Tempo scoperto dal lato di
            // chi attiva. Rispecchiati a mano sui due client: quello che
            // conta è cosa fa l'effetto, non come si è arrivati a quel
            // campo.
            await bersaglio.evaluate(() => {
                const m = cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck && c.attack === 1200);
                gameState.playerMonsterField[0] = { card: Object.assign({}, m, { uid: 'MIO' }), position: 'attack', isFaceDown: false, hasAttacked: false, canChangePosition: false };
                const mago = cardDatabase.find((c) => c.id === 28);
                gameState.botMonsterField[0] = { card: Object.assign({}, mago, { uid: 'MAGO' }), position: 'attack', isFaceDown: false, hasAttacked: false, canChangePosition: false };
                updateUI();
            });
            await attore.evaluate(() => {
                const m = cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck && c.attack === 1200);
                gameState.botMonsterField[0] = { card: Object.assign({}, m, { uid: 'MIO' }), position: 'attack', isFaceDown: false, hasAttacked: false, canChangePosition: false };
                const mago = cardDatabase.find((c) => c.id === 28);
                gameState.playerMonsterField[0] = { card: Object.assign({}, mago, { uid: 'MAGO' }), position: 'attack', isFaceDown: false, hasAttacked: false, canChangePosition: false };
                updateUI();
            });
            await attore.waitForTimeout(600);

            await attore.evaluate(() => { DuelEngine.activateCard('player', 'monster', 0); });
            // La moneta si legge da gameState.timeWizardCoinResultFor, che
            // la carta scrive comunque (serve già a Saggio Oscuro id 191).
            const attesaMoneta = (page) => page.waitForFunction(
                () => !!gameState.timeWizardCoinResultFor, null, { timeout: 20000 }
            );
            await Promise.all([attesaMoneta(attore), attesaMoneta(bersaglio)]);
            await attore.waitForTimeout(1500);

            const [monetaA, monetaB] = await Promise.all([
                attore.evaluate(() => gameState.timeWizardCoinResultFor.heads),
                bersaglio.evaluate(() => gameState.timeWizardCoinResultFor.heads)
            ]);
            assert(monetaA === monetaB,
                `I due client devono vedere la stessa faccia della moneta (qua ${monetaA}, là ${monetaB})`);

            const [sommaA, sommaB] = await Promise.all([
                attore.evaluate(() => DuelEngine.computeStateChecksum()),
                bersaglio.evaluate(() => DuelEngine.computeStateChecksum())
            ]);
            assert(sommaA === sommaB,
                `Dopo l'effetto i due client devono avere lo stesso stato ("${sommaA}" contro "${sommaB}")`);

            assert(pageErrors.length === 0, `Errori JS non gestiti: ${pageErrors.join(' | ')}`);
        } finally {
            await context.close();
            await room.close();
            await statics.close();
        }
    }
};
