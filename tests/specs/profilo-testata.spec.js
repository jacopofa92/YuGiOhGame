// La parte alta del Profilo (js/ui/profile-hero.js), condivisa da
// profilo.html e dalla vista Profilo del menu (index.html):
//  - c'è in ENTRAMBE le copie (le due sono già andate alla deriva in
//    passato, per questo è un componente);
//  - il nome si cambia con la matita, un tocco su un mazzo lo rende attivo;
//  - il titolo segue la regola scritta sotto (1 punto per vittoria, 15 per
//    torneo vinto, 20 per storia completata);
//  - vittorie/sconfitte non si ripetono nelle statistiche, che non usano
//    più emoji.
const path = require('path');
const RADICE = path.join(__dirname, '..', '..');

module.exports = {
    standalone: true,
    name: 'Profilo: testata condivisa, nome con la matita, mazzo con un tocco, titolo dai punti',
    async run(t) {
        const page = await t.browser.newPage({ viewport: { width: 1280, height: 900 } });
        const errori = [];
        page.on('pageerror', (e) => errori.push(e.message));
        await page.addInitScript(() => { window.AUTH_GATE_SKIP = true; window.PAGE_LOADER_SKIP = true; });
        try {
            await page.goto('file:///' + path.join(RADICE, 'profilo.html').replace(/\\/g, '/'));
            await page.waitForFunction(() => !!window.SaveManager && !!window.ProfileHero);
            await page.evaluate(() => {
                if (!SaveManager.hasSave()) SaveManager.createNew('Tester');
                const s = SaveManager.load();
                s.records = { kaiba: { wins: 6, losses: 2 } };
                s.tournamentStats = { duelistKingdom: { attempts: 1, completions: 1 } };
                s.decks = [s.decks[0], Object.assign({}, s.decks[0], { id: 'secondo-mazzo', name: 'Secondo mazzo' })];
                localStorage.setItem('yugiohDuelArenaSave', JSON.stringify(s));
            });
            await page.reload();
            await page.waitForSelector('#heroMount .phr-nome');

            const testata = await page.evaluate(() => ({
                titolo: document.querySelector('.phr-titolo').textContent,
                vinti: document.querySelector('.phr-numero--vinti strong').textContent,
                pct: document.querySelector('.phr-anello-valore').textContent,
                emoji: /[\u{1F300}-\u{1FAFF}]/u.test(document.getElementById('statsMount').textContent),
                vintiNelleStatistiche: /Duelli giocati/i.test(document.getElementById('statsMount').textContent)
            }));
            // 6 vittorie + 15 per il torneo = 21 punti: oltre i 20 di "Duellante esperto".
            t.assert(testata.titolo === 'Duellante esperto', `Titolo dai punti (21): ${testata.titolo}`);
            t.assert(testata.vinti === '6' && testata.pct === '75%', `Riepilogo: ${JSON.stringify(testata)}`);
            t.assert(!testata.emoji, 'Le statistiche non devono più usare emoji di sistema');
            t.assert(!testata.vintiNelleStatistiche, 'I duelli giocati stanno nella testata, non ripetuti nelle statistiche');

            await page.click('[data-phr="modifica"]');
            await page.fill('.phr-input', 'Seto');
            await page.click('.phr-modifica button[type="submit"]');
            await page.waitForFunction(() => document.querySelector('.phr-nome') && document.querySelector('.phr-nome').textContent === 'Seto');
            t.assert(await page.evaluate(() => SaveManager.getPlayerName()) === 'Seto', 'Il nome cambiato con la matita va nel salvataggio');

            await page.locator('.phr-mazzo').nth(1).click();
            t.assert(await page.evaluate(() => SaveManager.getActiveDeckId()) === 'secondo-mazzo', 'Un tocco su un mazzo lo rende quello attivo');

            // La stessa testata nella vista del menu.
            await page.goto('file:///' + RADICE.replace(/\\/g, '/') + '/index.html');
            await page.waitForFunction(() => typeof showView === 'function' && !!window.SaveManager, null, { timeout: 20000 });
            await page.evaluate(() => showView('profilo'));
            await page.waitForSelector('#profilo-heroMount .phr-nome', { timeout: 15000 });
            t.assert(await page.evaluate(() => document.querySelector('#profilo-heroMount .phr-nome').textContent) === 'Seto',
                'La vista Profilo del menu deve mostrare la stessa testata');
            t.assert(errori.length === 0, `Nessun errore in pagina: ${JSON.stringify(errori)}`);
        } finally {
            await page.close();
        }
    }
};
