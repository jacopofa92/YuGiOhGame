#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { giocaPartita } = require('./duello-senza-testa.js');
const { caricaCustom } = require('./audit-archetipi-classici.js');

const RADICE = path.join(__dirname, '..');
const SLIFER = 31;
const CAMPIONI = ['yamiYugi', 'joey', 'kaiba', 'pegasus', 'mako'];

function caricaDeck() {
    const sorgente = fs.readFileSync(path.join(RADICE, 'js/data/character-decks.js'), 'utf8');
    const contesto = {};
    vm.createContext(contesto);
    vm.runInContext(sorgente, contesto);
    return JSON.parse(JSON.stringify(contesto.getCharacterDeck('strings', 'hard')));
}

function cambia(deck, modifiche) {
    const copie = new Map(deck.main.map((c) => [Number(c.id), Number(c.qty) || 1]));
    for (const [idTesto, delta] of Object.entries(modifiche)) {
        const id = Number(idTesto);
        const nuova = (copie.get(id) || 0) + delta;
        if (nuova > 0) copie.set(id, nuova); else copie.delete(id);
    }
    return Object.assign({}, deck, { main: Array.from(copie, ([id, qty]) => ({ id, qty })) });
}

function varianti() {
    const pubblicato = caricaDeck();
    return {
        pubblicato,
        waboku: cambia(pubblicato, { 6: -1, 503: 1 }),
        protezioneTributi: cambia(pubblicato, { 6: -1, 307: -1, 141: -1, 503: 2, 750: 1 })
    };
}

function valore(argv, nome, fallback) {
    const i = argv.indexOf('--' + nome);
    return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
}

function opzioniDa(argv) {
    return {
        partite: Math.max(1, Number(valore(argv, 'partite', '50')) || 50),
        turni: Math.max(20, Number(valore(argv, 'turni', '80')) || 80),
        seme: Number(valore(argv, 'seme', '173000')) || 173000,
        salvataggio: valore(argv, 'salvataggio', null),
        deckCustom: valore(argv, 'deck-custom', null),
        output: valore(argv, 'output', 'reports/archetypes/STRINGS_HARD_AUDIT.json')
    };
}

const pct = (n, totale) => totale ? Number((n * 100 / totale).toFixed(1)) : 0;
const media = (v) => v.length ? Number((v.reduce((a, b) => a + b, 0) / v.length).toFixed(2)) : 0;

async function serie(base, opzioni, offset) {
    const risultati = [];
    for (let i = 0; i < opzioni.partite; i++) {
        const r = await giocaPartita(Object.assign({}, base, {
            seme: opzioni.seme + offset + i,
            turni: opzioni.turni,
            osservaBotIds: [SLIFER]
        }), 0);
        if (r.erroriCarte.length || r.invarianti.length) {
            throw new Error(`seme ${r.seme}: ${[...r.erroriCarte, ...r.invarianti].join(' | ')}`);
        }
        risultati.push(r);
    }
    return risultati;
}

function riepiloga(partite, vittoriaStrings) {
    const evocate = partite.filter((p) => p.evocatiBotIds.includes(SLIFER));
    const viste = partite.filter((p) => p.osservatiBotIds.includes(SLIFER));
    const vinte = partite.filter((p) => vittoriaStrings ? p.esito === false : p.esito === true);
    const vinteConSlifer = evocate.filter((p) => vittoriaStrings ? p.esito === false : p.esito === true);
    return {
        partite: partite.length,
        vittorie: vinte.length,
        vittoriePct: pct(vinte.length, partite.length),
        sliferVistoPct: pct(viste.length, partite.length),
        sliferEvocato: evocate.length,
        sliferEvocatoPct: pct(evocate.length, partite.length),
        vittorieConSliferEvocatoPct: pct(vinteConSlifer.length, evocate.length),
        turnoMedioEvocazione: media(evocate.map((p) => p.primaEvocazioneBot[SLIFER].turno)),
        manoMediaAllEvocazione: media(evocate.map((p) => p.primaEvocazioneBot[SLIFER].mano)),
        turniMedi: media(partite.map((p) => p.turno)),
        nonFinite: partite.filter((p) => p.esito !== true && p.esito !== false).length
    };
}

async function eseguiAudit(opzioni) {
    const custom = caricaCustom(opzioni);
    if (!custom) throw new Error('Serve --salvataggio oppure --deck-custom con il deck Custom.');
    const risultati = [];
    for (const [variante, deck] of Object.entries(varianti())) {
        process.stdout.write(`${variante}... `);
        const ufficiali = [];
        for (let c = 0; c < CAMPIONI.length; c++) {
            ufficiali.push(...await serie({
                avversario: 'strings', livello: 'hard', livelloGiocatore: 'hard',
                giocatore: CAMPIONI[c], mazzoAvversario: deck
            }, opzioni, c * 10000));
        }
        const controCustom = await serie({
            avversario: 'strings', livello: 'hard', livelloGiocatore: 'hard',
            mazzoGiocatore: { main: custom.deck.main, extra: custom.deck.extra },
            mazzoAvversario: deck
        }, opzioni, 90000);
        const riga = {
            variante,
            carteMain: deck.main.reduce((n, c) => n + c.qty, 0),
            ufficiale: riepiloga(ufficiali, true),
            custom: riepiloga(controCustom, false)
        };
        risultati.push(riga);
        console.log(`Strings ${riga.ufficiale.vittoriePct}% | Slifer ${riga.ufficiale.sliferEvocatoPct}% | Custom vince ${riga.custom.vittoriePct}%`);
    }
    return {
        generatoIl: new Date().toISOString(),
        metodo: 'IA hard; stessi semi; cinque deck ufficiali piu Custom; Slifer contato solo quando entra nella zona Mostri',
        opzioni: { partite: opzioni.partite, turni: opzioni.turni, seme: opzioni.seme },
        custom: { name: custom.deck.name, impronta: custom.impronta },
        varianti: {
            waboku: '-1 Cavaliere Oscuro, +1 Waboku',
            protezioneTributi: '-1 Cavaliere Oscuro, -1 Carte Infinite, -1 Carta del Ritorno Sicuro, +2 Waboku, +1 Gabbia d’Acciaio dell’Incubo'
        },
        risultati
    };
}

async function main() {
    const opzioni = opzioniDa(process.argv.slice(2));
    const report = await eseguiAudit(opzioni);
    console.table(report.risultati.map((r) => ({
        variante: r.variante,
        vittorieStrings: r.ufficiale.vittoriePct,
        sliferEvocato: r.ufficiale.sliferEvocatoPct,
        vittorieDopoSlifer: r.ufficiale.vittorieConSliferEvocatoPct,
        customVince: r.custom.vittoriePct
    })));
    const destinazione = path.resolve(RADICE, opzioni.output);
    fs.mkdirSync(path.dirname(destinazione), { recursive: true });
    fs.writeFileSync(destinazione, JSON.stringify(report, null, 2) + '\n', 'utf8');
    console.log(`Report scritto in ${destinazione}`);
}

if (require.main === module) main().catch((e) => { console.error(e.stack || e); process.exit(1); });
module.exports = { caricaDeck, cambia, varianti, opzioniDa, eseguiAudit };
