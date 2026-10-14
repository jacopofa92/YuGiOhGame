// Il benchmark Custom deve restare separato e riproducibile: questo smoke
// test controlla parsing, impronta e un duello reale per ciascun livello.
const fs = require('fs');
const os = require('os');
const path = require('path');
const audit = require('../../tools/audit-archetipi-classici.js');

module.exports = {
    standalone: true,
    name: 'Audit archetipi classici: Custom separato, identificato e giocabile',
    async run(t) {
        const cartella = fs.mkdtempSync(path.join(os.tmpdir(), 'ygo-custom-audit-'));
        const file = path.join(cartella, 'save.json');
        const main = Array.from({ length: 40 }, (_, i) => ({ id: i % 2 ? 4 : 24, qty: 1 }));
        fs.writeFileSync(file, JSON.stringify({ decks: [{ id: 'custom', name: 'Custom', main, extra: [] }] }), 'utf8');
        try {
            const opzioni = { duellanti: ['joey'], partite: 1, turni: 80, seme: 141000, salvataggio: file, deckCustom: null, output: null };
            const custom = audit.caricaCustom(opzioni);
            t.assert(custom.deck.name === 'Custom' && custom.deck.main.length === 40,
                'Il salvataggio esportato deve fornire il deck Custom');
            t.assert(/^[a-f0-9]{16}$/.test(custom.impronta), 'Il deck deve avere un\'impronta stabile');
            const report = await audit.eseguiAudit(opzioni);
            t.assert(report.risultati.length === 3, 'Lo smoke test deve misurare i tre livelli');
            t.assert(report.risultati.every((r) => r.ufficiale.partite === 5 && r.custom.deckVittorie.partite === 1),
                'Campione ufficiale e Custom devono restare metriche separate');
            t.assert(report.risultati.every((r) => Object.prototype.hasOwnProperty.call(r.firmaPartitePct, 'Drago Nero Occhi Rossi')),
                'La frequenza della carta firma deve essere osservata nelle zone del solo avversario');
            t.assert(report.custom && report.custom.impronta === custom.impronta,
                'Il report deve conservare lista e impronta di Custom');
        } finally {
            fs.rmSync(cartella, { recursive: true, force: true });
        }
    }
};
