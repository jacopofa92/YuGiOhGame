// 1) La selezione dei Tributi si può ANNULLARE (pulsante e Esc): la carta
//    resta in mano, nessun mostro viene sacrificato, la modalità sparisce.
// 2) Il bot non va avanti (attacchi, catene) finché il giocatore ha un
//    modale aperto: waitForNoBlockingModal si risolve solo a modale chiuso.
module.exports = {
    name: 'Tributi: Annulla/Esc; il bot aspetta se un modale è aperto',
    async run(t) {
        const { page, assert } = t;
        await page.waitForTimeout(800);

        const prep = await page.evaluate(() => {
            const carta = { id: 1, uid: 'tribTest', name: 'Test', type: 'monster', level: 5, attack: 2000, defense: 1000 };
            gameState.playerMonsterField[0] = { card: { id: 2, uid: 'm0', name: 'M0', type: 'monster', level: 3, attack: 1000, defense: 1000 }, position: 'attack', isFaceDown: false };
            gameState.playerHand.push(carta);
            startTributeSelection(carta, gameState.playerHand.length - 1, 1, null);
            return {
                modo: document.body.classList.contains('tribute-mode'),
                banda: document.getElementById('tributePrompt').classList.contains('show'),
                haAnnulla: !!document.getElementById('tributePromptCancel')
            };
        });
        assert(prep.modo && prep.banda && prep.haAnnulla, `Modalità Tributo evidente con pulsante Annulla: ${JSON.stringify(prep)}`);

        await page.click('#tributePromptCancel');
        const dopoBtn = await page.evaluate(() => ({
            pending: !!gameState.pendingTributeSummon,
            modo: document.body.classList.contains('tribute-mode'),
            inMano: gameState.playerHand.some((c) => c.uid === 'tribTest'),
            mostro: !!gameState.playerMonsterField[0]
        }));
        assert(!dopoBtn.pending && !dopoBtn.modo && dopoBtn.inMano && dopoBtn.mostro, `Annulla deve lasciare tutto com'era: ${JSON.stringify(dopoBtn)}`);

        const dopoEsc = await page.evaluate(() => {
            const carta = gameState.playerHand.find((c) => c.uid === 'tribTest');
            startTributeSelection(carta, gameState.playerHand.indexOf(carta), 1, null);
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
            return { pending: !!gameState.pendingTributeSummon, modo: document.body.classList.contains('tribute-mode') };
        });
        assert(!dopoEsc.pending && !dopoEsc.modo, `Esc deve annullare: ${JSON.stringify(dopoEsc)}`);

        // Il bot aspetta con un modale aperto.
        const attesa = await page.evaluate(async () => {
            document.getElementById('activateModal').classList.add('open');
            let risolta = false;
            waitForNoBlockingModal().then(() => { risolta = true; });
            await new Promise((r) => setTimeout(r, 600));
            const mentreAperto = risolta;
            document.getElementById('activateModal').classList.remove('open');
            await new Promise((r) => setTimeout(r, 600));
            return { mentreAperto, dopoChiuso: risolta };
        });
        assert(!attesa.mentreAperto && attesa.dopoChiuso, `Il bot deve aspettare finché il modale è aperto: ${JSON.stringify(attesa)}`);
    }
};
