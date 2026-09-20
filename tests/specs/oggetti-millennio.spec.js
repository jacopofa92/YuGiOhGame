// Oggetti del Millennio, e le valute che ogni torneo NON paga.
// =====================================================================
// Due regole nuove, entrambe in js/economy/rewards.js:
//   - ogni torneo paga SOLO la propria valuta (il Regno le Stelle, Battle
//     City le Carte Locazione, il Torneo Kaiba le Carte del Millennio);
//   - Occhio/Bastone/Collana del Millennio si vincono al 5% battendo chi
//     li porta, e solo dentro un torneo in cui ha senso incontrarlo.
//
// Il 5% NON si prova tirando i dadi e sperando: Math.random viene forzato
// nei due sensi, cosi' il test dice qualcosa di preciso invece di
// dipendere dalla fortuna. Quello che si prova per davvero e' la
// condizione — chi, dove, e una volta sola.
//
// Lo spec apre il duello come tutti gli altri (l'harness carica
// rewards.js e save-manager.js insieme al resto), ma non gioca: chiama le
// funzioni dell'economia direttamente.
module.exports = {
    name: 'Oggetti del Millennio (drop 5% mirato) e valute escluse per torneo',
    async run(t) {
        const presenti = await t.evaluate(() => !!(window.Rewards && window.SaveManager && Rewards.MILLENNIUM_ITEMS));
        t.assert(presenti, 'La pagina del duello deve caricare Rewards e SaveManager');

        // --- Le due tabelle non devono contraddirsi -------------------
        // Una valuta pagata da un torneo e insieme elencata fra quelle che
        // quel torneo non paga sarebbe una regola che si smentisce da
        // sola, e nessuno se ne accorgerebbe guardando il gioco.
        const contraddizioni = await t.evaluate(() => {
            const out = [];
            Object.keys(Rewards.TOURNAMENT_EXCLUDED).forEach((torneo) => {
                const pagate = Object.keys(Rewards.TOURNAMENT_COMPLETION[torneo] || {});
                Rewards.TOURNAMENT_EXCLUDED[torneo].forEach((c) => {
                    if (pagate.indexOf(c) !== -1) out.push(`${torneo} paga ${c} ma lo elenca fra gli esclusi`);
                });
            });
            return out;
        });
        t.assert(contraddizioni.length === 0, contraddizioni.join(' · '));

        // --- Ogni torneo paga solo la propria valuta ------------------
        const attesi = {
            duelistKingdom: 'starChips',
            battleCity: 'locatorCards',
            kaibaTournament: 'millenniumCards'
        };
        for (const torneo of Object.keys(attesi)) {
            const esito = await t.evaluate((id) => {
                const prima = SaveManager.getCurrency();
                const voci = Rewards.forTournament(id, false);
                const dopo = SaveManager.getCurrency();
                const cambiate = ['starChips', 'locatorCards', 'millenniumCards']
                    .filter((c) => (dopo[c] || 0) !== (prima[c] || 0));
                return {
                    cambiate: cambiate,
                    note: voci.filter((v) => v.nota).map((v) => v.rule),
                    html: Rewards.summaryHtml(voci, 'x')
                };
            }, torneo);
            t.assert(esito.cambiate.length === 1 && esito.cambiate[0] === attesi[torneo],
                `${torneo} deve accreditare solo ${attesi[torneo]} fra le valute rare (rilevate: ${JSON.stringify(esito.cambiate)})`);
            t.assert(esito.note.length === 2,
                `${torneo} deve SPIEGARE le due valute che non paga, non limitarsi a non pagarle (note rilevate: ${esito.note.length})`);
            // Una nota non ha importo: se il riepilogo la disegnasse come
            // una voce vera uscirebbe "+undefined".
            t.assert(esito.html.indexOf('undefined') === -1,
                `Il riepilogo di ${torneo} non deve contenere "undefined": ${esito.html.slice(0, 200)}`);
        }

        // --- Il drop e' mirato: chi, e dove --------------------------
        const inPalio = await t.evaluate(() => ({
            pegasusNelRegno: !!Rewards.millenniumItemInPalio('duelistKingdom', 'pegasus'),
            pegasusABattleCity: !!Rewards.millenniumItemInPalio('battleCity', 'pegasus'),
            marikABattleCity: !!Rewards.millenniumItemInPalio('battleCity', 'marik'),
            marikNelRegno: !!Rewards.millenniumItemInPalio('duelistKingdom', 'marik'),
            ishizuDaKaiba: !!Rewards.millenniumItemInPalio('kaibaTournament', 'ishizu'),
            joeyDaKaiba: !!Rewards.millenniumItemInPalio('kaibaTournament', 'joey'),
            senzaTorneo: !!Rewards.millenniumItemInPalio(null, 'pegasus')
        }));
        t.assert(inPalio.pegasusNelRegno, 'L\'Occhio deve essere in palio battendo Pegasus nel Regno dei Duellanti');
        t.assert(!inPalio.pegasusABattleCity, 'Pegasus non c\'entra nulla con Battle City: nessun Occhio in palio li\'');
        t.assert(inPalio.marikABattleCity, 'Il Bastone deve essere in palio battendo Marik a Battle City');
        t.assert(!inPalio.marikNelRegno, 'Marik non partecipa al Regno dei Duellanti: nessun Bastone in palio li\'');
        t.assert(inPalio.ishizuDaKaiba, 'La Collana deve essere in palio battendo Ishizu al Torneo Kaiba');
        t.assert(!inPalio.joeyDaKaiba, 'Un Duellante qualunque non porta alcun Oggetto del Millennio');
        t.assert(!inPalio.senzaTorneo, 'Fuori da un torneo non si vince alcun Oggetto del Millennio');

        // --- Esce col 5%, e una volta sola ---------------------------
        const esito = await t.evaluate(() => {
            const vinciSempre = () => { Math.random = () => 0; };      // 0 < 0.05
            const vinciMai = () => { Math.random = () => 0.99; };      // 0.99 >= 0.05
            const originale = Math.random;
            const premi = (opts) => Rewards.forDuel(Object.assign({
                won: true, difficulty: 'Difficile', inTournament: true,
                tournamentId: 'duelistKingdom', opponentId: 'pegasus'
            }, opts));
            const oggetti = (voci) => voci.filter((v) => v.item);

            vinciMai();
            const conSfortuna = oggetti(premi({})).length;

            vinciSempre();
            const primaVolta = oggetti(premi({}));
            const secondaVolta = oggetti(premi({}));   // gia' posseduto: non deve ripetersi

            Math.random = originale;
            return {
                conSfortuna: conSfortuna,
                primaVolta: primaVolta.length,
                nome: primaVolta.length ? primaVolta[0].nome : null,
                regola: primaVolta.length ? primaVolta[0].rule : null,
                secondaVolta: secondaVolta.length,
                posseduto: !!SaveManager.ownsMillenniumItem('millenniumEye')
            };
        });
        t.assert(esito.conSfortuna === 0, 'Sopra la soglia del 5% non deve uscire alcun Oggetto');
        t.assert(esito.primaVolta === 1, `Sotto la soglia deve uscire esattamente 1 Oggetto (rilevati ${esito.primaVolta})`);
        t.assert(esito.nome === 'Occhio del Millennio', `Da Pegasus deve uscire l'Occhio (rilevato ${esito.nome})`);
        t.assert(/Pegasus/.test(esito.regola || '') && /5%/.test(esito.regola || ''),
            `Il premio deve spiegare da chi e con che probabilita': "${esito.regola}"`);
        t.assert(esito.posseduto, 'L\'Oggetto vinto dev\'essere registrato nel salvataggio');
        t.assert(esito.secondaVolta === 0,
            'Un Oggetto gia\' posseduto non deve uscire una seconda volta: e\' un pezzo unico, non una valuta');

        // --- Fuori dai tornei non esce mai ---------------------------
        const fuoriTorneo = await t.evaluate(() => {
            const originale = Math.random;
            Math.random = () => 0;   // fortuna massima, per non lasciare scampo
            const voci = Rewards.forDuel({
                won: true, difficulty: 'Difficile', inTournament: false,
                tournamentId: 'duelistKingdom', opponentId: 'pegasus'
            });
            Math.random = originale;
            return voci.filter((v) => v.item).length;
        });
        t.assert(fuoriTorneo === 0,
            'In un Duello Libero contro Pegasus non si vince alcun Oggetto del Millennio, nemmeno con la fortuna forzata al massimo');
    }
};
