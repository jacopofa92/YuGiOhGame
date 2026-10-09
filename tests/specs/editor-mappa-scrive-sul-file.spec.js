// L'Editor Mappa salva DAVVERO sul disco: nel file dei ritocchi.
// =====================================================================
// Richiesta dell'utente ("non posso modificare i file fisicamente: non
// c'è un workaround?"): le modifiche dell'editor vivono in
// js/data/story-ritocchi.js, riscritto per intero a ogni modifica, e
// js/story/story-ritocchi.js le applica al catalogo in ogni pagina.
//
// Tre parti:
//   1) andata e ritorno: un catalogo modificato in tutti i modi che
//      l'editor conosce -> differenze -> riapplicate all'originale ->
//      identico. È la garanzia che il file dica esattamente ciò che si è
//      fatto, né più né meno;
//   2) il testo del file generato si rilegge (in Node, come farebbe il
//      browser) e dà gli stessi ritocchi;
//   3) l'editor vero, con un file finto (il picker nativo non si pilota
//      da un browser senza finestra): personaggio dalla griglia, musica
//      dall'elenco, una battuta di dialogo, Salva -> il file contiene i
//      ritocchi giusti.
const path = require('path');
const vm = require('vm');

function leggiRitocchi(testo) {
    const sandbox = { window: {} };
    vm.createContext(sandbox);
    vm.runInContext(testo, sandbox);
    return sandbox.window.storyRitocchi;
}

