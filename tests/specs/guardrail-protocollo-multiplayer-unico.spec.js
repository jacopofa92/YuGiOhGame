// Guardrail: il client Multiplayer ha un solo protocollo di gioco.
//
// Il passo comune scambia comandi e decisioni e fa eseguire le stesse
// regole ai due motori. Il protocollo precedente replicava invece ogni
// mossa con messaggi dedicati, mani a segnaposto e fotografie di stato:
// tenere anche solo un emettitore o un ingresso remoto riaprirebbe due
// percorsi concorrenti e quindi il rischio di applicare una mossa due volte.
//
// Il relay non è incluso deliberatamente: durante la distribuzione del
// nuovo APK continua per poco ad accettare i tipi vecchi, senza che il
// client nuovo possa produrli o interpretarli.
const fs = require('fs');
const path = require('path');

const RADICE = path.join(__dirname, '..', '..');
const CARTELLE_CLIENT = ['js/engine', 'js/ai', 'js/multiplayer'];
const NOMI_VIETATI = [
    'MP_SENZA_PASSO_COMUNE',
    'MP_applyingRemote',
    'broadcastLocalStatePush',
    'serializePublicState',
    'computeStateChecksum',
    'awaitRemoteCardChoice',
    'broadcastCardChoice',
    'applyRemoteCardChoice',
    'applyRemoteChainDecision',
    'applyRemotePriorityDecision',
    'isRemoteResponder',
    'isRemoteChooser'
];

function fileJsDentro(cartella) {
    const assoluta = path.join(RADICE, cartella);
    return fs.readdirSync(assoluta, { withFileTypes: true }).flatMap((voce) => {
        const relativo = path.join(cartella, voce.name);
        if (voce.isDirectory()) return fileJsDentro(relativo);
        return voce.isFile() && voce.name.endsWith('.js') ? [relativo] : [];
    });
}

module.exports = {
    name: 'Guardrail: il client usa soltanto il Multiplayer a passo comune',
    standalone: true,
    async run({ assert }) {
        const residui = [];
        CARTELLE_CLIENT.flatMap(fileJsDentro).forEach((file) => {
            const testo = fs.readFileSync(path.join(RADICE, file), 'utf8');
            NOMI_VIETATI.forEach((nome) => {
                if (testo.includes(nome)) residui.push(`${file}: ${nome}`);
            });
        });
        assert(residui.length === 0,
            `Sono ricomparsi ingressi o ripieghi del protocollo Multiplayer vecchio:\n  - ${residui.join('\n  - ')}`);
    }
};
