// Il campo di una tappa della Storia arriva davvero nel duello.
// =====================================================================
// La Storia scrive nel catalogo il PERCORSO completo del campo
// ("images/fields/mobile/grandeGuerraCampoDiBattagliaNotte.jpg") e lo
// passa al duello così com'è; duelMonstersCore.html ci anteponeva la sua
// cartella e cercava "images/fields/images/fields/mobile/…". Nessun
// errore visibile: restava semplicemente lo sfondo di default, su ogni
// tappa della Storia con un campo suo. Segnalato dall'utente sulla Grande
// Guerra (giorno/notte).
//
// Il controllo gira su OGNI campo dichiarato dal catalogo delle Storie,
// così una tappa nuova con un campo inesistente fallisce qui invece che
// in partita.
//
// `standalone`: apre duelMonstersCore.html con un ?field= diverso ogni
// volta, non la pagina di duello già pronta della suite.
const path = require('path');
const fs = require('fs');

module.exports = {
    name: 'Storia: il campo di battaglia della tappa arriva nel duello',
    standalone: true,
    async run({ browser, assert }) {
        const RADICE = path.join(__dirname, '..', '..');
        const catalogo = fs.readFileSync(path.join(RADICE, 'js/data/story-campaigns.js'), 'utf8');
        const campi = Array.from(new Set(
            Array.from(catalogo.matchAll(/(?:field|campoDuello):\s*'([^']+)'/g)).map((m) => m[1])
        ));
        assert(campi.length > 0, 'Nessun campo trovato nel catalogo delle Storie: il test non proverebbe nulla');

        // Ogni campo deve esistere in ENTRAMBE le cartelle: la pagina
        // sceglie quella mobile sugli schermi touch.
        campi.forEach((c) => {
            const nome = c.split('/').pop();
            ['images/fields/', 'images/fields/mobile/'].forEach((dir) => {
                assert(fs.existsSync(path.join(RADICE, dir, nome)), `Campo della Storia mancante: ${dir}${nome}`);
            });
        });

        const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: 'block' });
        await context.addInitScript(() => { window.AUTH_GATE_SKIP = true; window.DUEL_FAST_OPENING = true; });
        const page = await context.newPage();
        try {
            // Il caso segnalato, scritto come lo scrive la Storia.
            const campo = 'images/fields/mobile/grandeGuerraCampoDiBattagliaNotte.jpg';
            const falliti = [];
            page.on('requestfailed', (r) => { if (/\/fields\//.test(r.url())) falliti.push(r.url()); });
            await page.goto('file:///' + RADICE.replace(/\\/g, '/') + '/duelMonstersCore.html?field=' + encodeURIComponent(campo));
            await page.waitForFunction(() => /url\(/.test(document.body.style.backgroundImage), null, { timeout: 20000 });
            const sfondo = await page.evaluate(() => document.body.style.backgroundImage);
            assert(/images\/fields\/grandeGuerraCampoDiBattagliaNotte\.jpg/.test(sfondo) && !/fields\/images/.test(sfondo),
                `Lo sfondo del duello non è il campo della tappa: ${sfondo}`);
            await page.waitForTimeout(500);
            assert(falliti.length === 0, 'Il campo non si è caricato: ' + falliti.join(', '));
        } finally {
            await context.close();
        }
    }
};
