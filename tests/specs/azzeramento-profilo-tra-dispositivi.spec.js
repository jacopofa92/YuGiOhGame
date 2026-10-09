// Azzeramento del profilo con DUE dispositivi dello stesso account.
//
// Il difetto: l'azzeramento cancellava la riga del cloud. Un altro
// dispositivo con i dati di prima trovava così il cloud vuoto e, alla
// riconciliazione successiva, ci rimetteva sopra il profilo appena
// azzerato — un reset che non resetta. Ora l'azzeramento lascia sul cloud un
// segno ({ azzeratoIl }) e ogni dispositivo con dati più vecchi di quel
// segno li toglie invece di caricarli, ANCHE se li ha modificati dopo
// (un telefono rimasto offline che continua a giocare col profilo vecchio).
//
// Due contesti del browser (ognuno col suo localStorage) e un cloud finto
// condiviso, come in sync-salvataggi-tra-dispositivi.spec.js.
const path = require('path');
const { creaFintoCloud } = require('../helpers/finto-cloud.js');

const RADICE = path.join(__dirname, '..', '..');
const INDEX = 'file:///' + path.join(RADICE, 'index.html').replace(/\\/g, '/');

module.exports = {
    name: 'Azzeramento del profilo: gli altri dispositivi non lo riportano in vita',
    standalone: true,
    async run({ browser, assert }) {
        const { cloud, collega } = creaFintoCloud();
        const desktop = await browser.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: 'block' });
        const telefono = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
        await collega(desktop);
        await collega(telefono);
        const rigaCloud = () => cloud.saves['utente-prova'] || null;
        const aspettaMenu = (page) => page.waitForFunction(() => {
            const m = document.getElementById('menuShell');
            return m && getComputedStyle(m).display !== 'none';
        }, null, { timeout: 20000 });
        // "Chiudere e riaprire l'app": sessionStorage vuoto, localStorage intatto.
        const riapri = async (page) => {
            await page.evaluate(() => sessionStorage.clear());
            await page.reload();
            await aspettaMenu(page);
            await page.waitForTimeout(500);
        };
        try {
            // --- Un profilo vero, presente su entrambi i dispositivi ---------
            const tel = await telefono.newPage();
            await tel.goto(INDEX);
            await tel.waitForFunction(() => !!(window.SaveManager && window.CloudSync));
            await tel.evaluate(() => { SaveManager.createNew('Vecchio'); });
            await tel.evaluate(() => AutoSync.caricaOra());
            assert(rigaCloud() && rigaCloud().data.player.name === 'Vecchio', 'il profilo di partenza è sul cloud');

            const desk = await desktop.newPage();
            await desk.goto(INDEX);
            await aspettaMenu(desk);
            assert(await desk.evaluate(() => SaveManager.load().player.name) === 'Vecchio', 'il desktop lo ha scaricato');

            // --- Il desktop azzera il profilo ---------------------------------
            await desk.evaluate(() => CloudSync.resetAccount());
            assert(await desk.evaluate(() => SaveManager.hasSave()) === false, 'il desktop non ha più il salvataggio');
            assert(rigaCloud() && !rigaCloud().data.player && !!rigaCloud().data.azzeratoIl,
                'sul cloud resta solo il segno di azzeramento: ' + JSON.stringify(rigaCloud()));

            // --- Il telefono, offline, continua col profilo vecchio ----------
            // Ha quindi una data di modifica PIÙ RECENTE dell'azzeramento, e un
            // caricamento rimasto in sospeso: proprio il caso in cui "vince il
            // più recente" da solo lo rimetterebbe sul cloud.
            await tel.waitForTimeout(20);
            await tel.evaluate(() => {
                SaveManager.addOwnedCards(1, 1);
                localStorage.setItem('ygoSyncInSospeso', '1');
            });
            await riapri(tel);
            assert(await tel.evaluate(() => SaveManager.hasSave()) === false,
                'riaprendosi il telefono toglie i dati del profilo azzerato');
            assert(rigaCloud() && !rigaCloud().data.player, 'e NON li rimette sul cloud: ' + JSON.stringify(rigaCloud()).slice(0, 120));
            const avviso = await tel.evaluate(() => document.getElementById('menuToast').textContent);
            assert(/azzerato da un altro dispositivo/.test(avviso), 'e lo dice: ' + avviso);

            // --- Il profilo nuovo creato sul telefono è quello buono ----------
            await tel.evaluate(() => { SaveManager.createNew('Nuovo'); });
            await tel.evaluate(() => AutoSync.caricaOra());
            assert(rigaCloud() && rigaCloud().data.player && rigaCloud().data.player.name === 'Nuovo',
                'il profilo nuovo arriva sul cloud: ' + JSON.stringify(rigaCloud()).slice(0, 120));
            assert(!!rigaCloud().data.azzeratoIl, 'e porta con sé la generazione dell\'azzeramento');

            await riapri(desk);
            assert(await desk.evaluate(() => SaveManager.hasSave() && SaveManager.load().player.name) === 'Nuovo',
                'il desktop riceve il profilo nuovo');
            // E il profilo nuovo NON viene scambiato per uno da togliere.
            await riapri(tel);
            assert(await tel.evaluate(() => SaveManager.hasSave() && SaveManager.load().player.name) === 'Nuovo',
                'riaprendo il telefono il profilo nuovo resta');
        } finally {
            await desktop.close();
            await telefono.close();
        }
    }
};
