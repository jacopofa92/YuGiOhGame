// Modalità Storia: si avanza vincendo, e solo vincendo.
// =====================================================================
// `standalone`: la Storia vive su una pagina sua (storia.html), non su
// quella del duello che la suite apre per tutti gli altri spec.
//
// La regola che vale la pena sorvegliare piu' di ogni altra e' la
// seconda: l'esito dell'ultimo duello arriva qui come una breadcrolla in
// sessionStorage, e va CONSUMATA. Senza, un semplice ricaricamento della
// pagina rifarebbe avanzare la campagna con lo stesso duello, e si
// arriverebbe in fondo senza giocare — un difetto che non si vede mai
// provando a mano, perche' a mano non si ricarica la pagina apposta.
const path = require('path');
const fs = require('fs');

module.exports = {
    standalone: true,
    name: 'Modalità Storia: avanzamento, breadcrolla consumata, sconfitta innocua',
    async run(t) {
        const page = await t.browser.newPage({ viewport: { width: 1200, height: 900 } });
        const erroriPagina = [];
        page.on('pageerror', (e) => erroriPagina.push(e.message));
        await page.addInitScript(() => { window.AUTH_GATE_SKIP = true; });

        const RADICE = path.join(__dirname, '..', '..');
        const url = (q) => 'file:///' + path.join(RADICE, 'storia.html').replace(/\\/g, '/') + (q || '');
        const leggiProgresso = () => page.evaluate(() => {
            const save = JSON.parse(localStorage.getItem('yugiohDuelArenaSave') || '{}');
            return (save.story || {}).anime || { completate: 0 };
        });
        // Fa credere alla pagina di essere appena tornata da un duello.
        const tornaDaDuello = async (playerWon) => {
            await page.evaluate((vinto) => {
                sessionStorage.setItem('ygoLastDuelOutcome', JSON.stringify({
                    mode: 'story', campaignId: 'anime', playerWon: vinto, timestamp: Date.now()
                }));
            }, playerWon);
            await page.reload();
            await page.waitForSelector('.nm-node', { timeout: 20000 });
        };

        try {
            // --- L'elenco distingue le campagne pronte da quelle future --
            await page.goto(url());
            await page.waitForSelector('.campagna', { timeout: 20000 });
            // Confronto DERIVATO e non per posizione: "bloccata se e solo
            // se non ha tappe" resta vera aggiungendo campagne o
            // riordinandole, mentre "la prima è giocabile" si rompe al
            // primo cambiamento e non dice nulla di utile.
            const elenco = await page.evaluate(() => {
                const bloccate = [...document.querySelectorAll('.campagna')]
                    .map((c) => c.classList.contains('campagna--bloccata'));
                return StoryProgress.getCampaigns().map((c, i) => ({
                    id: c.id,
                    vuota: StoryProgress.getTappe(c.id).length === 0,
                    bloccata: bloccate[i]
                }));
            });
            t.assert(elenco.length >= 3, `Devono comparire tutte le campagne dichiarate (rilevate ${elenco.length})`);
            const incoerenti = elenco.filter((c) => c.vuota !== c.bloccata);
            t.assert(incoerenti.length === 0,
                `Una campagna dev'essere bloccata esattamente quando non ha tappe — dichiararla e non poterla giocare è più onesto che nasconderla, ma mostrarla giocabile e poi non farla partire no: ${JSON.stringify(incoerenti)}`);
            t.assert(elenco.some((c) => !c.vuota), 'Almeno una campagna dev\'essere giocabile');

            // --- Ogni duello punta a un personaggio che esiste ----------
            // Un characterId sbagliato non fallisce in modo rumoroso: manda
            // in un duello contro il vuoto, e si scopre solo arrivandoci.
            //
            // Il roster si legge dal FILE e non dalla pagina: storia.html
            // non carica characters-db.js (non gli serve, le etichette
            // della mappa stanno nel catalogo delle campagne), e caricarlo
            // solo per far girare un controllo sarebbe far pagare alla
            // pagina il costo del test.
            const rosterSrc = fs.readFileSync(path.join(RADICE, 'js', 'data', 'characters-db.js'), 'utf8');
            const idsRoster = [...rosterSrc.matchAll(/id: '([^']+)'/g)].map((m) => m[1]);
            t.assert(idsRoster.length > 20, `Il roster letto dal file sembra vuoto (${idsRoster.length} id)`);
            const tappeDuello = await page.evaluate(() => StoryProgress.getCampaigns().flatMap((c) =>
                StoryProgress.getTappe(c.id)
                    .filter((t) => t.kind === 'duel')
                    .map((t) => ({ campagna: c.id, tappa: t.id, characterId: t.characterId }))));
            const personaggiRotti = tappeDuello
                .filter((t) => idsRoster.indexOf(t.characterId) === -1)
                .map((t) => `${t.campagna}/${t.tappa}: "${t.characterId}"`);
            t.assert(personaggiRotti.length === 0,
                `Tappe che puntano a un personaggio inesistente: ${personaggiRotti.join(', ')}`);
            t.assert(tappeDuello.length > 25,
                `Le campagne scritte devono contenere parecchi duelli (rilevati ${tappeDuello.length})`);

            // --- La mappa apre sulla prima tappa, il resto e' coperto ----
            await page.goto(url('?campaign=anime'));
            await page.waitForSelector('.nm-node', { timeout: 20000 });
            const mappa = await page.evaluate(() => ({
                nodi: document.querySelectorAll('.nm-node').length,
                correnti: document.querySelectorAll('.nm-node--corrente').length,
                cliccabili: [...document.querySelectorAll('.nm-node')].filter((n) => !n.disabled).length,
                etichetteSvelate: [...document.querySelectorAll('.nm-node:not(.nm-node--bloccata) .nm-label')].map((l) => l.textContent)
            }));
            t.assert(mappa.nodi > 15, `La campagna anime deve avere un sentiero lungo (rilevate ${mappa.nodi} tappe)`);
            t.assert(mappa.correnti === 1, `Dev'esserci ESATTAMENTE una tappa corrente (rilevate ${mappa.correnti})`);
            t.assert(mappa.cliccabili === 1,
                `Solo la tappa corrente dev'essere cliccabile: e' cio' che rende la Storia una storia invece di duelli a scelta libera (cliccabili ${mappa.cliccabili})`);
            t.assert(mappa.etichetteSvelate.length === 1,
                'Le tappe bloccate non devono rivelare chi ci aspetta');

            // --- Una scena si supera leggendola -------------------------
            const primaScena = await leggiProgresso();
            await page.locator('.nm-node--corrente').click();
            await page.waitForSelector('.scena', { timeout: 10000 });
            await page.locator('.scena .btn').click();
            await page.waitForTimeout(400);
            const dopoScena = await leggiProgresso();
            t.assert(dopoScena.completate === (primaScena.completate || 0) + 1,
                `Una scena si supera leggendola (da ${primaScena.completate} a ${dopoScena.completate})`);

            // --- L'URL del duello porta tutto quello che serve ----------
            const href = await page.evaluate(() => StoryProgress.urlDuello('anime', StoryProgress.getTappaCorrente('anime')));
            t.assert(/mode=story/.test(href) && /campaign=anime/.test(href) && /character=/.test(href) && /difficulty=/.test(href),
                `L'URL del duello deve portare modalita', campagna, personaggio e difficolta': ${href}`);

            // --- La breadcrolla la SCRIVE davvero il duello -------------
            // Tutti i controlli qui sotto la scrivono a mano, quindi
            // provano il lettore e non lo scrittore. E' esattamente cosi'
            // che un `campaignId` mancante in js/duel-session.js e'
            // passato inosservato: la Storia non sarebbe mai avanzata
            // giocando davvero, e il test sarebbe restato verde.
            const duello = await t.browser.newPage({ viewport: { width: 1200, height: 900 } });
            try {
                await duello.addInitScript(() => { window.AUTH_GATE_SKIP = true; });
                const urlDuello = 'file:///' + path.join(RADICE, 'duelMonstersCore.html').replace(/\\/g, '/')
                    + '?mode=story&campaign=anime&character=joey&difficulty=Medio&autowin=1';
                await duello.goto(urlDuello);
                await duello.waitForFunction(() => sessionStorage.getItem('ygoLastDuelOutcome') !== null,
                    null, { timeout: 60000 });
                const breadcrolla = JSON.parse(await duello.evaluate(() => sessionStorage.getItem('ygoLastDuelOutcome')));
                t.assert(breadcrolla.mode === 'story',
                    `Il duello deve dichiarare la modalità (rilevato ${breadcrolla.mode})`);
                t.assert(breadcrolla.campaignId === 'anime',
                    `Il duello deve dichiarare la CAMPAGNA, altrimenti storia.html non sa cosa far avanzare (rilevato ${JSON.stringify(breadcrolla.campaignId)})`);
                t.assert(breadcrolla.playerWon === true,
                    'Il duello deve dichiarare com\'è finito');
            } finally {
                await duello.close();
            }

            // --- Vincere fa avanzare... --------------------------------
            const primaDelDuello = await leggiProgresso();
            await tornaDaDuello(true);
            const dopoVittoria = await leggiProgresso();
            t.assert(dopoVittoria.completate === primaDelDuello.completate + 1,
                `Una vittoria deve far avanzare di una tappa (da ${primaDelDuello.completate} a ${dopoVittoria.completate})`);

            // --- ...ma una volta sola ----------------------------------
            const breadcrumb = await page.evaluate(() => sessionStorage.getItem('ygoLastDuelOutcome'));
            t.assert(breadcrumb === null, 'La breadcrolla dell\'esito dev\'essere consumata, non lasciata li\'');
            await page.reload();
            await page.waitForSelector('.nm-node', { timeout: 20000 });
            const dopoReload = await leggiProgresso();
            t.assert(dopoReload.completate === dopoVittoria.completate,
                `Ricaricare la pagina NON deve far avanzare di nuovo con lo stesso duello (da ${dopoVittoria.completate} a ${dopoReload.completate}): altrimenti si arriva in fondo alla campagna senza giocare`);

            // --- Perdere non fa arretrare ne' avanzare ------------------
            await tornaDaDuello(false);
            const dopoSconfitta = await leggiProgresso();
            t.assert(dopoSconfitta.completate === dopoVittoria.completate,
                `Una sconfitta lascia la tappa dov'era (rilevato ${dopoSconfitta.completate} invece di ${dopoVittoria.completate})`);
            const avviso = await page.evaluate(() => {
                const el = document.querySelector('.avviso');
                return el ? el.textContent : null;
            });
            t.assert(avviso && /pers/i.test(avviso),
                'Dopo una sconfitta la pagina deve dirlo: tornare a una mappa immutata senza spiegazioni sembra un difetto');

            // --- Un duello di un'ALTRA modalita' non tocca la Storia ----
            const primaEstraneo = await leggiProgresso();
            await page.evaluate(() => {
                sessionStorage.setItem('ygoLastDuelOutcome', JSON.stringify({
                    mode: 'tournament', tournamentId: 'duelistKingdom', playerWon: true, timestamp: Date.now()
                }));
            });
            await page.reload();
            await page.waitForSelector('.nm-node', { timeout: 20000 });
            const dopoEstraneo = await leggiProgresso();
            t.assert(dopoEstraneo.completate === primaEstraneo.completate,
                'Un duello di torneo non deve far avanzare la campagna');

            // --- Finire la campagna paga, una volta sola ----------------
            const premi = await page.evaluate(() => {
                const tappe = StoryProgress.getTappe('anime');
                SaveManager.setStoryState('anime', { completate: tappe.length, finita: true, premiata: false });
                const prima = SaveManager.getCurrency().credits;
                const voci = StoryProgress.riscuotiPremioFinale('anime');
                const dopoPrimo = SaveManager.getCurrency().credits;
                const bis = StoryProgress.riscuotiPremioFinale('anime');
                const dopoSecondo = SaveManager.getCurrency().credits;
                return { voci: voci.length, guadagno: dopoPrimo - prima, bis: bis.length, guadagnoBis: dopoSecondo - dopoPrimo };
            });
            t.assert(premi.voci > 0 && premi.guadagno > 0,
                `Completare la campagna deve pagare (voci ${premi.voci}, crediti +${premi.guadagno})`);
            t.assert(premi.bis === 0 && premi.guadagnoBis === 0,
                'Il premio finale si riscuote una volta sola: la campagna resta rigiocabile, il premio no');

            t.assert(erroriPagina.length === 0, `Errori JS sulla pagina Storia: ${erroriPagina.join(' | ')}`);
        } finally {
            await page.close();
        }
    }
};
