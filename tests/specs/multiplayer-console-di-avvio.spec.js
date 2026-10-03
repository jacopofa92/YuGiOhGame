// Console di avvio "KaibaCorp System" del Multiplayer (js/multiplayer/mp-boot.js):
// compare mentre ci si collega, racconta il risveglio del server, chiude da
// sola a collegamento riuscito e resta aperta, con un pulsante, su un errore.
// Si prova il modulo direttamente (nessun server): il collegamento vero lo
// esercitano già gli spec multiplayer end-to-end, che passano da qui.
//
// `standalone`: la lobby vive su una pagina sua.
const path = require('path');

module.exports = {
    standalone: true,
    name: 'Multiplayer: console di avvio (attesa, risveglio, accesso consentito, errore)',
    async run(t) {
        const RADICE = path.join(__dirname, '..', '..');
        const page = await t.browser.newPage({ viewport: { width: 1280, height: 800 } });
        const erroriPagina = [];
        page.on('pageerror', (e) => erroriPagina.push(e.message));
        await page.addInitScript(() => { window.AUTH_GATE_SKIP = true; });
        try {
            await page.goto('file:///' + path.join(RADICE, 'multiplayer.html').replace(/\\/g, '/'));
            await page.waitForFunction(() => !!window.MpBoot, null, { timeout: 20000 });

            // Il titolo, dopo l'effetto di decodifica, torna quello vero.
            await page.waitForFunction(() => document.querySelector('.mp-title').textContent === 'Duello Multiplayer', null, { timeout: 5000 });
            const orologio = await page.evaluate(() => document.getElementById('mpSysClock').textContent);
            t.assert(/^\d\d:\d\d:\d\d$/.test(orologio), `L'orologio di sistema deve mostrare l'ora: "${orologio}"`);

            // Apertura + risveglio: compare, con l'host del nodo e la fase.
            await page.evaluate(() => { MpBoot.apri('wss://nodo-di-prova.onrender.com'); });
            await page.waitForFunction(() => /nodo-di-prova\.onrender\.com/i.test(document.querySelector('.mp-boot').textContent), null, { timeout: 5000 });
            await page.evaluate(() => { MpBoot.risveglio({ attempt: 1, remainingMs: 80000 }); });
            await page.waitForFunction(() => /STANDBY/.test(document.querySelector('.mp-boot-corpo').textContent), null, { timeout: 8000 });
            const attesa = await page.evaluate(() => ({
                visibile: !document.querySelector('.mp-boot').hidden,
                fase: document.querySelector('.mp-boot-fase').textContent.trim(),
                chiudiNascosto: document.querySelector('.mp-boot-chiudi').hidden || getComputedStyle(document.querySelector('.mp-boot-chiudi')).display === 'none'
            }));
            t.assert(attesa.visibile, 'La console deve essere visibile durante il collegamento');
            t.assert(/RISVEGLIO|COLLEGAMENTO|AVVIO/.test(attesa.fase), `Deve mostrare una fase di attesa: ${attesa.fase}`);
            t.assert(attesa.chiudiNascosto, 'Mentre si aspetta non c\'è nulla da chiudere: il pulsante Chiudi resta nascosto');

            // Collegamento riuscito: "accesso consentito", poi chiude da sola.
            const esito = await page.evaluate(async () => {
                const prima = Date.now();
                await MpBoot.connesso();
                return { ms: Date.now() - prima, visibile: !document.querySelector('.mp-boot').hidden, testo: document.querySelector('.mp-boot-corpo').textContent };
            });
            t.assert(!esito.visibile, 'A collegamento riuscito la console deve chiudersi da sola');
            t.assert(/ACCESSO CONSENTITO/.test(esito.testo), 'Prima di chiudersi deve dire "ACCESSO CONSENTITO"');

            // Errore: resta aperta, con il motivo e il pulsante Chiudi.
            await page.evaluate(() => { MpBoot.apri('wss://nodo-di-prova.onrender.com'); MpBoot.errore('Timeout'); });
            await page.waitForFunction(() => /ERRORE: TIMEOUT/.test(document.querySelector('.mp-boot-corpo').textContent), null, { timeout: 5000 });
            const errore = await page.evaluate(() => ({
                visibile: !document.querySelector('.mp-boot').hidden,
                chiudi: !document.querySelector('.mp-boot-chiudi').hidden,
                classe: document.querySelector('.mp-boot').classList.contains('mp-boot--errore')
            }));
            t.assert(errore.visibile && errore.chiudi && errore.classe, `Su un errore resta aperta con Chiudi: ${JSON.stringify(errore)}`);
            await page.click('.mp-boot-chiudi');
            t.assert(await page.evaluate(() => document.querySelector('.mp-boot').hidden), 'Chiudi deve nascondere la console');

            t.assert(erroriPagina.length === 0, 'Nessun errore JS: ' + erroriPagina.join(' | '));
        } finally {
            await page.close();
        }
    }
};
