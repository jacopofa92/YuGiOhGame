// Il salvataggio più recente non si perde.
// =====================================================================
// Nasce da una perdita vera segnalata dall'utente. Le cause erano due, e
// si sommavano:
//
//   1. il caricamento sul cloud partiva SOLO da "Esci"/"Cambia account".
//      Chi chiude il gioco in un altro modo — l'APK ucciso dal sistema,
//      la batteria, la scheda chiusa — o semplicemente non fa mai logout,
//      lasciava ore di gioco nel solo localStorage di quel dispositivo;
//   2. al rientro il modale chiedeva quale salvataggio tenere mostrando
//      UNA data sola, quella del cloud. Chi la leggeva non poteva sapere
//      se il locale fosse più nuovo, e un click dato a caso cancellava la
//      giornata appena giocata — senza ritorno.
//
// Qui si sorveglia il MECCANISMO, non l'interfaccia: che ogni scrittura
// del salvataggio avvisi qualcuno (è ciò su cui si appoggia il
// caricamento automatico) e che, fra due salvataggi, la regola scelga
// SEMPRE il più recente, senza mai chiedere — richiesta esplicita
// dell'utente dopo che profilo.html continuava a chiederlo comunque
// (aveva una copia propria del controllo, mai collegata a questa regola).
//
// `standalone`: serve una pagina di menu, non quella del duello.
const path = require('path');

