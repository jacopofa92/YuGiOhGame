// Spegnere/riaccendere lo schermo puo' congelare la WebView e farle perdere
// il layer grafico di un modale, lasciando pero' viva nel motore la relativa
// decisione. Al pageshow la stessa richiesta deve essere riproposta.
module.exports = {
    name: 'Duello mobile: una scelta persa torna visibile dopo la sospensione',
    async run(t) {
        const prima = await t.evaluate(() => {
            gameState.phase = 'battle';
            gameState.currentPlayer = 'player';
            window.__resumeChoice = 'attesa';
            const carta = gameState.playerHand[0] || cardDatabase[0];
            Decisioni.chiedi({
                chi: 'player', tipo: 'risposta', candidati: [{ card: carta }],
                momento: 'all\'inizio della Battle Phase', automatica: () => null
            }, (scelta) => { window.__resumeChoice = scelta ? 'carta' : 'passa'; });
            const modal = document.getElementById('activateModal');
            const aperto = modal.classList.contains('open');
            modal.classList.remove('open');
            window.dispatchEvent(new Event('pageshow'));
            return { aperto, sospesa: !!Decisioni.inSospeso(), riaperto: modal.classList.contains('open') };
        });
        t.assert(prima.aperto && prima.sospesa && prima.riaperto,
            `La scelta di Battle Phase deve essere realmente in attesa: ${JSON.stringify(prima)}`);
        const ripresa = await t.evaluate(() => ({
            fase: gameState.phase,
            sospesa: !!Decisioni.inSospeso(),
            modale: document.getElementById('activateModal').classList.contains('open')
        }));
        t.assert(ripresa.fase === 'battle' && ripresa.sospesa && ripresa.modale,
            `Al ritorno la stessa scelta deve riapparire senza cambiare fase: ${JSON.stringify(ripresa)}`);

        await t.page.click('#activateCancelBtn');
        const chiusa = await t.evaluate(() => ({
            esito: window.__resumeChoice,
            sospesa: !!Decisioni.inSospeso()
        }));
        t.assert(chiusa.esito === 'passa' && !chiusa.sospesa,
            `Dopo la risposta il duello deve tornare utilizzabile: ${JSON.stringify(chiusa)}`);
    }
};
