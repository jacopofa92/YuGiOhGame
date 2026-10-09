// Salvataggio fra due dispositivi dello stesso account — il difetto
// segnalato dall'utente: "progressi su desktop, poi apro l'APK sul telefono
// e vedo dati diversi, penso vecchi".
//
// Le cause erano due, e qui si provano entrambe con DUE dispositivi veri
// (due contesti del browser, ognuno col suo localStorage) e UN cloud
// condiviso (tests/helpers/finto-cloud.js):
//   1) con la sessione già attiva il menu si apriva sul salvataggio del
//      dispositivo senza mai guardare il cloud;
//   2) il cloud veniva confrontato con la data del CARICAMENTO, non della
//      modifica: un dispositivo che caricava la sua copia vecchia la
//      rendeva "la più recente" e cancellava i progressi dell'altro.
//
// Il segno dei progressi è il numero di copie della carta 1 nella
// collezione, letto dal salvataggio grezzo (getOwnedCount risponde sempre
// "3" a un amministratore, e l'utente finto lo è).
const path = require('path');
const { creaFintoCloud } = require('../helpers/finto-cloud.js');

const RADICE = path.join(__dirname, '..', '..');
const INDEX = 'file:///' + path.join(RADICE, 'index.html').replace(/\\/g, '/');

module.exports = {
    name: 'Sync salvataggi: il telefono vede i progressi del desktop e non li cancella',
    standalone: true,
    async run({ browser, assert }) {
        const { cloud, collega } = creaFintoCloud();
        const desktop = await browser.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: 'block' });
        const telefono = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
        await collega(desktop);
        await collega(telefono);
        const copie = (page) => page.evaluate(() => { const s = SaveManager.load(); return s && s.collection ? (s.collection['1'] || 0) : null; });
        const copieNelCloud = () => {
            const riga = cloud.saves['utente-prova'];
            return riga && riga.data.collection ? (riga.data.collection['1'] || 0) : null;
        };
        const aspettaMenu = (page) => page.waitForFunction(() => {
            const m = document.getElementById('menuShell');
            return m && getComputedStyle(m).display !== 'none';
        }, null, { timeout: 20000 });
        try {
            // --- Il telefono gioca per primo, poi resta lì -------------------
            const tel = await telefono.newPage();
            await tel.goto(INDEX);
            await tel.waitForFunction(() => !!(window.SaveManager && window.CloudSync));
            await tel.evaluate(() => {
                SaveManager.createNew('Admin');
                SaveManager.addOwnedCards(1, -3);
                SaveManager.addOwnedCards(1, 1);
            });
            await tel.evaluate(() => AutoSync.caricaOra());
            assert(copieNelCloud() === 1, 'il primo salvataggio del telefono arriva sul cloud: ' + copieNelCloud());

            // --- Il desktop si collega, prende quello del cloud, gioca --------
            const desk = await desktop.newPage();
            await desk.goto(INDEX);
            await aspettaMenu(desk);
            assert(await copie(desk) === 1, 'all\'avvio il desktop (senza dati) prende il salvataggio del cloud');
            await desk.evaluate(() => { SaveManager.addOwnedCards(1, 1); });
            await desk.evaluate(() => AutoSync.caricaOra());
            assert(copieNelCloud() === 2, 'i progressi del desktop arrivano sul cloud: ' + copieNelCloud());

            // --- Il telefono si riapre con la sessione già attiva -------------
            // Prima di questa correzione si apriva sul SUO salvataggio (1
            // copia). E se aveva un caricamento rimasto in sospeso lo
            // mandava, cancellando i progressi del desktop: lo si simula.
            // Chiudere e riaprire l'app = sessione della scheda nuova:
            // sessionStorage vuoto, localStorage (salvataggio, sessione
            // dell'account) intatto.
            await tel.evaluate(() => { localStorage.setItem('ygoSyncInSospeso', '1'); sessionStorage.clear(); });
            await tel.reload();
            await aspettaMenu(tel);
            await tel.waitForTimeout(500);
            assert(await copie(tel) === 2, 'riaprendo il telefono vede i progressi del desktop: ' + await copie(tel));
            assert(copieNelCloud() === 2, 'il caricamento in sospeso del telefono NON ha cancellato i progressi del desktop: ' + copieNelCloud());
            const avviso = await tel.evaluate(() => document.getElementById('menuToast').textContent);
            assert(/più recenti dal cloud/.test(avviso), 'e lo dice: ' + avviso);

            // --- Il desktop gioca ancora; il telefono torna in primo piano ---
            await desk.evaluate(() => { SaveManager.addOwnedCards(1, 1); });
            await desk.evaluate(() => AutoSync.caricaOra());
            assert(copieNelCloud() === 3, 'nuovi progressi del desktop sul cloud');
            await tel.evaluate(() => {
                sessionStorage.setItem('ygoUltimaRiconciliazione', String(Date.now() - 10 * 60 * 1000));
                document.dispatchEvent(new Event('visibilitychange'));
            });
            await tel.waitForFunction(() => sessionStorage.getItem('ygoAvvisoSync') === null && !!window.SaveManager
                && (SaveManager.load().collection['1'] || 0) === 3, null, { timeout: 20000 });
            assert(await copie(tel) === 3, 'tornando in primo piano il telefono si aggiorna da solo');

            // --- Il telefono gioca: ora è lui il più recente -----------------
            await aspettaMenu(tel);
            await tel.evaluate(() => { SaveManager.addOwnedCards(1, -1); });
            await tel.evaluate(() => AutoSync.caricaOra());
            assert(copieNelCloud() === 2, 'una modifica vera del telefono arriva sul cloud: ' + copieNelCloud());
            await desk.evaluate(() => sessionStorage.clear());
            await desk.reload();
            await aspettaMenu(desk);
            await desk.waitForTimeout(500);
            assert(await copie(desk) === 2, 'e il desktop, riaprendosi, la riceve: ' + await copie(desk));
        } finally {
            await desktop.close();
            await telefono.close();
        }
    }
};
