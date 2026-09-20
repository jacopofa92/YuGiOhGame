// La mappa della Storia: si ingrandisce, si rimpicciolisce, e su telefono
// le informazioni si chiudono per lasciarle lo schermo.
// =====================================================================
// Due richieste esplicite: poter fare zoom sulla mappa, e che la mappa si
// estenda il più possibile su tutto lo schermo ("le info sulla campagna
// sono invasive a video così su mobile... fai magari un collapse").
//
// Le tre cose che questo spec tiene ferme, perché rompendosi non si
// vedrebbero se non provando a mano su un telefono:
//
//   1) i comandi dello zoom esistono e funzionano nei due versi, e il
//      punto del mondo che sta al centro dello sguardo ci RESTA dopo uno
//      zoom. Senza quest'ultima cosa ogni tocco del "+" sposta la vista
//      in un punto a caso e la mappa diventa inesplorabile;
//   2) rimpicciolendo non compaiono MAI zone vuote — né al minimo, né
//      scorrendo fino agli angoli, né dopo aver ruotato lo schermo.
//      È il punto più facile da sbagliare: lo zoom che fa entrare tutta
//      la mappa (`min` fra i due rapporti) lascia per forza due bande
//      vuote sul lato in eccesso, perché mappa e finestra non hanno mai
//      la stessa forma. Quello giusto è `max`, che copre;
//   3) su schermo stretto le informazioni sulla campagna partono chiuse e
//      la mappa si prende il resto, mentre su desktop il pulsante che le
//      chiude non esiste nemmeno — lì lo spazio non manca e sarebbe solo
//      un clic in più.
//
// `standalone`: serve storia.html a due dimensioni di finestra diverse,
// non la pagina del duello su cui lavora il resto della suite.
const path = require('path');

const CAMPAGNA = 'forbiddenMemories';
const TELEFONO = { width: 393, height: 852 };
const TELEFONO_ORIZZONTALE = { width: 852, height: 393 };
const DESKTOP = { width: 1300, height: 900 };

/**
 * Vero se il mondo della mappa copre la finestra in ENTRAMBE le
 * direzioni. Se è più piccolo anche su un solo asse, su quel lato si
 * vede il fondo — ed è esattamente ciò che non deve accadere.
 */
function copre(page) {
    return page.evaluate(() => {
        const sc = document.querySelector('#mappaViewport .nm-scroll');
        const m = document.querySelector('#mappaViewport .nm-mondo').getBoundingClientRect();
        return m.width >= sc.clientWidth - 1 && m.height >= sc.clientHeight - 1;
    });
}

/** I numeri veri, per un messaggio di errore che si capisca da solo. */
async function descriviCopertura(page, premessa) {
    const d = await page.evaluate(() => {
        const vp = document.getElementById('mappaViewport');
        const sc = vp.querySelector('.nm-scroll');
        const m = vp.querySelector('.nm-mondo').getBoundingClientRect();
        return {
            zoom: Math.round((vp.__nmZoom || 1) * 1000) / 1000,
            mondo: Math.round(m.width) + 'x' + Math.round(m.height),
            finestra: sc.clientWidth + 'x' + sc.clientHeight
        };
    });
    return `${premessa}: allo zoom ${d.zoom} il mondo è ${d.mondo} in una finestra ${d.finestra}`;
}

