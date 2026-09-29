const path = require('path');

module.exports = {
    standalone: true,
    name: 'Tornei: una partita in corso si può abbandonare dalla selezione',
    async run(t) {
        const radice = path.join(__dirname, '..', '..');
        const url = 'file:///' + path.join(radice, 'tornei.html').replace(/\\/g, '/');
        const page = await t.browser.newPage({ viewport: { width: 1100, height: 850 } });
        await page.addInitScript(() => { window.AUTH_GATE_SKIP = true; });
        try {
            await page.goto(url);
            await page.waitForFunction(() => !!window.SaveManager);
            await page.evaluate(() => {
                if (!SaveManager.hasSave()) SaveManager.createNew('Tester');
                SaveManager.setTournamentState('duelistKingdom', null);
                SaveManager.setTournamentState('battleCity', { phase: 'city', locators: 3, eliminated: false });
                SaveManager.setTournamentState('kaibaTournament', { round: 'quarter', eliminated: false });
                SaveManager.incrementTournamentStat('battleCity', 'attempts');
            });
            await page.reload();
            await page.waitForFunction(() => !!window.SaveManager);

            t.assert(await page.locator('#battleCityAbandon').isVisible(),
                'Il torneo in corso deve mostrare Abbandona nella schermata di selezione');
            t.assert(await page.locator('#kaibaTournamentAbandon').isVisible(),
                'Ogni torneo in corso deve avere la propria azione Abbandona');
            t.assert(!(await page.locator('#duelistKingdomAbandon').isVisible()),
                'Un torneo mai iniziato non deve mostrare Abbandona');

            await page.locator('#battleCityAbandon').click();
            t.assert(await page.locator('#abandonTournamentModal').isVisible(),
                'Abbandona deve chiedere conferma senza aprire il tabellone');
            await page.locator('#abandonTournamentConfirm').click();
            // La conferma salva prima di ricaricare. Aspettare un generico
            // load poteva agganciarsi al documento precedente già carico
            // e interrogare la pagina mentre SaveManager veniva rimosso.
            await page.waitForFunction(() => window.SaveManager
                && SaveManager.getTournamentState('battleCity') === null);
            const stato = await page.evaluate(() => ({
                battleCity: SaveManager.getTournamentState('battleCity'),
                kaiba: SaveManager.getTournamentState('kaibaTournament'),
                tentativi: SaveManager.getTournamentStats('battleCity').attempts
            }));
            t.assert(stato.battleCity === null, 'La conferma deve cancellare solo il percorso scelto');
            t.assert(stato.kaiba && stato.kaiba.round === 'quarter',
                'Abbandonare Battle City non deve toccare un altro torneo');
            t.assert(stato.tentativi > 0, 'Le statistiche storiche devono sopravvivere all’abbandono');
            t.assert(!(await page.locator('#battleCityAbandon').isVisible()),
                'Dopo l’abbandono il comando deve sparire e il torneo tornare avviabile');
        } finally {
            await page.close();
        }
    }
};
