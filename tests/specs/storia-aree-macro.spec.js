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

        const AREA = 'anime-area-regno';

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
            t.assert(struttura.aree === struttura.totale && struttura.aree >= 5,
                `Sulla mappa grande devono esserci solo aree, e almeno cinque: ${JSON.stringify(struttura)}`);
            t.assert(struttura.senzaMappa.length === 0,
                `Aree senza una mappa propria: ${struttura.senzaMappa}`);
            t.assert(new Set(struttura.posizioni).size === struttura.posizioni.length,
                `Due aree si sovrappongono sulla mappa: ${struttura.posizioni}`);

            // --- Entrandoci si trova la SUA mappa -----------------------
            await page.goto(url('?campaign=anime&torneo=' + AREA));
            await page.waitForSelector('.nm-node', { timeout: 20000 });
            // Si contano le TAPPE, non i passaggi fra le mappe di un'area
            // (il Regno ne ha due), e si confrontano con quelle della mappa
            // mostrata, non con l'area intera.
            const dentro = await page.evaluate((id) => ({
                nodi: document.querySelectorAll('.nm-node:not(.nm-node--passaggio)').length,
                quante: (() => {
                    const p = StoryProgress.getPagineConStato('anime', id);
                    return p.pagine[p.corrente].prove.length;
                })(),
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
                // `completate: 1` è il Regno (il prologo gli sta davanti), e
                // il timbro dice che lo stato è già nella forma di oggi:
                // senza, verrebbe letto come un salvataggio vecchio e il
                // suo progresso spostato nel prologo — e il controllo qui
                // sotto passerebbe a vuoto, 0 prima e 0 dopo.
                // Il timbro si legge dal catalogo: scritto a mano,
                // invecchierebbe alla prossima area staccata.
                SaveManager.setStoryState('anime', {
                    completate: 1, finita: false, premiata: false, sotto: { [id]: 3 },
                    separazioni: storyCampaignsDatabase.find((c) => c.id === 'anime').separazioni.map((s) => s.id)
                });
                const prima = StoryProgress.getProgressoTorneo('anime', id);
                sessionStorage.setItem('ygoLastDuelOutcome', JSON.stringify({
                    mode: 'story', campaignId: 'anime', torneoId: id,
                    playerWon: false, opponentId: 'joey', timestamp: Date.now()
                }));
                const esito = StoryProgress.consumaEsitoDuello('anime');
                return { prima: prima, dopo: StoryProgress.getProgressoTorneo('anime', id), perso: esito.perso };
            }, AREA);
            t.assert(perdita.prima === 3, `Lo stato timbrato va letto così com'è (rilevato ${perdita.prima} invece di 3)`);
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

            // --- UN SALVATAGGIO DI PRIMA DEL PROLOGO NON PERDE NIENTE ------
            // Il prologo era la testa del Regno: 5 tappe che oggi stanno in
            // un'area loro. L'avanzamento si salva per posizione, quindi un
            // salvataggio vecchio va riletto nella forma nuova — altrimenti
            // chi era a metà Regno si ritroverebbe a metà prologo, e chi era
            // in Battle City tornerebbe indietro di un'area.
            const migrazione = await page.evaluate(() => {
                const leggi = (stato) => {
                    SaveManager.setStoryState('anime', stato);
                    const p = StoryProgress.getProgress('anime');
                    return { c: p.completate, prologo: p.sotto['anime-area-prologo'] || 0, regno: p.sotto['anime-area-regno'] || 0 };
                };
                const out = {
                    // Dentro il vecchio Regno, ancora nelle tappe del prologo.
                    aMetaPrologo: leggi({ completate: 0, sotto: { 'anime-area-regno': 3 } }),
                    // Dentro il vecchio Regno, oltre il prologo: il resto del
                    // Regno resta dov'era, e si giocano le tappe nuove.
                    oltrePrologo: leggi({ completate: 0, sotto: { 'anime-area-regno': 8 } }),
                    // Già in Battle City: tutto fatto, un passo più avanti
                    // (il prologo davanti) e il Regno pieno, comprese le
                    // tappe nate col castello.
                    inBattleCity: leggi({ completate: 1, sotto: { 'anime-area-regno': 14, 'anime-area-battlecity1': 2 } })
                };
                // Il castello: Pegasus chiudeva l'isola, e ora gli stanno
                // davanti due tappe nate col castello. Chi era arrivato
                // davanti a lui (qui già riportato in pari col prologo)
                // entra nel castello dalla prima delle due.
                const statoProva = (stato) => {
                    SaveManager.setStoryState('anime', stato);
                    const p = StoryProgress.getProgress('anime');
                    const area = StoryProgress.getTappaCorrente('anime');
                    return { c: p.completate, regno: p.sotto['anime-area-regno'] || 0,
                        prova: (area.tappe[p.sotto[area.id] || 0] || {}).id };
                };
                out.davantiAPegasus = statoProva({
                    completate: 1, sotto: { 'anime-area-prologo': 7, 'anime-area-regno': 8 },
                    separazioni: ['prologo-domino-city']
                });
                // Per un giorno il castello è stato un'area a sé: chi era
                // dentro (a una tappa) ci si ritrova, ora dentro il Regno.
                out.dalCastelloArea = statoProva({
                    completate: 2, sotto: { 'anime-area-prologo': 7, 'anime-area-regno': 8, 'anime-area-castello': 1 },
                    separazioni: ['prologo-domino-city', 'castello-pegasus']
                });
                // Scrivere lo timbra: rileggendolo non si migra una seconda volta.
                StoryProgress.ricomincia('anime');
                out.timbro = (SaveManager.getStoryState('anime').separazioni || []).slice();
                out.attese = storyCampaignsDatabase.find((c) => c.id === 'anime').separazioni.map((s) => s.id);
                return out;
            });
            t.assert(migrazione.aMetaPrologo.c === 0 && migrazione.aMetaPrologo.prologo === 3 && migrazione.aMetaPrologo.regno === 0,
                `A metà delle vecchie tappe del prologo si deve restare lì: ${JSON.stringify(migrazione.aMetaPrologo)}`);
            t.assert(migrazione.oltrePrologo.c === 0 && migrazione.oltrePrologo.prologo === 5 && migrazione.oltrePrologo.regno === 3,
                `Oltre il prologo, il Regno deve tenere il suo avanzamento: ${JSON.stringify(migrazione.oltrePrologo)}`);
            t.assert(migrazione.inBattleCity.c === 2 && migrazione.inBattleCity.regno === 11,
                `Chi era già oltre il Regno non deve tornare indietro: ${JSON.stringify(migrazione.inBattleCity)}`);
            t.assert(migrazione.davantiAPegasus.c === 1 && migrazione.davantiAPegasus.prova === 'anime-2c-scena',
                `Chi era davanti a Pegasus deve entrare nel castello dalla prima tappa nuova: ${JSON.stringify(migrazione.davantiAPegasus)}`);
            t.assert(migrazione.dalCastelloArea.c === 1 && migrazione.dalCastelloArea.regno === 9
                && migrazione.dalCastelloArea.prova === 'anime-2c-mai',
                `Chi era dentro il castello-area deve ritrovarsi allo stesso punto dentro il Regno: ${JSON.stringify(migrazione.dalCastelloArea)}`);

            // --- DUE MAPPE NELLO STESSO REGNO --------------------------
            // L'isola e poi, battuto Kaiba, gli interni del castello. Si
            // controlla il dato (dove comincia la seconda mappa) e la
            // pagina vera: a campagna al castello si apre il castello, coi
            // passaggi per tornare sull'isola, e dall'isola si torna avanti.
            const mappe = await page.evaluate(() => {
                const tStamp = storyCampaignsDatabase.find((c) => c.id === 'anime').separazioni.map((s) => s.id);
                SaveManager.setStoryState('anime', {
                    completate: 1, sotto: { 'anime-area-prologo': 7, 'anime-area-regno': 8 }, separazioni: tStamp
                });
                try { sessionStorage.setItem('ygoStoriaMappaVista:anime-area-regno:1', '1'); } catch (e) { /* */ }
                const p = StoryProgress.getPagineConStato('anime', 'anime-area-regno');
                return {
                    quante: p.pagine.length, corrente: p.corrente,
                    primaDelCastello: p.pagine[1] && p.pagine[1].prove[0].id,
                    ultimaDellIsola: p.pagine[0].prove[p.pagine[0].prove.length - 1].id
                };
            });
            t.assert(mappe.quante === 2 && mappe.corrente === 1,
                `Il Regno deve avere due mappe, e davanti a Pegasus la corrente è la seconda: ${JSON.stringify(mappe)}`);
            t.assert(mappe.ultimaDellIsola === 'anime-2-kaiba' && mappe.primaDelCastello === 'anime-2c-scena',
                `L'isola finisce con Kaiba e il castello comincia dall'ingresso: ${JSON.stringify(mappe)}`);

            await page.goto(url('?campaign=anime&torneo=' + AREA));
            await page.waitForSelector('.nm-node', { timeout: 20000 });
            const sulCastello = await page.evaluate(() => ({
                sfondo: getComputedStyle(document.querySelector('.nm-canvas')).backgroundImage,
                nodi: document.querySelectorAll('.nm-node').length,
                capitolo: document.getElementById('mappaCapitolo').textContent
            }));
            // Il disegno si posa in asincrono: si guarda il testo e i nodi
            // subito, lo sfondo dopo un attimo.
            await page.waitForFunction(() => /castello_pegasus/.test(getComputedStyle(document.querySelector('.nm-canvas')).backgroundImage),
                null, { timeout: 10000 });
            // 3 tappe del castello + il passaggio di ritorno sull'isola.
            t.assert(sulCastello.nodi === 4 && /Castello di Pegasus/.test(sulCastello.capitolo),
                `Davanti a Pegasus la pagina deve aprirsi sul castello: ${JSON.stringify(sulCastello)}`);
            await page.locator('.nm-node', { hasText: 'Torna sull\'isola' }).click();
            await page.waitForFunction(() => /storia_anime_regno/.test(getComputedStyle(document.querySelector('.nm-canvas')).backgroundImage),
                null, { timeout: 10000 });
            const sullIsola = await page.evaluate(() => ({
                nodi: document.querySelectorAll('.nm-node').length,
                passaggioAvanti: !!document.querySelector('.nm-node--apribile .nm-label')
                    && [...document.querySelectorAll('.nm-node')].some((n) => /Il Castello/.test(n.textContent) && !n.disabled)
            }));
            // 8 tappe dell'isola + il passaggio verso il castello, aperto.
            t.assert(sullIsola.nodi === 9 && sullIsola.passaggioAvanti,
                `Sull'isola ci devono essere le sue tappe e il passaggio aperto verso il castello: ${JSON.stringify(sullIsola)}`);

            // --- SU UNO SCHERMO PIÙ GRANDE DEL DISEGNO -------------------
            // Segnalato su un monitor 2K: il mondo si allargava fino alla
            // finestra e il disegno lo seguiva, ma i nodi restavano alle
            // coordinate del disegno — sentiero schiacciato in alto a
            // sinistra. Il mondo deve restare grande quanto il disegno, e
            // a riempire la finestra deve pensarci lo zoom.
            await page.setViewportSize({ width: 2560, height: 1300 });
            await page.goto(url('?campaign=anime&torneo=' + AREA + '&pagina=0'));
            await page.waitForSelector('.nm-node', { timeout: 20000 });
            const grande = await page.evaluate(() => {
                const canvas = document.querySelector('.nm-canvas');
                const vp = document.getElementById('mappaViewport');
                return { larghezza: parseFloat(canvas.style.width), zoom: vp.__nmZoom || 1 };
            });
            t.assert(grande.larghezza === 1672 && grande.zoom > 1,
                `Su uno schermo più grande della mappa il mondo resta grande quanto il disegno e si ingrandisce con lo zoom: ${JSON.stringify(grande)}`);
            await page.setViewportSize({ width: 1280, height: 900 });

            // --- RILEGGERE UNA SCENA NON LA SUPERA DI NUOVO ---------------
            // Segnalato dall'utente come "dopo quel nodo mi ributta alla
            // mappa principale": rileggere "Il cancello si apre" contava
            // come superarla un'altra volta, e alla seconda rilettura il
            // Regno risultava vinto senza aver giocato Mai né Pegasus.
            await page.evaluate(() => {
                SaveManager.setStoryState('anime', {
                    completate: 1, sotto: { 'anime-area-prologo': 7, 'anime-area-regno': 9 },
                    separazioni: storyCampaignsDatabase.find((c) => c.id === 'anime').separazioni.map((s) => s.id)
                });
            });
            await page.goto(url('?campaign=anime&torneo=' + AREA + '&pagina=1'));
            await page.waitForSelector('.nm-node', { timeout: 20000 });
            await page.locator('.nm-node', { hasText: 'Il cancello si apre' }).click();
            await page.waitForSelector('.sc-scena', { timeout: 10000 });
            const scadenza = Date.now() + 25000;
            while (Date.now() < scadenza) {
                const stato = await page.evaluate(() => {
                    const s = document.querySelector('.sc-scena');
                    return s ? (s.classList.contains('is-visibile') ? 'v' : 'c') : null;
                });
                if (!stato) break;
                if (stato === 'v') await page.keyboard.press('Enter');
                await page.waitForTimeout(200);
            }
            await page.waitForTimeout(400);
            const dopoRilettura = await page.evaluate(() => ({
                regno: StoryProgress.getProgress('anime').sotto['anime-area-regno'],
                completate: StoryProgress.getProgress('anime').completate,
                ancoraDentro: /torneo=anime-area-regno/.test(location.search)
            }));
            t.assert(dopoRilettura.regno === 9 && dopoRilettura.completate === 1 && dopoRilettura.ancoraDentro,
                `Rileggere una scena già letta non deve far avanzare niente: ${JSON.stringify(dopoRilettura)}`);
            t.assert(JSON.stringify(migrazione.timbro) === JSON.stringify(migrazione.attese),
                `Ogni scrittura deve timbrare tutte le separazioni del catalogo: ${JSON.stringify(migrazione.timbro)}`);

            t.assert(erroriPagina.length === 0, 'Errori JS in pagina: ' + erroriPagina.join(' | '));
        } finally {
            await page.close();
        }
    }
};
