// Multiplayer: una Carta Equipaggiamento sul Terreno di chi manda una
// fotografia di stato deve restare agganciata anche dall'altra parte.
// `equippedToOwner` ('player'/'bot') è relativo a chi guarda: copiato così
// com'era, di qua l'Equip puntava al lato sbagliato e recomputeStaticEffects
// lo scartava. Misurato con la Spada Sigillante di Orichalcos (id 396) usata
// nella finestra di priorità a inizio Battle Phase avversaria (scarto e
// bersaglio scelti dal giocatore): finiva nel Cimitero su un client e
// restava in campo sull'altro. Poi chi è di turno attacca e chiude il
// turno, e i due client devono restare allineati per tutto il tempo.
const { startStaticServer, startRoomServer } = require('../helpers/local-servers');

module.exports = {
    name: 'Multiplayer: Equip e fotografie di stato restano allineati (Spada di Orichalcos in finestra di priorità)',
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
                await page.waitForFunction(() => { const el = document.getElementById('pageLoader'); return !el || el.classList.contains('page-loader-hidden'); }, null, { timeout: 15000 });
                await page.evaluate(() => { const a = document.querySelector('.mp-advanced'); if (a) a.open = true; });
                await page.fill('#mpServerUrl', room.wsUrl);
                return page;
            };
            const pageA = await openLobby('A');
            const pageB = await openLobby('B');
            await pageA.click('#mpCreateBtn');
            await pageA.waitForFunction(() => { const el = document.getElementById('mpRoomCodeValue'); return el && /^[A-Z0-9]{5}$/.test(el.textContent.trim()); }, null, { timeout: 15000 });
            const code = (await pageA.textContent('#mpRoomCodeValue')).trim();
            await pageB.click('#mpTabJoin');
            await pageB.fill('#mpJoinCode', code);
            await pageB.click('#mpJoinBtn');
            await pageA.waitForSelector('#mpReadyBar:not([hidden])', { timeout: 20000 });
            await pageB.waitForSelector('#mpReadyBar:not([hidden])', { timeout: 20000 });
            await pageA.click('#mpReadyBtn');
            await pageB.click('#mpReadyBtn');
            const arenaReady = (page) => page.waitForFunction(() => window.MULTIPLAYER_MODE === true && typeof gameState !== 'undefined' && Array.isArray(gameState.playerHand) && gameState.playerHand.length >= 5, null, { timeout: 40000 });
            await Promise.all([arenaReady(pageA), arenaReady(pageB)]);
            for (const page of [pageA, pageB]) { try { await page.click('.di-skip', { timeout: 4000 }); } catch (e) { /* nessuna intro */ } }
            for (const page of [pageA, pageB]) {
                await page.evaluate(() => { window.__mpSent = []; const inner = window.MP_broadcast; window.MP_broadcast = function (a) { window.__mpSent.push(a.kind); return inner(a); }; });
            }
            const diTurno = async () => ((await pageA.evaluate(() => gameState.currentPlayer)) === 'player' ? [pageA, pageB] : [pageB, pageA]);
            let [att, pas] = await diTurno();
            await att.waitForFunction(() => gameState.phase === 'main1' && gameState.currentPlayer === 'player', null, { timeout: 30000 });
            // Turno 2: nel primo non si entra in Battle Phase.
            const t0 = await att.evaluate(() => gameState.turn);
            await att.evaluate(() => endTurn());
            await Promise.all([att, pas].map((p) => p.waitForFunction((t) => gameState.turn > t, t0, { timeout: 25000 })));
            [att, pas] = await diTurno();
            await att.waitForFunction(() => gameState.phase === 'main1' && gameState.currentPlayer === 'player', null, { timeout: 30000 });

            // Campo speculare: chi è di turno ha due mostri scoperti; l'altro
            // un mostro Effetto con la Spada agganciata e 2 carte in mano.
            const prepara = (page, io) => page.evaluate((io) => {
                const base = cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck && c.attack === 1800);
                const eff = cardDatabase.find((c) => c.type === 'monster' && c.subtype === 'effect' && !c.extraDeck && !DuelEngine.getDefinition(c.id)) || cardDatabase.find((c) => c.type === 'monster' && c.subtype === 'effect');
                const spada = cardDatabase.find((c) => c.id === 396);
                const lato = (chi) => (io === chi ? 'player' : 'bot');
                gameState[lato('att') + 'MonsterField'] = [
                    { card: Object.assign({}, base, { uid: 'mp_a1' }), position: 'attack', isFaceDown: false, hasAttacked: false, canChangePosition: false },
                    { card: Object.assign({}, base, { uid: 'mp_a2' }), position: 'attack', isFaceDown: false, hasAttacked: false, canChangePosition: false },
                    null, null, null];
                gameState[lato('pas') + 'MonsterField'] = [
                    { card: Object.assign({}, eff, { uid: 'mp_p1' }), position: 'attack', isFaceDown: false, hasAttacked: false, canChangePosition: false },
                    null, null, null, null];
                gameState[lato('pas') + 'STField'] = [{ card: Object.assign({}, spada, { uid: 'mp_spada', equippedToOwner: lato('pas'), equippedToIndex: 0, equippedToUid: 'mp_p1' }), isFaceDown: false }, null, null, null, null];
                gameState[lato('att') + 'STField'] = [null, null, null, null, null];
                if (io === 'pas') {
                    gameState.playerHand = [Object.assign({}, base, { uid: 'mp_h1' }), Object.assign({}, base, { uid: 'mp_h2' })];
                } else {
                    gameState.botHand = [{ id: -1, uid: 'ph1', name: '???', type: 'monster' }, { id: -1, uid: 'ph2', name: '???', type: 'monster' }];
                }
                gameState.botLP = 8000; gameState.playerLP = 8000;
                DuelEngine.recomputeStaticEffects();
                updateUI();
            }, io);
            await prepara(att, 'att');
            await prepara(pas, 'pas');

            await att.evaluate(() => nextPhase()); // Main Phase 1 -> Battle Phase
            const domanda = await pas.waitForSelector('#activateModal.open', { timeout: 15000 }).then(() => true).catch(() => false);
            assert(domanda, 'A inizio Battle Phase avversaria, chi ha la Spada riceve la domanda sull\'Effetto Veloce');
            const bloccato = await att.evaluate(() => { const prima = gameState.botLP; executeAttack(0, 0); return DuelEngine.isPriorityWindowOpen() && gameState.botLP === prima; });
            assert(bloccato, 'Chi è di turno non può attaccare mentre l\'altro decide');
            await pas.click('#activateConfirmBtn');
            await pas.waitForFunction(() => document.getElementById('cardListPickerModal').classList.contains('open') && document.querySelectorAll('#cardListPickerModal .card-list-item').length === 2, null, { timeout: 20000 });
            await pas.evaluate(() => document.querySelectorAll('#cardListPickerModal .card-list-item')[1].click());
            await pas.waitForFunction(() => document.getElementById('cardListPickerModal').classList.contains('open') && /distruggere/.test(document.getElementById('cardListPickerText').textContent), null, { timeout: 20000 });
            await pas.evaluate(() => document.querySelectorAll('#cardListPickerModal .card-list-item')[1].click());
            const fatto = (p, lato) => p.waitForFunction((lato) => !gameState[lato + 'MonsterField'].some((s) => s && s.card.uid === 'mp_a2') && !DuelEngine.isChainActive() && !DuelEngine.isPriorityWindowOpen(), lato, { timeout: 20000 }).then(() => true).catch(() => false);
            const [fa, fp] = await Promise.all([fatto(att, 'player'), fatto(pas, 'bot')]);
            assert(fa && fp, `Il mostro scelto è distrutto su entrambi i client (attivo ${fa}, passivo ${fp})`);
            await att.waitForTimeout(1500);

            const dopo = await Promise.all([att, pas].map((p, i) => p.evaluate((lato) => ({
                somma: DuelEngine.computeStateChecksum(),
                spada: gameState[lato + 'STField'].some((s) => s && s.card.uid === 'mp_spada'),
                spadaNelCimitero: gameState[lato + 'Graveyard'].some((c) => c.uid === 'mp_spada')
            }), i === 0 ? 'bot' : 'player')));
            assert(dopo[0].spada && !dopo[0].spadaNelCimitero, `Dal lato di chi è di turno la Spada resta agganciata dopo la fotografia di stato (${JSON.stringify(dopo[0])})`);
            assert(dopo[1].spada, 'Dal lato di chi l\'ha usata la Spada resta in campo');
            assert(dopo[0].somma === dopo[1].somma, `Stesso checksum dopo l'Effetto Veloce ("${dopo[0].somma}" contro "${dopo[1].somma}")`);

            // Chi è di turno attacca col mostro rimasto, poi chiude il turno.
            await att.evaluate(() => executeAttack(0, 0));
            const promptDif = await pas.waitForSelector('#activateModal.open', { timeout: 6000 }).then(() => true).catch(() => false);
            if (promptDif) await pas.click('#activateCancelBtn');
            await att.waitForFunction(() => !DuelEngine.isChainActive() && gameState.botMonsterField.every((s) => !s || s.card.uid !== 'mp_p1'), null, { timeout: 15000 });
            await att.waitForTimeout(800);
            const [sa, sp] = await Promise.all([att, pas].map((p) => p.evaluate(() => DuelEngine.computeStateChecksum())));
            assert(sa === sp, `Stesso checksum dopo l'attacco ("${sa}" contro "${sp}")`);

            const t1 = await att.evaluate(() => gameState.turn);
            await att.evaluate(() => endTurn());
            const cambiato = await Promise.all([att, pas].map((p) => p.waitForFunction((t) => gameState.turn > t, t1, { timeout: 20000 }).then(() => true).catch(() => false)));
            assert(cambiato[0] && cambiato[1], `Il turno passa su entrambi i client (${cambiato})`);

            const resync = (await Promise.all([pageA, pageB].map((p) => p.evaluate(() => window.__mpSent.filter((k) => k === 'request-resync').length)))).reduce((x, y) => x + y, 0);
            assert(resync === 0, `Nessun resync (ne sono stati chiesti ${resync})`);
            assert(pageErrors.length === 0, `Errori JS non gestiti: ${pageErrors.join(' | ')}`);
        } finally {
            await context.close(); await room.close(); await statics.close();
        }
    }
};