module.exports = {
    name: 'Storia: zoom della mappa, e su telefono le informazioni si chiudono',
    standalone: true,
    async run({ browser, assert }) {
        const RADICE = path.join(__dirname, '..', '..');
        const url = 'file:///' + RADICE.replace(/\\/g, '/') + '/storia.html';

        /** Apre la mappa della campagna a una data dimensione di finestra. */
        async function apri(viewport, dettagliAperti) {
            const context = await browser.newContext({ viewport: viewport, serviceWorkers: 'block' });
            await context.addInitScript((aperti) => {
                window.AUTH_GATE_SKIP = true;
                try {
                    // La preferenza del collapse vive in localStorage: si
                    // parte da uno stato noto invece di ereditare quello
                    // lasciato da un'esecuzione precedente.
                    //
                    // UNA VOLTA SOLA, però: addInitScript gira ad OGNI
                    // navigazione, ricaricamenti compresi, e riazzerando
                    // la preferenza ad ogni giro renderebbe impossibile
                    // provare proprio che sopravvive a un ricaricamento.
                    if (sessionStorage.getItem('__statoInizialeImpostato')) return;
                    sessionStorage.setItem('__statoInizialeImpostato', '1');
                    if (aperti === null) localStorage.removeItem('ygoStoriaDettagliAperti');
                    else localStorage.setItem('ygoStoriaDettagliAperti', aperti ? '1' : '0');
                } catch (e) { /* niente */ }
            }, dettagliAperti === undefined ? null : dettagliAperti);
            const page = await context.newPage();
            await page.goto(url);
            await page.waitForFunction(() => !!(window.StoryProgress && window.SaveManager), null, { timeout: 15000 });
            await page.evaluate((campagna) => {
                if (!SaveManager.hasSave()) SaveManager.createNew('Tester');
                SaveManager.setStoryState(campagna, { completate: 16 });
            }, CAMPAGNA);
            await page.goto(url + '?campaign=' + CAMPAGNA);
            await page.waitForSelector('.nm-node--corrente', { timeout: 15000 });
            await page.waitForTimeout(600);
            return { context: context, page: page };
        }

        // ----------------------------------------------------------------
        // 1) e 2): lo zoom, su desktop
        // ----------------------------------------------------------------
        let sessione = await apri(DESKTOP);
        try {
            const page = sessione.page;

            const iniziale = await page.evaluate(() => {
                const vp = document.getElementById('mappaViewport');
                return {
                    zoom: vp.__nmZoom,
                    pulsanti: vp.querySelectorAll('.nm-zoom-btn').length,
                    valore: (vp.querySelector('.nm-zoom-valore') || {}).textContent
                };
            });
            assert(iniziale.pulsanti === 3,
                `I comandi dello zoom devono essere tre (−, +, tutta la mappa): trovati ${iniziale.pulsanti}`);
            assert(iniziale.zoom === 1,
                `La mappa deve aprirsi a grandezza naturale, come è sempre stata: zoom ${iniziale.zoom}`);
            assert(iniziale.valore === '100%', `L'etichetta deve dire 100%, dice "${iniziale.valore}"`);

            // Il punto del mondo al centro dello sguardo, prima e dopo.
            const centroDelMondo = () => page.evaluate(() => {
                const vp = document.getElementById('mappaViewport');
                const sc = vp.querySelector('.nm-scroll');
                const z = vp.__nmZoom || 1;
                return {
                    zoom: z,
                    x: (sc.scrollLeft + sc.clientWidth / 2) / z,
                    y: (sc.scrollTop + sc.clientHeight / 2) / z
                };
            });

            const prima = await centroDelMondo();
            await page.evaluate(() => document.querySelectorAll('#mappaViewport .nm-zoom-btn')[1].click());
            await page.waitForTimeout(150);
            const dopoPiu = await centroDelMondo();
            assert(dopoPiu.zoom > prima.zoom,
                `Il pulsante "+" deve ingrandire: da ${prima.zoom} a ${dopoPiu.zoom}`);
            // Qualche pixel di scarto è inevitabile (gli scroll sono interi).
            assert(Math.abs(dopoPiu.x - prima.x) < 3 && Math.abs(dopoPiu.y - prima.y) < 3,
                `Ingrandendo, il punto al centro deve restare lo stesso: era (${Math.round(prima.x)}, ${Math.round(prima.y)}), ora (${Math.round(dopoPiu.x)}, ${Math.round(dopoPiu.y)})`);

            await page.evaluate(() => document.querySelectorAll('#mappaViewport .nm-zoom-btn')[0].click());
            await page.waitForTimeout(150);
            const dopoMeno = await centroDelMondo();
            assert(Math.abs(dopoMeno.zoom - prima.zoom) < 0.01,
                `"−" dopo "+" deve riportare allo zoom di partenza: ${dopoMeno.zoom} contro ${prima.zoom}`);

            // Rimpicciolendo all'osso non deve comparire vuoto. Si insiste
            // ben oltre il necessario: il limite deve reggere da sé, non
            // grazie al fatto che nessuno ci prova abbastanza.
            for (let i = 0; i < 12; i++) {
                await page.evaluate(() => document.querySelectorAll('#mappaViewport .nm-zoom-btn')[0].click());
            }
            await page.evaluate(() => document.querySelectorAll('#mappaViewport .nm-zoom-btn')[2].click());
            await page.waitForTimeout(250);
            assert(await copre(page), await descriviCopertura(page,
                'Rimpicciolendo al minimo la mappa deve continuare a coprire tutta la finestra'));

            // E nemmeno scorrendo fino all'angolo opposto.
            const angolo = await page.evaluate(() => {
                const vp = document.getElementById('mappaViewport');
                const sc = vp.querySelector('.nm-scroll');
                sc.scrollLeft = 99999;
                sc.scrollTop = 99999;
                const mondo = vp.querySelector('.nm-mondo').getBoundingClientRect();
                const box = sc.getBoundingClientRect();
                return {
                    destra: Math.round(box.right - mondo.right),
                    basso: Math.round(box.bottom - mondo.bottom)
                };
            });
            assert(angolo.destra <= 1 && angolo.basso <= 1,
                `Scorrendo fino all'angolo non deve restare scoperto nulla: ${angolo.destra}px a destra, ${angolo.basso}px in basso`);
        } finally {
            await sessione.context.close();
        }

        // ----------------------------------------------------------------
        // 3) il collapse: c'è su telefono, non su desktop
        // ----------------------------------------------------------------
        sessione = await apri(TELEFONO);
        try {
            const page = sessione.page;
            const chiuso = await page.evaluate(() => {
                const vp = document.getElementById('mappaViewport');
                return {
                    toggleVisibile: document.getElementById('mappaToggle').offsetParent !== null,
                    dettagliVisibili: document.getElementById('mappaDettagli').offsetParent !== null,
                    riassunto: document.getElementById('mappaToggleTesto').textContent,
                    mappaH: vp.getBoundingClientRect().height,
                    finestraH: window.innerHeight,
                    paginaScorre: document.documentElement.scrollHeight - document.documentElement.clientHeight
                };
            });
            assert(chiuso.toggleVisibile, 'Su telefono il pulsante che apre/chiude le informazioni deve esserci');
            assert(!chiuso.dettagliVisibili,
                'Su telefono le informazioni sulla campagna devono partire CHIUSE: erano invasive');
            assert(/Cap\. \d+\/\d+/.test(chiuso.riassunto) && /\d+\/\d+$/.test(chiuso.riassunto),
                `Chiuse, deve restare un riassunto con capitolo e avanzamento: "${chiuso.riassunto}"`);
            assert(chiuso.mappaH > chiuso.finestraH * 0.7,
                `Con le informazioni chiuse la mappa deve prendersi quasi tutto lo schermo: ${Math.round(chiuso.mappaH)}px su ${chiuso.finestraH}`);
            assert(chiuso.paginaScorre === 0,
                `La pagina non deve scorrere: la mappa si adatta a quello che c'è (scarto ${chiuso.paginaScorre}px)`);

            // Aprendole, la mappa cede spazio ma resta la parte principale.
            await page.click('#mappaToggle');
            await page.waitForTimeout(300);
            const aperto = await page.evaluate(() => ({
                dettagliVisibili: document.getElementById('mappaDettagli').offsetParent !== null,
                mappaH: document.getElementById('mappaViewport').getBoundingClientRect().height
            }));
            assert(aperto.dettagliVisibili, 'Il pulsante deve aprire le informazioni');
            assert(aperto.mappaH < chiuso.mappaH,
                'Aprendo le informazioni la mappa deve cedere spazio, altrimenti il collapse non serviva a niente');

            // La scelta si ricorda.
            await page.reload();
            await page.waitForSelector('.nm-node--corrente', { timeout: 15000 });
            await page.waitForTimeout(500);
            const dopoRicarica = await page.evaluate(() => document.getElementById('mappaDettagli').offsetParent !== null);
            assert(dopoRicarica, 'La scelta di tenere aperte le informazioni deve sopravvivere a un ricaricamento');
        } finally {
            await sessione.context.close();
        }

        // ----------------------------------------------------------------
        // Rotazione dello schermo
        // ----------------------------------------------------------------
        // Ruotando, la finestra cambia forma e con essa lo zoom minimo che
        // evita il vuoto: uno zoom che in verticale copriva tutto, in
        // orizzontale può lasciare scoperte le fasce laterali. La mappa
        // deve rialzarsi da sola.
        sessione = await apri(TELEFONO);
        try {
            const page = sessione.page;
            await page.evaluate(() => document.querySelectorAll('#mappaViewport .nm-zoom-btn')[2].click());
            await page.waitForTimeout(200);
            assert(await copre(page), await descriviCopertura(page, 'In verticale, al minimo'));
            const zoomVerticale = await page.evaluate(() => document.getElementById('mappaViewport').__nmZoom);

            await page.setViewportSize(TELEFONO_ORIZZONTALE);
            // Il riadattamento è volutamente ritardato (il browser riporta
            // le nuove dimensioni in due tempi dopo una rotazione).
            await page.waitForTimeout(700);
            assert(await copre(page), await descriviCopertura(page, 'Dopo aver ruotato in orizzontale'));
            const zoomOrizzontale = await page.evaluate(() => document.getElementById('mappaViewport').__nmZoom);
            assert(zoomOrizzontale > zoomVerticale,
                `Ruotando, lo zoom deve rialzarsi fin dove serve a non scoprire nulla: era ${zoomVerticale}, è ${zoomOrizzontale}`);

            await page.setViewportSize(TELEFONO);
            await page.waitForTimeout(700);
            assert(await copre(page), await descriviCopertura(page, 'Tornando in verticale'));

            // In orizzontale il collapse deve esserci comunque: un telefono
            // ruotato è LARGO 852px — fuori da qualunque limite di
            // larghezza — ma alto 393, e lì l'intestazione si mangiava
            // quasi tutto lo schermo.
            await page.setViewportSize(TELEFONO_ORIZZONTALE);
            await page.waitForTimeout(500);
            const orizzontale = await page.evaluate(() => ({
                toggleVisibile: document.getElementById('mappaToggle').offsetParent !== null,
                mappaH: document.getElementById('mappaViewport').getBoundingClientRect().height,
                finestraH: window.innerHeight
            }));
            assert(orizzontale.toggleVisibile,
                'Anche con il telefono in orizzontale le informazioni devono potersi chiudere: lì manca l\'altezza, non la larghezza');
            assert(orizzontale.mappaH > orizzontale.finestraH * 0.6,
                `In orizzontale la mappa deve restare la parte principale: ${Math.round(orizzontale.mappaH)}px su ${orizzontale.finestraH}`);
        } finally {
            await sessione.context.close();
        }

        // Su desktop il pulsante non deve nemmeno esistere a schermo.
        sessione = await apri(DESKTOP, false);
        try {
            const desktop = await sessione.page.evaluate(() => ({
                toggleVisibile: document.getElementById('mappaToggle').offsetParent !== null,
                dettagliVisibili: document.getElementById('mappaDettagli').offsetParent !== null
            }));
            assert(!desktop.toggleVisibile,
                'Su desktop il pulsante del collapse non deve comparire: lo spazio non manca');
            assert(desktop.dettagliVisibili,
                'Su desktop le informazioni devono restare sempre visibili, anche con la preferenza "chiuse"');
        } finally {
            await sessione.context.close();
        }
    }
};
