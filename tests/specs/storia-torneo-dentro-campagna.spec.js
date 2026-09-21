// Un torneo dentro una campagna: si sale un incontro alla volta, e chi
// perde ricomincia dal primo.
// =====================================================================
// Richiesta esplicita, sul modello del gioco originale: nel presente di
// Memorie Proibite non ci sono duelli sparsi, c'è il torneo della Kaiba
// Corporation. È una tappa sola della campagna che dentro ha un proprio
// percorso, con la propria mappa (`kind: 'torneo'`).
//
// Le regole qui non sono quelle della campagna, ed è tutto il punto:
//   - nella campagna perdere non costa niente e si riprova la stessa
//     tappa; nel torneo perdere AZZERA il tabellone;
//   - la campagna non si muove finché il torneo non è vinto per intero,
//     e allora avanza di quella sola tappa.
//
// Le tre cose che, rompendosi, costerebbero care:
//   1) perdere deve azzerare davvero (se non lo facesse, il torneo
//      sarebbe una fila di duelli qualunque e la richiesta sarebbe
//      disattesa in silenzio);
//   2) vincere l'ultimo incontro deve far avanzare la campagna di UNA
//      tappa e riportare sulla sua mappa;
//   3) un torneo già vinto non deve poter essere riaperto: mostrerebbe
//      un tabellone tutto superato e nessun incontro giocabile, cioè un
//      vicolo cieco. Lo si prova ricaricando la pagina dopo la vittoria.
//
// `standalone`: serve storia.html, non la pagina del duello.
const path = require('path');

const CAMPAGNA = 'forbiddenMemories';
const TORNEO = 'fm-3-torneo';

