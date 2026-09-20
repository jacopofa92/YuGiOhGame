// Le scene della Storia sono intermezzi a dialoghi, e una tappa già fatta
// non può far avanzare due volte.
// =====================================================================
// Le scene erano un riquadro fermo con tutto il testo insieme e un
// pulsante "Avanti". Ora usano lo stesso componente degli intermezzi dei
// tornei (js/ui/story-cutscene.js): luogo sullo sfondo, ritratto di chi
// parla, una battuta alla volta che si scrive e avanza al tocco.
//
// Questo spec sorveglia le tre cose che, rompendosi, non si vedrebbero
// subito:
//
//   1) la scena si apre DAVVERO come intermezzo, con il nome di chi parla
//      — anche quando quella voce non è un personaggio del roster (la
//      Storia ne è piena: "Il Bollettino", "La troupe", "Il Principe").
//      Prima quel nome andava perso e la battuta diventava narratore;
//   2) quando il ritratto non esiste compare il SIGILLO col simbolo della
//      tappa, non un cerchio vuoto. Oggi tutti i personaggi hanno almeno
//      un ritratto PROVVISORIO generato, quindi il caso non capita più da
//      solo: qui si provoca, puntando la voce del roster a un file che
//      non c'è. Il meccanismo serve comunque — è quello che copre ogni
//      personaggio aggiunto prima della sua arte;
//   3) una tappa GIÀ SUPERATA si può rileggere ma non fa avanzare niente,
//      e un duello già vinto non è nemmeno riapribile. Questo è il punto
//      che costa caro se si rompe: riaprire un duello vinto lo farebbe
//      rigiocare e il suo esito verrebbe contato una seconda volta, con
//      le ricompense pagate due volte.
//
// `standalone` perché serve storia.html, non la pagina del duello su cui
// lavora il resto della suite.
const path = require('path');

/** La campagna con più materiale su cui provare, e una scena come prima tappa. */
const CAMPAGNA = 'forbiddenMemories';

