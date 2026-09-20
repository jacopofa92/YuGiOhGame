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
            const campagne = await page.evaluate(() => [...document.querySelectorAll('.campagna')]
                .map((c) => c.classList.contains('campagna--bloccata')));
            t.assert(campagne.length >= 3, `Devono comparire tutte le campagne dichiarate (rilevate ${campagne.length})`);
            t.assert(campagne[0] === false, 'La campagna con delle tappe dev\'essere giocabile');
            t.assert(campagne.slice(1).every((b) => b === true),
                'Una campagna senza tappe dev\'essere mostrata bloccata, non nascosta: dichiararla e non poterla giocare e\' piu\' onesto che far finta che non esista');

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