module.exports = {
    name: 'Storia: il torneo dentro la campagna (si sale, perdendo si ricomincia, vincendo si esce)',
    standalone: true,
    async run({ browser, assert }) {
        const RADICE = path.join(__dirname, '..', '..');
        const url = 'file:///' + RADICE.replace(/\\/g, '/') + '/storia.html';
        const context = await browser.newContext({
            viewport: { width: 1280, height: 950 },
            serviceWorkers: 'block'
        });
        await context.addInitScript(() => { window.AUTH_GATE_SKIP = true; });
        const page = await context.newPage();
        const erroriPagina = [];
        page.on('pageerror', (e) => erroriPagina.push(e.message));

        /** Quanto si è saliti nel tabellone, e dove si è nella campagna. */
        const leggi = () => page.evaluate((d) => {
            const stato = SaveManager.getStoryState(d.c) || {};
            return {
                campagna: stato.completate || 0,
                torneo: (stato.sotto || {})[d.t] || 0,
                dentro: /torneo=/.test(location.search),
                nodi: document.querySelectorAll('.nm-node').length,
                avviso: (document.querySelector('.avviso') || {}).textContent || ''
            };
        }, { c: CAMPAGNA, t: TORNEO });

        /**
         * Finge il ritorno da una prova del torneo. `rigiocata` è quello
         * che la pagina mette nell'URL del duello quando il tabellone è
         * già stato vinto una volta, e che torna indietro nella
         * breadcrolla: senza, la campagna avanzerebbe di nuovo.
         */
        const tornaDaDuello = async (vinto, opponentId, rigiocata) => {
            await page.evaluate((d) => sessionStorage.setItem('ygoLastDuelOutcome', JSON.stringify({
                mode: 'story', campaignId: d.c, torneoId: d.t, rigiocata: d.r === true,
                playerWon: d.v, opponentId: d.o, timestamp: Date.now()
            })), { c: CAMPAGNA, t: TORNEO, v: vinto, o: opponentId, r: rigiocata });
            await page.reload();
            await page.waitForSelector('.nm-node', { timeout: 20000 });
            await page.waitForTimeout(500);
        };

        try {
            await page.goto(url);
            await page.waitForFunction(() => !!(window.StoryProgress && window.SaveManager), null, { timeout: 15000 });

            // Il catalogo deve davvero contenere il torneo, altrimenti il
            // resto proverebbe il nulla.
            const forma = await page.evaluate((d) => {
                const t = StoryProgress.getTorneo(d.c, d.t);
                return t ? { prove: (t.tappe || []).length, haMappa: !!(t.mappa && t.mappa.sfondo) } : null;
            }, { c: CAMPAGNA, t: TORNEO });
            assert(forma && forma.prove >= 3,
                `La campagna deve contenere il torneo con i suoi incontri: ${JSON.stringify(forma)}`);
            assert(forma.haMappa, 'Un torneo deve avere una mappa propria');

            // --- Il tabellone è quello del gioco PS1 -------------------
            // Richiesta esplicita, dopo che una prima versione ne aveva
            // solo cinque: quattro preliminari e cinque finali, e ognuno
            // dei finalisti porta un Oggetto del Millennio — è il motivo
            // per cui il torneo esiste. L'ordine conta quanto l'elenco.
            const tabellone = await page.evaluate((d) => {
                const t = StoryProgress.getTorneo(d.c, d.t);
                return (t.tappe || []).map((p) => p.characterId || ('scena:' + p.kind));
            }, { c: CAMPAGNA, t: TORNEO });
            const ATTESO = ['rex', 'weevil', 'mai', 'bandit_keith',
                'shadi', 'bakura', 'pegasus', 'ishizu', 'kaiba', 'scena:scene'];
            assert(tabellone.join(',') === ATTESO.join(','),
                `Il tabellone deve seguire il gioco originale.\n  atteso: ${ATTESO.join(', ')}\n  trovato: ${tabellone.join(', ')}`);

            // La chiusura è una SCENA, non un duello: vinto il torneo non
            // si torna sulla mappa a freddo.
            const ultima = await page.evaluate((d) => {
                const t = StoryProgress.getTorneo(d.c, d.t);
                const p = (t.tappe || [])[t.tappe.length - 1];
                return { kind: p.kind, righe: (p.testo || []).length };
            }, { c: CAMPAGNA, t: TORNEO });
            assert(ultima.kind === 'scene' && ultima.righe >= 4,
                `Dopo Kaiba ci dev'essere una scena di chiusura: ${JSON.stringify(ultima)}`);

            // Si parte esattamente sulla tappa del torneo.
            const indice = await page.evaluate((d) => {
                if (!SaveManager.hasSave()) SaveManager.createNew('Tester');
                const i = StoryProgress.getTappe(d.c).findIndex((t) => t.id === d.t);
                SaveManager.setStoryState(d.c, { completate: i, finita: false, premiata: false, sotto: {} });
                return i;
            }, { c: CAMPAGNA, t: TORNEO });
            assert(indice > 0, 'Tappa del torneo non trovata nella campagna');

            // --- Ci si entra cliccando il nodo -------------------------
            await page.goto(url + '?campaign=' + CAMPAGNA);
            await page.waitForSelector('.nm-node--corrente', { timeout: 20000 });
            await page.click('.nm-node--corrente');
            await page.waitForFunction(() => /torneo=/.test(location.search), null, { timeout: 15000 });
            await page.waitForSelector('.nm-node', { timeout: 20000 });
            await page.waitForTimeout(400);
            const dentro = await leggi();
            assert(dentro.dentro, 'Cliccando la tappa-torneo si deve entrare nel suo percorso');
            assert(dentro.nodi === forma.prove,
                `Dentro il torneo si vedono i suoi incontri, non le tappe della campagna: ${dentro.nodi} invece di ${forma.prove}`);

            // --- Si sale ----------------------------------------------
            await tornaDaDuello(true, 'weevil');
            await tornaDaDuello(true, 'rex');
            const salito = await leggi();
            assert(salito.torneo === 2, `Due incontri vinti devono valere due passi nel tabellone (rilevato ${salito.torneo})`);
            assert(salito.campagna === indice,
                `La campagna NON deve muoversi finché il torneo non è vinto (rilevato ${salito.campagna} invece di ${indice})`);

            // --- Perdere azzera ---------------------------------------
            await tornaDaDuello(false, 'mai');
            const caduto = await leggi();
            assert(caduto.torneo === 0,
                `Perdere deve riportare al primo incontro (rilevato ${caduto.torneo})`);
            assert(caduto.campagna === indice, 'Perdere nel torneo non deve toccare la campagna');
            assert(/riparte|ricomincia/i.test(caduto.avviso),
                `Va detto che il tabellone è ripartito da capo, altrimenti sembra svuotato per un difetto: "${caduto.avviso}"`);
            assert(/2/.test(caduto.avviso),
                `E va detto da quanto si è caduti: "${caduto.avviso}"`);

            // --- Vincerlo tutto riporta alla campagna -----------------
            const avversari = await page.evaluate((d) =>
                StoryProgress.getTorneo(d.c, d.t).tappe.map((p) => p.characterId), { c: CAMPAGNA, t: TORNEO });
            for (const id of avversari) await tornaDaDuello(true, id);
            const uscito = await leggi();
            assert(uscito.campagna === indice + 1,
                `Vinto il torneo, la campagna avanza di UNA tappa (da ${indice} a ${uscito.campagna})`);
            assert(!uscito.dentro, 'Vinto il torneo si torna sulla mappa della campagna');
            assert(uscito.nodi > forma.prove, 'Dopo la vittoria si devono rivedere le tappe della campagna');

            // --- Niente vicolo cieco ----------------------------------
            await page.reload();
            await page.waitForSelector('.nm-node', { timeout: 20000 });
            await page.waitForTimeout(500);
            const dopoReload = await leggi();
            assert(!dopoReload.dentro && dopoReload.nodi > forma.prove,
                'Ricaricando dopo la vittoria non si deve rientrare in un tabellone finito e senza incontri giocabili');

            // --- Ma si deve poter RIFARE ------------------------------
            // Richiesta esplicita: il nodo del torneo si rigioca come
            // ogni altra tappa già superata. Le due cose vanno insieme e
            // non si contraddicono: rientrandoci il tabellone riparte dal
            // primo incontro, ed è la stessa riga che rende impossibile
            // il vicolo cieco qui sopra.
            const nodoTorneo = await page.evaluate((d) => {
                const t = StoryProgress.getTappeConStato(d.c).find((x) => x.id === d.t);
                const el = document.querySelectorAll('.nm-node')[t.indice];
                return { stato: t.stato, apribile: !!(el && el.className.indexOf('apribile') !== -1), indice: t.indice };
            }, { c: CAMPAGNA, t: TORNEO });
            assert(nodoTorneo.stato === 'fatta' && nodoTorneo.apribile,
                `Il nodo di un torneo già vinto deve restare apribile: ${JSON.stringify(nodoTorneo)}`);

            await page.evaluate((i) => document.querySelectorAll('.nm-node')[i].click(), nodoTorneo.indice);
            await page.waitForFunction(() => /torneo=/.test(location.search), null, { timeout: 15000 });
            await page.waitForSelector('.nm-node', { timeout: 20000 });
            await page.waitForTimeout(400);
            const rientrato = await leggi();
            assert(rientrato.dentro && rientrato.nodi === forma.prove && rientrato.torneo === 0,
                `Rientrando in un torneo già vinto il tabellone deve ripartire dal primo incontro: ${JSON.stringify(rientrato)}`);

            // Rivincerlo per intero NON deve far avanzare la campagna una
            // seconda volta: sarebbe saltare la tappa dopo senza giocarla,
            // esattamente il motivo per cui esiste `rigiocata`.
            const campagnaPrima = rientrato.campagna;
            for (const id of avversari) await tornaDaDuello(true, id, true);
            const rivinto = await leggi();
            assert(rivinto.campagna === campagnaPrima,
                `Rifare un torneo già vinto non deve far avanzare la storia (da ${campagnaPrima} a ${rivinto.campagna})`);
            assert(!rivinto.dentro, 'Rivinto il torneo si torna comunque sulla mappa della campagna');
            assert(/rigiocat|rifatt|resta dov/i.test(rivinto.avviso),
                `Va detto che la storia resta dov'era, altrimenti la mappa ferma sembra un difetto: "${rivinto.avviso}"`);

            // --- Ogni duello ha la sua conversazione ------------------
            // Richiesta esplicita: prima di ogni incontro si parla con
            // quel duellante. Si controlla sul catalogo, che è dove vive.
            const senzaDialogo = await page.evaluate((c) => {
                const fuori = [];
                const guarda = (t) => {
                    if (t.kind === 'duel' && !(t.dialogo && t.dialogo.length)) fuori.push(t.id);
                };
                StoryProgress.getCampaign(c).capitoli.forEach((cap) => cap.tappe.forEach((t) => {
                    guarda(t);
                    if (t.kind === 'torneo') (t.tappe || []).forEach(guarda);
                }));
                return fuori;
            }, CAMPAGNA);
            assert(senzaDialogo.length === 0,
                `Ogni duello di questa campagna deve avere il suo dialogo: mancano ${senzaDialogo.join(', ')}`);

            assert(erroriPagina.length === 0, 'Errori JS in pagina: ' + erroriPagina.join(' | '));
        } finally {
            await context.close();
        }
    }
};
