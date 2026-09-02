// Le carte personalizzate (crea-carta.html) hanno nome/effetto testo
// libero scelto dall'utente. Se quel testo finisce in innerHTML senza
// escape, un nome tipo "<img src=x onerror=...>" verrebbe eseguito come
// HTML vero — XSS memorizzato, rilevante anche in multiplayor (js/multiplayer/)
// dove un giocatore vede le carte scelte dall'altro. Vedi il punto 3
// dell'audit architetturale: escapeHtml() (game-flow.js) e i suoi punti
// di uso in updateCardInfoPanel/i popover di mano in actions.js.
module.exports = {
    name: 'Nome/effetto di una carta con markup HTML non vengono eseguiti (XSS)',
    async run(t) {
        const result = await t.evaluate(() => {
            const payload = '<img src=x onerror="window.__xssFired = true">';
            window.__xssFired = false;

            updateCardInfoPanel(
                { id: 90401, name: payload, type: 'monster', effect: payload, attack: 100, defense: 100 },
                { sourceType: 'hand', sourceOwner: 'player' }
            );
            const nameEl = document.querySelector('.card-info-name');

            return {
                escapeHtmlEscapes: escapeHtml('<b>x</b>') === '&lt;b&gt;x&lt;/b&gt;',
                panelXssFired: window.__xssFired === true,
                panelShowsRawTagAsText: !!nameEl && nameEl.textContent.includes('<img'),
            };
        });

        t.assert(result.escapeHtmlEscapes, 'escapeHtml() deve trasformare < e > in entità HTML');
        t.assert(!result.panelXssFired, 'Un nome carta con <img onerror=...> non deve eseguirsi quando il pannello descrizione lo mostra');
        t.assert(result.panelShowsRawTagAsText, 'Il pannello descrizione deve mostrare il tag come testo letterale, non interpretarlo come markup');
    }
};
