// Multiplayer: un effetto che sceglie un bersaglio deve scegliere lo
// STESSO bersaglio sui due schermi.
// =====================================================================
// Sesto spec del Multiplayer, e quello che chiude il limite dichiarato
// da tempo nel progetto: "un effetto che, risolvendosi, fa una scelta
// locale può ancora divergere fra i due client".
//
// Chi riceve un'attivazione RIFÀ l'effetto per conto proprio — è il
// modello di questo protocollo, i due client simulano la stessa partita.
// Dove l'effetto sceglie, però, la copia di qua sceglieva da sé (il primo
// candidato): se il giocatore vero ne aveva scelto un altro, da quel
// momento i due schermi raccontavano due partite diverse.
//
// Il caso peggiore, ed è quello provato qui: la scelta cade sul Terreno di
// CHI SUBISCE. Nessuna fotografia di stato dell'avversario può
// correggerla, perché quella descrive il lato di chi manda, non il mio.
//
// SOTTO C'ERA UN GUASTO PIÙ GROSSO, trovato proprio inseguendo questo:
// il messaggio 'activate' viene passato tale e quale come `extra` al
// contesto dell'effetto (è così che l'esito viaggia), ma contiene un
// campo `owner` — il mittente, dal SUO punto di vista — che finiva per
// sovrascrivere di chi fosse l'effetto. Di qua la carta dell'avversario
// si risolveva con `ctx.owner` e `ctx.opponent` entrambi a 'player': un
// contesto senza senso, e ogni effetto che legge uno dei due lavorava
// sul lato sbagliato. Non si vedeva con carte come Buco Nero, che
// colpiscono i due Terreni allo stesso modo — per questo era rimasto lì.
//
// La carta usata è Dispositivo di Evacuazione Forzata (id 671): sceglie 1
// mostro scoperto sul Terreno e lo rimanda in mano. Con due mostri
// identici per ruolo ma diversi per uid, "quale dei due" è misurabile.
const { startStaticServer, startRoomServer } = require('../helpers/local-servers');

module.exports = {
    name: 'Multiplayer: la scelta del bersaglio di un effetto è la stessa sui due client',
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

            // Due mostri riconoscibili per uid sul Terreno di chi subisce,
            // e la Trappola coperta da chi attiva. Rispecchiati a mano sui
            // due lati: quello che conta è cosa fa l'effetto, non come si è
            // arrivati a quel campo.
            await bersaglio.evaluate(() => {
                const m1 = cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck && c.attack === 1200);
                const m2 = cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck && c.attack === 1800);
                gameState.playerMonsterField[0] = { card: Object.assign({}, m1, { uid: 'PRIMO' }), position: 'attack', isFaceDown: false, hasAttacked: false, canChangePosition: false };
                gameState.playerMonsterField[1] = { card: Object.assign({}, m2, { uid: 'SECONDO' }), position: 'attack', isFaceDown: false, hasAttacked: false, canChangePosition: false };
                const t = cardDatabase.find((c) => c.id === 671);
                gameState.botSTField[0] = { card: Object.assign({}, t, { uid: 'mp_evacuazione' }), isFaceDown: true, setOnTurn: 0 };
                updateUI();
            });
            await attore.evaluate(() => {
                const m1 = cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck && c.attack === 1200);
                const m2 = cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck && c.attack === 1800);
                gameState.botMonsterField[0] = { card: Object.assign({}, m1, { uid: 'PRIMO' }), position: 'attack', isFaceDown: false, hasAttacked: false, canChangePosition: false };
                gameState.botMonsterField[1] = { card: Object.assign({}, m2, { uid: 'SECONDO' }), position: 'attack', isFaceDown: false, hasAttacked: false, canChangePosition: false };
                const t = cardDatabase.find((c) => c.id === 671);
                gameState.playerSTField[0] = { card: Object.assign({}, t, { uid: 'mp_evacuazione' }), isFaceDown: true, setOnTurn: 0 };
                updateUI();
            });
            await attore.waitForTimeout(600);

            await attore.evaluate(() => { DuelEngine.activateCard('player', 'st', 0); });

            // Il picker si apre da chi attiva, che sceglie il SECONDO —
            // cioè NON quello che la vecchia auto-scelta avrebbe preso.
            await attore.waitForSelector('#cardListPickerModal.open', { timeout: 20000 });
            const voci = await attore.$$('#cardListPickerRow .card-list-item');
            assert(voci.length === 2, `Il picker deve offrire i due mostri dell'avversario (ne mostra ${voci.length})`);
            await voci[1].click();

            // Chi subisce deve arrivare allo STESSO risultato: SECONDO via
            // dal Terreno, PRIMO ancora lì. Tetto stretto: se la scelta non
            // viaggia, di là si aspetta il tetto remoto da 30 secondi prima
            // di ripiegare sul primo candidato.
            const campoDiChiSubisce = () => bersaglio.evaluate(
                () => gameState.playerMonsterField.map((s) => (s ? s.card.uid : null))
            );
            await bersaglio.waitForFunction(
                () => gameState.playerMonsterField.filter(Boolean).length === 1,
                null, { timeout: 12000 }
            ).catch(() => { /* ci pensa l'assert qui sotto */ });

            const visto = await campoDiChiSubisce();
            const restaAttore = await attore.evaluate(
                () => gameState.botMonsterField.map((s) => (s ? s.card.uid : null))
            );
            assert(visto.filter(Boolean).join(',') === 'PRIMO',
                `Chi subisce deve ritrovarsi senza il mostro SCELTO dall'avversario, non senza il primo della lista (sul suo Terreno: ${JSON.stringify(visto)})`);
            assert(restaAttore.filter(Boolean).join(',') === 'PRIMO',
                `Chi attiva deve vedere lo stesso Terreno avversario (vede: ${JSON.stringify(restaAttore)})`);

            const [sommaA, sommaB] = await Promise.all([
                attore.evaluate(() => DuelEngine.computeStateChecksum()),
                bersaglio.evaluate(() => DuelEngine.computeStateChecksum())
            ]);
            assert(sommaA === sommaB,
                `Dopo l'effetto i due client devono avere lo stesso stato ("${sommaA}" contro "${sommaB}")`);

            // Il contesto dell'effetto non deve essere stato ribaltato: se
            // `owner` della busta del messaggio filtrasse ancora dentro,
            // di qua la carta si risolverebbe come se fosse di chi subisce.
            const contesto = await bersaglio.evaluate(() => {
                const ctx = DuelEngine.makeContext('bot', { owner: 'player', zone: 'hand', index: 3 });
                return { owner: ctx.owner, opponent: ctx.opponent };
            });
            assert(contesto.owner === 'bot' && contesto.opponent === 'player',
                `Il proprietario di un effetto lo decide il chiamante, non i campi del messaggio (ottenuto owner="${contesto.owner}", opponent="${contesto.opponent}")`);

            assert(pageErrors.length === 0, `Errori JS non gestiti: ${pageErrors.join(' | ')}`);
        } finally {
            await context.close();
            await room.close();
            await statics.close();
        }
    }
};
