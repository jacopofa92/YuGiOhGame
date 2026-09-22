// L'autowin delle Storie è dell'amministratore, non di tutti.
// =====================================================================
// Era una costante accesa nel codice: chiunque aprisse una campagna
// vinceva ogni duello senza giocarlo. Ora servono DUE cose insieme —
// l'interruttore acceso su questo dispositivo (dal Pannello Admin) e un
// account che sia davvero di un amministratore.
//
// Quello che va sorvegliato è la porta CHIUSA, non quella aperta: se
// domani qualcuno rimette una scorciatoia, o inverte per sbaglio una
// condizione, il difetto non si vede giocando — al contrario, sembra che
// il gioco funzioni benissimo — e si scopre solo quando un giocatore vero
// finisce una campagna senza duellare.
//
// `standalone`: la Storia vive su una pagina sua.
const path = require('path');

module.exports = {
    standalone: true,
    name: 'Autowin nelle Storie: solo con interruttore acceso E account amministratore',
    async run(t) {
        const RADICE = path.join(__dirname, '..', '..');
        const url = 'file:///' + path.join(RADICE, 'storia.html').replace(/\\/g, '/');
        const page = await t.browser.newPage({ viewport: { width: 1200, height: 900 } });
        const erroriPagina = [];
        page.on('pageerror', (e) => erroriPagina.push(e.message));
        await page.addInitScript(() => { window.AUTH_GATE_SKIP = true; });

        /**
         * Apre la mappa con l'interruttore in un certo stato e con
         * `CloudSync.isAdmin()` forzato, poi chiede l'URL del prossimo
         * duello. Si guarda l'URL e non "cosa succede nel duello" perché
         * è lì che la decisione viene presa: l'autowin è un parametro
         * che storia.html attacca (o non attacca) al link.
         *
         * `isAdmin` si impone con addInitScript DOPO aver caricato la
         * pagina una prima volta? No: si riscrive la funzione appena il
         * modulo esiste, perché cloud-sync.js definisce window.CloudSync
         * al proprio caricamento e sovrascriverebbe qualunque finto
         * preparato prima.
         */
        async function urlDelDuello(interruttore, admin) {
            await page.goto(url + '?campaign=anime');
            await page.waitForFunction(() => !!(window.StoryProgress && window.StoryAutowin),
                null, { timeout: 20000 });
            await page.evaluate((d) => {
                StoryAutowin.imposta(d.interruttore);
                if (!window.CloudSync) window.CloudSync = {};
                CloudSync.isAdmin = function () { return d.admin; };
            }, { interruttore: interruttore, admin: admin });
            // test-shortcuts.js avvolge StoryProgress.urlDuello dentro un
            // setInterval da 100ms: senza questa attesa si misurerebbe
            // ancora la funzione originale, e ogni caso risulterebbe
            // "niente autowin" — cioè il test passerebbe per il motivo
            // sbagliato.
            await page.waitForTimeout(400);
            return page.evaluate(() => StoryProgress.urlDuello('anime', StoryProgress.getTappaCorrente('anime')));
        }

        try {
            // Il caso di gran lunga più importante: un giocatore qualunque,
            // che non ha mai sentito parlare dell'interruttore.
            const normale = await urlDelDuello(false, false);
            t.assert(!/autowin=1/.test(normale),
                `Un giocatore normale deve duellare davvero: ${normale}`);

            // Interruttore acceso ma account non amministratore: la chiave
            // in localStorage se la può scrivere chiunque, quindi da sola
            // non deve bastare.
            const soloInterruttore = await urlDelDuello(true, false);
            t.assert(!/autowin=1/.test(soloInterruttore),
                `Il solo interruttore in localStorage non deve bastare senza i permessi: ${soloInterruttore}`);

            // Amministratore ma interruttore spento: è il valore di
            // partenza, e dev'essere davvero spento — altrimenti l'opzione
            // non esiste, esiste solo il vecchio comportamento.
            const soloAdmin = await urlDelDuello(false, true);
            t.assert(!/autowin=1/.test(soloAdmin),
                `Con l'interruttore spento nemmeno un amministratore deve vincere da solo: ${soloAdmin}`);

            // E infine il caso che serve davvero a chi collauda.
            const acceso = await urlDelDuello(true, true);
            t.assert(/autowin=1/.test(acceso),
                `Con interruttore acceso e account amministratore l'autowin deve partire: ${acceso}`);
            // La barra rossa di prova è un'altra cosa (?test=1) e non
            // deve arrivare per conto suo.
            t.assert(!/test=1/.test(acceso),
                `L'autowin non deve tirarsi dietro anche il modo prova: ${acceso}`);

            // Acceso, si annuncia: vincere senza giocare e senza sapere
            // perché sembra un gioco rotto.
            const pillola = await page.waitForSelector('#testAutowinPill', { timeout: 6000 }).catch(() => null);
            t.assert(pillola, 'Con l\'autowin attivo la mappa deve dirlo, invece di far vincere in silenzio');

            t.assert(erroriPagina.length === 0, 'Errori JS in pagina: ' + erroriPagina.join(' | '));
        } finally {
            await page.close();
        }
    }
};