module.exports = {
    name: 'Storia: scene cinematiche, sigillo al posto del ritratto mancante, e nessun doppio avanzamento',
    standalone: true,
    async run({ browser, assert }) {
        const RADICE = path.join(__dirname, '..', '..');
        const url = 'file:///' + RADICE.replace(/\\/g, '/') + '/storia.html';
        const context = await browser.newContext({
            viewport: { width: 1000, height: 900 },
            serviceWorkers: 'block'
        });
        await context.addInitScript(() => {
            window.AUTH_GATE_SKIP = true;
            // "Alti" accende anche la polvere dorata: qui interessa solo
            // che accenderla non rompa nulla.
            try { localStorage.setItem('ygoVideoDetail', 'alti'); } catch (e) { /* niente */ }
        });
        const page = await context.newPage();
        const erroriPagina = [];
        page.on('pageerror', (e) => erroriPagina.push(e.message));

        try {
            await page.goto(url);
            await page.waitForFunction(() => !!(window.StoryProgress && window.StoryCutscene && window.SaveManager), null, { timeout: 15000 });

            // Un salvataggio e un punto di partenza deterministici: la
            // prima tappa del capitolo dei Cinque Maghi è una scena, e
            // chi parla (High Mage Secmeton) non ha il ritratto su disco.
            const partenza = await page.evaluate((campagna) => {
                if (!SaveManager.hasSave()) SaveManager.createNew('Tester');
                const tappe = StoryProgress.getTappe(campagna);
                const i = tappe.findIndex((t) => t.id === 'fm-4-scena-ocean');
                SaveManager.setStoryState(campagna, { completate: i });
                return { indice: i, totale: tappe.length };
            }, CAMPAGNA);
            assert(partenza.indice > 0, 'Non trovata la scena di partenza fm-4-scena-ocean nel catalogo');

            await page.goto(url + '?campaign=' + CAMPAGNA);
            await page.waitForSelector('.nm-node--corrente', { timeout: 15000 });

            // Si toglie il ritratto a chi parla in questa scena, puntandolo
            // a un file che non esiste: è l'unico modo di provare il
            // ripiego adesso che ogni personaggio ha almeno un ritratto
            // provvisorio generato. Si tocca solo la copia in memoria del
            // roster, niente sul disco.
            await page.evaluate(() => {
                const pg = characterDatabase.find((c) => c.id === 'highMageSecmeton');
                if (pg) pg.image = 'images/characters/__non_esiste__.jpg';
            });

            // --- 1) la scena si apre come intermezzo -------------------
            await page.click('.nm-node--corrente');
            await page.waitForSelector('.sc-scena', { timeout: 10000 });
            // Il cartello d'apertura dura un attimo prima del dialogo.
            await page.waitForFunction(() => {
                const el = document.querySelector('.sc-chi');
                return !!(el && el.textContent.trim());
            }, null, { timeout: 10000 });

            // Il sigillo compare quando l'immagine FALLISCE il caricamento,
            // che è un evento asincrono: leggerlo subito dopo la comparsa
            // del nome lo coglierebbe prima che il browser si sia accorto
            // del file mancante.
            await page.waitForFunction(() => !!document.querySelector('.sc-ritratto.is-sigillo'), null, { timeout: 10000 });

            const scena = await page.evaluate(() => {
                const s = document.querySelector('.sc-scena');
                return {
                    chi: s.querySelector('.sc-chi').textContent.trim(),
                    narratore: s.querySelector('.sc-box').classList.contains('is-narratore'),
                    sigillo: !!s.querySelector('.sc-ritratto.is-sigillo'),
                    simbolo: (s.querySelector('.sc-sigillo') || {}).textContent || '',
                    polvere: !!s.querySelector('.sc-polvere')
                };
            });
            assert(scena.chi === 'High Mage Secmeton',
                `Il nome di chi parla dovrebbe essere "High Mage Secmeton", trovato "${scena.chi}"`);
            assert(!scena.narratore, 'Una battuta con un nome non deve essere resa come voce narrante');

            // --- 2) sigillo al posto del ritratto mancante -------------
            assert(scena.sigillo,
                'Senza il file del ritratto deve comparire il sigillo, non un cerchio vuoto');
            assert(scena.simbolo === '🌊',
                `Il sigillo deve portare il simbolo della tappa (🌊), trovato "${scena.simbolo}"`);
            assert(scena.polvere, 'Con i Dettagli video su "Alti" la scena deve avere la polvere dorata');

            // Il canvas della polvere deve avere una dimensione VERA: se
            // nasce prima che la scena entri nel documento resta di un
            // pixel, e stirato al 100% diventa una lastra d'oro piena.
            const polvere = await page.evaluate(() => {
                const c = document.querySelector('.sc-polvere');
                return { w: c.width, h: c.height };
            });
            assert(polvere.w > 100 && polvere.h > 100,
                `Il canvas della polvere è ${polvere.w}x${polvere.h}: nato prima che la scena avesse dimensioni`);

            // --- la scena si chiude e fa avanzare ----------------------
            const prima = await page.evaluate((c) => SaveManager.getStoryState(c).completate, CAMPAGNA);
            // Si avanza a tastiera: un click sulla scena mentre si sta
            // chiudendo colpirebbe un elemento che si sta staccando.
            for (let i = 0; i < 14; i++) {
                const viva = await page.evaluate(() => !!document.querySelector('.sc-scena.is-visibile'));
                if (!viva) break;
                await page.keyboard.press('Enter');
                await page.waitForTimeout(260);
            }
            await page.waitForFunction(() => !document.querySelector('.sc-scena'), null, { timeout: 15000 });
            const dopo = await page.evaluate((c) => SaveManager.getStoryState(c).completate, CAMPAGNA);
            assert(dopo === prima + 1,
                `Una scena letta deve far avanzare di una tappa sola: da ${prima} a ${dopo}`);

            // --- 3) niente doppio avanzamento sulle tappe già fatte -----
            await page.waitForSelector('.nm-node--corrente', { timeout: 10000 });
            const cliccabili = await page.evaluate(() => {
                const nodi = Array.from(document.querySelectorAll('.nm-node'));
                const fatti = nodi.filter((n) => n.classList.contains('nm-node--fatta'));
                return {
                    fattiTotali: fatti.length,
                    fattiApribili: fatti.filter((n) => !n.disabled).length,
                    fattiBloccati: fatti.filter((n) => n.disabled).length
                };
            });
            assert(cliccabili.fattiApribili > 0,
                'Almeno una tappa già fatta (una scena) deve restare riapribile per rileggerla');
            assert(cliccabili.fattiBloccati > 0,
                'I duelli già vinti NON devono essere riapribili: rigiocarli conterebbe due volte il loro esito');

            // Rileggere una scena già vista non deve toccare il progresso.
            const primaDiRileggere = await page.evaluate((c) => SaveManager.getStoryState(c).completate, CAMPAGNA);
            await page.evaluate(() => {
                const riapribile = Array.from(document.querySelectorAll('.nm-node--fatta'))
                    .find((n) => !n.disabled);
                riapribile.click();
            });
            await page.waitForSelector('.sc-scena', { timeout: 10000 });
            for (let i = 0; i < 14; i++) {
                const viva = await page.evaluate(() => !!document.querySelector('.sc-scena.is-visibile'));
                if (!viva) break;
                await page.keyboard.press('Enter');
                await page.waitForTimeout(260);
            }
            await page.waitForFunction(() => !document.querySelector('.sc-scena'), null, { timeout: 15000 });
            const dopoRilettura = await page.evaluate((c) => SaveManager.getStoryState(c).completate, CAMPAGNA);
            assert(dopoRilettura === primaDiRileggere,
                `Rileggere una scena già vista non deve far avanzare: da ${primaDiRileggere} a ${dopoRilettura}`);

            assert(erroriPagina.length === 0, 'Errori JS in pagina: ' + erroriPagina.join(' | '));
        } finally {
            await context.close();
        }
    }
};
