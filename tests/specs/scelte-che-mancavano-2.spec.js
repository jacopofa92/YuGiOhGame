// Secondo giro di carte che promettevano una scelta e sceglievano da sole
// (audit "testo con una scelta / codice senza helper di scelta"):
// 548 Attacco a Doppia Punta, 289 Lady Arpia Formazione della Fenice,
// 220 Scuotiterra, 881 Nobile dello Sterminio, 742 Mago dell'Esplosione,
// 792 Bara Oscura, 363 Cappelli Magici.
//
// Ogni caso sceglie un candidato che il vecchio auto-pick NON avrebbe
// preso (di solito non il primo della lista): con l'auto-pick il test
// fallirebbe.
module.exports = {
    name: 'Scelte che mancavano (2): 548, 289, 220, 881, 742, 792, 363',
    async run(t) {
        const prepara = () => t.evaluate(() => {
            if (typeof clearPhaseTransitionTimeout === 'function') clearPhaseTransitionTimeout();
            gameState.playerLP = 8000;
            gameState.botLP = 8000;
            gameState.gameOver = false;
            gameState.turn = 20;
            gameState.currentPlayer = 'player';
            gameState.phase = 'main1';
            gameState.playerMonsterField = [null, null, null, null, null];
            gameState.botMonsterField = [null, null, null, null, null];
            gameState.playerSTField = [null, null, null, null, null];
            gameState.botSTField = [null, null, null, null, null];
            gameState.playerFieldSpell = null;
            gameState.botFieldSpell = null;
            gameState.playerGraveyard = [];
            gameState.botGraveyard = [];
            gameState.playerHand = [];
            gameState.botHand = [];
            gameState.chain = { links: [], active: false };
            gameState.monsterEffectsNegatedUidsFor = { player: new Set(), bot: new Set() };
            if (typeof closeQuickPopover === 'function') closeQuickPopover();
            const m = document.getElementById('cardListPickerModal');
            if (m) m.classList.remove('open');
            window.__base = cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck && !DuelEngine.getDefinition(c.id) && c.attribute);
            window.__mostro = (uid, atk, extra) => ({ card: Object.assign({}, window.__base, { uid, attack: atk, defense: 100 }, extra || {}), position: 'attack', isFaceDown: false });
            DuelEngine.recomputeStaticEffects();
        });
        // Aspetta la lista con `attesi` voci e clicca la voce `i`.
        const scegli = async (i, attesi) => {
            await t.page.waitForFunction((n) => {
                const m = document.getElementById('cardListPickerModal');
                return m.classList.contains('open') && document.querySelectorAll('#cardListPickerModal .card-list-item').length === n;
            }, attesi, { timeout: 8000 });
            await t.evaluate((i) => document.querySelectorAll('#cardListPickerModal .card-list-item')[i].click(), i);
        };
        const opzione = async (testo) => {
            await t.page.waitForFunction((s) => [...document.querySelectorAll('#quickPopover [data-option]')].some((b) => b.textContent.includes(s)), testo, { timeout: 8000 });
            await t.evaluate((s) => [...document.querySelectorAll('#quickPopover [data-option]')].find((b) => b.textContent.includes(s)).click(), testo);
        };
        const vivi = (lato) => t.evaluate((lato) => gameState[lato + 'MonsterField'].filter(Boolean).map((s) => s.card.uid), lato);

        // --- 548: 2 propri + 1 avversario, scelti dal giocatore ---
        await prepara();
        await t.evaluate(() => {
            gameState.playerMonsterField = [__mostro('a', 100), __mostro('b', 200), __mostro('c', 300), null, null];
            gameState.botMonsterField = [__mostro('x', 1000), __mostro('y', 2000), null, null, null];
            const card = { ...cardDatabase.find((c) => c.id === 548), uid: 'doppia' };
            DuelEngine.getDefinition(548).activate(DuelEngine.makeContext('player', { card }));
        });
        await scegli(2, 3);   // propri dal più debole: a, b, c -> c
        await scegli(1, 2);   // restano a, b -> b
        await scegli(1, 2);   // avversari dal più forte: y, x -> x
        const p548 = await vivi('player');
        const b548 = await vivi('bot');
        t.assert(p548.join() === 'a' && b548.join() === 'y', `548: distrutti c, b e x (restano ${p548} / ${b548})`);

        // --- 289: tante quante le Lady Arpia, scelte dal giocatore ---
        await prepara();
        const harpie = await t.evaluate(() => {
            const arpia = cardDatabase.find((c) => c.type === 'monster' && c.name && c.name.startsWith('Lady Arpia') && !c.extraDeck);
            gameState.playerMonsterField = [0, 1, 2].map((i) => ({ card: { ...arpia, uid: 'arpia' + i }, position: 'attack', isFaceDown: false })).concat([null, null]);
            gameState.botMonsterField = [__mostro('o1', 2500), __mostro('o2', 1800), __mostro('o3', 1200), __mostro('o4', 600), null];
            const card = { ...cardDatabase.find((c) => c.id === 289), uid: 'fenice' };
            const ctx = DuelEngine.makeContext('player', { card });
            const puo = DuelEngine.getDefinition(289).canActivate(ctx);
            if (puo) DuelEngine.getDefinition(289).activate(ctx);
            return puo;
        });
        t.assert(harpie, '289: attivabile con 3 Lady Arpia');
        await scegli(3, 4);   // o1, o2, o3, o4 -> o4
        await scegli(2, 3);   // o1, o2, o3 -> o3
        await scegli(1, 2);   // o1, o2 -> o2
        const b289 = await vivi('bot');
        const lp289 = await t.evaluate(() => gameState.botLP);
        t.assert(b289.join() === 'o1', `289: distrutti i tre scelti, non i più forti (resta ${b289})`);
        t.assert(lp289 === 8000 - 1800, `289: danno pari all'ATK più alto fra i distrutti (LP ${lp289})`);

        // --- 220: il giocatore dichiara, il bot da avversario sceglie ---
        await prepara();
        await t.evaluate(() => {
            gameState.playerMonsterField = [__mostro('mia-terra', 500, { attribute: 'TERRA' }), null, null, null, null];
            gameState.botMonsterField = [__mostro('f1', 500, { attribute: 'FUOCO' }), __mostro('f2', 500, { attribute: 'FUOCO' }), __mostro('acq', 500, { attribute: 'ACQUA' }), null, null];
            const card = { ...cardDatabase.find((c) => c.id === 220), uid: 'scuoti' };
            DuelEngine.getDefinition(220).activate(DuelEngine.makeContext('player', { card }));
        });
        await opzione('FUOCO');
        await opzione('ACQUA');
        const b220 = await vivi('bot');
        t.assert(b220.join() === 'f1,f2', `220: il bot sceglie l'Attributo che gli costa meno, ACQUA (restano ${b220})`);

        // --- 220: il bot dichiara, il giocatore da avversario sceglie ---
        await prepara();
        await t.evaluate(() => {
            gameState.playerMonsterField = [__mostro('l1', 500, { attribute: 'LUCE' }), __mostro('l2', 500, { attribute: 'LUCE' }), __mostro('osc', 500, { attribute: 'OSCURITÀ' }), null, null];
            const card = { ...cardDatabase.find((c) => c.id === 220), uid: 'scuoti-bot' };
            DuelEngine.getDefinition(220).activate(DuelEngine.makeContext('bot', { card }));
        });
        const voci220 = await t.page.waitForFunction(() => {
            const v = [...document.querySelectorAll('#quickPopover [data-option]')].map((b) => b.textContent);
            return v.length === 2 ? v : null;
        }, null, { timeout: 8000 }).then((h) => h.jsonValue());
        t.assert(voci220.some((v) => v.includes('LUCE')) && voci220.some((v) => v.includes('OSCURITÀ')), `220: al giocatore arrivano i due Attributi dichiarati dal bot (${voci220})`);
        await opzione('OSCURITÀ');
        const p220 = await vivi('player');
        t.assert(p220.join() === 'l1,l2', `220: si distrugge l'Attributo scelto dal giocatore (restano ${p220})`);

        // --- 881: il giocatore sceglie quale coperta, senza vederla ---
        await prepara();
        await t.evaluate(() => {
            const trappola = cardDatabase.find((c) => c.type === 'trap' && !DuelEngine.getDefinition(c.id)) || cardDatabase.find((c) => c.type === 'trap');
            const magia = cardDatabase.find((c) => c.type === 'spell' && c.subtype === 'normal');
            gameState.botSTField = [{ card: { ...magia, uid: 'cop1' }, isFaceDown: true }, { card: { ...trappola, uid: 'cop2' }, isFaceDown: true }, null, null, null];
            gameState.botDeck = [{ ...trappola, uid: 'deck-copia' }, { ...magia, uid: 'deck-altra' }];
            gameState.botDeckCount = 2;
            const card = { ...cardDatabase.find((c) => c.id === 881), uid: 'nobile' };
            DuelEngine.getDefinition(881).activate(DuelEngine.makeContext('player', { card }));
        });
        const nascoste = await t.page.waitForFunction(() => {
            const items = [...document.querySelectorAll('#cardListPickerModal .card-list-item')];
            return items.length === 2 ? items.map((el) => el.textContent) : null;
        }, null, { timeout: 8000 }).then((h) => h.jsonValue());
        const nomi881 = await t.evaluate(() => gameState.botSTField.filter(Boolean).map((s) => s.card.name));
        t.assert(!nascoste.some((testo) => nomi881.some((n) => testo.includes(n))), `881: le coperte avversarie nella lista non rivelano il nome (${nascoste})`);
        await scegli(1, 2);
        const e881 = await t.evaluate(() => ({
            st: gameState.botSTField.filter(Boolean).map((s) => s.card.uid),
            banditi: (gameState.botBanished || []).map((c) => c.uid),
            deck: gameState.botDeck.map((c) => c.uid)
        }));
        t.assert(e881.st.join() === 'cop1', `881: distrutta la seconda coperta, quella scelta (${JSON.stringify(e881)})`);
        t.assert(e881.deck.join() === 'deck-altra', `881: era una Trappola, le sue copie lasciano il Deck (${JSON.stringify(e881)})`);

        // --- 742: bersaglio scelto, Segnalini rimossi solo quanti servono ---
        await prepara();
        await t.evaluate(() => {
            const mago = { ...cardDatabase.find((c) => c.id === 742), uid: 'mago', counters: 4 };
            gameState.playerMonsterField = [{ card: mago, position: 'attack', isFaceDown: false }, __mostro('mio', 1000), null, null, null];
            gameState.botMonsterField = [__mostro('e2500', 2500), __mostro('e2000', 2000), __mostro('e1500', 1500), __mostro('e3000', 3000), null];
            DuelEngine.getDefinition(742).activate(DuelEngine.makeContext('player', { card: mago, zone: 'monster', index: 0 }));
        });
        // 4 Segnalini = 2800 ATK: e2500, e2000, e1500, poi i propri (mio, e il
        // Mago stesso se alla portata) — si sceglie e1500, non il più forte.
        const n742 = await t.evaluate(() => document.querySelectorAll('#cardListPickerModal .card-list-item').length);
        await scegli(2, n742);
        const e742 = await t.evaluate(() => ({
            bot: gameState.botMonsterField.filter(Boolean).map((s) => s.card.uid),
            segnalini: gameState.playerMonsterField[0].card.counters,
            mio: !!gameState.playerMonsterField[1]
        }));
        t.assert(e742.bot.join() === 'e2500,e2000,e3000' && e742.mio, `742: distrutto il mostro scelto (${JSON.stringify(e742)})`);
        t.assert(e742.segnalini === 1, `742: per 1500 ATK servono 3 Segnalini, ne resta 1 (${e742.segnalini})`);

        // --- 792: la vittima (il giocatore) sceglie effetto e mostro ---
        await prepara();
        await t.evaluate(() => {
            gameState.playerHand = [{ ...__base, uid: 'h1' }, { ...__base, uid: 'h2' }, { ...__base, uid: 'h3' }];
            gameState.playerMonsterField = [__mostro('debole', 300), __mostro('forte', 2400), null, null, null];
            const bara = { ...cardDatabase.find((c) => c.id === 792), uid: 'bara' };
            DuelEngine.getDefinition(792).onSTDestroyed(DuelEngine.makeContext('bot', { card: bara, wasFaceDown: true }));
        });
        await opzione('Distruggi');
        await scegli(1, 2);   // dal più debole: debole, forte -> forte
        const e792 = await t.evaluate(() => ({ campo: gameState.playerMonsterField.filter(Boolean).map((s) => s.card.uid), mano: gameState.playerHand.length }));
        t.assert(e792.campo.join() === 'debole' && e792.mano === 3, `792: il giocatore sceglie di perdere il mostro, e quale (${JSON.stringify(e792)})`);

        // --- 792: vittima bot, decide da sé senza aprire nulla ---
        await prepara();
        const e792b = await t.evaluate(() => {
            gameState.botHand = [{ ...__base, uid: 'bh1' }];
            gameState.botMonsterField = [__mostro('bforte', 2400), __mostro('bdebole', 300), null, null, null];
            const bara = { ...cardDatabase.find((c) => c.id === 792), uid: 'bara2' };
            DuelEngine.getDefinition(792).onSTDestroyed(DuelEngine.makeContext('player', { card: bara, wasFaceDown: true }));
            return {
                popover: !!document.getElementById('quickPopover'),
                campo: gameState.botMonsterField.filter(Boolean).map((s) => s.card.uid),
                mano: gameState.botHand.length
            };
        });
        t.assert(!e792b.popover && e792b.campo.join() === 'bforte' && e792b.mano === 1, `792: con 1 sola carta in mano il bot sacrifica il mostro più debole (${JSON.stringify(e792b)})`);

        // --- 363: 2 carte dal Deck e 1 mostro, scelti dal giocatore ---
        await prepara();
        await t.evaluate(() => {
            const magia = cardDatabase.find((c) => c.type === 'spell' && c.subtype === 'normal');
            const trappola = cardDatabase.find((c) => c.type === 'trap');
            gameState.playerDeck = [
                { ...magia, uid: 'd-m1' }, { ...__base, uid: 'd-mostro' }, { ...trappola, uid: 'd-t1' }, { ...magia, uid: 'd-m2' }
            ];
            gameState.playerDeckCount = 4;
            gameState.playerMonsterField = [__mostro('cap-a', 800), __mostro('cap-b', 1600), null, null, null];
            gameState.currentPlayer = 'bot';
            gameState.phase = 'battle';
            const card = { ...cardDatabase.find((c) => c.id === 363), uid: 'cappelli' };
            DuelEngine.getDefinition(363).activate(DuelEngine.makeContext('player', { card }));
        });
        await scegli(2, 3);   // d-m1, d-t1, d-m2 -> d-m2
        await scegli(1, 2);   // d-m1, d-t1 -> d-t1
        await scegli(1, 2);   // mostri dal più forte: cap-b, cap-a -> cap-a
        const e363 = await t.evaluate(() => ({
            deck: gameState.playerDeck.map((c) => c.uid),
            campo: gameState.playerMonsterField.filter(Boolean).map((s) => ({ uid: s.card.uid, coperta: s.isFaceDown, atk: s.card.attack }))
        }));
        const coperte363 = e363.campo.filter((c) => c.coperta).map((c) => c.uid).sort().join();
        t.assert(e363.deck.join() === 'd-m1,d-mostro', `363: lasciano il Deck le due carte scelte (${e363.deck})`);
        t.assert(coperte363 === 'cap-a,d-m2,d-t1', `363: coperte le due carte scelte e il mostro scelto (${JSON.stringify(e363.campo)})`);
    }
};
