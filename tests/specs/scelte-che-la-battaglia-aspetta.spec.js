// Le scelte del giocatore dentro una battaglia o una Chain: la battaglia
// deve ASPETTARE la scelta (callCardHandlerWaiting/attendiScelta in
// duel-engine.js/card-effects.js). Prima ripartiva subito, e una scelta
// arrivata dopo qualche secondo trovava il danno già calcolato — per questo
// queste carte sceglievano da sole.
//
// Ogni scelta qui si fa dopo ATTESA_MS: il tempo con cui era stato misurato
// il difetto (Fuoco di Copertura, 4 secondi). Durante l'attesa si controlla
// che la battaglia sia ancora ferma.
const ATTESA_MS = 4000;

module.exports = {
    name: 'Scelte che la battaglia aspetta (100, 883, 885, 889, 895, 1120)',
    async run(t) {
        const prepara = () => t.evaluate(() => {
            if (typeof clearPhaseTransitionTimeout === 'function') clearPhaseTransitionTimeout();
            window.__battleDone = false;
            gameState.playerLP = 8000;
            gameState.botLP = 8000;
            gameState.gameOver = false;
            gameState.turn = 6;
            gameState.playerMonsterField = [null, null, null, null, null];
            gameState.botMonsterField = [null, null, null, null, null];
            gameState.playerSTField = [null, null, null, null, null];
            gameState.botSTField = [null, null, null, null, null];
            gameState.playerFieldSpell = null;
            gameState.botFieldSpell = null;
            gameState.playerGraveyard = [];
            gameState.botGraveyard = [];
            gameState.monsterEffectsNegatedUidsFor = { player: new Set(), bot: new Set() };
            gameState.negatedEffectsForeverUids = new Set();
            gameState.damageStepOnlyBonusFor = {};
            gameState.chain = { links: [], active: false };
            gameState.currentPlayer = 'player';
            gameState.phase = 'battle';
            if (typeof closeQuickPopover === 'function') closeQuickPopover();
            DuelEngine.recomputeStaticEffects();
        });
        const mostro = (uid, atk, def) => ({ uid, atk, def });
        const aspettaPopover = () => t.page.waitForFunction(() => !!document.getElementById('quickPopover'), null, { timeout: 15000 });
        const cliccaOpzione = (testo) => t.evaluate((testo) => {
            const btn = [...document.querySelectorAll('#quickPopover [data-option]')].find((b) => b.textContent.includes(testo));
            if (!btn) return false;
            btn.click();
            return true;
        }, testo);
        const fineBattaglia = () => t.page.waitForFunction(() => window.__battleDone === true, null, { timeout: 12000 });

        // --- 889 Iniezione della Fata Giglio: paga 2000 LP, +3000 ATK ---
        await prepara();
        await t.evaluate(({ lily, nemico }) => {
            const base = cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck && !DuelEngine.getDefinition(c.id));
            gameState.playerMonsterField[0] = { card: { ...cardDatabase.find((c) => c.id === 889), attack: lily.atk, uid: lily.uid }, position: 'attack', isFaceDown: false, hasAttacked: false };
            gameState.botMonsterField[0] = { card: { ...base, attack: nemico.atk, defense: nemico.def, uid: nemico.uid }, position: 'attack', isFaceDown: false };
            resolveAttack('player', 0, 0, () => { window.__battleDone = true; });
        }, { lily: mostro('lily', 400, 1500), nemico: mostro('nemico889', 2000, 1000) });
        await aspettaPopover();
        await t.page.waitForTimeout(ATTESA_MS);
        const ferma889 = await t.evaluate(() => ({ done: window.__battleDone, lpBot: gameState.botLP, vivo: !!gameState.botMonsterField[0] }));
        t.assert(!ferma889.done && ferma889.lpBot === 8000 && ferma889.vivo, `889: la battaglia aspetta la scelta (${JSON.stringify(ferma889)})`);
        t.assert(await cliccaOpzione('Paga'), '889: c\'è il pulsante "Paga 2000 LP"');
        await fineBattaglia();
        const esito889 = await t.evaluate(() => ({ lpPlayer: gameState.playerLP, lpBot: gameState.botLP, nemicoVivo: !!gameState.botMonsterField[0], lilyViva: !!gameState.playerMonsterField[0] }));
        t.assert(esito889.lpPlayer === 6000, `889: pagati 2000 LP (${esito889.lpPlayer})`);
        t.assert(esito889.lpBot === 6600 && !esito889.nemicoVivo && esito889.lilyViva, `889: con 3400 ATK distrugge il mostro da 2000 e infligge 1400 (${JSON.stringify(esito889)})`);

        // --- 889: "Non pagare" lascia la battaglia com'è ---
        await prepara();
        await t.evaluate(() => {
            const base = cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck && !DuelEngine.getDefinition(c.id));
            gameState.playerMonsterField[0] = { card: { ...cardDatabase.find((c) => c.id === 889), attack: 400, uid: 'lily2' }, position: 'attack', isFaceDown: false, hasAttacked: false };
            gameState.botMonsterField[0] = { card: { ...base, attack: 2000, defense: 1000, uid: 'nemico889b' }, position: 'attack', isFaceDown: false };
            resolveAttack('player', 0, 0, () => { window.__battleDone = true; });
        });
        await aspettaPopover();
        t.assert(await cliccaOpzione('Non pagare'), '889: c\'è il pulsante "Non pagare"');
        await fineBattaglia();
        const noPaga = await t.evaluate(() => ({ lpPlayer: gameState.playerLP, lilyViva: !!gameState.playerMonsterField[0] }));
        t.assert(noPaga.lpPlayer === 6400 && !noPaga.lilyViva, `889: senza pagare perde lo scontro (${JSON.stringify(noPaga)})`);

        // --- 895 Assalitore: il giocatore sceglie QUALE mostro cambia Posizione ---
        await prepara();
        await t.evaluate(() => {
            const base = cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck && !DuelEngine.getDefinition(c.id));
            gameState.playerFieldSpell = { card: { ...cardDatabase.find((c) => c.id === 890), uid: 'necro' }, isFaceDown: false };
            gameState.playerMonsterField[0] = { card: { ...cardDatabase.find((c) => c.id === 895), attack: 3000, uid: 'assalitore' }, position: 'attack', isFaceDown: false, hasAttacked: false };
            gameState.botMonsterField[0] = { card: { ...base, attack: 2500, defense: 100, uid: 'forte' }, position: 'attack', isFaceDown: false };
            gameState.botMonsterField[1] = { card: { ...base, attack: 500, defense: 100, uid: 'debole' }, position: 'attack', isFaceDown: false };
            DuelEngine.recomputeStaticEffects();
            resolveAttack('player', 0, 1, () => { window.__battleDone = true; });
        });
        await t.page.waitForFunction(() => document.getElementById('cardListPickerModal') && document.getElementById('cardListPickerModal').classList.contains('open'), null, { timeout: 15000 });
        await t.page.waitForTimeout(ATTESA_MS);
        const ferma895 = await t.evaluate(() => ({ done: window.__battleDone, lpBot: gameState.botLP }));
        t.assert(!ferma895.done && ferma895.lpBot === 8000, `895: la dichiarazione aspetta la scelta (${JSON.stringify(ferma895)})`);
        // Il SECONDO candidato (il debole, che è anche il bersaglio): con un
        // auto-pick sul più forte il test fallirebbe.
        await t.evaluate(() => document.querySelectorAll('#cardListPickerModal .card-list-item')[1].click());
        await fineBattaglia();
        const esito895 = await t.evaluate(() => ({ forte: gameState.botMonsterField[0] && gameState.botMonsterField[0].position, debole: gameState.botMonsterField[1], lpBot: gameState.botLP }));
        t.assert(esito895.forte === 'attack', `895: il mostro NON scelto resta in Attacco (${esito895.forte})`);
        t.assert(esito895.lpBot === 8000, `895: il bersaglio scelto è passato in Difesa prima del danno, quindi nessun danno (LP ${esito895.lpBot})`);

        // --- 100 Armatura Guida d'Attacco: "sposta l'attacco" su un altro mostro ---
        await prepara();
        await t.evaluate(() => {
            const base = cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck && !DuelEngine.getDefinition(c.id));
            gameState.currentPlayer = 'bot';
            gameState.botMonsterField[0] = { card: { ...base, attack: 1500, defense: 100, uid: 'attaccante' }, position: 'attack', isFaceDown: false, hasAttacked: false };
            gameState.playerMonsterField[0] = { card: { ...base, attack: 500, defense: 100, uid: 'bersaglio' }, position: 'attack', isFaceDown: false };
            // Due candidati: il primo debole, il secondo lo scudo. Si sceglie
            // il SECONDO, così un auto-pick del primo farebbe fallire il test.
            gameState.playerMonsterField[1] = { card: { ...base, attack: 300, defense: 100, uid: 'altro' }, position: 'attack', isFaceDown: false };
            gameState.playerMonsterField[2] = { card: { ...base, attack: 2000, defense: 100, uid: 'scudo' }, position: 'attack', isFaceDown: false };
            gameState.playerSTField[0] = { card: { ...cardDatabase.find((c) => c.id === 100), uid: 'armatura' }, isFaceDown: true, setOnTurn: gameState.turn - 1 };
            resolveAttack('bot', 0, 0, () => { window.__battleDone = true; });
        });
        await t.page.waitForFunction(() => document.getElementById('activateModal') && document.getElementById('activateModal').classList.contains('open'), null, { timeout: 10000 });
        await t.page.click('#activateConfirmBtn');
        await aspettaPopover();
        await t.page.waitForTimeout(ATTESA_MS);
        const ferma100 = await t.evaluate(() => ({ done: window.__battleDone, lpPlayer: gameState.playerLP, bersaglio: !!gameState.playerMonsterField[0] }));
        t.assert(!ferma100.done && ferma100.lpPlayer === 8000 && ferma100.bersaglio, `100: la battaglia aspetta la scelta fra le due clausole (${JSON.stringify(ferma100)})`);
        t.assert(await cliccaOpzione('Sposta'), '100: c\'è l\'opzione "Sposta l\'attacco"');
        await t.page.waitForFunction(() => document.getElementById('cardListPickerModal').classList.contains('open'), null, { timeout: 5000 });
        const nomiCandidati = await t.evaluate(() => document.querySelectorAll('#cardListPickerModal .card-list-item').length);
        t.assert(nomiCandidati === 2, `100: candidati = ogni mostro tranne attaccante e bersaglio attuale (${nomiCandidati})`);
        await t.page.waitForTimeout(ATTESA_MS);
        await t.evaluate(() => document.querySelectorAll('#cardListPickerModal .card-list-item')[1].click());
        await fineBattaglia();
        const esito100 = await t.evaluate(() => ({ bersaglio: !!gameState.playerMonsterField[0], altro: !!gameState.playerMonsterField[1], scudo: !!gameState.playerMonsterField[2], attaccante: !!gameState.botMonsterField[0], lpPlayer: gameState.playerLP, lpBot: gameState.botLP }));
        t.assert(esito100.bersaglio && esito100.altro && esito100.scudo && !esito100.attaccante, `100: l'attacco va sullo scudo da 2000 e l'attaccante muore (${JSON.stringify(esito100)})`);
        t.assert(esito100.lpPlayer === 8000 && esito100.lpBot === 7500, `100: danni del nuovo scontro, non del vecchio (${JSON.stringify(esito100)})`);

        // --- 852 Fuoco di Copertura: il caso con cui era stato misurato ---
        // Senza attesa il bonus arriva a battaglia finita (1000 LP persi);
        // con l'attesa e il SECONDO candidato (300 ATK, non il più forte
        // che il bot sceglierebbe) il bersaglio sale a 1300: 700 LP persi.
        await prepara();
        await t.evaluate(() => {
            const base = cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck && !DuelEngine.getDefinition(c.id));
            gameState.currentPlayer = 'bot';
            gameState.botMonsterField[0] = { card: { ...base, attack: 2000, defense: 100, uid: 'att852' }, position: 'attack', isFaceDown: false, hasAttacked: false };
            gameState.playerMonsterField[0] = { card: { ...base, attack: 1000, defense: 100, uid: 'bers852' }, position: 'attack', isFaceDown: false };
            gameState.playerMonsterField[1] = { card: { ...base, attack: 1500, defense: 100, uid: 'forte852' }, position: 'attack', isFaceDown: false };
            gameState.playerMonsterField[2] = { card: { ...base, attack: 300, defense: 100, uid: 'debole852' }, position: 'attack', isFaceDown: false };
            gameState.playerSTField[0] = { card: { ...cardDatabase.find((c) => c.id === 852), uid: 'fuoco' }, isFaceDown: true, setOnTurn: gameState.turn - 1 };
            resolveAttack('bot', 0, 0, () => { window.__battleDone = true; });
        });
        await t.page.waitForFunction(() => document.getElementById('activateModal') && document.getElementById('activateModal').classList.contains('open'), null, { timeout: 10000 });
        await t.page.click('#activateConfirmBtn');
        await t.page.waitForFunction(() => document.getElementById('cardListPickerModal').classList.contains('open'), null, { timeout: 15000 });
        await t.page.waitForTimeout(ATTESA_MS);
        const ferma852 = await t.evaluate(() => ({ done: window.__battleDone, lpPlayer: gameState.playerLP }));
        t.assert(!ferma852.done && ferma852.lpPlayer === 8000, `852: la battaglia aspetta la scelta (${JSON.stringify(ferma852)})`);
        await t.evaluate(() => document.querySelectorAll('#cardListPickerModal .card-list-item')[1].click());
        await fineBattaglia();
        const esito852 = await t.evaluate(() => gameState.playerLP);
        t.assert(esito852 === 7300, `852: bonus del mostro SCELTO applicato in tempo, 700 LP persi (${8000 - esito852})`);

        // --- 885 Quiz Inverso: la categoria la dichiara il giocatore ---
        await prepara();
        await t.evaluate(() => {
            const magia = cardDatabase.find((c) => c.type === 'spell' && !DuelEngine.getDefinition(c.id)) || cardDatabase.find((c) => c.type === 'spell');
            const mostroBase = cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck);
            gameState.phase = 'main1';
            gameState.playerLP = 1000;
            gameState.botLP = 7000;
            // Deck pieno di mostri e una sola Magia in cima: il bot (e un
            // auto-pick sulla categoria più frequente) direbbe "Mostro".
            gameState.playerDeck = [{ ...mostroBase, uid: 'd1' }, { ...mostroBase, uid: 'd2' }, { ...mostroBase, uid: 'd3' }, { ...magia, uid: 'cima' }];
            gameState.playerDeckCount = gameState.playerDeck.length;
            gameState.playerHand = [{ ...cardDatabase.find((c) => c.id === 885), uid: 'quiz' }];
            DuelEngine.activateCard('player', 'hand', 0);
        });
        await aspettaPopover();
        await t.page.waitForTimeout(1000);
        t.assert(await cliccaOpzione('Magia'), '885: c\'è l\'opzione "Magia"');
        await t.page.waitForFunction(() => !DuelEngine.isChainActive(), null, { timeout: 12000 });
        const esito885 = await t.evaluate(() => ({ lpPlayer: gameState.playerLP, lpBot: gameState.botLP }));
        t.assert(esito885.lpPlayer === 7000 && esito885.lpBot === 1000, `885: indovinato "Magia", i Life Points si scambiano (${JSON.stringify(esito885)})`);

        // --- 1120 Cacciatore: il Tipo lo dichiara il giocatore ---
        await prepara();
        const tipo = await t.evaluate(() => {
            const base = cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck && c.race === 'Drago');
            gameState.botMonsterField[0] = { card: { ...base, uid: 'drago' }, position: 'attack', isFaceDown: false };
            const cacciatore = { ...cardDatabase.find((c) => c.id === 1120), uid: 'cacciatore' };
            gameState.playerMonsterField[0] = { card: cacciatore, position: 'attack', isFaceDown: false };
            DuelEngine.getDefinition(1120).onSummon(DuelEngine.makeContext('player', { card: cacciatore, summonedVia: 'normal' }));
            return [...document.querySelectorAll('#quickPopover [data-option]')].map((b) => b.textContent.trim());
        });
        t.assert(tipo[0] && tipo[0].includes('Drago'), `1120: il Tipo che l'avversario ha in campo viene proposto per primo (${tipo.slice(0, 3)})`);
        t.assert(await cliccaOpzione('Zombie'), '1120: si può dichiarare anche un Tipo che non è in campo');
        const dichiarato = await t.evaluate(() => gameState.playerMonsterField[0].card.declaredRace);
        t.assert(dichiarato === 'Zombie', `1120: dichiarato il Tipo scelto (${dichiarato})`);

        // --- 883 Don Zaloog: il giocatore sceglie quale effetto, o nessuno ---
        await prepara();
        const zaloog = await t.evaluate(() => {
            const base = cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck);
            gameState.botHand = [{ ...base, uid: 'h1' }];
            gameState.botDeck = [{ ...base, uid: 'k1' }, { ...base, uid: 'k2' }, { ...base, uid: 'k3' }];
            gameState.botDeckCount = 3;
            const don = { ...cardDatabase.find((c) => c.id === 883), uid: 'don' };
            DuelEngine.getDefinition(883).onDealsBattleDamage(DuelEngine.makeContext('player', { card: don }));
            return !!document.getElementById('quickPopover');
        });
        t.assert(zaloog, '883: si apre la scelta fra i due effetti');
        t.assert(await cliccaOpzione('2 carte'), '883: c\'è l\'opzione del Deck');
        const esito883 = await t.evaluate(() => ({ mano: gameState.botHand.length, deck: gameState.botDeck.length, cimitero: gameState.botGraveyard.length }));
        t.assert(esito883.mano === 1 && esito883.deck === 1 && esito883.cimitero === 2, `883: mandate 2 carte dal Deck, mano intatta (${JSON.stringify(esito883)})`);

        // --- Il bot sceglie da sé, senza aprire nulla ---
        await prepara();
        const bot = await t.evaluate(() => {
            const base = cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck);
            gameState.playerHand = [{ ...base, uid: 'ph1' }];
            const don = { ...cardDatabase.find((c) => c.id === 883), uid: 'don-bot' };
            DuelEngine.getDefinition(883).onDealsBattleDamage(DuelEngine.makeContext('bot', { card: don }));
            return { popover: !!document.getElementById('quickPopover'), mano: gameState.playerHand.length };
        });
        t.assert(!bot.popover && bot.mano === 0, `Per il bot nessun popover, e preferisce lo scarto (${JSON.stringify(bot)})`);
    }
};
