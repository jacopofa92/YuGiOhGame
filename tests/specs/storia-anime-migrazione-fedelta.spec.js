// La revisione di fedeltà all'anime ha inserito nuove tappe PRINCIPALI in
// sei aree (il tempo scaduto di Pegasus, il parapetto di Kaiba, gli otto
// finalisti, i Cinque uniti, Kaiba contro Gozaburo, la battaglia a quattro,
// l'epilogo di Battle City, Kisara, l'addio di Atem). L'avanzamento delle
// aree si salva come NUMERO di prove principali fatte, quindi una tappa in
// più sposta tutto quello che viene dopo: le voci `ids` in `separazioni`
// devono riportare in pari i salvataggi scritti prima.
//
// Per ogni area si ricostruisce la forma VECCHIA (le principali di oggi
// senza le tappe nuove) e si prova ogni possibile punto d'arrivo: chi era
// prima dell'inserimento non deve muoversi, chi l'aveva superato deve
// avanzare di quante tappe sono nate, e nessuno deve ritrovarsi con una
// prova "fatta" che non ha mai giocato o con una giocata da rifare.
// Due tappe nuove nella stessa area (Mondo Virtuale, Battle City 2, Mondo
// dei Ricordi) sono il caso che la vecchia forma delle voci sbagliava.
const path = require('path');

module.exports = {
    standalone: true,
    name: 'Storia anime: i salvataggi scritti prima della revisione di fedeltà restano allo stesso punto',
    async run(t) {
        const RADICE = path.join(__dirname, '..', '..');
        const url = 'file:///' + path.join(RADICE, 'storia.html').replace(/\\/g, '/') + '?campaign=anime';
        const page = await t.browser.newPage();
        const errori = [];
        page.on('pageerror', (e) => errori.push(e.message));
        await page.addInitScript(() => { window.AUTH_GATE_SKIP = true; });
        try {
            await page.goto(url);
            await page.waitForFunction(() => !!(window.StoryProgress && window.SaveManager), null, { timeout: 25000 });
            const problemi = await page.evaluate(() => {
                if (!SaveManager.hasSave()) SaveManager.createNew('Tester');
                const anime = storyCampaignsDatabase.find((c) => c.id === 'anime');
                const nuove = anime.separazioni.filter((s) => /^anime-fedelta-/.test(s.id));
                const timbroVecchio = anime.separazioni.filter((s) => !/^anime-fedelta-/.test(s.id)).map((s) => s.id);
                const idsNuovi = nuove.reduce((acc, s) => acc.concat(s.ids), []);
                const aree = StoryProgress.getTappe('anime').filter((x) => x.kind === 'area');
                const out = [];
                aree.forEach((area, indiceArea) => {
                    const oggi = (area.tappe || []).filter((x) => x.parallelo !== true).map((x) => x.id);
                    const vecchie = oggi.filter((id) => idsNuovi.indexOf(id) === -1);
                    if (vecchie.length === oggi.length) return; // area non toccata
                    for (let fatte = 0; fatte <= vecchie.length; fatte++) {
                        const sotto = {};
                        sotto[area.id] = fatte;
                        SaveManager.setStoryState('anime', { completate: indiceArea, sotto: sotto, separazioni: timbroVecchio });
                        const dopo = StoryProgress.getProgress('anime').sotto[area.id] || 0;
                        // Atteso: si arriva subito dopo l'ultima prova VECCHIA
                        // già giocata. Le tappe nuove che le stanno davanti
                        // contano come fatte (erano già "superate"); quelle
                        // dopo restano da giocare — compresa una tappa nuova in
                        // fondo a un'area già finita: contenuto mai visto, non
                        // un passo indietro.
                        const prossimaVecchia = vecchie[fatte]; // undefined se l'area era finita
                        const atteso = fatte === 0 ? 0 : oggi.indexOf(vecchie[fatte - 1]) + 1;
                        if (dopo !== atteso) {
                            out.push(`${area.id}: ${fatte}/${vecchie.length} fatte prima -> ${dopo}, atteso ${atteso} (prossima: ${prossimaVecchia || 'area finita'})`);
                        }
                    }
                });
                return out;
            });
            t.assert(problemi.length === 0, `Salvataggi spostati dalla migrazione:\n${problemi.join('\n')}`);
            t.assert(errori.length === 0, `Nessun errore in pagina: ${JSON.stringify(errori)}`);
        } finally {
            await page.close();
        }
    }
};
