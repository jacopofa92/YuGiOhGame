// Il client non può più ripiegare sul protocollo che replica le mosse.
// Questo spec isola il trasporto del passo comune e verifica sia l'handshake
// versionato sia il fallimento immediato quando parla un client precedente.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

module.exports = {
    name: 'Multiplayer: passo comune obbligatorio e versione incompatibile rifiutata',
    standalone: true,
    async run({ assert }) {
        const sorgente = fs.readFileSync(path.join(__dirname, '..', '..', 'js', 'multiplayer', 'mp-passo-comune.js'), 'utf8');

        function creaTrasporto() {
            const gestori = {};
            const inviati = [];
            const net = {
                on(nome, fn) {
                    if (!gestori[nome]) gestori[nome] = [];
                    gestori[nome].push(fn);
                },
                sendAction(azione) { inviati.push(azione); }
            };
            const window = { DuelNetwork: net };
            const contesto = vm.createContext({ window, globalThis: window, console, Math, setTimeout, clearTimeout });
            vm.runInContext(sorgente, contesto, { filename: 'mp-passo-comune.js' });
            return {
                api: window.MpPassoComune,
                net,
                inviati,
                emetti(nome, dato) { (gestori[nome] || []).forEach((fn) => fn(dato)); }
            };
        }

        const vecchio = creaTrasporto();
        vecchio.api.configura({ net: vecchio.net, sonoHost: true, iniziaIo: true });
        const attesaVecchio = vecchio.api.prepara({ main: [{ id: 1, qty: 3 }] });
        assert(vecchio.inviati[0] && vecchio.inviati[0].kind === 'mazzo' && vecchio.inviati[0].protocollo === 2,
            `Il mazzo deve dichiarare il protocollo 2: ${JSON.stringify(vecchio.inviati[0])}`);
        vecchio.emetti('game-action', { action: { kind: 'phase', name: 'draw' } });
        let erroreVecchio = null;
        try { await attesaVecchio; } catch (err) { erroreVecchio = err; }
        assert(erroreVecchio && /non più compatibile/i.test(erroreVecchio.message),
            `Un client legacy deve essere rifiutato subito: ${erroreVecchio && erroreVecchio.message}`);
        assert(typeof vecchio.api.rinuncia === 'undefined', 'L\'API non deve più offrire il ripiego sul protocollo precedente');

        const moderno = creaTrasporto();
        moderno.api.configura({ net: moderno.net, sonoHost: false, iniziaIo: false });
        const attesaModerno = moderno.api.prepara({ main: [{ id: 2, qty: 3 }] });
        moderno.emetti('game-action', {
            action: { kind: 'mazzo', protocollo: 2, spec: { main: [{ id: 3, qty: 3 }] }, seme: 12345 }
        });
        const partita = await attesaModerno;
        assert(partita.seme === 12345 && partita.sonoHost === false,
            `Due client sul protocollo 2 devono preparare la partita: ${JSON.stringify(partita)}`);
    }
};
