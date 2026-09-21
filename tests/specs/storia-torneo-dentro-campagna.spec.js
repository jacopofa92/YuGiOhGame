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

        /** Finge il ritorno da una prova del torneo. */
        const tornaDaDuello = async (vinto, opponentId) => {
            await page.evaluate((d) => sessionStorage.setItem('ygoLastDuelOutcome', JSON.stringify({
                mode: 'story', campaignId: d.c, torneoId: d.t,
                playerWon: d.v, opponentId: d.o, timestamp: Date.now()
            })), { c: CAMPAGNA, t: TORNEO, v: vinto, o: opponentId });
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
