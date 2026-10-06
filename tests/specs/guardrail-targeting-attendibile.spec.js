const fs = require('fs');
const path = require('path');

// Una Magia/Trappola che usa il checkpoint sincrono con un solo bersaglio
// renderebbe di nuovo impossibile la scelta di Specchietto/Spostamento.
// Le attivazioni a due bersagli restano sincrone: entrambe le Trappole
// richiedono esattamente un bersaglio e quindi non possono reagire lì.
module.exports = {
    name: 'Guardrail: Magie e Trappole a bersaglio singolo usano il checkpoint attendibile',
    async run(t) {
        const cards = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data/cards.json'), 'utf8'));
        const tipi = new Map(cards.map((c) => [c.id, c.type]));
        const engineDir = path.join(process.cwd(), 'js/engine');
        const files = fs.readdirSync(engineDir).filter((f) => /^card-effects(?:-\d+)?\.js$/.test(f));
        const violations = [];
        files.forEach((file) => {
            const lines = fs.readFileSync(path.join(engineDir, file), 'utf8').split(/\r?\n/);
            let id = null;
            lines.forEach((line, index) => {
                const registration = line.match(/CardEffects\.register\((\d+)/);
                if (registration) id = Number(registration[1]);
                if (!id || (tipi.get(id) !== 'spell' && tipi.get(id) !== 'trap')) return;
                if (/\.declareTarget\([^\n]*totalTargetCount:\s*1/.test(line)) {
                    violations.push(`${file}:${index + 1} (id ${id})`);
                }
            });
        });
        t.assert(violations.length === 0,
            `Checkpoint sincrono rimasto in Magie/Trappole a bersaglio singolo:\n${violations.join('\n')}`);
    }
};
