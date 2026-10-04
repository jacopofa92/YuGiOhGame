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
        const DIR_MOTORE = path.join(__dirname, '..', '..', 'js', 'engine');
        const engineSrc = fs.readFileSync(path.join(DIR_MOTORE, 'duel-engine.js'), 'utf8');
        // Gli effetti delle carte non sono più in un file solo: da quando
        // card-effects.js è stato diviso, le chiamate al checkpoint vivono
        // nelle parti (card-effects-1..N.js). Leggerne uno solo faceva
        // contare ZERO e bocciava il ratchet — cioè questo guardrail aveva
        // segnalato correttamente un cambiamento di struttura, non una
        // protezione perduta. Si legge quindi il condiviso PIÙ ogni parte,
        // così una parte nuova entra nel conteggio da sola.
        const effectsSrc = fs.readdirSync(DIR_MOTORE)
            .filter((f) => /^card-effects(-\d+)?\.js$/.test(f))
            .map((f) => fs.readFileSync(path.join(DIR_MOTORE, f), 'utf8'))
            .join('\n');

        t.assert(
            engineSrc.includes('destroyTargetedMonster(targetOwner, targetIndex, options)'),
            'ACTIONS.destroyTargetedMonster deve esistere in duel-engine.js (helper combinato declareTarget+destroyMonster, così una nuova carta "distruggi 1 mostro bersaglio" non deve più ricordarsi la danza in due mosse)'
        );

        // Conta solo le righe di CODICE, non le menzioni dentro un
        // commento (es. "quindi passa da ctx.declareTarget(...) — vedi").
        const codeLines = effectsSrc.split('\n').filter((line) => !line.trim().startsWith('//'));
        const declareTargetCalls = codeLines.filter((line) => line.includes('.declareTarget(')).length;
        const combinedHelperCalls = codeLines.filter((line) => line.includes('.destroyTargetedMonster(')).length;
        // `dichiara: true` passato a chooseFieldCardTarget (card-effects.js,
        // dichiaraBersaglioScelto): la terza forma del checkpoint, nata
        // dall'audit 1.0.37 che ha portato una trentina di carte a
        // dichiarare il proprio bersaglio. Conta come le altre due.
        const opzioneDichiara = codeLines.filter((line) => /\bdichiara:\s*true\b/.test(line)).length;
        const total = declareTargetCalls + combinedHelperCalls + opzioneDichiara;
        // Soglia rialzata dopo l'audit 1.0.37 (da 60): era 122 al momento
        // dell'audit. Si alza a mano quando si aggiungono chiamate, mai si
        // abbassa senza un motivo scritto.
        const SOGLIA = 115;

        t.assert(
            total >= SOGLIA,
            `Il numero di chiamate reali al checkpoint di targeting condiviso (ctx.declareTarget, ctx.destroyTargetedMonster o l'opzione dichiara: true) non deve scendere sotto ${SOGLIA} — lette ${total} (${declareTargetCalls} declareTarget + ${combinedHelperCalls} destroyTargetedMonster + ${opzioneDichiara} dichiara). Se sei qui perché hai rimosso/rifattorizzato una chiamata esistente, verifica di aver sostituito la protezione con l'equivalente corretto, non solo cancellato la riga.`
        );
        // La forma più comoda deve continuare a funzionare davvero: se
        // dichiaraBersaglioScelto smettesse di chiamare declareTarget,
        // tutte le carte con `dichiara: true` perderebbero la protezione
        // senza che il conteggio qui sopra se ne accorga.
        const shared = fs.readFileSync(path.join(DIR_MOTORE, 'card-effects.js'), 'utf8');
        const corpo = (shared.match(/function dichiaraBersaglioScelto\([^)]*\)\s*\{[\s\S]*?\n    \}/) || [''])[0];
        t.assert(corpo.includes('ctx.declareTarget('), 'dichiaraBersaglioScelto (card-effects.js) deve chiamare ctx.declareTarget');
        t.assert(/options\s*&&\s*options\.dichiara/.test(shared), 'chooseFieldCardTarget deve leggere options.dichiara');
    }
};
