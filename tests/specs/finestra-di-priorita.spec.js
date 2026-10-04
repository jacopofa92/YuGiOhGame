// Finestra di priorità "a vuoto" (DuelEngine.openPriorityWindow,
// duel-engine.js): nei tre momenti del turno avversario (Standby, inizio
// Battle Phase, fine turno) chi NON è di turno può usare un Effetto Veloce
// anche se nessuno ha attivato nulla. Prima un Effetto Veloce partiva solo in
// risposta a una Catena già aperta: Ninja d'Assalto (459), l'Effetto Veloce
// della Spada Sigillante di Orichalcos (396) e l'Amuleto di Shabti (1059)
// restavano inutilizzabili in un turno avversario in cui non succedeva niente.
//
// Cosa si controlla:
// - senza candidati il turno prosegue SUBITO, in modo sincrono (nessun
//   ritardo aggiunto a un duello normale);
// - il giocatore riceve la domanda, e un rifiuto non si ripropone nello
//   stesso turno;
// - il bot usa un Effetto Veloce solo se lo dichiara utile in quel momento
//   (botInFinestraDiPriorita), e la finestra passa davvero da enterBattlePhase;
// - un mostro che usa il suo Effetto Veloce risulta "già usato in questo
//   turno" anche quando lo usa in risposta a una Catena;
// - la Spada, cliccata nel proprio turno, fa scegliere fra le sue due abilità.
module.exports = {
    name: 'Finestra di priorità per gli Effetti Veloci (396, 459, 1059)',
    async run(t) {
        const prepara = (turno) => t.evaluate((turno) => {
            if (typeof clearPhaseTransitionTimeout === 'function') clearPhaseTransitionTimeout();
            gameState.playerLP = 8000;
            gameState.botLP = 8000;
            gameState.gameOver = false;
            gameState.turn = turno;
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
            gameState.usedIgnitionThisTurn = {};
            gameState.monsterEffectsNegatedUidsFor = { player: new Set(), bot: new Set() };
            gameState.orichalcosExtendedNegationUidsFor = { player: new Set(), bot: new Set() };
            gameState.chain = { links: [], active: false };
            gameState.phase = 'main1';
            if (typeof closeQuickPopover === 'function') closeQuickPopover();
            DuelEngine.recomputeStaticEffects();
        }, turno);
        const modaleAperto = () => t.page.waitForFunction(() => document.getElementById('activateModal').classList.contains('open'), null, { timeout: 20000 });
        const pickerAperto = () => t.page.waitForFunction(() => document.getElementById('cardListPickerModal').classList.contains('open'), null, { timeout: 20000 });
        const finestraChiusa = () => t.page.waitForFunction(() => window.__prioritaFatta === true && !DuelEngine.isPriorityWindowOpen() && !DuelEngine.isChainActive(), null, { timeout: 25000 });
        const apri = (chi, momento) => t.evaluate(({ chi, momento }) => {
            window.__prioritaFatta = false;
            DuelEngine.openPriorityWindow(chi, momento, () => { window.__prioritaFatta = true; });
            return { fatta: window.__prioritaFatta, aperta: DuelEngine.isPriorityWindowOpen() };
        }, { chi, momento });
        const mettiNinja = (lato) => t.evaluate((lato) => {
            const oscurita = cardDatabase.find((c) => c.type === 'monster' && c.attribute === 'OSCURITÀ' && !c.extraDeck && !DuelEngine.getDefinition(c.id));
            gameState[lato + 'MonsterField'][0] = { card: { ...cardDatabase.find((c) => c.id === 459), uid: 'ninja-' + lato }, position: 'attack', isFaceDown: false };
            gameState[lato + 'Graveyard'] = [{ ...oscurita, uid: 'osc1-' + lato }, { ...oscurita, uid: 'osc2-' + lato }];
        }, lato);

        // --- 1) Nessun candidato: il turno prosegue subito, senza aspettare ---
        await prepara(10);
        const vuota = await apri('player', 'end');
        t.assert(vuota.fatta && !vuota.aperta, `Senza Effetti Veloci la finestra chiude subito e in modo sincrono (${JSON.stringify(vuota)})`);

        // --- 2) Ninja d'Assalto del giocatore nel turno del bot ---
        await prepara(11);
        await t.evaluate(() => { gameState.currentPlayer = 'bot'; });
        await mettiNinja('player');
        const ninja = await apri('player', 'end');
        t.assert(!ninja.fatta && ninja.aperta, `Con un Effetto Veloce disponibile la finestra resta aperta (${JSON.stringify(ninja)})`);
        await modaleAperto();
        const titolo = await t.evaluate(() => document.getElementById('activateModalTitle') ? document.getElementById('activateModalTitle').textContent : document.querySelector('#activateModal').textContent);
        t.assert(titolo.includes('Effetto Veloce'), `Il prompt dice che è un Effetto Veloce (${titolo.slice(0, 80)})`);
        await t.page.click('#activateCancelBtn');
        await finestraChiusa();
        const rifiuto = await apri('player', 'end');
        t.assert(rifiuto.fatta && !rifiuto.aperta, `Un rifiuto non si ripropone nello stesso turno (${JSON.stringify(rifiuto)})`);
        const ninjaAncora = await t.evaluate(() => !!gameState.playerMonsterField[0]);
        t.assert(ninjaAncora, 'Rifiutando, Ninja resta in campo');

        // Turno dopo: la domanda torna, e confermando il Ninja si bandisce.
        await t.evaluate(() => { gameState.turn = 12; });
        await apri('player', 'standby');
        await modaleAperto();
        await t.page.click('#activateConfirmBtn');
        await finestraChiusa();
        const usato = await t.evaluate(() => ({
            campo: !!gameState.playerMonsterField[0],
            cimitero: gameState.playerGraveyard.length,
            segnato: !!(gameState.usedIgnitionThisTurn && gameState.usedIgnitionThisTurn['ninja-player'])
        }));
        t.assert(!usato.campo && usato.cimitero === 0, `Confermando, Ninja bandisce 2 OSCURITÀ e si bandisce (${JSON.stringify(usato)})`);
        t.assert(usato.segnato, 'Ninja risulta già usato in questo turno');

        // --- 3) Il bot non brucia Ninja d'Assalto a vuoto ---
        await prepara(13);
        await t.evaluate(() => { gameState.currentPlayer = 'player'; });
        await mettiNinja('bot');
        const botNinja = await apri('bot', 'battle');
        const botNinjaCampo = await t.evaluate(() => !!gameState.botMonsterField[0]);
        t.assert(botNinja.fatta && !botNinja.aperta && botNinjaCampo, `Il bot non usa Ninja in una finestra a vuoto (${JSON.stringify(botNinja)})`);

        // --- 4) Il bot usa la Spada all'inizio della TUA Battle Phase ---
        // Passa dal vero enterBattlePhase, non da una chiamata diretta.
        await prepara(14);
        await t.evaluate(() => {
            const base = cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck && !DuelEngine.getDefinition(c.id));
            const effetto = cardDatabase.find((c) => c.type === 'monster' && c.subtype === 'effect' && !c.extraDeck);
            gameState.currentPlayer = 'player';
            gameState.botMonsterField[0] = { card: { ...effetto, uid: 'bot-equip' }, position: 'attack', isFaceDown: false };
            gameState.botSTField[0] = { card: { ...cardDatabase.find((c) => c.id === 396), uid: 'spada-bot', equippedToOwner: 'bot', equippedToIndex: 0, equippedToUid: 'bot-equip' }, isFaceDown: false };
            gameState.botHand = [{ ...base, uid: 'costo-bot' }];
            gameState.playerMonsterField[0] = { card: { ...base, attack: 2600, defense: 2000, uid: 'forte-player' }, position: 'attack', isFaceDown: false, hasAttacked: false };
            DuelEngine.recomputeStaticEffects();
            window.__prioritaFatta = false;
            enterBattlePhase();
        });
        // enterBattlePhase passa updateUI come onDone: si aspetta la fine
        // della Catena e la chiusura della finestra.
        await t.page.waitForFunction(() => !DuelEngine.isPriorityWindowOpen() && !DuelEngine.isChainActive(), null, { timeout: 25000 });
        const spadaBot = await t.evaluate(() => ({
            forteVivo: !!gameState.playerMonsterField[0],
            costo: gameState.botGraveyard.some((c) => c.uid === 'costo-bot'),
            fase: gameState.phase
        }));
        t.assert(!spadaBot.forteVivo && spadaBot.costo, `Il bot scarta e distrugge il tuo mostro all'inizio della Battle Phase (${JSON.stringify(spadaBot)})`);
        t.assert(spadaBot.fase === 'battle', `Resta la Battle Phase (${spadaBot.fase})`);

        // --- 5) Il giocatore usa la Spada a fine turno del bot, scegliendo tutto ---
        await prepara(15);
        await t.evaluate(() => {
            const base = cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck && !DuelEngine.getDefinition(c.id));
            const effetto = cardDatabase.find((c) => c.type === 'monster' && c.subtype === 'effect' && !c.extraDeck);
            gameState.currentPlayer = 'bot';
            gameState.playerMonsterField[0] = { card: { ...effetto, uid: 'pl-equip' }, position: 'attack', isFaceDown: false };
            gameState.playerSTField[0] = { card: { ...cardDatabase.find((c) => c.id === 396), uid: 'spada-pl', equippedToOwner: 'player', equippedToIndex: 0, equippedToUid: 'pl-equip' }, isFaceDown: false };
            gameState.playerHand = [{ ...base, uid: 'tieni' }, { ...base, uid: 'scarta' }];
            gameState.botMonsterField[0] = { card: { ...base, uid: 'bot-primo' }, position: 'attack', isFaceDown: false };
            gameState.botMonsterField[1] = { card: { ...base, uid: 'bot-secondo' }, position: 'attack', isFaceDown: false };
            DuelEngine.recomputeStaticEffects();
        });
        await apri('player', 'end');
        await modaleAperto();
        await t.page.click('#activateConfirmBtn');
        // Prima lo scarto (il SECONDO, così un auto-pick della prima carta
        // farebbe fallire il test), poi il bersaglio (il SECONDO mostro).
        await pickerAperto();
        await t.evaluate(() => document.querySelectorAll('#cardListPickerModal .card-list-item')[1].click());
        await t.page.waitForFunction(() => {
            const m = document.getElementById('cardListPickerModal');
            return m.classList.contains('open') && /distruggere/.test(document.getElementById('cardListPickerText').textContent);
        }, null, { timeout: 20000 });
        await t.evaluate(() => document.querySelectorAll('#cardListPickerModal .card-list-item')[1].click());
        await finestraChiusa();
        const spadaPl = await t.evaluate(() => ({
            mano: gameState.playerHand.map((c) => c.uid),
            primo: !!gameState.botMonsterField[0],
            secondo: !!gameState.botMonsterField[1]
        }));
        t.assert(spadaPl.mano.length === 1 && spadaPl.mano[0] === 'tieni', `Scartata la carta scelta (${spadaPl.mano})`);
        t.assert(spadaPl.primo && !spadaPl.secondo, `Distrutto il mostro scelto, non il primo (${JSON.stringify(spadaPl)})`);

        // --- 6) Ninja in risposta a una Catena: risulta già usato ---
        await prepara(16);
        await t.evaluate(() => {
            gameState.currentPlayer = 'bot';
            CardEffects.register(90459, { canActivate() { return true; }, activate() {} });
            gameState.botHand = [{ id: 90459, uid: 'finta-bot', name: 'Magia finta', type: 'spell', subtype: 'normal' }];
        });
        await mettiNinja('player');
        await t.evaluate(() => DuelEngine.activateCard('bot', 'hand', 0));
        await modaleAperto();
        await t.page.click('#activateConfirmBtn');
        await t.page.waitForFunction(() => !DuelEngine.isChainActive(), null, { timeout: 25000 });
        const risposta = await t.evaluate(() => ({
            campo: !!gameState.playerMonsterField[0],
            segnato: !!(gameState.usedIgnitionThisTurn && gameState.usedIgnitionThisTurn['ninja-player'])
        }));
        t.assert(!risposta.campo && risposta.segnato, `Ninja usato in risposta risulta già usato nel turno (${JSON.stringify(risposta)})`);

        // --- 7) La Spada cliccata nel proprio turno: scegli quale abilità ---
        await prepara(17);
        await t.evaluate(() => {
            const base = cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck && !DuelEngine.getDefinition(c.id));
            const effetti = cardDatabase.filter((c) => c.type === 'monster' && c.subtype === 'effect' && !c.extraDeck);
            gameState.currentPlayer = 'player';
            gameState.playerMonsterField[0] = { card: { ...effetti[0], uid: 'eq-a' }, position: 'attack', isFaceDown: false };
            gameState.playerMonsterField[1] = { card: { ...effetti[1], uid: 'eq-b' }, position: 'attack', isFaceDown: false };
            gameState.playerSTField[0] = { card: { ...cardDatabase.find((c) => c.id === 396), uid: 'spada-click', equippedToOwner: 'player', equippedToIndex: 0, equippedToUid: 'eq-a' }, isFaceDown: false };
            gameState.playerFieldSpell = { card: { ...cardDatabase.find((c) => c.type === 'spell' && c.subtype === 'field'), uid: 'terreno' }, isFaceDown: false };
            gameState.playerHand = [{ ...base, uid: 'costo-click' }];
            gameState.botMonsterField[0] = { card: { ...base, uid: 'bersaglio-click' }, position: 'attack', isFaceDown: false };
            DuelEngine.recomputeStaticEffects();
            DuelEngine.activateCard('player', 'st', 0);
        });
        await t.page.waitForFunction(() => !!document.getElementById('quickPopover'), null, { timeout: 10000 });
        const voci = await t.evaluate(() => [...document.querySelectorAll('#quickPopover [data-option]')].map((b) => b.textContent.trim()));
        t.assert(voci.length === 2 && voci.some((v) => v.includes('Estendi')) && voci.some((v) => v.includes('Scarta')), `Due abilità fra cui scegliere (${voci})`);
        await t.evaluate(() => [...document.querySelectorAll('#quickPopover [data-option]')].find((b) => b.textContent.includes('Scarta')).click());
        await pickerAperto();
        await t.evaluate(() => document.querySelectorAll('#cardListPickerModal .card-list-item')[0].click());
        await t.page.waitForFunction(() => !DuelEngine.isChainActive(), null, { timeout: 25000 });
        const click = await t.evaluate(() => ({
            bersaglio: !!gameState.botMonsterField[0],
            mano: gameState.playerHand.length,
            estesa: gameState.orichalcosExtendedNegationUidsFor.player.size
        }));
        t.assert(!click.bersaglio && click.mano === 0 && click.estesa === 0, `Scelto l'Effetto Veloce: scarto e distruzione, nessuna estensione (${JSON.stringify(click)})`);

        // --- 8) Il bot scarta l'Amuleto di Shabti all'inizio della TUA Battle Phase ---
        await prepara(18);
        const shabti = await t.evaluate(() => {
            const guardiano = cardDatabase.find((c) => c.type === 'monster' && /Guardian[io] della Tomba/.test(c.name) && !c.extraDeck);
            gameState.currentPlayer = 'player';
            gameState.botMonsterField[0] = { card: { ...guardiano, uid: 'guardiano' }, position: 'attack', isFaceDown: false };
            gameState.botHand = [{ ...cardDatabase.find((c) => c.id === 1059), uid: 'shabti' }];
            gameState.battleProtectionByName = [];
            enterBattlePhase();
            return guardiano && guardiano.name;
        });
        await t.page.waitForFunction(() => !DuelEngine.isPriorityWindowOpen() && !DuelEngine.isChainActive(), null, { timeout: 25000 });
        const esitoShabti = await t.evaluate(() => ({
            mano: gameState.botHand.length,
            cimitero: gameState.botGraveyard.some((c) => c.uid === 'shabti'),
            protezione: (gameState.battleProtectionByName || []).some((p) => p.owner === 'bot' && p.turn === gameState.turn)
        }));
        t.assert(esitoShabti.mano === 0 && esitoShabti.cimitero && esitoShabti.protezione, `Il bot protegge ${shabti} scartando l'Amuleto (${JSON.stringify(esitoShabti)})`);
    }
};
