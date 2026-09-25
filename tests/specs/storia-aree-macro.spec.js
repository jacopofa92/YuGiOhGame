// Le aree della Storia: una mappa dentro la mappa.
// =====================================================================
// La campagna anime è a due livelli: la mappa grande porta un nodo per
// arco della serie, e ogni nodo apre la mappa di quell'arco con le sue
// tappe.
//
// Strutturalmente un'AREA è identica a un TORNEO — mappa propria, tappe
// proprie, avanzamento in `sotto` — e infatti le tratta lo stesso
// codice. Cambia UNA regola: in un torneo chi perde ricomincia dal primo
// incontro, in un'area no.
//
// È quella regola che questo file sorveglia, ed è la più importante da
// sorvegliare perché si rompe in silenzio: se un giorno un'area
// cominciasse ad azzerarsi, un giocatore perderebbe otto duelli di
// progresso senza che niente segnali un difetto — sembrerebbe solo di
// aver ricordato male a che punto si era. Verificato al contrario
// facendo azzerare anche le aree: gli altri spec della Storia restavano
// tutti verdi, questo no.
//
// `standalone`: la Storia vive su una pagina sua.
const path = require('path');

module.exports = {
    standalone: true,
    name: 'Storia: le aree sono mappe dentro la mappa, e perdere non le azzera',
    async run(t) {
        const RADICE = path.join(__dirname, '..', '..');
        const url = (q) => 'file:///' + path.join(RADICE, 'storia.html').replace(/\\/g, '/') + (q || '');
        const page = await t.browser.newPage({ viewport: { width: 1280, height: 900 } });
        const erroriPagina = [];
        page.on('pageerror', (e) => erroriPagina.push(e.message));
        await page.addInitScript(() => { window.AUTH_GATE_SKIP = true; });

        const AREA = 'anime-area-origini';

        try {
            await page.goto(url('?campaign=anime'));
            await page.waitForFunction(() => !!(window.StoryProgress && window.SaveManager), null, { timeout: 25000 });
            await page.evaluate(() => { if (!SaveManager.hasSave()) SaveManager.createNew('Tester'); });

            // --- Ogni nodo della mappa grande è un'area -----------------
            const struttura = await page.evaluate(() => {
                const tappe = StoryProgress.getTappe('anime');
                return {
                    totale: tappe.length,
                    aree: tappe.filter((x) => x.kind === 'area').length,
                    // Un'area senza mappa propria si aprirebbe su niente.
                    senzaMappa: tappe.filter((x) => x.kind === 'area' && !x.mappa).map((x) => x.id),
                    // Due aree con le stesse coordinate finirebbero una
                    // sopra l'altra, e una delle due sarebbe incliccabile.
                    posizioni: tappe.map((x) => `${x.x},${x.y}`)
                };
            });
            t.assert(struttura.aree === struttura.totale && struttura.aree >= 7,
                `Sulla mappa grande devono esserci solo aree, e almeno sette: ${JSON.stringify(struttura)}`);
            t.assert(struttura.senzaMappa.length === 0,
                `Aree senza una mappa propria: ${struttura.senzaMappa}`);
            t.assert(new Set(struttura.posizioni).size === struttura.posizioni.length,
                `Due aree si sovrappongono sulla mappa: ${struttura.posizioni}`);

            // --- Entrandoci si trova la SUA mappa -----------------------
            await page.goto(url('?campaign=anime&torneo=' + AREA));
            await page.waitForSelector('.nm-node', { timeout: 20000 });
            const dentro = await page.evaluate((id) => ({
                nodi: document.querySelectorAll('.nm-node').length,
                quante: StoryProgress.getProveConStato('anime', id).length,
                // Dentro un'area il pulsante "Ricomincia" non ha senso:
                // ricomincerebbe l'INTERA campagna da dentro un suo pezzo.
                ricominciaNascosto: document.getElementById('btnRicomincia').hidden,
                indietro: document.getElementById('btnIndietro').textContent
            }), AREA);
            t.assert(dentro.nodi === dentro.quante && dentro.nodi > 1,
                `La mappa dell'area deve mostrare le sue tappe (${dentro.nodi} nodi per ${dentro.quante} tappe)`);
            t.assert(dentro.ricominciaNascosto, 'Dentro un\'area "Ricomincia" dev\'essere nascosto');
            t.assert(/Regno delle Ombre/.test(dentro.indietro),
                `"Indietro" deve riportare alla campagna, non uscire dalla Storia: "${dentro.indietro}"`);

            // --- PERDERE NON AZZERA L'AREA ------------------------------
            // È la differenza fra un'area e un torneo, ed è tutto il punto
            // di questo file. Si porta l'area a metà, si perde, e si
            // controlla che il progresso sia ancora lì.
            const perdita = await page.evaluate((id) => {
                // Il progresso di un sotto-percorso si scrive dove vive
                // davvero, in `sotto` dentro lo stato della campagna:
                // `setProgressoTorneo` non è esportato, e allargare
                // l'interfaccia del modulo per comodità di un test
                // significherebbe che quella funzione esiste in pubblico
                // per una ragione che col gioco non c'entra.
                SaveManager.setStoryState('anime', {
                    completate: 0, finita: false, premiata: false, sotto: { [id]: 3 }
                });
                const prima = StoryProgress.getProgressoTorneo('anime', id);
                sessionStorage.setItem('ygoLastDuelOutcome', JSON.stringify({
                    mode: 'story', campaignId: 'anime', torneoId: id,
                    playerWon: false, opponentId: 'joey', timestamp: Date.now()
                }));
                const esito = StoryProgress.consumaEsitoDuello('anime');
                return { prima: prima, dopo: StoryProgress.getProgressoTorneo('anime', id), perso: esito.perso };
            }, AREA);
            t.assert(perdita.perso, 'La sconfitta dev\'essere riconosciuta come tale');
            t.assert(perdita.dopo === perdita.prima,
                `Perdere dentro un'AREA non deve far perdere il progresso: era ${perdita.prima}, è ${perdita.dopo}. `
                + 'Ricominciare da capo è la regola di un TORNEO, non di un pezzo di racconto.');

            // --- E in un torneo invece sì ------------------------------
            // Il contrario, sulla stessa funzione: senza questo controllo
            // "non azzerare mai niente" passerebbe, e i tornei perderebbero
            // la regola che li rende tornei.
            const torneo = await page.evaluate(() => {
                const tappe = StoryProgress.getTappe('forbiddenMemories');
                const t = tappe.find((x) => x.kind === 'torneo');
                if (!t) return { saltato: true };
                SaveManager.setStoryState('forbiddenMemories', {
                    completate: 0, finita: false, premiata: false, sotto: { [t.id]: 2 }
                });
                sessionStorage.setItem('ygoLastDuelOutcome', JSON.stringify({
                    mode: 'story', campaignId: 'forbiddenMemories', torneoId: t.id,
                    playerWon: false, opponentId: 'kaiba', timestamp: Date.now()
                }));
                StoryProgress.consumaEsitoDuello('forbiddenMemories');
                return { saltato: false, dopo: StoryProgress.getProgressoTorneo('forbiddenMemories', t.id) };
            });
            if (!torneo.saltato) {
                t.assert(torneo.dopo === 0,
                    `In un TORNEO perdere riporta al primo incontro (rilevato ${torneo.dopo})`);
            }

            t.assert(erroriPagina.length === 0, 'Errori JS in pagina: ' + erroriPagina.join(' | '));
        } finally {
            await page.close();
        }
    }
};
