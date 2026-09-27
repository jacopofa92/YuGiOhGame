// L'Editor Mappa scrive DAVVERO su story-campaigns.js — solo field/music.
// =====================================================================
// Richiesta esplicita dell'utente ("davvero non posso riflettere
// direttamente i valori sul file?"): per un amministratore che usa
// l'editor da sé, in locale, per lavoro di sviluppo, il giro
// "Esporta codice -> copia -> incolla nell'IDE" è un passaggio in più.
// js/dev/story-map-editor.js collega direttamente il file vero tramite
// la File System Access API del browser, ma SOLO per `field`/`music`:
// vedi il commento in cima a quel file per il perché di questo scope
// ristretto (sono le uniche due proprietà che stanno sempre da sole
// sulla propria riga in tutto il dataset).
//
// Due parti, con due strumenti diversi:
//   1) `_patchCampoEMusicaNelTesto` è una funzione PURA (testo dentro,
//      testo fuori), disponibile su QUALUNQUE apertura di storia.html
//      (non richiede l'editor acceso): la si prova contro il VERO
//      contenuto di story-campaigns.js, senza scrivere nulla, e si
//      verifica che OGNI ALTRA tappa del file resti bit-per-bit
//      identica — non solo che il risultato "sembri giusto", ma che non
//      abbia toccato nulla che non doveva.
//   2) Il giro intero (picker -> Salva -> scrittura) non si può pilotare
//      con un browser headless (il picker è un dialogo del sistema
//      operativo) — si finge un "file collegato" con
//      `_collegaFileFinto`, che accetta qualunque oggetto con la stessa
//      forma di un vero FileSystemFileHandle: qui un handle FINTO che
//      legge/scrive un buffer in memoria invece del disco, così si
//      esercita il vero pulsante "💾 Salva" del vero pannello.
const path = require('path');
const fs = require('fs');
const vm = require('vm');

/** Carica story-campaigns.js in una sandbox Node e torna il suo array — stesso schema di catalogo-sfide.spec.js. */
function caricaCampagne(testo) {
    const sandbox = {};
    sandbox.window = sandbox;
    vm.createContext(sandbox);
    vm.runInContext(testo.replace(/^const storyCampaignsDatabase/m, 'var storyCampaignsDatabase'), sandbox);
    return sandbox.storyCampaignsDatabase || sandbox.window.storyCampaignsDatabase;
}

/**
 * Tutte le tappe (a qualunque livello: capitolo, e dentro un'area/torneo)
 * con l'id come chiave — un'area/torneo entra SENZA il suo `tappe`
 * annidato (le sue prove sono già chiavi a sé in questa stessa mappa),
 * altrimenti il suo JSON includerebbe ricorsivamente ogni figlio e
 * risulterebbe "cambiato" ogni volta che ne cambia anche uno solo,
 * mascherando quale tappa VERA è stata toccata.
 */
function tutteLeTappe(campagne) {
    const out = {};
    campagne.forEach((c) => (c.capitoli || []).forEach((cap) => (cap.tappe || []).forEach((t) => {
        if (t.tappe) {
            const senzaFigli = Object.assign({}, t);
            delete senzaFigli.tappe;
            out[t.id] = senzaFigli;
            t.tappe.forEach((sub) => { out[sub.id] = sub; });
        } else {
            out[t.id] = t;
        }
    })));
    return out;
}

