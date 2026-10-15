const audit = require('../../tools/audit-varianti-hard-classici.js');
const { giocaPartita } = require('../../tools/duello-senza-testa.js');

module.exports = {
    standalone: true,
    name: 'Audit varianti Hard: liste sperimentali isolate dal database',
    async run(t) {
        const v = audit.varianti();
        const conta = (deck, id) => (deck.main.find((c) => Number(c.id) === id) || {}).qty || 0;
        const totale = (deck) => deck.main.reduce((n, c) => n + c.qty, 0);

        t.assert(totale(v.kaiba.precedente) === 40 && totale(v.kaiba.pubblicato) === 40,
            'Entrambe le liste Kaiba devono restare da 40 carte');
        t.assert(conta(v.kaiba.pubblicato, 398) === 0 && conta(v.kaiba.pubblicato, 353) === 2,
            'Il deck Kaiba pubblicato deve sostituire il Rituale con consistenza Drago');
        t.assert(totale(v.pegasus.precedente) === 40 && totale(v.pegasus.pubblicato) === 40,
            'Entrambe le liste Pegasus devono restare da 40 carte');
        t.assert(totale(v.pegasus.nucleoDoppio) === 40
            && [38, 416, 475].every((id) => conta(v.pegasus.nucleoDoppio, id) === 2)
            && conta(v.pegasus.nucleoDoppio, 434) === 1,
        'La variante conservativa Pegasus deve mantenere il nucleo doppio e recuperare Capro Espiatorio');
        t.assert(conta(v.pegasus.pubblicato, 38) === 1 && conta(v.pegasus.pubblicato, 434) === 1,
            'Il deck Pegasus pubblicato deve ridurre Fusione e recuperare Capro Espiatorio');

        const base = { avversario: 'kaiba', livello: 'hard', seme: 321, turni: 60 };
        const naturale = await giocaPartita(base, 0);
        const iniettato = await giocaPartita(Object.assign({}, base, { mazzoAvversario: v.kaiba.pubblicato }), 0);
        const firma = (r) => JSON.stringify({ esito: r.esito, turno: r.turno, lpG: r.lpG, lpB: r.lpB });
        t.assert(firma(naturale) === firma(iniettato),
            'Iniettare il deck pubblicato deve riprodurre la partita naturale senza RNG aggiuntivo');

        // Se il campione e l'avversario sono lo stesso personaggio, la
        // variante appartiene comunque solo al posto bot. Il deck del
        // giocatore deve continuare a essere letto dal database originale.
        const specchio = { avversario: 'pegasus', giocatore: 'pegasus', livello: 'hard', livelloGiocatore: 'hard', seme: 654, turni: 60 };
        const specchioNaturale = await giocaPartita(specchio, 0);
        const specchioIniettato = await giocaPartita(Object.assign({}, specchio, { mazzoAvversario: v.pegasus.pubblicato }), 0);
        t.assert(firma(specchioNaturale) === firma(specchioIniettato),
            'La variante bot non deve sostituire il deck omonimo del giocatore');
    }
};

