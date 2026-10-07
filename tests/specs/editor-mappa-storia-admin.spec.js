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
        // js/cloud/cloud-sync.js (un vero <script> della pagina) assegna
        // `window.CloudSync = {...}` con la sua implementazione reale un
        // istante DOPO che questo initScript gira — un mock ottenuto
        // sovrascrivendo `window.CloudSync` prima verrebbe quindi
        // cancellato. Un accessor intercetta invece QUALUNQUE assegnazione
        // futura e patcha `.isAdmin` nel momento stesso in cui arriva,
        // così isAdmin() risponde vero fin dal PRIMISSIMO controllo di
        // story-map-editor.js — esattamente come farebbe, nel gioco vero,
        // un amministratore già riconosciuto su questo dispositivo (vedi
        // wasAdminOffline in js/cloud/cloud-sync.js: la stessa ragione per
        // cui lì la risposta è sincrona anche prima che Supabase risponda).
        // Un semplice mock via page.evaluate() DOPO il page.goto arriva
        // sempre troppo tardi rispetto al PRIMO render della mappa, che
        // succede in modo sincrono durante il caricamento della pagina.
        await page.addInitScript(() => {
            let reale;
            Object.defineProperty(window, 'CloudSync', {
                configurable: true,
                get() { return reale; },
                set(v) { reale = v; if (reale) reale.isAdmin = () => true; }
            });
        });

        try {
            await page.goto('file:///' + path.join(RADICE, 'storia.html').replace(/\\/g, '/') + '?campaign=anime');
            await page.waitForFunction(() => !!(window.StoryProgress && window.StoryMapEditor), null, { timeout: 20000 });

            // --- Spento di default, anche per un amministratore vero ----
            // Stessa porta chiusa dell'autowin: un account admin che non
            // ha mai acceso l'interruttore non deve vedere nulla (isAdmin
            // è già vero fin da subito, vedi l'accessor in cima al test).
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
            // Il numero si legge dal catalogo invece di scriverlo qui: la
            // prima versione di questo controllo diceva 5 ed è invecchiata
            // il giorno in cui è arrivato il prologo.
            const aree = await page.evaluate(() => StoryProgress.getTappe('anime').length);
            t.assert(aree >= 5 && etichette.length === aree,
                `La mappa dell'anime deve mostrare un nodo per area (${etichette.length} nodi per ${aree} aree)`);
            const coordinateSempreVisibili = await page.evaluate(() => [...document.querySelectorAll('.sme-node')].every((n) => {
                const c = n.querySelector('.sme-node-coordinate');
                return c && /^X -?\d+ · Y -?\d+$/.test(c.textContent.trim());
            }));
            t.assert(coordinateSempreVisibili,
                'Con editor attivo ogni nodo deve mostrare le proprie coordinate senza essere cliccato');

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
            // Le coordinate devono essere leggibili PRIMA del rilascio:
            // controllarle dopo mouse.up proverebbe solo il riepilogo finale,
            // non l'aggiornamento realmente in tempo reale richiesto.
            const coordinateDuranteDrag = await page.evaluate(() => {
                const tappa = storyCampaignsDatabase.find((c) => c.id === 'anime').capitoli[0].tappe[0];
                return { testo: document.getElementById('smeCoordinate').textContent, x: tappa.x, y: tappa.y };
            });
            t.assert(coordinateDuranteDrag.testo.includes(`X ${coordinateDuranteDrag.x}`)
                && coordinateDuranteDrag.testo.includes(`Y ${coordinateDuranteDrag.y}`),
            `La barra deve mostrare X/Y aggiornate durante il drag: ${JSON.stringify(coordinateDuranteDrag)}`);
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

            // --- Campo e musica del duello, sulla tappa (non più solo a
            // livello di campagna) — richiesto esplicitamente dall'utente.
            // Un duello ha ENTRAMBI i campi, una scena SOLO il campo (la
            // musica non ha senso per un intermezzo a dialoghi). Vuoto =
            // eredita da campoDuello/musicaDuello della campagna: salvare
            // vuoto deve quindi TOGLIERE la proprietà dall'oggetto, non
            // scriverci una stringa vuota (js/story/story-progress.js
            // legge `tappa.field || campoDellaCampagna(...)`, e una
            // stringa vuota è comunque "presente" per quel `||`).
            await page.goto('file:///' + path.join(RADICE, 'storia.html').replace(/\\/g, '/')
                + '?campaign=anime&torneo=anime-area-prologo');
            // isAdmin resta vero da subito (l'accessor si riapplica ad
            // ogni navigazione). La modalità editor SOPRAVVIVE alla
            // navigazione (sta in sessionStorage, apposta per restare
            // accesa entrando in un'area — vedi CHIAVE_SESSIONE in
            // story-map-editor.js): niente "#smeAccendi" da ricliccare,
            // la barra vera compare da sola al primo render di questa mappa.
            await page.waitForSelector('#smeBarra', { timeout: 6000 });
            await page.waitForTimeout(700);
            const nodo = (i) => page.$$('.nm-node').then((n) => n[i]);
            const indici = await page.evaluate(() => {
                const area = storyCampaignsDatabase.find((c) => c.id === 'anime').capitoli[0].tappe
                    .find((t) => t.id === 'anime-area-prologo');
                return { duel: area.tappe.findIndex((t) => t.kind === 'duel'), scene: area.tappe.findIndex((t) => t.kind === 'scene') };
            });

            await (await nodo(indici.duel)).click();
            await page.waitForSelector('#smeOverlay', { timeout: 3000 });
            const pannelloDuel = await page.evaluate(() => ({ field: !!document.getElementById('smeField'), music: !!document.getElementById('smeMusic') }));
            t.assert(pannelloDuel.field && pannelloDuel.music, `Il pannello di un duello deve avere campo E musica: ${JSON.stringify(pannelloDuel)}`);
            await page.fill('#smeField', 'images/fields/mobile/campoProva.jpg');
            await page.fill('#smeMusic', 'traccia-prova.mp3');
            await page.click('#smeSalva');
            await page.waitForTimeout(400);
            let tappaDuel = await page.evaluate(() => storyCampaignsDatabase.find((c) => c.id === 'anime').capitoli[0].tappe
                .find((t) => t.id === 'anime-area-prologo').tappe.find((t) => t.kind === 'duel'));
            t.assert(tappaDuel.field === 'images/fields/mobile/campoProva.jpg' && tappaDuel.music === 'traccia-prova.mp3',
                `Campo e musica devono scriversi sulla tappa vera: ${JSON.stringify({ field: tappaDuel.field, music: tappaDuel.music })}`);

            // Svuotare i due campi deve TOGLIERLI, non lasciarli a stringa vuota.
            await (await nodo(indici.duel)).click();
            await page.waitForSelector('#smeOverlay', { timeout: 3000 });
            await page.fill('#smeField', '');
            await page.fill('#smeMusic', '');
            await page.click('#smeSalva');
            await page.waitForTimeout(400);
            tappaDuel = await page.evaluate(() => storyCampaignsDatabase.find((c) => c.id === 'anime').capitoli[0].tappe
                .find((t) => t.id === 'anime-area-prologo').tappe.find((t) => t.kind === 'duel'));
            t.assert(!('field' in tappaDuel) && !('music' in tappaDuel),
                `Svuotare campo/musica deve TOGLIERE la proprietà, non lasciare una stringa vuota: ${JSON.stringify(tappaDuel)}`);

            // Una scena ha il campo ma MAI il selettore della musica.
            await (await nodo(indici.scene)).click();
            await page.waitForSelector('#smeOverlay', { timeout: 3000 });
            const pannelloScene = await page.evaluate(() => ({ field: !!document.getElementById('smeField'), music: !!document.getElementById('smeMusic') }));
            t.assert(pannelloScene.field && !pannelloScene.music,
                `Il pannello di una scena deve avere il campo ma non la musica: ${JSON.stringify(pannelloScene)}`);
            await page.click('#smeAnnulla');

            // Si torna alla mappa PRINCIPALE della campagna: il resto del
            // test (creazione/esportazione/eliminazione) presume di essere
            // lì, e la parentesi campo/musica qui sopra ci ha portati
            // dentro l'area del prologo.
            await page.goto('file:///' + path.join(RADICE, 'storia.html').replace(/\\/g, '/') + '?campaign=anime');
            await page.waitForSelector('#smeBarra', { timeout: 6000 });
            await page.waitForTimeout(700);

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
