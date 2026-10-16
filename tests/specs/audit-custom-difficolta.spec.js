const audit = require('../../tools/audit-custom-difficolta.js');
const { giocaPartita } = require('../../tools/duello-senza-testa.js');

module.exports = {
    standalone: true,
    name: 'Audit Custom: IA e versione del deck restano variabili indipendenti',
    async run(t) {
        const opzioni = audit.opzioniDa([
            '--duellanti', 'kaiba', '--partite', '2', '--turni', '80',
            '--seme', '231000', '--deck-custom', 'tests/fixtures/custom-deck.json'
        ]);
        t.assert(opzioni.duellanti.length === 1 && opzioni.duellanti[0] === 'kaiba',
            'Il filtro dei duellanti deve essere rispettato');
        t.assert(opzioni.partite === 2 && opzioni.seme === 231000,
            'Partite e seme devono essere riproducibili');
        t.assert(audit.percentuale(1, 2) === 50 && audit.media([10, 14]) === 12,
            'Le metriche di riepilogo devono restare stabili');

        // Specificare lo stesso livello del deck non deve costruirlo e
        // rimescolarlo una seconda volta: il risultato seminato deve essere
        // identico alla partita naturale usata dalla baseline.
        const base = { avversario: 'kaiba', livello: 'hard', seme: 913, turni: 60 };
        const naturale = await giocaPartita(base, 0);
        const esplicito = await giocaPartita(Object.assign({}, base, { livelloDeckAvversario: 'hard' }), 0);
        const firma = (r) => JSON.stringify({ esito: r.esito, turno: r.turno, lpG: r.lpG, lpB: r.lpB });
        t.assert(firma(naturale) === firma(esplicito),
            'Il livello deck esplicito deve conservare la stessa partita seminata');
        t.assert(naturale.manoBotInizialeIds.length === 5 && Array.isArray(naturale.manoBotFinaleIds),
            'Il simulatore deve esporre le mani necessarie alla diagnosi delle carte morte');
    }
};

