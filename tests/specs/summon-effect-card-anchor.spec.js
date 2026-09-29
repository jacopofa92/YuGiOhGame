// Guardrail sull'origine delle cinematiche di Evocazione. Tutti i percorsi
// passano da playMonsterSummonEffect: qui la carta reale va risolta tramite
// uid, perche' un nodo ricevuto prima di updateUI puo' essere obsoleto e sul
// lato bot l'effetto finirebbe sopra il ritratto invece che sul mostro.
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'Effetto Evocazione Livello 7+: ancorato alla carta sul Terreno, non all avatar',
    async run(t) {
        const root = path.join(__dirname, '..', '..');
        const effects = fs.readFileSync(path.join(root, 'js', 'ui', 'effects.js'), 'utf8');
        const flow = fs.readFileSync(path.join(root, 'js', 'engine', 'game-flow.js'), 'utf8');
        t.assert(effects.includes("typeof window.findFieldCardElementByUid === 'function'")
            && effects.includes('window.findFieldCardElementByUid(card.uid) || monsterElement'),
        'playMonsterSummonEffect deve risolvere la carta reale tramite uid prima di calcolare il centro');
        t.assert(flow.includes('function findFieldCardElementByUid(uid)')
            && flow.includes('#botFieldBoard ${selettore}'),
        'L helper UID deve cercare esplicitamente anche nel campo del bot');
    }
};
