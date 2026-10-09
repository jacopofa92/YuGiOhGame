// Le carte personalizzate arrivano sul cloud dalla STESSA coda del
// salvataggio (js/cloud/auto-sync.js).
//
// Prima esisteva un secondo meccanismo, cloud-autosync.js, con un suo timer
// e una sua coda, caricato solo da crea-carta.html: le due code mandavano
// il salvataggio ciascuna per conto suo. Qui si prova che, con una coda
// sola, una carta creata su un dispositivo:
//   - lascia un segno "carte da caricare" che sopravvive alla chiusura;
//   - arriva sul cloud col caricamento normale;
//   - arriva sull'altro dispositivo quando scarica il profilo.
// Due contesti del browser e un cloud finto condiviso, come negli altri
// spec del sync.
const path = require('path');
const { creaFintoCloud } = require('../helpers/finto-cloud.js');

const RADICE = path.join(__dirname, '..', '..');
const INDEX = 'file:///' + path.join(RADICE, 'index.html').replace(/\\/g, '/');

module.exports = {
    name: 'Sync carte personalizzate: una coda sola, la carta arriva sull\'altro dispositivo',
    standalone: true,
    async run({ browser, assert }) {
        const { cloud, collega } = creaFintoCloud();
        const desktop = await browser.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: 'block' });
        const telefono = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
        await collega(desktop);
        await collega(telefono);
        const carteNelCloud = () => (cloud.custom_cards['utente-prova'] || []).map((c) => c.name);
        const aspettaMenu = (page) => page.waitForFunction(() => {
            const m = document.getElementById('menuShell');
            return m && getComputedStyle(m).display !== 'none';
        }, null, { timeout: 20000 });
        try {
            const tel = await telefono.newPage();
            await tel.goto(INDEX);
            await tel.waitForFunction(() => !!(window.SaveManager && window.CloudSync && window.CustomCards && window.AutoSync));
            await tel.evaluate(() => { SaveManager.createNew('Admin'); });
            await tel.evaluate(() => AutoSync.caricaOra());

            // --- Una carta nuova: segno in sospeso, poi sul cloud -------------
            const segno = await tel.evaluate(() => {
                const r = CustomCards.add({ name: 'Drago di Prova', type: 'monster', attack: 1000, defense: 1000, level: 4 });
                return { ok: r.success, segno: localStorage.getItem('ygoSyncCarteInSospeso') };
            });
            assert(segno.ok, 'la carta di prova si crea');
            assert(segno.segno === '1', 'creare una carta lascia il segno "carte da caricare": ' + segno.segno);
            assert(carteNelCloud().length === 0, 'il caricamento aspetta il suo turno (nessuna richiesta immediata)');

            await tel.evaluate(() => AutoSync.caricaOra());
            assert(carteNelCloud().includes('Drago di Prova'), 'la carta arriva sul cloud: ' + JSON.stringify(carteNelCloud()));
            assert(await tel.evaluate(() => localStorage.getItem('ygoSyncCarteInSospeso')) === null,
                'e il segno si toglie a caricamento riuscito');

            // --- Un caricamento senza carte cambiate non le tocca -------------
            const richiestePrima = cloud.richieste.filter((r) => r === 'custom_cards:delete').length;
            await tel.evaluate(() => { SaveManager.addOwnedCards(1, 1); });
            await tel.evaluate(() => AutoSync.caricaOra());
            const richiesteDopo = cloud.richieste.filter((r) => r === 'custom_cards:delete').length;
            assert(richiesteDopo === richiestePrima, 'cambiando solo il salvataggio, le carte non si ricaricano');

            // --- L'altro dispositivo la riceve col profilo --------------------
            const desk = await desktop.newPage();
            await desk.goto(INDEX);
            await aspettaMenu(desk);
            const nomi = await desk.evaluate(() => CustomCards.list().map((c) => c.name));
            assert(nomi.includes('Drago di Prova'), 'il desktop riceve la carta creata sul telefono: ' + JSON.stringify(nomi));
        } finally {
            await desktop.close();
            await telefono.close();
        }
    }
};
