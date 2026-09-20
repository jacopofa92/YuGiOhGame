// Guardrail: ogni chiamata a specialSummon dichiara da dove arriva la
// carta.
// =====================================================================
// Analisi statica del sorgente, nessun duello: gira in millisecondi.
//
// PERCHE' SERVE. `fromZone` e' il 5o argomento di ACTIONS.specialSummon
// (duel-engine.js) ed e' nato facoltativo. Finche' lo era, tre cose
// costruite sopra di lui funzionavano su una minoranza dei casi reali,
// in silenzio:
//   - Carta del Ritorno Sicuro (id 141) e la sua gemella pescano "quando
//     un mostro viene Special Summonato dal TUO Cimitero";
//   - def.cannotBeSpecialSummonedFromGraveyard vieta la rianimazione a
//     Drago Tiranno (1105), Sovrano Oscuro Ha Des (1118) e Helpoemer
//     (1123).
// Un divieto che vale solo dove qualcuno si e' ricordato di passare un
// parametro non e' un divieto: e' una lotteria. Da qui questo guardrail,
// che e' la ragione per cui quel meccanismo si puo' considerare chiuso.
//
// Non controlla che la zona sia GIUSTA — quello nessuna analisi statica
// puo' saperlo, la prova sta in come il chiamante ha tolto la carta
// dalla sua zona. Controlla che ci sia, che e' il modo in cui il difetto
// si ripresenterebbe: una carta nuova scritta copiando una vecchia.
const fs = require('fs');
const path = require('path');

const ZONE_AMMESSE = ['hand', 'deck', 'graveyard', 'extra', 'banished', 'field', 'token'];

module.exports = {
    name: 'Guardrail: ogni specialSummon dichiara la zona di provenienza (fromZone)',
    async run(t) {
        const radice = path.join(__dirname, '..', '..', 'js');
        const file = [];
        (function raccogli(dir) {
            fs.readdirSync(dir, { withFileTypes: true }).forEach((e) => {
                const p = path.join(dir, e.name);
                if (e.isDirectory()) { if (e.name !== 'vendor' && e.name !== 'data') raccogli(p); }
                else if (e.name.endsWith('.js')) file.push(p);
            });
        })(radice);

        const CHIAMATA = /(ctx|ACTIONS|actions|DuelEngine\.actions)\.specialSummon\(/g;
        const nude = [];
        const zoneViste = new Set();
        let totale = 0;

        file.forEach((f) => {
            const src = fs.readFileSync(f, 'utf8');
            const righe = src.split(/\r?\n/);
            let m;
            CHIAMATA.lastIndex = 0;
            while ((m = CHIAMATA.exec(src))) {
                const nRiga = src.slice(0, m.index).split('\n').length;
                const riga = righe[nRiga - 1];
                // I commenti che citano la funzione non sono chiamate.
                const prima = riga.slice(0, riga.indexOf('specialSummon'));
                if (/\/\/|^\s*\*/.test(prima)) continue;

                // Parentesi bilanciate: gli argomenti contengono chiamate
                // annidate, quindi uno split sulle virgole sbaglierebbe.
                let i = CHIAMATA.lastIndex - 1, g = 0;
                do {
                    if (src[i] === '(') g++;
                    else if (src[i] === ')') g--;
                    i++;
                } while (g > 0 && i < src.length);
                const dentro = src.slice(CHIAMATA.lastIndex, i - 1);
                const arg = [];
                let liv = 0, corr = '';
                for (const ch of dentro) {
                    if (ch === '(' || ch === '[' || ch === '{') liv++;
                    if (ch === ')' || ch === ']' || ch === '}') liv--;
                    if (ch === ',' && liv === 0) { arg.push(corr.trim()); corr = ''; continue; }
                    corr += ch;
                }
                if (corr.trim()) arg.push(corr.trim());

                totale++;
                const rel = path.relative(path.join(__dirname, '..', '..'), f).replace(/\\/g, '/');
                if (arg.length < 5 || !arg[4]) { nude.push(`${rel}:${nRiga}`); continue; }
                const z = arg[4].replace(/^['"]|['"]$/g, '');
                if (arg[4].startsWith("'") || arg[4].startsWith('"')) zoneViste.add(z);
            }
        });

        t.assert(totale >= 110,
            `L'analisi deve trovare le chiamate a specialSummon (rilevate ${totale}): se il numero crolla, e' il guardrail a essersi rotto, non il motore`);
        t.assert(nude.length === 0,
            `Ogni chiamata a specialSummon deve passare fromZone (5o argomento). Senza: ${nude.join(', ')}`);

        const sconosciute = [...zoneViste].filter((z) => !ZONE_AMMESSE.includes(z));
        t.assert(sconosciute.length === 0,
            `Zone di provenienza non previste: ${sconosciute.join(', ')}. Se ne serve una nuova va aggiunta a ZONE_AMMESSE qui e valutata in ACTIONS.specialSummon, non introdotta di nascosto`);

        // Le tre carte che dipendono dal divieto devono restare marcate:
        // togliere il flag renderebbe la clausola muta senza che nulla
        // fallisca altrove.
        const sorgenteCarte = fs.readdirSync(path.join(radice, 'engine'))
            .filter((f) => /^card-effects(-\d+)?\.js$/.test(f))
            .map((f) => fs.readFileSync(path.join(radice, 'engine', f), 'utf8'))
            .join('\n');
        const marcate = (sorgenteCarte.match(/cannotBeSpecialSummonedFromGraveyard:\s*true/g) || []).length;
        t.assert(marcate >= 3,
            `Le carte "non Special Summonabile dal Cimitero" devono restare marcate (rilevate ${marcate}, attese almeno 3: id 1105, 1118, 1123)`);
    }
};
