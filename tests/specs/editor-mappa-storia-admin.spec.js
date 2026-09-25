// L'Editor Mappa della Storia: sposta, modifica, crea, cancella ed esporta.
// =====================================================================
// Richiesto esplicitamente dall'utente dopo aver dovuto misurare a mano,
// ritagliando screenshot, il centro delle arene della mappa anime — vedi
// l'intestazione di js/dev/story-map-editor.js per il modello completo
// (editor "in sessione" più esportazione del codice, nessun salvataggio
// automatico sui contenuti: questo gioco non ha un backend per loro).
//
// Qui si sorveglia che le QUATTRO operazioni base funzionino DAVVERO su un
// gesto reale (trascinamento incluso, non solo chiamate dirette alle
// funzioni) — due bug concreti sono stati presi proprio così, non
// leggendo il codice:
//   1. NodeMap.render si centra da solo sull'ULTIMO nodo quando nessuno è
//      'corrente' (il caso normale in modalità editor, dove tutti i nodi
//      sono sbloccati): senza contromisura il PRIMO nodo finisce fuori
//      schermo (x negativo) e un trascinamento lì sopra non trova nulla.
//   2. Il 'click' nativo del bottone scatta comunque DOPO un trascinamento
//      vero (preventDefault sul pointerdown non lo impedisce): senza una
//      soppressione esplicita, il pannello di modifica si riapriva subito
//      dopo ogni spostamento.
// `standalone`: la Storia vive su una pagina sua.
const path = require('path');

