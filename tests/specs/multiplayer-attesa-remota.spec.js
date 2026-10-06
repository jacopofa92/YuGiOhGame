// L'attesa di una decisione Multiplayer deve essere visibile senza polling:
// PassoComune emette l'evento quando accoda la callback remota e lo spegne
// nello stesso momento in cui consuma la risposta. Si controllano anche il
// posizionamento nel viewport desktop/mobile e la pulizia a sessione ferma.
module.exports = {
    name: 'Multiplayer: avviso di attesa acceso dalla decisione remota e sempre dentro il viewport',
    async run({ page, assert, evaluate }) {
        const iniziale = await evaluate(() => {
            const eventi = [];
            window.__eventiAttesaRemota = eventi;
            window.__togliAttesaRemota = EventiDuello.ascolta('attesa-decisione-remota', (inAttesa, quante) => {
                eventi.push({ inAttesa, quante });
            });
            window.__decisioneRemotaRicevuta = null;
            PassoComune.avvia({ invia: () => {} });
            PassoComune.attendiDecisione((indice) => { window.__decisioneRemotaRicevuta = indice; });

            const el = document.getElementById('remoteChoiceWait');
            const r = el.getBoundingClientRect();
            return {
                hidden: el.hidden,
                ariaHidden: el.getAttribute('aria-hidden'),
                testo: el.textContent.trim(),
                dentroViewport: r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight,
                stato: PassoComune.stato(),
                eventi: eventi.slice()
            };
        });

        assert(!iniziale.hidden && iniziale.ariaHidden === 'false', 'L\'avviso compare quando viene accodata una decisione remota');
        assert(iniziale.testo.includes("L'avversario sta scegliendo"), `Testo dell'avviso inatteso: ${iniziale.testo}`);
        assert(iniziale.dentroViewport, 'Su desktop l\'avviso resta interamente nel viewport');
        assert(iniziale.stato.decisioniAttese === 1, `Il motore deve avere una decisione in attesa: ${JSON.stringify(iniziale.stato)}`);
        assert(iniziale.eventi.some((e) => e.inAttesa === true && e.quante === 1), `Manca l'evento di accensione: ${JSON.stringify(iniziale.eventi)}`);

        await page.setViewportSize({ width: 390, height: 844 });
        const dentroMobile = await evaluate(() => {
            const r = document.getElementById('remoteChoiceWait').getBoundingClientRect();
            return r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight;
        });
        assert(dentroMobile, 'Su mobile verticale l\'avviso resta interamente nel viewport');

        const conclusa = await evaluate(async () => {
            PassoComune.ricevi({ tipo: 'decisione', indice: 2 });
            await Promise.resolve();
            const el = document.getElementById('remoteChoiceWait');
            const primaDiFerma = {
                hidden: el.hidden,
                ariaHidden: el.getAttribute('aria-hidden'),
                indice: window.__decisioneRemotaRicevuta,
                stato: PassoComune.stato(),
                eventi: window.__eventiAttesaRemota.slice()
            };
            PassoComune.ferma();
            const dopoFerma = { hidden: el.hidden, eventi: window.__eventiAttesaRemota.slice() };
            window.__togliAttesaRemota();
            delete window.__eventiAttesaRemota;
            delete window.__togliAttesaRemota;
            delete window.__decisioneRemotaRicevuta;
            return { primaDiFerma, dopoFerma };
        });

        assert(conclusa.primaDiFerma.hidden && conclusa.primaDiFerma.ariaHidden === 'true', 'L\'avviso sparisce appena arriva la decisione');
        assert(conclusa.primaDiFerma.indice === 2, `La risposta deve raggiungere la callback originale: ${conclusa.primaDiFerma.indice}`);
        assert(conclusa.primaDiFerma.stato.decisioniAttese === 0, 'La decisione consumata non resta nella coda');
        assert(conclusa.primaDiFerma.eventi.some((e) => e.inAttesa === false && e.quante === 0), `Manca l'evento di spegnimento: ${JSON.stringify(conclusa.primaDiFerma.eventi)}`);
        assert(conclusa.dopoFerma.hidden, 'Fermare PassoComune lascia comunque nascosto l\'avviso');
    }
};
