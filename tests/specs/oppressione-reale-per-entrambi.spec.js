// Oppressione Reale (id 882): "UNO DEI DUE giocatori può pagare 800 Life
// Points per annullare l'Evocazione Speciale". Una volta scoperta, la può
// usare anche l'avversario di chi la controlla (`usableByEitherPlayer`,
// findTriggerCandidates in duel-engine.js). Prima ogni finestra di
// risposta guardava solo le carte di chi rispondeva.
module.exports = {
    name: 'Oppressione Reale: la usa anche l\'avversario di chi la controlla',
    async run(t) {
        const prepara = (coperta) => t.evaluate((coperta) => {
            if (typeof clearPhaseTransitionTimeout === 'function') clearPhaseTransitionTimeout();
            gameState.playerLP = 8000;
            gameState.botLP = 8000;
            gameState.gameOver = false;
            gameState.turn = 6;
            gameState.currentPlayer = 'bot';
            gameState.phase = 'main1';
            gameState.playerMonsterField = [null, null, null, null, null];
            gameState.botMonsterField = [null, null, null, null, null];
            gameState.playerSTField = [null, null, null, null, null];
            gameState.botSTField = [null, null, null, null, null];
            gameState.playerHand = [];
            gameState.chain = { links: [], active: false };
            // Oppressione Reale è del BOT.
            gameState.botSTField[0] = {
                card: { ...cardDatabase.find((c) => c.id === 882), uid: 'oppressione' },
                isFaceDown: coperta, setOnTurn: gameState.turn - 1
            };
            DuelEngine.recomputeStaticEffects();
            const base = cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck && !DuelEngine.getDefinition(c.id));
            window.__evocato = { ...base, uid: 'evocato-bot' };
            // Il BOT Special Summona: risponde il giocatore.
            DuelEngine.makeContext('bot', {}).specialSummon('bot', window.__evocato, 0, 'attack', 'hand');
        }, coperta);

        // --- Scoperta: il giocatore la usa, paga lui, distrugge il mostro ---
        await prepara(false);
        await t.page.waitForFunction(() => document.getElementById('activateModal') && document.getElementById('activateModal').classList.contains('open'), null, { timeout: 10000 });
        const testo = await t.evaluate(() => document.getElementById('activateModal').textContent);
        t.assert(testo.includes('Oppressione Reale'), `Il giocatore si vede offrire la carta del bot (${testo.slice(0, 120)})`);
        await t.page.click('#activateConfirmBtn');
        await t.page.waitForFunction(() => !DuelEngine.isChainActive(), null, { timeout: 15000 });
        const esito = await t.evaluate(() => ({
            lpPlayer: gameState.playerLP,
            lpBot: gameState.botLP,
            mostroVivo: gameState.botMonsterField.some((s) => s && s.card.uid === 'evocato-bot'),
            cartaAlBot: !!(gameState.botSTField[0] && gameState.botSTField[0].card.uid === 'oppressione' && !gameState.botSTField[0].isFaceDown)
        }));
        t.assert(esito.lpPlayer === 7200 && esito.lpBot === 8000, `Paga chi risponde, non chi la controlla (${JSON.stringify(esito)})`);
        t.assert(!esito.mostroVivo, `Il mostro Special Summonato dal bot viene distrutto (${JSON.stringify(esito)})`);
        t.assert(esito.cartaAlBot, `La carta resta scoperta sul Terreno del bot: è Continua e non viene consumata (${JSON.stringify(esito)})`);

        // --- Coperta: è del bot, il giocatore non può usarla ---
        await prepara(true);
        await t.page.waitForTimeout(3500);
        const coperta = await t.evaluate(() => ({
            modale: !!(document.getElementById('activateModal') && document.getElementById('activateModal').classList.contains('open')),
            mostroVivo: gameState.botMonsterField.some((s) => s && s.card.uid === 'evocato-bot'),
            lpPlayer: gameState.playerLP
        }));
        t.assert(!coperta.modale && coperta.mostroVivo && coperta.lpPlayer === 8000, `Coperta non viene offerta al giocatore (${JSON.stringify(coperta)})`);
    }
};