module.exports = {
    standalone: true,
    name: 'Editor Mappa della Storia: trascina, modifica, crea, cancella, esporta',
    async run(t) {
        const RADICE = path.join(__dirname, '..', '..');
        const page = await t.browser.newPage({ viewport: { width: 1400, height: 900 } });
        const erroriPagina = [];
        page.on('pageerror', (e) => erroriPagina.push(e.message));
        page.on('dialog', (d) => d.accept());
        await page.addInitScript(() => { window.AUTH_GATE_SKIP = true; });

        try {
            await page.goto('file:///' + path.join(RADICE, 'storia.html').replace(/\\/g, '/') + '?campaign=anime');
            await page.waitForFunction(() => !!(window.StoryProgress && window.StoryMapEditor), null, { timeout: 20000 });

            // --- Spento di default, anche per un amministratore vero ----
            // Stessa porta chiusa dell'autowin: un account admin che non
            // ha mai acceso l'interruttore non deve vedere nulla.
            await page.evaluate(() => { if (!window.CloudSync) window.CloudSync = {}; CloudSync.isAdmin = () => true; });
            await page.waitForTimeout(500);
            const nienteBottoneSenzaInterruttore = await page.$('#smeAccendi');
            t.assert(!nienteBottoneSenzaInterruttore,
                'Con interruttore spento (anche da amministratore) il pulsante dell\'editor non deve comparire');

            // --- Acceso: compare il pulsante, e solo allora -------------
            await page.evaluate(() => StoryMapEditor.imposta(true));
            await page.waitForSelector('#smeAccendi', { timeout: 6000 });
            await page.click('#smeAccendi');
            await page.waitForSelector('#smeBarra', { timeout: 4000 });
            // La barra deve avere davvero lo stile (bug reale preso qui:
            // il CSS veniva iniettato solo dai pannelli, mai da lei
            // stessa — appariva come un <div> grezzo in fondo alla
            // pagina invece che fissa in alto).
            const barraFissaInAlto = await page.evaluate(() => {
                const r = document.getElementById('smeBarra').getBoundingClientRect();
                return getComputedStyle(document.getElementById('smeBarra')).position === 'fixed' && r.top < 10;
            });
            t.assert(barraFissaInAlto, 'La barra dell\'editor deve essere fissa in cima allo schermo, non un blocco nel flusso della pagina');

            // Ogni nodo deve essere sbloccato e mostrare la sua vera
            // etichetta: in modalità editor non ha senso nascondere nulla.
            const etichette = await page.evaluate(() => [...document.querySelectorAll('.nm-node .nm-label')].map((e) => e.textContent));
            t.assert(etichette.indexOf('???') === -1, `Nessun nodo deve restare "???" in modalità editor: ${etichette}`);
            t.assert(etichette.length === 5, `La mappa dell'anime ha 5 aree (rilevate ${etichette.length})`);

            // La mappa fa uno scorrimento "morbido" al primo disegno:
            // aspettare che la contromisura dell'editor lo fissi, o il
            // primo nodo potrebbe risultare fuori schermo (bug #1 qui sopra).
            await page.waitForTimeout(700);

            // --- Trascinamento del primo nodo ----------------------------
            const primaXY = await page.evaluate(() => {
                const t2 = storyCampaignsDatabase.find((c) => c.id === 'anime').capitoli[0].tappe[0];
                return { x: t2.x, y: t2.y };
            });
            const bottonePrimo = await page.$('.nm-node');
            const box = await bottonePrimo.boundingBox();
            t.assert(box.x > -10, `Il primo nodo deve essere visibile a schermo, non spedito fuori dal ricentraggio automatico (x=${box.x})`);
            await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
            await page.mouse.down();
            await page.mouse.move(box.x + box.width / 2 + 40, box.y + box.height / 2 + 25, { steps: 5 });
            await page.mouse.up();
            const dopoXY = await page.evaluate(() => {
                const t2 = storyCampaignsDatabase.find((c) => c.id === 'anime').capitoli[0].tappe[0];
                return { x: t2.x, y: t2.y };
            });
            t.assert(dopoXY.x !== primaXY.x || dopoXY.y !== primaXY.y,
                `Il trascinamento deve spostare davvero il nodo (prima ${JSON.stringify(primaXY)}, dopo ${JSON.stringify(dopoXY)})`);

            // Un trascinamento VERO non deve riaprire il pannello di
            // modifica (bug #2 qui sopra: il click nativo che segue va
            // soppresso solo in quel caso).
            const overlayDopoTrascinamento = await page.$('#smeOverlay');
            t.assert(!overlayDopoTrascinamento, 'Un trascinamento vero non deve far comparire il pannello di modifica');

            // --- Un click SENZA trascinare apre il pannello --------------
            await page.click('.nm-node');
            await page.waitForSelector('#smeOverlay', { timeout: 3000 });
            await page.fill('#smeLabel', 'ETICHETTA DI PROVA');
            await page.click('#smeSalva');
            await page.waitForTimeout(700);
            const labelAggiornata = await page.evaluate(() =>
                storyCampaignsDatabase.find((c) => c.id === 'anime').capitoli[0].tappe[0].label);
            t.assert(labelAggiornata === 'ETICHETTA DI PROVA', `La modifica deve scrivere sull'oggetto vero (rilevato "${labelAggiornata}")`);
            const labelSulNodo = await page.$eval('.nm-node .nm-label', (e) => e.textContent);
            t.assert(labelSulNodo === 'ETICHETTA DI PROVA', 'La mappa deve ridisegnarsi da sola dopo il salvataggio');

            // --- Creazione di un nodo nuovo -------------------------------
            await page.click('#smeAggiungi');
            const canvas = await page.$('.nm-canvas');
            const cbox = await canvas.boundingBox();
            await page.mouse.click(cbox.x + 700, cbox.y + 200);
            await page.waitForSelector('#smeOverlay', { timeout: 3000 });
            await page.fill('#smeNuovoId', 'test-nodo-nuovo-99');
            await page.selectOption('#smeNuovoKind', 'scene');
            await page.fill('#smeNuovoLabel', 'Scena di prova');
            await page.fill('#smeChi', 'Tester');
            await page.fill('#smeTesto', 'Prima battuta.\nSeconda battuta.');
            await page.click('#smeCreaNuovo');
            await page.waitForTimeout(500);
            const nuovoCreato = await page.evaluate(() => {
                const cap = storyCampaignsDatabase.find((c) => c.id === 'anime').capitoli[0];
                return cap.tappe.find((tp) => tp.id === 'test-nodo-nuovo-99');
            });
            t.assert(nuovoCreato && nuovoCreato.kind === 'scene' && nuovoCreato.chi === 'Tester'
                && Array.isArray(nuovoCreato.testo) && nuovoCreato.testo.length === 2,
                `Il nodo nuovo deve comparire nei dati veri con i campi giusti: ${JSON.stringify(nuovoCreato)}`);

            // --- Esportazione: il codice generato include il nodo nuovo --
            await page.click('#smeEsporta');
            await page.waitForSelector('#smeExportTesto', { timeout: 3000 });
            const esportato = await page.$eval('#smeExportTesto', (e) => e.value);
            t.assert(esportato.includes('test-nodo-nuovo-99') && esportato.includes("kind: 'scene'"),
                'Il codice esportato deve contenere il nodo appena creato');
            await page.click('#smeChiudiExport');

            // --- Eliminazione ---------------------------------------------
            const indiceNuovo = await page.evaluate(() => [...document.querySelectorAll('.nm-node .nm-label')]
                .findIndex((e) => e.textContent === 'Scena di prova'));
            const bottoniOra = await page.$$('.nm-node');
            await bottoniOra[indiceNuovo].click();
            await page.waitForSelector('#smeOverlay', { timeout: 3000 });
            await page.click('#smeElimina');
            await page.waitForTimeout(500);
            const esisteAncora = await page.evaluate(() => {
                const cap = storyCampaignsDatabase.find((c) => c.id === 'anime').capitoli[0];
                return !!cap.tappe.find((tp) => tp.id === 'test-nodo-nuovo-99');
            });
            t.assert(!esisteAncora, 'Il nodo eliminato non deve più esistere nei dati');

            // --- Spegnendo l'interruttore, l'editor sparisce -------------
            await page.evaluate(() => StoryMapEditor.imposta(false));
            await page.reload();
            await page.waitForFunction(() => !!window.StoryMapEditor, null, { timeout: 20000 });
            await page.waitForTimeout(500);
            const spentoDopo = await page.$('#smeAccendi');
            t.assert(!spentoDopo, 'Spegnendo l\'interruttore, il pulsante dell\'editor non deve più comparire');

            t.assert(erroriPagina.length === 0, `Errori JS in pagina: ${erroriPagina.join(' | ')}`);
        } finally {
            await page.close();
        }
    }
};
