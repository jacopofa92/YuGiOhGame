#!/usr/bin/env node
/**
 * duello-gemello.js — due motori che si parlano come due telefoni.
 * =====================================================================
 * Priorità 3 del piano, passo C: lo strumento che verifica il Multiplayer a
 * passo comune (js/engine/passo-comune.js) senza browser né server.
 *
 * Due copie complete del motore (le stesse di tools/duello-senza-testa.js)
 * girano nello stesso processo, sullo stesso orologio virtuale. Su ciascuna
 * il posto 'player' è l'IA del gioco e il posto 'bot' è 'remoto': l'altra
 * copia. Ciò che una manda (comandi, decisioni) arriva all'altra dopo una
 * latenza variabile, passando per JSON — come sulla rete, niente oggetti in
 * comune fra le due.
 *
 * Cosa si controlla:
 *  - ogni comando porta l'impronta INTERA dello stato di chi lo manda, e chi
 *    lo riceve la confronta con la propria prima di eseguirlo (vedi
 *    improntaCompleta in passo-comune.js): la prima divergenza dice già
 *    quale pezzo dello stato si è separato, e in che punto della partita;
 *  - a fine partita, le due impronte devono coincidere;
 *  - nessuna delle due copie lancia errori, e la partita arriva in fondo
 *    (uno stallo — chi aspetta una decisione che non arriva — è un errore).
 *
 * Uso:
 *   node tools/duello-gemello.js [--host yamiYugi] [--ospite kaiba]
 *        [--livello-host hard] [--livello-ospite hard]
 *        [--seme 42] [--partite 1] [--turni 60] [--log]
 * Esce con 1 se una partita diverge, si blocca o lancia un errore.
 */
'use strict';

const vm = require('vm');
const path = require('path');
const { creaContesto, creaOrologio, prng } = require(path.join(__dirname, 'duello-senza-testa.js'));

function argomenti() {
    const a = process.argv.slice(2);
    const val = (k, d) => { const i = a.indexOf('--' + k); return i >= 0 && a[i + 1] ? a[i + 1] : d; };
    return {
        host: val('host', 'yamiYugi'),
        ospite: val('ospite', 'kaiba'),
        livelloHost: val('livello-host', 'hard'),
        livelloOspite: val('livello-ospite', 'hard'),
        seme: Number(val('seme', '42')),
        partite: Number(val('partite', '1')),
        turni: Number(val('turni', '60')),
        log: a.includes('--log'),
        traccia: a.includes('--traccia')
    };
}

/**
 * Una partita fra due copie del motore.
 * @returns {Promise<object>} esito, divergenze, errori, stallo
 */