module.exports = {
    name: 'Editor Mappa: le modifiche si salvano nel file dei ritocchi e si riapplicano identiche',
    standalone: true,
    async run({ browser, assert }) {
        const RADICE = path.join(__dirname, '..', '..');
        const url = (q) => 'file:///' + RADICE.replace(/\\/g, '/') + '/storia.html' + q;
        const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' });
        await context.addInitScript(() => { window.AUTH_GATE_SKIP = true; });
        // CloudSync.isAdmin finto, riapplicato a ogni navigazione nel
        // momento stesso in cui cloud-sync.js crea CloudSync (vedi
        // editor-mappa-storia-admin.spec.js per il perché).
        await context.addInitScript(() => {
            let reale;
            Object.defineProperty(window, 'CloudSync', {
                configurable: true,
                get: () => reale,
                set: (v) => { reale = v; if (v) v.isAdmin = () => true; }
            });
        });
        const page = await context.newPage();
        const erroriPagina = [];
        page.on('pageerror', (e) => erroriPagina.push(e.message));

        try {
            await page.goto(url('?campaign=anime'));
            await page.waitForFunction(() => !!(window.StoryRitocchi && window.StoryMapEditor), null, { timeout: 20000 });

            // --- 1) Andata e ritorno ------------------------------------
            const giro = await page.evaluate(() => {
                const R = window.StoryRitocchi;
                const vuoto = R.differenze(R.originale(), R.originale());
                const mod = R.originale();
                const anime = mod.find((c) => c.id === 'anime');
                const cap0 = anime.capitoli[0];
                const prologo = cap0.tappe.find((t) => t.id === 'anime-area-prologo');
                const nonno = prologo.tappe.find((t) => t.id === 'anime-1-nonno') || prologo.tappe[1];
                // proprietà cambiate, aggiunte e tolte
                nonno.x += 37;
                nonno.field = 'images/fields/mobile/citta.jpg';
                nonno.testo = [{ chi: 'yugiMuto', testo: 'Battuta nuova.' }, 'Riga semplice.'];
                delete nonno.icona;
                // una tappa nuova dentro un'area esistente
                prologo.tappe.splice(1, 0, { id: 'test-ritocco-duello', kind: 'duel', label: 'Prova', x: 10, y: 20,
                    characterId: 'joey', dialogo: [{ io: true, testo: 'Pronto?' }, { chi: 'joey', testo: 'Sempre!' }] });
                // un'area nuova, con una tappa dentro
                cap0.tappe.push({ id: 'test-ritocco-area', kind: 'area', label: 'Area di prova', x: 5, y: 6,
                    mappa: { sfondo: [], larghezza: 1400, altezza: 900 },
                    tappe: [{ id: 'test-ritocco-scena', kind: 'scene', label: 'Scena', x: 1, y: 2, testo: ['Ciao.'] }] });
                // una tappa tolta
                const tolta = prologo.tappe[prologo.tappe.length - 1].id;
                prologo.tappe.pop();
                const diff = R.differenze(R.originale(), mod);
                const rifatto = R.originale();
                const persi = R.applica(rifatto, diff);
                return {
                    vuoto, diff, persi, tolta,
                    uguale: JSON.stringify(rifatto) === JSON.stringify(mod),
                    testoFile: R.testoDelFile(diff)
                };
            });
            const conta = (d) => Object.keys(d.modifiche).length + d.aggiunte.length + d.rimosse.length;
            assert(conta(giro.vuoto) === 0, 'Il catalogo senza modifiche non deve produrre ritocchi: ' + JSON.stringify(giro.vuoto));
            assert(giro.uguale && giro.persi.length === 0,
                'I ritocchi riapplicati all\'originale devono ridare esattamente il catalogo modificato: ' + JSON.stringify({ persi: giro.persi, diff: giro.diff }));
            assert(giro.diff.rimosse.indexOf(giro.tolta) !== -1, 'La tappa tolta va fra le rimosse');
            assert(giro.diff.aggiunte.length === 2 && giro.diff.aggiunte.some((a) => a.tappa.id === 'test-ritocco-area' && a.tappa.tappe.length === 1),
                'Le due tappe nuove (una dentro un\'area, un\'area con la sua tappa) vanno fra le aggiunte: ' + JSON.stringify(giro.diff.aggiunte.map((a) => a.tappa.id)));

            // --- 2) Il file generato si rilegge uguale ------------------
            const riletto = leggiRitocchi(giro.testoFile);
            assert(JSON.stringify(riletto) === JSON.stringify(giro.diff), 'Il file generato deve rileggersi con gli stessi ritocchi');

            // --- 3) L'editor vero, con un file finto ---------------------
            await page.goto(url('?campaign=anime&torneo=anime-area-prologo'));
            await page.waitForFunction(() => !!window.StoryMapEditor, null, { timeout: 20000 });
            await page.evaluate(() => {
                let buffer = '';
                window.__smeFileFinto = {
                    name: 'story-ritocchi.js (finto)',
                    queryPermission: async () => 'granted',
                    requestPermission: async () => 'granted',
                    createWritable: async () => ({ write: async (t) => { buffer = t; }, close: async () => {} }),
                    _leggi: () => buffer
                };
                StoryMapEditor.imposta(true);
                StoryMapEditor._collegaFileFinto(window.__smeFileFinto);
            });
            await page.waitForSelector('#smeAccendi', { timeout: 6000 });
            await page.click('#smeAccendi');
            await page.waitForSelector('#smeBarra', { timeout: 4000 });
            await page.waitForTimeout(700);
            const info = await page.evaluate(() => {
                const area = storyCampaignsDatabase.find((c) => c.id === 'anime').capitoli[0].tappe.find((t) => t.id === 'anime-area-prologo');
                const i = area.tappe.findIndex((t) => t.kind === 'duel');
                return { i, id: area.tappe[i].id, battutePrima: (area.tappe[i].dialogo || []).length };
            });
            await (await page.$$('.nm-node'))[info.i].click();
            await page.waitForSelector('#smeOverlay', { timeout: 3000 });

            // Avversario dalla griglia dei ritratti.
            await page.click('[data-sme-apri-griglia="smePg"]');
            await page.fill('#smePgCerca', 'joey');
            await page.click('#smePgElenco .sme-pg[data-id="joey"]');
            // Musica dall'elenco, con anteprima.
            await page.waitForSelector('input[name="smeMusica"]', { timeout: 5000 });
            const musica = await page.evaluate(() => document.querySelectorAll('input[name="smeMusica"]')[2].value);
            await page.click(`[data-sme-ascolta="${musica}"]`);
            const inAscolto = await page.$eval(`[data-sme-ascolta="${musica}"]`, (b) => b.textContent);
            assert(inAscolto === '■', 'Il pulsante di anteprima deve passare a "stop" mentre suona: ' + inAscolto);
            await page.check(`input[name="smeMusica"][value="${musica}"]`);
            // Una battuta di un altro personaggio, in fondo al dialogo.
            await page.click('#smeAggiungiBattuta');
            const ultima = `#smeBattute .sme-battuta:nth-child(${info.battutePrima + 1})`;
            await page.selectOption(`${ultima} select`, 'pg:tea');
            await page.fill(`${ultima} textarea`, 'Forza, Yugi!');
            await page.click('#smeSalva');
            await page.waitForFunction(() => /storyRitocchi/.test(window.__smeFileFinto._leggi()), null, { timeout: 4000 });

            const salvato = leggiRitocchi(await page.evaluate(() => window.__smeFileFinto._leggi()));
            const mio = salvato.modifiche[info.id] || {};
            assert(mio.characterId === 'joey' && mio.music === musica,
                'Il file deve contenere avversario e musica scelti: ' + JSON.stringify(mio));
            const dialogo = mio.dialogo || [];
            assert(dialogo.length === info.battutePrima + 1
                && JSON.stringify(dialogo[dialogo.length - 1]) === JSON.stringify({ chi: 'tea', testo: 'Forza, Yugi!' }),
                'Il dialogo salvato deve avere la battuta nuova, con la sua voce: ' + JSON.stringify(dialogo));
            assert(Object.keys(salvato.modifiche).length === 1 && salvato.aggiunte.length === 0 && salvato.rimosse.length === 0,
                'Il file deve contenere SOLO la tappa toccata: ' + JSON.stringify(Object.keys(salvato.modifiche)));
            // E riapplicati all'originale danno la tappa come in memoria.
            const coerente = await page.evaluate((r) => {
                const rifatto = StoryRitocchi.originale();
                StoryRitocchi.applica(rifatto, r);
                const area = (c) => c.find((x) => x.id === 'anime').capitoli[0].tappe.find((t) => t.id === 'anime-area-prologo');
                const id = area(storyCampaignsDatabase).tappe.find((t) => t.kind === 'duel').id;
                return JSON.stringify(area(rifatto).tappe.find((t) => t.id === id)) === JSON.stringify(area(storyCampaignsDatabase).tappe.find((t) => t.id === id));
            }, salvato);
            assert(coerente, 'I ritocchi salvati, riapplicati, devono ridare la tappa com\'è in memoria');

            assert(erroriPagina.length === 0, 'Errori JS in pagina: ' + erroriPagina.join(' | '));
        } finally {
            await context.close();
        }
    }
};