module.exports = {
    name: 'Editor Mappa: field/music si scrivono anche sul vero file (chirurgico, senza toccare il resto)',
    standalone: true,
    async run({ browser, assert }) {
        const RADICE = path.join(__dirname, '..', '..');
        const percorsoFile = path.join(RADICE, 'js', 'data', 'story-campaigns.js');
        const testoOriginale = fs.readFileSync(percorsoFile, 'utf8');

        const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' });
        await context.addInitScript(() => { window.AUTH_GATE_SKIP = true; });
        const page = await context.newPage();
        const erroriPagina = [];
        page.on('pageerror', (e) => erroriPagina.push(e.message));

        try {
            await page.goto('file:///' + RADICE.replace(/\\/g, '/') + '/storia.html?campaign=anime');
            await page.waitForFunction(() => !!(window.StoryMapEditor && window.StoryMapEditor._patchCampoEMusicaNelTesto), null, { timeout: 20000 });

            // --- Parte 1: la funzione pura, contro il VERO file --------
            // Non richiede l'editor acceso: è disponibile su ogni
            // apertura di storia.html (vedi il commento sopra).
            // 'anime-1-nonno' non ha ancora field/music: si aggiungono
            // entrambi. 'ww1-1-kaiserjager' ha già un field ("...Notte.jpg"):
            // si sostituisce SOLO quello, senza toccarne il dialogo.
            const risultato = await page.evaluate((testo) => {
                const p = window.StoryMapEditor._patchCampoEMusicaNelTesto;
                const uno = p(testo, 'anime-1-nonno', { field: 'images/fields/mobile/campoProva.jpg', music: 'traccia-prova.mp3' });
                if (!uno.ok) return { fase: 'aggiunta', errore: uno.motivo };
                const due = p(uno.testo, 'ww1-1-kaiserjager', { field: 'images/fields/mobile/campoSostituito.jpg' });
                if (!due.ok) return { fase: 'sostituzione', errore: due.motivo };
                const tre = p(due.testo, 'anime-1-nonno', { field: null, music: null });
                if (!tre.ok) return { fase: 'cancellazione', errore: tre.motivo };
                return { ok: true, dopoAggiunta: uno.testo, dopoSostituzione: due.testo, dopoCancellazione: tre.testo };
            }, testoOriginale);
            assert(risultato.ok, `La funzione pura deve riuscire su un caso reale del file vero: ${JSON.stringify(risultato)}`);

            // Dopo l'aggiunta: la tappa ha i due campi nuovi, TUTTE le
            // altre tappe del file restano IDENTICHE (confronto profondo,
            // non solo "il file si carica ancora").
            const primaTutte = tutteLeTappe(caricaCampagne(testoOriginale));
            const dopoAggiuntaTutte = tutteLeTappe(caricaCampagne(risultato.dopoAggiunta));
            assert(dopoAggiuntaTutte['anime-1-nonno'].field === 'images/fields/mobile/campoProva.jpg'
                && dopoAggiuntaTutte['anime-1-nonno'].music === 'traccia-prova.mp3',
                `I due campi devono comparire sulla tappa giusta: ${JSON.stringify(dopoAggiuntaTutte['anime-1-nonno'])}`);
            const idDiversi = Object.keys(primaTutte).filter((id) => id !== 'anime-1-nonno'
                && JSON.stringify(primaTutte[id]) !== JSON.stringify(dopoAggiuntaTutte[id]));
            assert(idDiversi.length === 0, `Nessun'altra tappa deve cambiare: differiscono ${idDiversi.join(', ')}`);
            assert(Object.keys(primaTutte).length === Object.keys(dopoAggiuntaTutte).length,
                'Il numero di tappe non deve cambiare (nessuna persa o duplicata)');

            // Dopo la sostituzione: SOLO il valore è cambiato, il dialogo
            // di quella stessa tappa (un array multi-riga) resta intatto.
            const dopoSostTutte = tutteLeTappe(caricaCampagne(risultato.dopoSostituzione));
            assert(dopoSostTutte['ww1-1-kaiserjager'].field === 'images/fields/mobile/campoSostituito.jpg',
                'Il campo esistente deve essere sostituito');
            assert(JSON.stringify(dopoSostTutte['ww1-1-kaiserjager'].dialogo) === JSON.stringify(primaTutte['ww1-1-kaiserjager'].dialogo),
                'Il dialogo della stessa tappa non deve essere toccato dalla sostituzione del campo');

            // Dopo la cancellazione: le due proprietà tornano ad essere
            // ASSENTI (non una stringa vuota) — eredita di nuovo dalla
            // campagna, esattamente come prima di questo test.
            const dopoCancTutte = tutteLeTappe(caricaCampagne(risultato.dopoCancellazione));
            assert(!('field' in dopoCancTutte['anime-1-nonno']) && !('music' in dopoCancTutte['anime-1-nonno']),
                `Svuotare deve TOGLIERE la proprietà, non lasciarla vuota: ${JSON.stringify(dopoCancTutte['anime-1-nonno'])}`);
            assert(JSON.stringify(dopoCancTutte['anime-1-nonno']) === JSON.stringify(primaTutte['anime-1-nonno']),
                'Dopo aggiunta e cancellazione la tappa deve tornare come all\'inizio');

            // Un id inesistente non deve corrompere nulla, solo fallire onestamente.
            const idInesistente = await page.evaluate((testo) =>
                window.StoryMapEditor._patchCampoEMusicaNelTesto(testo, 'id-che-non-esiste-davvero', { field: 'x.jpg' }),
                testoOriginale);
            assert(idInesistente.ok === false && /non trovato/.test(idInesistente.motivo || ''),
                `Un id inesistente deve fallire onestamente, non scrivere a caso: ${JSON.stringify(idInesistente)}`);

            // --- Parte 2: il vero pulsante "Salva", con un file finto ----
            // Un handle finto che si comporta come un vero
            // FileSystemFileHandle ma legge/scrive un buffer in memoria:
            // il picker nativo non è pilotabile da un browser headless.
            // Ci si sposta sull'area del prologo, che ha nodi 'duel' veri;
            // CloudSync.isAdmin va rimockato dopo OGNI navigazione (si
            // perde col resto dello stato in memoria della pagina).
            await page.evaluate(() => { if (!window.CloudSync) window.CloudSync = {}; CloudSync.isAdmin = () => true; });
            await page.goto('file:///' + RADICE.replace(/\\/g, '/') + '/storia.html?campaign=anime&torneo=anime-area-prologo');
            await page.waitForFunction(() => !!window.StoryMapEditor, null, { timeout: 20000 });
            await page.evaluate((testoIniziale) => {
                if (!window.CloudSync) window.CloudSync = {};
                CloudSync.isAdmin = () => true;
                let buffer = testoIniziale;
                const handleFinto = {
                    name: 'story-campaigns.js (finto)',
                    queryPermission: async () => 'granted',
                    requestPermission: async () => 'granted',
                    getFile: async () => ({ text: async () => buffer }),
                    createWritable: async () => ({ write: async (t) => { buffer = t; }, close: async () => {} }),
                    // Solo per leggere l'esito dal test.
                    _leggiBuffer: () => buffer
                };
                window.__smeHandleFinto = handleFinto;
                StoryMapEditor.imposta(true);
                StoryMapEditor._collegaFileFinto(handleFinto);
            }, testoOriginale);
            await page.waitForSelector('#smeAccendi', { timeout: 6000 });
            await page.click('#smeAccendi');
            await page.waitForSelector('#smeBarra', { timeout: 4000 });
            await page.waitForTimeout(700);

            const iDuel = await page.evaluate(() => {
                const area = storyCampaignsDatabase.find((c) => c.id === 'anime').capitoli[0].tappe.find((t) => t.id === 'anime-area-prologo');
                return area.tappe.findIndex((t) => t.kind === 'duel');
            });
            const nodo = (i) => page.$$('.nm-node').then((n) => n[i]);
            await (await nodo(iDuel)).click();
            await page.waitForSelector('#smeOverlay', { timeout: 3000 });
            await page.fill('#smeField', 'images/fields/mobile/dalPulsanteSalva.jpg');
            await page.fill('#smeMusic', 'musica-dal-pulsante.mp3');
            await page.click('#smeSalva');
            // La scrittura sul file finto è asincrona: si aspetta che il
            // buffer contenga davvero il nuovo valore, non un tempo fisso.
            await page.waitForFunction(() => {
                const buf = window.__smeHandleFinto._leggiBuffer();
                return buf.includes('dalPulsanteSalva.jpg');
            }, null, { timeout: 4000 });

            const bufferFinale = await page.evaluate(() => window.__smeHandleFinto._leggiBuffer());
            const campagneFinali = tutteLeTappe(caricaCampagne(bufferFinale));
            const idDuel = await page.evaluate((i) => {
                const area = storyCampaignsDatabase.find((c) => c.id === 'anime').capitoli[0].tappe.find((t) => t.id === 'anime-area-prologo');
                return area.tappe[i].id;
            }, iDuel);
            assert(campagneFinali[idDuel].field === 'images/fields/mobile/dalPulsanteSalva.jpg'
                && campagneFinali[idDuel].music === 'musica-dal-pulsante.mp3',
                `Il pulsante Salva deve scrivere anche sul file collegato: ${JSON.stringify(campagneFinali[idDuel])}`);
            // Ogni altra tappa del file finto resta uguale all'originale.
            const originaliTutte = tutteLeTappe(caricaCampagne(testoOriginale));
            const cambiate = Object.keys(originaliTutte).filter((id) => id !== idDuel
                && JSON.stringify(originaliTutte[id]) !== JSON.stringify(campagneFinali[id]));
            assert(cambiate.length === 0, `Il pulsante Salva non deve toccare altre tappe: ${cambiate.join(', ')}`);

            assert(erroriPagina.length === 0, 'Errori JS in pagina: ' + erroriPagina.join(' | '));
        } finally {
            await context.close();
        }
    }
};