async function giocaGemello(opz, n) {
    const seme = opz.seme + n;
    const orologio = creaOrologio();
    // Ogni copia ha il suo Math.random (l'IA di un telefono non tira gli
    // stessi numeri dell'altro); la casualità di GIOCO esce invece dal seme
    // comune passato a PassoComune.preparaDuello.
    const lati = [
        { nome: 'host', personaggio: opz.host, livello: opz.livelloHost },
        { nome: 'ospite', personaggio: opz.ospite, livello: opz.livelloOspite }
    ].map((l, i) => Object.assign(l, creaContesto({
        avversario: l.personaggio, livello: l.livello, seme: seme * 7 + i + 1, orologio, log: opz.log
    })));
    const esegui = (lato, codice) => vm.runInContext(codice, lato.contesto);

    // La rete: un messaggio parte come testo JSON e arriva all'altra copia
    // dopo una latenza fra 20 e 300 ms, MAI prima del messaggio precedente
    // nella stessa direzione (una connessione WebSocket è ordinata).
    const latenza = prng(seme * 13 + 5);
    let inVolo = 0;
    const ultimoArrivo = [0, 0];
    lati.forEach((lato, i) => {
        const altro = lati[1 - i];
        lato.contesto.__spedisciAlGemello = (testo) => {
            inVolo++;
            const arrivo = Math.max(ultimoArrivo[i], orologio.ora + 20 + Math.floor(latenza() * 280));
            ultimoArrivo[i] = arrivo;
            orologio.setTimeout(() => {
                inVolo--;
                esegui(altro, `PassoComune.ricevi(${testo})`);
            }, arrivo - orologio.ora);
        };
    });

    // I due mazzi, dai dati: uguali sui due lati per costruzione.
    const mazzo = (lato) => `getCharacterDeck(${JSON.stringify(lato.personaggio)}, ${JSON.stringify(lato.livello)})`;
    lati.forEach((lato, i) => {
        esegui(lato, `
            resetGameState();
            Tavolo.imposta({ player: 'ia', bot: 'remoto' });
            Tavolo.impostaNaturaRemoto('ia');
            gameState.livelloIA = { player: ${JSON.stringify(lato.livello)}, bot: ${JSON.stringify(lati[1 - i].livello)} };
            PassoComune.avvia({ invia: (m) => __spedisciAlGemello(JSON.stringify(m)), improntaCompleta: true });
            // Lo stato da confrontare è quello del momento in cui il duello
            // finisce: quel che fanno dopo i timer ancora in volo (il resto di
            // una Catena, una fase) non conta più per nessuno.
            var __improntaFinale = null;
            EventiDuello.ascolta('fine-duello', () => { if (__improntaFinale === null) __improntaFinale = PassoComune.impronta(); });
            PassoComune.preparaDuello({
                seme: ${seme},
                sonoHost: ${i === 0},
                mazzoHost: ${mazzo(lati[0])},
                mazzoOspite: ${mazzo(lati[1])}
            });
        `);
    });
    // --traccia: ogni scelta chiesta, ogni decisione mandata o attesa e ogni
    // comando finiscono nel registro, segnati con '»'. È il modo di vedere
    // DOVE le due copie hanno smesso di chiedersi le stesse cose.
    if (opz.traccia) {
        lati.forEach((lato) => esegui(lato, `
            (function () {
                const chiedi = Decisioni.chiedi;
                Decisioni.chiedi = function (r, cb) {
                    __logDuello.push('» chiede a ' + r.chi + ' (' + (r.tipo || 'carte') + ', ' + (r.candidati || []).length + ' candidati' + (r.titolo ? ', ' + r.titolo : '') + ')');
                    return chiedi.apply(this, arguments);
                };
                const manda = PassoComune.decisioneLocale;
                PassoComune.decisioneLocale = function (i) { __logDuello.push('» manda decisione ' + i); return manda.apply(this, arguments); };
                const attendi = PassoComune.attendiDecisione;
                PassoComune.attendiDecisione = function (poi) {
                    __logDuello.push('» attende una decisione');
                    return attendi.call(this, (i) => { __logDuello.push('» riceve decisione ' + i); poi(i); });
                };
                const comando = PassoComune.comando;
                PassoComune.comando = function (posto, cmd) {
                    __logDuello.push('» comando ' + cmd.tipo + ' di ' + posto);
                    return comando.apply(this, arguments);
                };
            })();
        `));
    }

    // Il primo turno è dell'host: di là lo guida la sua IA, di qua le fasi
    // del posto remoto avanzano da sole (vedi changeTurn in fasi.js).
    esegui(lati[0], 'turnoIA(\'player\');');
    esegui(lati[1], 'enterDrawPhase(true);');

    const finito = (lato) => esegui(lato, '!!gameState.gameOver || __esitoDuello !== null');
    let passi = 0;
    const LIMITE_PASSI = 400000;
    let motivoStop = null;
    while (passi < LIMITE_PASSI) {
        passi++;
        const turno = esegui(lati[0], 'gameState.turn');
        if (finito(lati[0]) && finito(lati[1]) && inVolo === 0) { motivoStop = 'fine'; break; }
        if (turno > opz.turni) { motivoStop = 'limite'; break; }
        // Una divergenza segnalata da PassoComune basta: le mosse dopo
        // girerebbero su due partite diverse e non direbbero nulla di più.
        if (lati.some((l) => l.erroriCarte.some((e) => e.includes('PassoComune: lo stato di qua')))) { motivoStop = 'divergenza'; break; }
        await new Promise((r) => setImmediate(r));
        if (!orologio.passo()) {
            await new Promise((r) => setImmediate(r));
            if (orologio.inCoda === 0) { motivoStop = 'coda vuota'; break; }
        }
        // Un duello che non si muove più: l'orologio va avanti solo coi
        // tentativi di PassoComune (ogni 50 ms) o coi giri d'attesa dell'IA.
        if (orologio.ora > 3 * 3600 * 1000) { motivoStop = 'tempo virtuale esaurito'; break; }
    }

    const foto = (lato) => esegui(lato, `({
        impronta: __improntaFinale !== null ? __improntaFinale : PassoComune.impronta(),
        passo: PassoComune.stato(),
        nonFermo: PassoComune.motivoNonFermo(),
        esito: __esitoDuello, turno: gameState.turn, fase: gameState.phase, diTurno: gameState.currentPlayer,
        lp: [gameState.playerLP, gameState.botLP],
        log: __logDuello.slice(${opz.traccia ? -45 : -10})
    })`);
    const [fh, fo] = lati.map(foto);
    const divergenze = lati.flatMap((l) => l.erroriCarte.filter((e) => e.includes('PassoComune')).map((e) => `${l.nome}: ${e}`));
    const altriErrori = lati.flatMap((l) => l.erroriCarte.filter((e) => !e.includes('PassoComune')).map((e) => `${l.nome}: ${e}`));
    // L'esito visto dai due lati è rovesciato: vince il 'player' di uno se
    // vince il 'bot' dell'altro.
    const esitiCoerenti = fh.esito === null || fo.esito === null
        ? fh.esito === fo.esito
        : (fh.esito === 'draw' ? fo.esito === 'draw' : fh.esito === !fo.esito);
    const finaliUguali = fh.impronta === fo.impronta;
    return { seme, passi, ora: orologio.ora, motivoStop, host: fh, ospite: fo, divergenze, altriErrori, esitiCoerenti, finaliUguali };
}

