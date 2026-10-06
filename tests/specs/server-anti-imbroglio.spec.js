// Il relay Multiplayer accetta esclusivamente il protocollo a passo comune.
// Le mosse del vecchio client (Evocazione, fase, attacco, fotografie e
// resync) devono essere sconosciute: altrimenti un APK obsoleto potrebbe
// riaprire il secondo percorso appena eliminato dal motore.
const { validateGameAction } = require('../../server/server.js');

module.exports = {
    standalone: true,
    name: 'Server Multiplayer: accetta soltanto lobby, passo comune ed esito',
    async run(t) {
        const A = 'giocatoreA';
        const B = 'giocatoreB';
        const room = () => ({});
        const ok = (r, id, a, msg) => t.assert(validateGameAction(r, id, a) === null, msg);
        const no = (r, id, a, msg) => t.assert(typeof validateGameAction(r, id, a) === 'string', msg);

        [
            'room-config', 'ready', 'rps',
            'mazzo', 'passo', 'passo-riprendi', 'game-over'
        ].forEach((kind) => ok(room(), A, { kind }, `${kind} appartiene al protocollo corrente`));

        [
            'phase', 'summon', 'tribute', 'position', 'spelltrap',
            'fieldspell', 'attack', 'activate', 'chain-response',
            'card-choice', 'state-push', 'request-resync', 'state-sync'
        ].forEach((kind) => no(room(), B, { kind }, `${kind} del protocollo legacy deve essere rifiutato`));

        no(room(), A, null, 'Un payload nullo va rifiutato senza generare eccezioni');
        no(room(), A, [], 'Un array non è una game-action valida');
        no(room(), A, { kind: 'regala-carte' }, 'Un tipo sconosciuto va rifiutato');
    }
};
