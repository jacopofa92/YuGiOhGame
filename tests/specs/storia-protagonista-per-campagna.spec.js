// In una campagna non si duella come sé stessi.
// =====================================================================
// Richiesta esplicita: nel Regno delle Ombre e in Memorie Proibite il
// ritratto è quello di Yami Yugi (col nome "Atem" nella seconda, che è
// il nome vero del Faraone), in Freedom è Giacobbo, nella Grande Guerra
// è la bandiera italiana. Il campo è `protagonista` sulla campagna, e lo
// legge js/duel-session.js.
//
// Due cose si rompono in silenzio, ed è per quelle che questo test
// esiste:
//   1) il ritratto punta a un file che non c'è — non si vede alcun
//      errore, compare l'emoji di ripiego e sembra una scelta;
//   2) duelMonstersCore.html smette di caricare js/data/story-campaigns.js
//      (una riga in una lista di trenta script): il protagonista svanisce
//      e il duello torna a chiamarti "Giocatore" senza che nulla segnali
//      niente.
//
// `standalone`: servono più caricamenti della pagina del duello con URL
// diversi, non la partita già aperta che l'harness prepara.
const path = require('path');

module.exports = {
    name: 'Storia: in una campagna il giocatore è il protagonista di quella storia',
    standalone: true,
    async run({ browser, assert }) {
        const RADICE = path.join(__dirname, '..', '..');
        const base = 'file:///' + RADICE.replace(/\\/g, '/') + '/';
        const context = await browser.newContext({
            viewport: { width: 1280, height: 900 },
            serviceWorkers: 'block'
        });
        await context.addInitScript(() => {
            window.AUTH_GATE_SKIP = true;
            window.DUEL_FAST_OPENING = true;
        });
        const page = await context.newPage();
        const erroriPagina = [];
        page.on('pageerror', (e) => erroriPagina.push(e.message));

        try {
            // --- Il catalogo: ogni campagna GIOCABILE ne dichiara uno ---
            await page.goto(base + 'storia.html');
            await page.waitForFunction(() => !!window.StoryProgress, null, { timeout: 15000 });
            const catalogo = await page.evaluate(() => StoryProgress.getCampaigns()
                .filter((c) => (c.capitoli || []).length > 0)
                .map((c) => ({
                    id: c.id,
                    nome: (c.protagonista || {}).name || null,
                    img: (c.protagonista || {}).image || null
                })));
            assert(catalogo.length >= 4, `Poche campagne giocabili (${catalogo.length})`);
            const senza = catalogo.filter((c) => !c.nome || !c.img);
            assert(senza.length === 0,
                'Ogni campagna giocabile deve dire chi sei: ' + senza.map((c) => c.id).join(', '));

            // Il ritratto deve esistere DAVVERO: un percorso sbagliato non
            // fa rumore, ricade sull'emoji e sembra voluto.
            const rotti = [];
            for (const c of catalogo) {
                const ok = await page.evaluate((src) => new Promise((res) => {
                    const i = new Image();
                    i.onload = () => res(true);
                    i.onerror = () => res(false);
                    i.src = src;
                }), c.img);
                if (!ok) rotti.push(`${c.id} -> ${c.img}`);
            }
            assert(rotti.length === 0, 'Ritratti del protagonista che non esistono: ' + rotti.join(', '));

            // --- Il duello lo usa davvero -------------------------------
            const atteso = new Map(catalogo.map((c) => [c.id, c]));
            for (const id of ['anime', 'forbiddenMemories', 'freedom', 'ww1']) {
                const c = atteso.get(id);
                if (!c) continue;
                await page.goto(base + 'duelMonstersCore.html?mode=story&campaign=' + id
                    + '&character=kaiba&difficulty=Medio');
                await page.waitForFunction(() => !!(window.DuelSession && DuelSession.player), null, { timeout: 25000 });
                const p = await page.evaluate(() => ({
                    nome: DuelSession.player.name,
                    img: DuelSession.player.image
                }));
                assert(p.nome === c.nome && p.img === c.img,
                    `In ${id} si deve duellare come "${c.nome}" (${c.img}), rilevato "${p.nome}" (${p.img})`);
            }

            // --- Fuori dalla Storia resta il giocatore ------------------
            await page.goto(base + 'duelMonstersCore.html?mode=free&character=kaiba&difficulty=Medio');
            await page.waitForFunction(() => !!(window.DuelSession && DuelSession.player), null, { timeout: 25000 });
            const libero = await page.evaluate(() => DuelSession.player.name);
            const nomiStoria = catalogo.map((c) => c.nome);
            assert(nomiStoria.indexOf(libero) === -1,
                `In Duello Libero il nome dev'essere il proprio, non quello di una campagna: "${libero}"`);

            assert(erroriPagina.length === 0, 'Errori JS in pagina: ' + erroriPagina.join(' | '));
        } finally {
            await context.close();
        }
    }
};
