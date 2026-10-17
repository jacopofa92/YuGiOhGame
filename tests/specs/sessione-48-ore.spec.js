// La sessione di accesso dura 48 ore, poi si deve rifare il login
// (js/cloud/cloud-sync.js, "Durata della sessione"). Supabase terrebbe la
// sessione per sempre; il limite è nostro, lato client.
//
// Con un Supabase finto che ricorda l'uscita (tests/helpers/finto-cloud.js,
// opzione `ricordaUscita`) si prova:
//   1) sessione vecchia di 47 ore: il menu si apre, nessuna uscita;
//   2) sessione vecchia di 49 ore: all'avvio si esce, si arriva al gate con
//      l'avviso, e il salvataggio con le ultime modifiche è già sul cloud;
//   3) nessun segno (sessione nata prima di questa regola): non si caccia
//      nessuno, il segno parte da adesso;
//   4) la sessione scade MENTRE l'app è aperta (ritorno in primo piano): si
//      esce e si torna al gate;
//   5) a metà di un duello non si interrompe niente;
//   6) rifatto l'accesso, il conto riparte.
const path = require('path');
const { creaFintoCloud } = require('../helpers/finto-cloud.js');

const RADICE = path.join(__dirname, '..', '..');
const INDEX = 'file:///' + path.join(RADICE, 'index.html').replace(/\\/g, '/');
const ORA = 60 * 60 * 1000;

module.exports = {
    name: 'Sessione: dura 48 ore, poi si rifà il login (salvando prima il progresso)',
    standalone: true,
    async run({ browser, assert }) {
        const { cloud, collega } = creaFintoCloud();
        const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: 'block' });
        await collega(ctx, { ricordaUscita: true });
        const aspettaMenu = (page) => page.waitForFunction(() => {
            const m = document.getElementById('menuShell');
            return m && getComputedStyle(m).display !== 'none';
        }, null, { timeout: 20000 });
        const aspettaGate = (page) => page.waitForFunction(() => {
            const g = document.getElementById('gateShell');
            return g && getComputedStyle(g).display !== 'none';
        }, null, { timeout: 25000 });
        const creditiNelCloud = () => {
            const riga = cloud.saves['utente-prova'];
            return riga && riga.data.currency ? (riga.data.currency.credits || 0) : null;
        };
        try {
            // Un primo giro per avere un salvataggio sul cloud e una sessione.
            const page = await ctx.newPage();
            await page.goto(INDEX);
            await page.waitForFunction(() => !!(window.SaveManager && window.CloudSync));
            await page.evaluate(() => { SaveManager.createNew('Admin'); SaveManager.addCurrency('credits', 1000); });
            await page.evaluate(() => AutoSync.caricaOra());
            const base = creditiNelCloud();
            assert(base > 0, 'il salvataggio è sul cloud: ' + base);

            // --- 1) 47 ore: tutto normale ---------------------------------------
            await page.evaluate((fa) => localStorage.setItem('ygoSessioneInizio', JSON.stringify({ uid: 'utente-prova', at: Date.now() - fa })), 47 * ORA);
            await page.reload();
            await aspettaMenu(page);
            assert(await page.evaluate(() => localStorage.getItem('__fintoUscito') !== '1'), 'a 47 ore non si esce');

            // --- 3) Nessun segno: non si caccia fuori nessuno --------------------
            await page.evaluate(() => localStorage.removeItem('ygoSessioneInizio'));
            await page.reload();
            await aspettaMenu(page);
            const segno = await page.evaluate(() => JSON.parse(localStorage.getItem('ygoSessioneInizio') || 'null'));
            assert(segno && Date.now() - segno.at < 60 * 1000, 'senza segno la sessione parte da adesso: ' + JSON.stringify(segno));

            // --- 2) 49 ore: si esce, col progresso già salvato ------------------
            await page.evaluate(() => { SaveManager.addCurrency('credits', 500); });   // ultime modifiche, NON ancora sul cloud
            await page.evaluate((fa) => localStorage.setItem('ygoSessioneInizio', JSON.stringify({ uid: 'utente-prova', at: Date.now() - fa })), 49 * ORA);
            await page.reload();
            await aspettaGate(page);
            const gate = await page.evaluate(() => ({
                msg: (document.getElementById('gateLoginStatus') || {}).textContent || '',
                uscito: localStorage.getItem('__fintoUscito') === '1',
                segno: localStorage.getItem('ygoSessioneInizio')
            }));
            assert(gate.uscito, 'a 49 ore la sessione viene chiusa');
            assert(/scaduta/i.test(gate.msg) && /48/.test(gate.msg), 'il gate spiega perché: ' + gate.msg);
            assert(gate.segno === null, 'e il segno è tolto');
            assert(creditiNelCloud() === base + 500, 'prima di uscire il progresso è stato salvato sul cloud: ' + creditiNelCloud() + ' (atteso ' + (base + 500) + ')');

            // --- 6) Rifatto l'accesso, il conto riparte -------------------------
            await page.evaluate(() => CloudSync.signIn('admin@prova.it', 'x'));
            const nuovo = await page.evaluate(() => JSON.parse(localStorage.getItem('ygoSessioneInizio')));
            assert(nuovo && Date.now() - nuovo.at < 60 * 1000, 'dopo il nuovo accesso il segno riparte da adesso: ' + JSON.stringify(nuovo));
            await page.reload();
            await aspettaMenu(page);
            assert(await page.evaluate(() => !CloudSync.sessioneScaduta()), 'e la sessione non è scaduta');

            // --- 4) Scade mentre l'app è aperta ---------------------------------
            await page.evaluate((fa) => localStorage.setItem('ygoSessioneInizio', JSON.stringify({ uid: 'utente-prova', at: Date.now() - fa })), 50 * ORA);
            await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
            await aspettaGate(page);
            assert(await page.evaluate(() => localStorage.getItem('__fintoUscito') === '1'), 'tornando in primo piano a 50 ore la sessione si chiude');

            // --- 5) Mai a metà di un duello -------------------------------------
            await page.evaluate(() => CloudSync.signIn('admin@prova.it', 'x'));
            await page.evaluate((fa) => localStorage.setItem('ygoSessioneInizio', JSON.stringify({ uid: 'utente-prova', at: Date.now() - fa })), 50 * ORA);
            await page.reload();
            // Dopo il reload la sessione è già scaduta: si prova il controllo con un duello "in corso".
            await aspettaGate(page);
            await page.evaluate(() => CloudSync.signIn('admin@prova.it', 'x'));
            await page.reload();
            await aspettaMenu(page);
            await page.evaluate((fa) => { window.gameState = { gameOver: false }; localStorage.setItem('ygoSessioneInizio', JSON.stringify({ uid: 'utente-prova', at: Date.now() - fa })); }, 50 * ORA);
            await page.evaluate(() => CloudSync.controllaScadenzaSessione());
            await page.waitForTimeout(1500);
            assert(await page.evaluate(() => localStorage.getItem('__fintoUscito') !== '1'), 'a metà di un duello la sessione scaduta NON viene chiusa');
            await page.evaluate(() => { window.gameState.gameOver = true; });
            await page.evaluate(() => CloudSync.controllaScadenzaSessione());
            await aspettaGate(page);
            assert(await page.evaluate(() => localStorage.getItem('__fintoUscito') === '1'), 'finito il duello, la sessione scaduta si chiude');
        } finally {
            await ctx.close();
        }
    }
};