async function main() {
    const opz = argomenti();
    let ok = true;
    for (let n = 0; n < opz.partite; n++) {
        const t0 = Date.now();
        let r;
        try {
            r = await giocaGemello(opz, n);
        } catch (e) {
            ok = false;
            console.error(`Partita ${n + 1} (seme ${opz.seme + n}): ERRORE\n${e && e.stack ? e.stack.split('\n').slice(0, 8).join('\n') : e}`);
            continue;
        }
        const esito = r.host.esito === true ? `vince ${opz.host}` : r.host.esito === false ? `vince ${opz.ospite}` : r.host.esito === 'draw' ? 'pareggio' : '—';
        const buona = r.motivoStop !== 'divergenza' && r.divergenze.length === 0 && r.altriErrori.length === 0
            && r.esitiCoerenti && (r.motivoStop === 'limite' || r.finaliUguali)
            && (r.motivoStop === 'fine' || r.motivoStop === 'limite');
        if (!buona) ok = false;
        console.log(`Partita ${n + 1} (seme ${r.seme}): ${buona ? 'ALLINEATA' : 'PROBLEMA'} — ${r.motivoStop}, ${esito}, turno ${r.host.turno}, LP ${r.host.lp.join('/')} — ${r.passi} passi, ${Math.round(r.ora / 1000)} s di gioco in ${Date.now() - t0} ms`);
        if (buona) continue;
        r.divergenze.slice(0, 3).forEach((d) => console.log(`  ${d}`));
        r.altriErrori.slice(0, 5).forEach((d) => console.log(`  errore ${d}`));
        if (!r.esitiCoerenti) console.log(`  esiti incoerenti: host ${r.host.esito}, ospite ${r.ospite.esito}`);
        if (!r.finaliUguali && r.motivoStop === 'fine') {
            const a = r.host.impronta.split(' ## ');
            const b = r.ospite.impronta.split(' ## ');
            const i = a.findIndex((x, k) => x !== b[k]);
            console.log(`  stato finale diverso fra i due lati: host «${a[i]}» / ospite «${b[i]}»`);
        }
        [['host', r.host], ['ospite', r.ospite]].forEach(([nome, f]) => {
            console.log(`  ${nome}: turno ${f.turno} fase ${f.fase} di turno ${f.diTurno}, non fermo: ${f.nonFermo}, passo comune ${JSON.stringify(f.passo)}`);
            console.log(`    ${f.log.join('\n    ')}`);
        });
    }
    process.exit(ok ? 0 : 1);
}

if (require.main === module) main();
module.exports = { giocaGemello };
