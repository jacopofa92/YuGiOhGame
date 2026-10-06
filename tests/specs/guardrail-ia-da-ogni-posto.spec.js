// Guardrail statico: l'IA gioca da qualunque posto al tavolo.
//
// Priorità 3 del piano ("posti al tavolo", js/engine/tavolo.js). L'IA
// sapeva giocare solo dal posto 'bot': ogni sua funzione leggeva
// gameState.botHand, attaccava gameState.playerMonsterField, attivava
// carte di 'bot'. Ora riceve il posto da cui gioca (`io`) e legge lo stato
// con gli accessori di Tavolo. Questo spec impedisce di tornare indietro
// un pezzo alla volta:
//  1. nei file dell'IA (js/ai/) niente gameState.botXxx/playerXxx scritti a
//     mano, e niente letterali 'bot'/'player' tranne il valore di default
//     del posto (`io = 'bot'`), la scorciatoia storica botTurn() e i testi
//     del registro;
//  2. in tutto js/ niente assegnazioni a un accessore di Tavolo
//     (`Tavolo.mano(io) = ...`): in uno script non stretto non è un errore
//     di sintassi, esplode solo quando la riga gira — è successo davvero
//     convertendo bot.js. Lo stato si modifica sull'array restituito
//     (splice, push), non sostituendolo.
const fs = require('fs');
const path = require('path');

const RADICE = path.join(__dirname, '..', '..');
const CAMPI = 'Hand|MonsterField|STField|Graveyard|LP|Deck|DeckCount|FieldSpell|ExtraDeck|Banished';

function tuttiIJs(dir) {
    return fs.readdirSync(path.join(RADICE, dir), { withFileTypes: true }).flatMap((e) => {
        const rel = dir + '/' + e.name;
        if (e.isDirectory()) return e.name === 'vendor' ? [] : tuttiIJs(rel);
        return e.name.endsWith('.js') ? [rel] : [];
    });
}

module.exports = {
    name: 'Guardrail: l\'IA gioca da qualunque posto al tavolo (niente posto fisso)',
    standalone: true,
    async run({ assert }) {
        const problemi = [];
        tuttiIJs('js/ai').forEach((f) => {
            fs.readFileSync(path.join(RADICE, f), 'utf8').split(/\r?\n/).forEach((riga, i) => {
                if (/^\s*(\/\/|\*|\/\*)/.test(riga)) return;
                const dove = `${f}:${i + 1} → ${riga.trim().slice(0, 110)}`;
                if (new RegExp(`gameState\\.(bot|player)(${CAMPI})\\b`).test(riga)) { problemi.push(dove); return; }
                if (/addToLog\(|console\.log\(/.test(riga)) return;
                const pulita = riga
                    .replace(/\bio = 'bot'/g, '')
                    .replace(/turnoIA\('bot'\)/g, '')
                    .replace(/io \|\| 'bot'/g, '');
                if (/'bot'|'player'/.test(pulita)) problemi.push(dove);
            });
        });
        assert(problemi.length === 0,
            `L'IA dà per scontato il suo posto (usare il parametro io e gli accessori di Tavolo, js/engine/tavolo.js):\n  - ${problemi.join('\n  - ')}`);

        const assegnazioni = [];
        tuttiIJs('js').forEach((f) => {
            fs.readFileSync(path.join(RADICE, f), 'utf8').split(/\r?\n/).forEach((riga, i) => {
                if (/Tavolo\.\w+\([^()]*(\([^()]*\))?[^()]*\)\s*=(?!=)/.test(riga)) assegnazioni.push(`${f}:${i + 1} → ${riga.trim().slice(0, 110)}`);
            });
        });
        assert(assegnazioni.length === 0,
            `Assegnazione a un accessore di Tavolo (esplode solo quando la riga gira; modificare l'array restituito):\n  - ${assegnazioni.join('\n  - ')}`);

        const ternariDiStato = [];
        const coppiaStato = new RegExp(`(?:gameState|ctx\\.gameState)\\.(player|bot)(${CAMPI}).*\\?.*(?:gameState|ctx\\.gameState)\\.(player|bot)\\2`);
        tuttiIJs('js/engine').forEach((f) => {
            if (f.endsWith('/tavolo.js')) return;
            fs.readFileSync(path.join(RADICE, f), 'utf8').split(/\r?\n/).forEach((riga, i) => {
                if (/^\s*(\/\/|\*|\/\*)/.test(riga)) return;
                const match = riga.match(coppiaStato);
                if (match && match[1] !== match[3]) ternariDiStato.push(`${f}:${i + 1} → ${riga.trim().slice(0, 110)}`);
            });
        });
        assert(ternariDiStato.length === 0,
            `Ternario di stato player/bot nel nucleo (usare gli accessori di Tavolo):\n  - ${ternariDiStato.join('\n  - ')}`);
    }
};
