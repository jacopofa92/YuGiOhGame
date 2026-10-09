// Azzeramento delle storie per tutti (save-manager.js, AZZERAMENTO_STORIE).
//
// Richiesta dell'utente: "resettare tutte le storie a tutti e salvare su
// cloud, così si riparte per bene", premi finali compresi. Si sorveglia:
//   - un salvataggio scritto prima dell'azzeramento perde le storie
//     (avanzamento, livelli, premio finale) e tiene tutto il resto;
//   - la data del salvataggio non si sposta (la regola "vince il più
//     recente" del cloud resta quella di prima);
//   - la copia azzerata va sul cloud da sola;
//   - una copia vecchia scaricata dal cloud si azzera anch'essa;
//   - il progresso fatto DOPO l'azzeramento non viene più toccato.
// Due dispositivi e un cloud finto condiviso (tests/helpers/finto-cloud.js).
const path = require('path');
const { creaFintoCloud } = require('../helpers/finto-cloud.js');

const RADICE = path.join(__dirname, '..', '..');
const INDEX = 'file:///' + path.join(RADICE, 'index.html').replace(/\\/g, '/');

module.exports = {
    name: 'Azzeramento delle storie per tutti: locale, cloud e copie vecchie',
    standalone: true,
    async run({ browser, assert }) {
        const { cloud, collega } = creaFintoCloud();
        const telefono = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
        const desktop = await browser.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: 'block' });
        await collega(telefono);
        await collega(desktop);
        const aspettaMenu = (page) => page.waitForFunction(() => {
            const m = document.getElementById('menuShell');
            return m && getComputedStyle(m).display !== 'none';
        }, null, { timeout: 20000 });
        try {
            // --- Un salvataggio "di prima", su telefono e cloud --------------
            const tel = await telefono.newPage();
            await tel.goto(INDEX);
            await tel.waitForFunction(() => !!(window.SaveManager && window.CloudSync));
            const vecchio = await tel.evaluate(() => {
                const s = SaveManager.createNew('Vecchio');
                delete s.storieAzzerate;
                s.player.lastSaved = '2026-10-08T10:00:00.000Z';
                s.currency.credits = 777;
                s.story = {
                    anime: { completate: 4, finita: false, premiata: true, sotto: { 'anime-area-regno': 9 } },
                    'anime@livello': { livello: 'normale', sbloccati: ['facile', 'normale', 'difficile'] },
                    'anime@normale': { completate: 2 }
                };
                localStorage.setItem('yugiohDuelArenaSave', JSON.stringify(s));
                return s;
            });
            cloud.saves['utente-prova'] = { data: JSON.parse(JSON.stringify(vecchio)), updated_at: '2026-10-08T10:00:00.000Z' };

            // --- Un dispositivo nuovo scarica la copia vecchia dal cloud -----
            const desk = await desktop.newPage();
            await desk.goto(INDEX);
            await aspettaMenu(desk);
            const scaricato = await desk.evaluate(() => {
                const s = SaveManager.load();
                return { story: s.story, segno: s.storieAzzerate, crediti: s.currency.credits };
            });
            assert(JSON.stringify(scaricato.story) === '{}' && !!scaricato.segno && scaricato.crediti === 777,
                'una copia vecchia scaricata dal cloud perde le storie e tiene il resto: ' + JSON.stringify(scaricato));

            // --- Il telefono si riapre: azzera, data ferma, va sul cloud ----
            await tel.evaluate(() => sessionStorage.clear());
            await tel.reload();
            await aspettaMenu(tel);
            await tel.waitForTimeout(300);
            const locale = await tel.evaluate(() => {
                const s = SaveManager.load();
                return {
                    story: s.story, segno: s.storieAzzerate, data: s.player.lastSaved,
                    crediti: s.currency.credits, inSospeso: localStorage.getItem('ygoSyncInSospeso')
                };
            });
            assert(JSON.stringify(locale.story) === '{}' && !!locale.segno,
                'le storie del telefono si azzerano: ' + JSON.stringify(locale.story));
            assert(locale.crediti === 777, 'il resto del salvataggio resta (crediti): ' + locale.crediti);
            assert(locale.data === '2026-10-08T10:00:00.000Z', 'la data del salvataggio non si sposta: ' + locale.data);
            // Il caricamento parte DA SOLO (nessun caricaOra a mano): appena la
            // sessione è nota, auto-sync manda la copia azzerata.
            const scadenza = Date.now() + 20000;
            while (Date.now() < scadenza && cloud.saves['utente-prova'].data.story && cloud.saves['utente-prova'].data.story.anime) {
                await tel.waitForTimeout(250);
            }
            const riga = cloud.saves['utente-prova'].data;
            assert(JSON.stringify(riga.story) === '{}' && !!riga.storieAzzerate && riga.player.lastSaved === '2026-10-08T10:00:00.000Z',
                'sul cloud arriva la copia azzerata, con la data di prima: ' + JSON.stringify({ story: riga.story, segno: riga.storieAzzerate, data: riga.player.lastSaved }));

            // --- Il progresso nuovo non si azzera più ------------------------
            await tel.evaluate(() => {
                SaveManager.setStoryState('anime', { completate: 1, finita: false, premiata: false, sotto: {} });
                sessionStorage.clear();
            });
            await tel.reload();
            await aspettaMenu(tel);
            const dopo = await tel.evaluate(() => (SaveManager.getStoryState('anime') || {}).completate);
            assert(dopo === 1, 'il progresso fatto dopo l\'azzeramento resta: ' + dopo);
            const nuovo = await desk.evaluate(() => SaveManager.createNew('Nuovo').storieAzzerate);
            assert(!!nuovo, 'un salvataggio nuovo nasce già col segno');
        } finally {
            await telefono.close();
            await desktop.close();
        }
    }
};
