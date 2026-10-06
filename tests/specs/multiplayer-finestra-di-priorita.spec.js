// Multiplayer: la finestra di priorità per gli Effetti Veloci
// (DuelEngine.openPriorityWindow). Chi NON è di turno ha Ninja d'Assalto
// (id 459) e lo usa "a vuoto" mentre l'avversario chiude il turno.
//
// Cosa si controlla:
// - la domanda arriva al client giusto (chi non è di turno), e chi è di
//   turno ASPETTA: il turno non passa finché l'altro non ha deciso;
// - l'Effetto Veloce si risolve uguale sui due client (Ninja bandito da
//   tutte e due le parti), con lo stesso checksum e senza resync;
// - la decisione viaggia come 'chain-response' con `priorityKey`: un tipo
//   che il relay già accetta (server/server.js ha un elenco chiuso di
//   tipi, e un tipo nuovo veniva scartato in silenzio — chi è di turno
//   restava fermo 30 secondi ad ogni finestra).
const { startStaticServer, startRoomServer } = require('../helpers/local-servers');

module.exports = {
    name: 'Multiplayer: finestra di priorità per gli Effetti Veloci',
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
                // MP_SENZA_PASSO_COMUNE: questo spec verifica il Multiplayer di prima (ripiego con un client vecchio).
                await page.addInitScript(() => { window.AUTH_GATE_SKIP = true; window.DUEL_RPS_SKIP = true; window.MP_SENZA_PASSO_COMUNE = true; });
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
            for (const page of [pageA, pageB]) {
                await page.evaluate(() => {
                    window.__mpSent = [];
                    const inner = window.MP_broadcast;
                    window.MP_broadcast = function (action) { window.__mpSent.push(action.kind); return inner(action); };
                });
            }

            const attivo = (await pageA.evaluate(() => gameState.currentPlayer)) === 'player' ? pageA : pageB;
            const passivo = attivo === pageA ? pageB : pageA;
            await attivo.waitForFunction(() => gameState.phase === 'main1' && gameState.currentPlayer === 'player', null, { timeout: 30000 });

            // Lo stesso Ninja, con gli stessi uid, sui due client: di qua
            // del passivo è suo, dal lato dell'attivo è dell'avversario.
            const preparaNinja = (page, lato) => page.evaluate((lato) => {
                const ninja = cardDatabase.find((c) => c.id === 459);
                const osc = cardDatabase.find((c) => c.type === 'monster' && c.attribute === 'OSCURITÀ' && !c.extraDeck && !DuelEngine.getDefinition(c.id));
                gameState[lato + 'MonsterField'][0] = { card: Object.assign({}, ninja, { uid: 'mp_ninja' }), position: 'attack', isFaceDown: false, hasAttacked: false, canChangePosition: false };
                gameState[lato + 'Graveyard'] = [Object.assign({}, osc, { uid: 'mp_osc1' }), Object.assign({}, osc, { uid: 'mp_osc2' })];
                gameState.usedIgnitionThisTurn = {};
                updateUI();
            }, lato);
            await preparaNinja(passivo, 'player');
            await preparaNinja(attivo, 'bot');
            const turnoPrima = await attivo.evaluate(() => gameState.turn);

            await attivo.evaluate(() => endTurn());

            const domanda = await passivo.waitForSelector('#activateModal.open', { timeout: 15000 }).then(() => true).catch(() => false);
            assert(domanda, 'A fine turno dell\'avversario, chi non è di turno deve ricevere la domanda sull\'Effetto Veloce');
            const titolo = await passivo.evaluate(() => (document.getElementById('activateModalTitle') || document.getElementById('activateModal')).textContent);
            assert(titolo.includes('Effetto Veloce'), `Il prompt è quello della finestra di priorità (${titolo.trim().slice(0, 60)})`);

            // Chi è di turno aspetta: il turno non deve passare mentre
            // l'altro sta decidendo.
            await attivo.waitForTimeout(2500);
            const intanto = await attivo.evaluate(() => ({ turno: gameState.turn, aperta: DuelEngine.isPriorityWindowOpen() }));
            assert(intanto.turno === turnoPrima && intanto.aperta, `Chi è di turno aspetta la decisione (${JSON.stringify(intanto)})`);

            await passivo.click('#activateConfirmBtn');

            // Ninja bandito sui due client, poi il turno passa davvero.
            const banditoDi = (page, lato) => page.waitForFunction(
                (lato) => !gameState[lato + 'MonsterField'].some((s) => s && s.card.uid === 'mp_ninja'),
                lato, { timeout: 15000 }
            ).then(() => true).catch(() => false);
            const [bp, ba] = await Promise.all([banditoDi(passivo, 'player'), banditoDi(attivo, 'bot')]);
            assert(bp && ba, `Ninja bandito su entrambi i client (passivo ${bp}, attivo ${ba})`);

            const cambiato = (page) => page.waitForFunction((t) => gameState.turn > t, turnoPrima, { timeout: 20000 }).then(() => true).catch(() => false);
            const [ca, cp] = await Promise.all([cambiato(attivo), cambiato(passivo)]);
            assert(ca && cp, `Dopo la decisione il turno passa su tutti e due i lati (attivo ${ca}, passivo ${cp})`);

            // Il nuovo turno è del passivo: aspettiamo che arrivi in Main
            // Phase 1 (passando dalla SUA Standby, dove ora la finestra è
            // dell'altro), poi confrontiamo.
            await passivo.waitForFunction(() => gameState.phase === 'main1' && gameState.currentPlayer === 'player', null, { timeout: 30000 });
            await passivo.waitForTimeout(800);
            const [sa, sp] = await Promise.all([attivo, passivo].map((p) => p.evaluate(() => DuelEngine.computeStateChecksum())));
            assert(sa === sp, `Stesso checksum sui due client ("${sa}" contro "${sp}")`);

            const resync = (await Promise.all([pageA, pageB].map(
                (p) => p.evaluate(() => window.__mpSent.filter((k) => k === 'request-resync').length)
            ))).reduce((x, y) => x + y, 0);
            assert(resync === 0, `Nessun resync (ne sono stati chiesti ${resync})`);
            assert(pageErrors.length === 0, `Errori JS non gestiti: ${pageErrors.join(' | ')}`);
        } finally {
            await context.close();
            await room.close();
            await statics.close();
        }
    }
};
