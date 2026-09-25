// L'ora della rotazione viene dal server, e i tre livelli si susseguono.
// =====================================================================
// La rotazione del Negozio e delle missioni si appoggia tutta a questo:
// se l'ora tornasse a essere quella del dispositivo, basterebbe spostare
// l'orologio del telefono per far ruotare il catalogo a piacere.
//
// Il difetto che ha reso necessario questo test: il primo approccio
// leggeva l'header `Date` della risposta HTTP, che il CORS non espone MAI
// al JavaScript — quindi non funzionava nemmeno una volta, e il Negozio
// mostrava sempre l'avviso "non riesco a leggere la data dal server".
// Un difetto totale, passato inosservato perché il ripiego funzionava:
// la pagina continuava a mostrare un catalogo, solo con l'ora sbagliata.
//
// Qui la rete NON viene toccata: `fetch` è sostituito dal test, così i
// tre livelli si possono provare uno per uno in modo deterministico e la
// suite non dipende da Supabase (né dalla connessione della macchina che
// la esegue).
//
// `standalone`: serve una pagina che carichi server-date.js, non quella
// del duello.
const path = require('path');

/** Un JWT finto: solo il payload conta, la firma non viene verificata da nessuno qui. */
function tokenConIat(secondi) {
    const payload = Buffer.from(JSON.stringify({ iat: secondi, sub: 'tester' })).toString('base64')
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return 'intestazione.' + payload + '.firma';
}

module.exports = {
    standalone: true,
    name: 'Orologio del server: RPC, poi il token, poi l\'orologio locale dichiarato',
    async run(t) {
        const RADICE = path.join(__dirname, '..', '..');
        const url = 'file:///' + path.join(RADICE, 'negozio.html').replace(/\\/g, '/');

        /**
         * Apre la pagina con `fetch` sostituito e (se serve) un token
         * finto, poi chiede l'ora. Ogni caso vuole una pagina NUOVA: il
         * modulo tiene lo scarto in una variabile propria e in
         * sessionStorage, quindi una volta riuscito non riproverebbe.
         */
        async function provaCon(opzioni) {
            const page = await t.browser.newPage({ viewport: { width: 1100, height: 800 } });
            await page.addInitScript((o) => {
                window.AUTH_GATE_SKIP = true;
                try { sessionStorage.removeItem('ygoServerClock'); } catch (e) { /* noop */ }
                const vero = window.fetch;
                window.fetch = function (indirizzo, config) {
                    const s = String(indirizzo);
                    if (s.indexOf('/rpc/server_now') !== -1) {
                        window.__rpcChiamata = (window.__rpcChiamata || 0) + 1;
                        if (!o.rpcIso) return Promise.reject(new Error('rete assente (finta)'));
                        return Promise.resolve({
                            ok: true,
                            json: () => Promise.resolve(o.rpcIso)
                        });
                    }
                    return vero.apply(this, arguments);
                };
            }, opzioni);
            await page.goto(url);
            await page.waitForFunction(() => !!window.ServerDate, null, { timeout: 20000 });
            // Il token finto si mette DOPO il caricamento, mai con
            // addInitScript: cloud-sync.js riscrive `window.CloudSync` per
            // intero quando gira, quindi qualunque finto preparato prima
            // verrebbe buttato via — e il caso "ripiego sul token"
            // risulterebbe fallito per un motivo che col motore non
            // c'entra niente.
            if (opzioni.token) {
                await page.evaluate((tok) => {
                    window.CloudSync = window.CloudSync || {};
                    window.CloudSync.getAccessToken = function () { return tok; };
                }, opzioni.token);
            }
            const esito = await page.evaluate(async () => {
                const ok = await ServerDate.sync();
                return {
                    sync: ok,
                    trusted: ServerDate.isTrusted(),
                    oraMs: ServerDate.now().getTime(),
                    rpcChiamata: window.__rpcChiamata || 0
                };
            });
            await page.close();
            return esito;
        }

        // --- 1. L'ora esatta, dalla funzione SQL --------------------
        // Una data lontanissima dall'oggi della macchina: se il modulo
        // ignorasse la risposta e usasse l'orologio locale, si vedrebbe.
        const FINTA = '2030-07-04T12:00:00+00:00';
        const rpc = await provaCon({ rpcIso: FINTA });
        t.assert(rpc.sync && rpc.trusted, `Con la funzione SQL disponibile l'ora dev'essere quella del server: ${JSON.stringify(rpc)}`);
        t.assert(rpc.rpcChiamata > 0, 'La funzione SQL dev\'essere davvero interrogata');
        t.assert(Math.abs(rpc.oraMs - Date.parse(FINTA)) < 5000,
            `L'ora dev'essere quella tornata dal server (scarto ${rpc.oraMs - Date.parse(FINTA)}ms)`);

        // --- 2. Rete assente: l'ora firmata nel token ---------------
        // Non costa una richiesta e, soprattutto, il giocatore non la può
        // falsificare spostando l'orologio: la scrive il server quando
        // emette il token.
        const IAT = Math.floor(Date.parse('2029-01-15T08:30:00Z') / 1000);
        const token = await provaCon({ rpcIso: null, token: tokenConIat(IAT) });
        t.assert(token.sync && token.trusted,
            `Senza rete l'ora dev'essere quella firmata nel token, non quella locale: ${JSON.stringify(token)}`);
        t.assert(Math.abs(token.oraMs - IAT * 1000) < 5000,
            `L'ora dev'essere quella del token (scarto ${token.oraMs - IAT * 1000}ms)`);

        // --- 3. Né rete né token: lo si DICE ------------------------
        // Il punto non è che funzioni comunque, ma che non finga: il
        // Negozio mostra l'avviso solo perché `isTrusted` è false.
        const locale = await provaCon({ rpcIso: null });
        t.assert(!locale.sync && !locale.trusted,
            `Senza rete né token la data è quella del dispositivo e va dichiarata: ${JSON.stringify(locale)}`);
        t.assert(Math.abs(locale.oraMs - Date.now()) < 10000,
            'Il ripiego dev\'essere comunque l\'ora locale, non una data a caso');
    }
};
