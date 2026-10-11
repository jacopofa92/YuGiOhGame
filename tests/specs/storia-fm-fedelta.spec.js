// Memorie Proibite riallineata al gioco PS1 (Yu-Gi-Oh! Forbidden Memories).
// Sorveglia i punti che erano sbagliati e che è facile rompere di nuovo
// scrivendo un dialogo nuovo:
//  - il passato si apre in paese (Teana, poi Jono, poi Seto alla festa) e
//    la Sacerdotessa Isis NON c'è: si incontra solo nel torneo di Kaiba;
//  - Seto non duella durante il colpo di stato (chiede il Puzzle) e tradisce
//    solo alla fine; Heishin vuole gli Oggetti per sé;
//  - nel presente Shadi non duella prima del torneo: porta Yugi dentro il
//    Puzzle dopo i preliminari, e i finalisti portano SEI Oggetti;
//  - il ritorno in Egitto (Sadin, Mage Soldier, le rivincite) e Seto nel
//    labirinto ci sono;
//  - un salvataggio scritto prima della revisione resta allo stesso punto,
//    nella campagna e dentro il torneo.
const path = require('path');

module.exports = {
    standalone: true,
    name: 'Memorie Proibite: trama fedele al gioco PS1, e salvataggi che restano al loro punto',
    async run(t) {
        const RADICE = path.join(__dirname, '..', '..');
        const url = 'file:///' + path.join(RADICE, 'storia.html').replace(/\\/g, '/') + '?campaign=forbiddenMemories';
        const page = await t.browser.newPage();
        const errori = [];
        page.on('pageerror', (e) => errori.push(e.message));
        await page.addInitScript(() => { window.AUTH_GATE_SKIP = true; });
        try {
            await page.goto(url);
            await page.waitForFunction(() => !!(window.StoryProgress && window.SaveManager), null, { timeout: 25000 });
            const esito = await page.evaluate(() => {
                if (!SaveManager.hasSave()) SaveManager.createNew('Tester');
                const fm = storyCampaignsDatabase.find((c) => c.id === 'forbiddenMemories');
                const problemi = [];
                const tappe = StoryProgress.getTappe('forbiddenMemories');
                const ids = tappe.map((x) => x.id);
                const nodo = (id) => tappe.find((x) => x.id === id);
                const torneo = StoryProgress.getTorneo('forbiddenMemories', 'fm-3-torneo');
                const proveTorneo = torneo.tappe.map((x) => x.id);
                const prima = (a, b, elenco) => elenco.indexOf(a) >= 0 && elenco.indexOf(a) < elenco.indexOf(b);

                // --- Trama -------------------------------------------------
                if (tappe.some((x) => x.capitoloId !== 'fm-presente' && x.characterId === 'priestessIsis')) {
                    problemi.push('La Sacerdotessa Isis non deve comparire nel passato');
                }
                if (!torneo.tappe.some((x) => x.characterId === 'ishizu')) problemi.push('Isis deve restare fra i finalisti del torneo');
                if (!(prima('fm-1-teana', 'fm-1-jono', ids) && prima('fm-1-jono', 'fm-1-seto-festa', ids))) {
                    problemi.push('Il passato si apre con Teana, poi Jono, poi Seto alla festa');
                }
                ['fm-2-seto', 'fm-3-shadi'].forEach((id) => {
                    if (!nodo(id) || nodo(id).kind !== 'scene') problemi.push(`${id}: nel gioco non è un duello`);
                });
                if (!(prima('fm-3t-keith', 'fm-3t-dentro-il-puzzle', proveTorneo) && prima('fm-3t-dentro-il-puzzle', 'fm-3t-shadi', proveTorneo))) {
                    problemi.push('Shadi porta Yugi dentro il Puzzle dopo i preliminari, prima delle finali');
                }
                const ritorno = ['fm-4-valle', 'fm-4-mage-soldier', 'fm-4-jono2', 'fm-4-teana2', 'fm-4-seto-consiglio', 'fm-4-scena-ocean'];
                ritorno.slice(1).forEach((id, i) => { if (!prima(ritorno[i], id, ids)) problemi.push(`Ritorno in Egitto fuori ordine: ${id}`); });
                if (!(prima('fm-5-labirinto', 'fm-5-seto2', ids) && prima('fm-5-seto2', 'fm-5-sebek', ids))) {
                    problemi.push('Seto nel labirinto va dopo Labyrinth Mage e prima di Sebek');
                }
                if (!characterDatabase.some((c) => c.id === 'mageSoldier')) problemi.push('Mage Soldier deve esistere nel roster');
                const testi = JSON.stringify(fm);
                if (/tremila/i.test(testi)) problemi.push('Memorie Proibite conta cinquemila anni, mai tremila');
                if (/QUALCUN ALTRO/.test(testi)) problemi.push('Heishin vuole gli Oggetti per sé, non per qualcun altro');
                if (!/sei Oggetti/i.test(JSON.stringify(torneo))) problemi.push('I finalisti del torneo portano sei Oggetti');

                // --- Migrazione --------------------------------------------
                const nuove = fm.separazioni.filter((s) => /^fm-(ritorno-in-egitto|seto-labirinto|dentro-il-puzzle)$/.test(s.id));
                const timbroVecchio = fm.separazioni.filter((s) => nuove.indexOf(s) === -1).map((s) => s.id);
                const idsNuovi = nuove.reduce((acc, s) => acc.concat(s.nuove || s.ids || []), []);
                // Campagna: si arriva subito dopo l'ultima tappa VECCHIA già
                // fatta; le tappe nuove che le stanno davanti contano come
                // fatte, quelle dopo restano da giocare.
                const vecchie = ids.filter((id) => idsNuovi.indexOf(id) === -1);
                for (let fatte = 0; fatte <= vecchie.length; fatte++) {
                    SaveManager.setStoryState('forbiddenMemories', { completate: fatte, sotto: {}, separazioni: timbroVecchio });
                    const dopo = StoryProgress.getProgress('forbiddenMemories').completate;
                    const atteso = fatte === 0 ? 0 : ids.indexOf(vecchie[fatte - 1]) + 1;
                    if (dopo !== atteso) problemi.push(`campagna: ${fatte} fatte prima -> ${dopo}, atteso ${atteso}`);
                }
                // Torneo: stessa regola sulle sue prove. Si prova fino a
                // un'ultima prova ESCLUSA: un torneo finito con la campagna
                // ancora ferma su di lui non esiste (chi chiude il torneo
                // avanza la campagna nella stessa scrittura), e lo stato
                // finito viene giustamente superato.
                const indiceTorneo = ids.indexOf('fm-3-torneo');
                const proveVecchie = proveTorneo.filter((id) => idsNuovi.indexOf(id) === -1);
                for (let fatte = 0; fatte < proveVecchie.length; fatte++) {
                    SaveManager.setStoryState('forbiddenMemories', {
                        completate: ids.filter((id) => idsNuovi.indexOf(id) === -1).indexOf('fm-3-torneo'),
                        sotto: { 'fm-3-torneo': fatte }, separazioni: timbroVecchio
                    });
                    const p = StoryProgress.getProgress('forbiddenMemories');
                    const atteso = fatte === 0 ? 0 : proveTorneo.indexOf(proveVecchie[fatte - 1]) + 1;
                    if ((p.sotto['fm-3-torneo'] || 0) !== atteso) problemi.push(`torneo: ${fatte} fatte prima -> ${p.sotto['fm-3-torneo']}, atteso ${atteso}`);
                    if (p.completate !== indiceTorneo) problemi.push(`torneo: la campagna deve restare sul torneo (${p.completate} invece di ${indiceTorneo})`);
                }
                return problemi;
            });
            t.assert(esito.length === 0, `Problemi in Memorie Proibite:\n${esito.join('\n')}`);
            t.assert(errori.length === 0, `Nessun errore in pagina: ${JSON.stringify(errori)}`);
        } finally {
            await page.close();
        }
    }
};
