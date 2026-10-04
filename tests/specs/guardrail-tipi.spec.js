// Guardrail: il controllo dei tipi (npm run typecheck) passa.
//
// I tipi vivono in types/motore.d.ts e il gioco resta JavaScript puro:
// tsc non compila nulla (noEmit), controlla solo i file che portano
// `// @ts-check` in cima (checkJs è spento per tutti gli altri, vedi
// jsconfig.json). Si accende un file alla volta, a partire da quelli nuovi
// del nucleo. Questo spec impedisce che un file già acceso torni ad avere
// errori senza che nessuno se ne accorga.
const path = require('path');
const { execFileSync } = require('child_process');

module.exports = {
    name: 'Guardrail: il controllo dei tipi (tsc, file con @ts-check) passa',
    async run(t) {
        const radice = path.join(__dirname, '..', '..');
        const tsc = path.join(radice, 'node_modules', 'typescript', 'bin', 'tsc');
        let uscita = '';
        let ok = true;
        try {
            execFileSync(process.execPath, [tsc, '-p', path.join(radice, 'jsconfig.json')], { cwd: radice, encoding: 'utf8', stdio: 'pipe' });
        } catch (e) {
            ok = false;
            uscita = String(e.stdout || '') + String(e.stderr || '');
        }
        t.assert(ok, `Errori di tipo nei file con // @ts-check (lancia npm run typecheck):\n${uscita.split('\n').slice(0, 25).join('\n')}`);
    }
};
