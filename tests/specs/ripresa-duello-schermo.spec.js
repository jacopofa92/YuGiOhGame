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

        // Un duello offline non deve limitarsi a ridisegnarsi: i timer di
        // regola scaduti in background restano congelati finche' la persona
        // non preme esplicitamente Riprendi.
        await t.evaluate(() => {
            window.__timerDellaPausa = 0;
            sospendiDuelloPerLifecycle();
            PausaDuello.dopo(() => { window.__timerDellaPausa++; }, 20);
        });
        await t.page.waitForTimeout(100);
        const inPausa = await t.evaluate(() => ({
            pausa: PausaDuello.inPausa(),
            timer: window.__timerDellaPausa,
            classe: document.documentElement.classList.contains('duel-paused'),
            overlay: getComputedStyle(document.getElementById('duelPauseOverlay')).display,
            testo: document.querySelector('.duel-pause-resume')?.textContent
        }));
        t.assert(inPausa.pausa && inPausa.timer === 0 && inPausa.classe
            && inPausa.overlay === 'grid' && /Riprendi/.test(inPausa.testo || ''),
        `Background offline deve congelare regole e mostrare la ripresa: ${JSON.stringify(inPausa)}`);

        await t.page.click('.duel-pause-resume');
        await t.page.waitForTimeout(80);
        const ripartito = await t.evaluate(() => ({
            pausa: PausaDuello.inPausa(),
            timer: window.__timerDellaPausa,
            classe: document.documentElement.classList.contains('duel-paused')
        }));
        t.assert(!ripartito.pausa && ripartito.timer === 1 && !ripartito.classe,
            `Il timer deve ripartire una volta sola dopo il click: ${JSON.stringify(ripartito)}`);

        // Nel Multiplayer un solo client non puo' congelare il motore a passo
        // comune. Il lifecycle locale deve quindi lasciare tutto invariato.
        const multiplayer = await t.evaluate(() => {
            const attivoOriginale = PassoComune.attivo;
            PassoComune.attivo = () => true;
            sospendiDuelloPerLifecycle();
            const risultato = {
                pausa: PausaDuello.inPausa(),
                classe: document.documentElement.classList.contains('duel-paused')
            };
            PassoComune.attivo = attivoOriginale;
            return risultato;
        });
        t.assert(!multiplayer.pausa && !multiplayer.classe,
            `Il Multiplayer deve rimanere invariato: ${JSON.stringify(multiplayer)}`);
    }
};