module.exports = {
    standalone: true,
    name: 'Salvataggi: ogni scrittura avvisa, e fra due vince il più recente',
    async run(t) {
        const RADICE = path.join(__dirname, '..', '..');
        const url = 'file:///' + path.join(RADICE, 'profilo.html').replace(/\\/g, '/');
        const page = await t.browser.newPage({ viewport: { width: 1200, height: 900 } });
        const erroriPagina = [];
        page.on('pageerror', (e) => erroriPagina.push(e.message));
        await page.addInitScript(() => { window.AUTH_GATE_SKIP = true; });

        try {
            await page.goto(url);
            await page.waitForFunction(() => !!(window.SaveManager && window.CloudSync && window.AutoSync),
                null, { timeout: 20000 });
            await page.evaluate(() => { if (!SaveManager.hasSave()) SaveManager.createNew('Tester'); });

            // --- Ogni scrittura avvisa chi ascolta -------------------
            // È il gancio su cui si regge il caricamento automatico: se
            // smettesse di scattare, il salvataggio tornerebbe ad
            // arrivare sul cloud solo al logout, cioè il difetto di
            // partenza — e senza che nulla dia segno di essersi rotto.
            const avvisi = await page.evaluate(() => {
                let contati = 0;
                SaveManager.onSaved(() => { contati++; });
                SaveManager.addCurrency('credits', 10);
                SaveManager.setRecord('kaiba', { wins: 1, losses: 0 });
                return contati;
            });
            t.assert(avvisi >= 2,
                `Ogni scrittura del salvataggio deve avvisare chi ascolta (rilevati ${avvisi} avvisi su 2 scritture)`);

            // --- Fra due salvataggi vince il più recente -------------
            // Si guarda la REGOLA, non la schermata: è la stessa funzione
            // che usano il gate e il Profilo, quindi provarla qui le
            // copre entrambe.
            const ORA = Date.now();
            const verdetti = await page.evaluate((adesso) => {
                function conLocale(quando) {
                    const save = SaveManager.load();
                    save.player.lastSaved = new Date(quando).toISOString();
                    // writeRaw diretto no: si passa da touch come tutto il
                    // resto, poi si riscrive la data (touch la rimette ad
                    // adesso, ed è proprio il suo mestiere).
                    SaveManager.touch(save);
                    const s2 = SaveManager.load();
                    s2.player.lastSaved = new Date(quando).toISOString();
                    localStorage.setItem('yugiohDuelArenaSave', JSON.stringify(s2));
                }
                const esiti = {};
                const GIORNO = 24 * 60 * 60 * 1000;

                conLocale(adesso - GIORNO);
                esiti.cloudPiuNuovo = CloudSync.confrontaSalvataggi({ updatedAt: new Date(adesso).toISOString() }).scelta;

                conLocale(adesso);
                esiti.localePiuNuovo = CloudSync.confrontaSalvataggi({ updatedAt: new Date(adesso - GIORNO).toISOString() }).scelta;

                // Anche a un solo minuto di differenza si decide comunque:
                // l'utente ha chiesto esplicitamente di non chiedere MAI
                // più, nemmeno quando i due orologi sono vicini. Il locale
                // è ancora "adesso" (impostato sopra): un cloud di un
                // minuto più vecchio perde.
                esiti.tropoVicini = CloudSync.confrontaSalvataggi({ updatedAt: new Date(adesso - 60000).toISOString() }).scelta;

                // Una data illeggibile non blocca più la decisione: vale
                // come "la più vecchia possibile", quindi l'altro lato (qui
                // il locale, ancora "adesso") vince comunque.
                esiti.dataRotta = CloudSync.confrontaSalvataggi({ updatedAt: 'non-una-data' }).scelta;

                // E il verdetto porta con sé ENTRAMBE le date: chi mostra
                // il messaggio deve poterle dire tutte e due, che era
                // esattamente quello che mancava prima.
                const v = CloudSync.confrontaSalvataggi({ updatedAt: new Date(adesso - 60000).toISOString() });
                esiti.haEntrambeLeDate = !!(v.quandoCloud && v.quandoLocale);
                return esiti;
            }, ORA);

            t.assert(verdetti.cloudPiuNuovo === 'cloud',
                `Se il cloud è di un giorno più recente si prende quello (rilevato "${verdetti.cloudPiuNuovo}")`);
            t.assert(verdetti.localePiuNuovo === 'locale',
                `Se il locale è di un giorno più recente si tiene quello (rilevato "${verdetti.localePiuNuovo}")`);
            t.assert(verdetti.tropoVicini === 'locale',
                `Anche a un minuto di distanza si decide da sé, mai una domanda (rilevato "${verdetti.tropoVicini}")`);
            t.assert(verdetti.dataRotta === 'locale',
                `Una data illeggibile non deve mai bloccare la decisione (rilevato "${verdetti.dataRotta}")`);
            t.assert(verdetti.haEntrambeLeDate,
                'Il verdetto deve portare tutte e due le date: con una sola non si può decidere');

            // --- L'amministratore ha le valute piene -----------------
            // Calcolate alla lettura, MAI scritte nel salvataggio: se
            // quell'account smette di essere amministratore deve
            // ritrovarsi quello che ha davvero guadagnato.
            const valute = await page.evaluate(() => {
                if (!window.CloudSync) window.CloudSync = {};
                CloudSync.isAdmin = function () { return false; };
                const daGiocatore = SaveManager.getCurrency().credits;
                CloudSync.isAdmin = function () { return true; };
                const daAdmin = SaveManager.getCurrency();
                const salvato = JSON.parse(localStorage.getItem('yugiohDuelArenaSave')).currency.credits;
                return { daGiocatore: daGiocatore, daAdmin: daAdmin, salvato: salvato };
            });
            t.assert(valute.daAdmin.credits === 999999 && valute.daAdmin.starChips === 999999
                && valute.daAdmin.locatorCards === 999999 && valute.daAdmin.millenniumCards === 999999,
                `Un amministratore deve avere 999999 di OGNI valuta: ${JSON.stringify(valute.daAdmin)}`);
            t.assert(valute.salvato === valute.daGiocatore,
                `Le valute dell'amministratore non devono finire nel salvataggio (salvato ${valute.salvato}, vero ${valute.daGiocatore})`);

            t.assert(erroriPagina.length === 0, 'Errori JS in pagina: ' + erroriPagina.join(' | '));
        } finally {
            await page.close();
        }
    }
};
