// Guardrail statico (nessuna pagina/duello coinvolto, solo lettura dei
// sorgenti) per il checkpoint di targeting condiviso
// (declareCardEffectTarget/ctx.declareTarget, duel-engine.js) e il suo
// helper combinato ctx.destroyTargetedMonster (nato in questa sessione
// per ridurre il rischio di dimenticarsi la "danza in due mosse"
// declareTarget+destroyMonster scrivendo una carta nuova).
//
// Non è (e non può essere, in modo affidabile) un rilevatore perfetto di
// "questa nuova carta avrebbe dovuto chiamare il checkpoint e non l'ha
// fatto" — capire se un dato ctx.destroyMonster(...) rappresenti un vero
// targeting o un effetto di massa richiede di leggere il testo reale
// della carta, cosa che un'analisi statica del sorgente non può fare in
// modo affidabile senza un tasso di falsi positivi che renderebbe il
// controllo inutile (ignorato). È invece un RATCHET: il numero di
// chiamate reali (non in un commento) al checkpoint condiviso non deve
// mai scendere sotto una soglia nota — se scende, qualcuno ha rimosso
// una chiamata esistente senza sostituirla con l'equivalente corretto,
// una regressione silenziosa reale che questo test intercetta.
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'Guardrail: il checkpoint di targeting condiviso (ctx.declareTarget/destroyTargetedMonster) non regredisce',
    async run(t) {
        const engineSrc = fs.readFileSync(path.join(__dirname, '..', '..', 'js', 'engine', 'duel-engine.js'), 'utf8');
        const effectsSrc = fs.readFileSync(path.join(__dirname, '..', '..', 'js', 'engine', 'card-effects.js'), 'utf8');

        t.assert(
            engineSrc.includes('destroyTargetedMonster(targetOwner, targetIndex, options)'),
            'ACTIONS.destroyTargetedMonster deve esistere in duel-engine.js (helper combinato declareTarget+destroyMonster, così una nuova carta "distruggi 1 mostro bersaglio" non deve più ricordarsi la danza in due mosse)'
        );

        // Conta solo le righe di CODICE, non le menzioni dentro un
        // commento (es. "quindi passa da ctx.declareTarget(...) — vedi").
        const codeLines = effectsSrc.split('\n').filter((line) => !line.trim().startsWith('//'));
        const declareTargetCalls = codeLines.filter((line) => line.includes('.declareTarget(')).length;
        const combinedHelperCalls = codeLines.filter((line) => line.includes('.destroyTargetedMonster(')).length;
        const total = declareTargetCalls + combinedHelperCalls;

        t.assert(
            total >= 60,
            `Il numero di chiamate reali al checkpoint di targeting condiviso (ctx.declareTarget o ctx.destroyTargetedMonster) non deve scendere sotto 60 — lette ${total} (${declareTargetCalls} declareTarget + ${combinedHelperCalls} destroyTargetedMonster). Se sei qui perché hai rimosso/rifattorizzato una chiamata esistente, verifica di aver sostituito la protezione con l'equivalente corretto, non solo cancellato la riga.`
        );
    }
};
