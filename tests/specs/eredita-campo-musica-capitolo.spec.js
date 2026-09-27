// Un nodo della Storia eredita campo/musica dal proprio CAPITOLO se non
// li dichiara — stessa precedenza già esistente per `protagonista`
// (tappa > capitolo > campagna), estesa qui a `field`/`music` (stesse
// chiavi sulla tappa e sul capitolo). Utile soprattutto quando un
// capitolo È un'intera area/macromappa (un capitolo per area nella
// campagna 'anime'): basta scrivere `music` una volta sul capitolo
// perché ogni nodo dell'area — inclusi quelli annidati dentro le sue
// prove — la erediti, senza ripeterla su ciascuno.
//
// Parte A usa dati VERI del catalogo (nessuna mutazione): l'area del
// prologo ('anime-area-prologo') sta nel capitolo 'prologo', che
// dichiara già `music: '02. Input Name.mp3'` senza mai essere stato
// letto da nessuno finora (dato "morto", scritto in previsione di
// questa stessa funzione). Parte B copre l'intera catena
// tappa → capitolo → campagna con una campagna sintetica minima,
// aggiunta e rimossa dentro lo stesso test.
//
// `standalone`: la Storia vive su una pagina sua.
const path = require('path');

module.exports = {
    standalone: true,
    name: 'Storia: un nodo senza campo/musica propri eredita quelli del capitolo',
    async run(t) {
        const RADICE = path.join(__dirname, '..', '..');
        const url = 'file:///' + path.join(RADICE, 'storia.html').replace(/\\/g, '/') + '?campaign=anime';
        const page = await t.browser.newPage({ viewport: { width: 1280, height: 900 } });
        const erroriPagina = [];
        page.on('pageerror', (e) => erroriPagina.push(e.message));
        await page.addInitScript(() => { window.AUTH_GATE_SKIP = true; });

        try {
            await page.goto(url);
            await page.waitForFunction(() => !!(window.StoryProgress && window.storyCampaignsDatabase), null, { timeout: 25000 });

            // --- Parte A: dati reali del catalogo ---------------------------
            const areaPrologo = await page.evaluate(() => {
                const tp = StoryProgress.getTappe('anime').find((x) => x.id === 'anime-area-prologo');
                return tp ? { field: tp.field, music: tp.music, capitoloId: tp.capitoloId } : null;
            });
            t.assert(!!areaPrologo, 'L\'area del prologo deve esistere nel catalogo dell\'anime');
            t.assert(areaPrologo.capitoloId === 'prologo', 'L\'area deve appartenere al capitolo "prologo"');
            t.assert(areaPrologo.music === '02. Input Name.mp3',
                `L'area (che non dichiara una music propria) deve ereditare quella del capitolo "prologo": ${JSON.stringify(areaPrologo)}`);
            t.assert(areaPrologo.field === null,
                `Il capitolo "prologo" non dichiara un field: l'area deve restare senza (null), non un valore inventato: ${JSON.stringify(areaPrologo)}`);

            const proveArea = await page.evaluate(() => StoryProgress.getProveConStato('anime', 'anime-area-prologo')
                .map((p) => ({ id: p.id, kind: p.kind, field: p.field, music: p.music })));
            const nonno = proveArea.find((p) => p.id === 'anime-1-nonno');
            t.assert(!!nonno, 'Il duello contro il nonno Solomon deve esistere dentro l\'area del prologo');
            t.assert(nonno.music === '07. Preliminary Face-Off.mp3',
                `Un nodo con la propria music deve tenere la SUA, non quella ereditata dal capitolo: ${JSON.stringify(nonno)}`);

            const scena = proveArea.find((p) => p.id === 'anime-1-scena');
            t.assert(!!scena, 'La scena "Otto anni dopo" deve esistere dentro l\'area del prologo');
            t.assert(scena.music === '02. Input Name.mp3',
                `Una scena senza music propria deve ereditare quella del capitolo attraverso il contenitore (l'area): ${JSON.stringify(scena)}`);

            // --- Parte B: catena completa tappa -> capitolo -> campagna -----
            // Campagna sintetica minima, aggiunta e rimossa dentro il test:
            // non tocca né il file né alcuna campagna vera.
            const risultatoCatena = await page.evaluate(() => {
                const finta = {
                    id: 'test-eredita-catena',
                    nome: 'Test', capitoli: [
                        {
                            id: 'cap1', nome: 'Capitolo 1', field: 'capField.jpg', music: 'capMusic.mp3',
                            tappe: [
                                { id: 't1', kind: 'duel' },
                                { id: 't2', kind: 'duel', field: 'tField.jpg', music: 'tMusic.mp3' }
                            ]
                        },
                        { id: 'cap2', nome: 'Capitolo 2', tappe: [{ id: 't3', kind: 'duel' }] }
                    ],
                    campoDuello: 'campoCampagna.jpg',
                    musicaDuello: 'musicaCampagna.mp3'
                };
                storyCampaignsDatabase.push(finta);
                try {
                    const tappe = StoryProgress.getTappe('test-eredita-catena');
                    const t1 = tappe.find((x) => x.id === 't1');
                    const t2 = tappe.find((x) => x.id === 't2');
                    const t3 = tappe.find((x) => x.id === 't3');
                    const urlT1 = new URLSearchParams(StoryProgress.urlDuello('test-eredita-catena', t1).split('?')[1]);
                    const urlT3 = new URLSearchParams(StoryProgress.urlDuello('test-eredita-catena', t3).split('?')[1]);
                    return {
                        t1: { field: t1.field, music: t1.music },
                        t2: { field: t2.field, music: t2.music },
                        t3: { field: t3.field, music: t3.music },
                        urlT1: { field: urlT1.get('field'), music: urlT1.get('music') },
                        urlT3: { field: urlT3.get('field'), music: urlT3.get('music') }
                    };
                } finally {
                    // Non deve sopravvivere al test, qualunque cosa succeda sopra.
                    const i = storyCampaignsDatabase.indexOf(finta);
                    if (i !== -1) storyCampaignsDatabase.splice(i, 1);
                }
            });

            t.assert(risultatoCatena.t1.field === 'capField.jpg', `t1 (senza field proprio) deve ereditare quello del capitolo: ${JSON.stringify(risultatoCatena.t1)}`);
            t.assert(risultatoCatena.t1.music === 'capMusic.mp3', `t1 (senza music propria) deve ereditare quella del capitolo: ${JSON.stringify(risultatoCatena.t1)}`);
            t.assert(risultatoCatena.t2.field === 'tField.jpg', `t2 dichiara il proprio field: deve vincere sul capitolo: ${JSON.stringify(risultatoCatena.t2)}`);
            t.assert(risultatoCatena.t2.music === 'tMusic.mp3', `t2 dichiara la propria music: deve vincere sul capitolo: ${JSON.stringify(risultatoCatena.t2)}`);
            t.assert(risultatoCatena.t3.field === null, `t3 e il suo capitolo (cap2) non dichiarano field: deve restare null qui: ${JSON.stringify(risultatoCatena.t3)}`);
            t.assert(risultatoCatena.t3.music === null, `t3 e il suo capitolo (cap2) non dichiarano music: deve restare null qui: ${JSON.stringify(risultatoCatena.t3)}`);
            t.assert(risultatoCatena.urlT1.field === 'capField.jpg', `Il duello di t1 deve usare l'arena ereditata dal capitolo, non quella della campagna: ${JSON.stringify(risultatoCatena.urlT1)}`);
            t.assert(risultatoCatena.urlT1.music === 'capMusic.mp3', `Il duello di t1 deve usare la musica ereditata dal capitolo, non quella della campagna: ${JSON.stringify(risultatoCatena.urlT1)}`);
            t.assert(risultatoCatena.urlT3.field === 'campoCampagna.jpg', `Solo quando NÉ la tappa NÉ il capitolo dichiarano un'arena, il duello deve ricadere su quella della campagna: ${JSON.stringify(risultatoCatena.urlT3)}`);
            t.assert(risultatoCatena.urlT3.music === 'musicaCampagna.mp3', `Solo quando NÉ la tappa NÉ il capitolo dichiarano una musica, il duello deve ricadere su quella della campagna: ${JSON.stringify(risultatoCatena.urlT3)}`);

            t.assert(erroriPagina.length === 0, 'Nessun errore JS deve comparire in pagina: ' + erroriPagina.join(' | '));
        } finally {
            await page.close();
        }
    }
};
