#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { giocaPartita } = require('./duello-senza-testa.js');

const ROOT = path.join(__dirname, '..');
const PRIMO_PACCHETTO = [1266, 1267, 1268];
const SECONDO_PACCHETTO = [1269, 1270];
const SUPPORTI = PRIMO_PACCHETTO.concat(SECONDO_PACCHETTO);
const OSSERVATI = [487, 416, 476].concat(SUPPORTI);
const AVVERSARI = ['yamiYugi', 'joey', 'kaiba', 'mako', 'bakura'];
// Si preservano tutti i Toon, Mondo, Maschera/Riavvolgimento e l'intera
// linea Abbandonato + Idolo + Fusione + Restrizione. I primi tagli sono i
// tre Conigli Oscuri, poi utility non necessarie al piano identitario.
const TAGLI = [190, 190, 190, 206, 8, 10, 272, 646, 382, 306];

function arg(name, fallback) {
    const index = process.argv.indexOf('--' + name);
    return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function pegasusHard() {
    const source = fs.readFileSync(path.join(ROOT, 'js/data/character-decks.js'), 'utf8');
    return JSON.parse(vm.runInNewContext(`${source}\nJSON.stringify(getCharacterDeck('pegasus', 'hard'));`, {}));
}

function sostituisci(base, additions) {
    const deck = JSON.parse(JSON.stringify(base));
    additions.forEach((id, index) => {
        const cut = TAGLI[index];
        const entry = deck.main.find((candidate) => candidate.id === cut && candidate.qty > 0);
        if (!entry) throw new Error(`Taglio ${cut} non disponibile nel deck Pegasus Hard.`);
        entry.qty--;
        if (entry.qty === 0) deck.main.splice(deck.main.indexOf(entry), 1);
        const found = deck.main.find((candidate) => candidate.id === id);
        if (found) found.qty++;
        else deck.main.push({ id, qty: 1 });
    });
    return deck;
}

function varianti(base) {
    const rows = [{ nome: 'baseline', copie: 0, carte: [], deck: base }];
    SECONDO_PACCHETTO.forEach((id) => {
        for (let copie = 1; copie <= 3; copie++) {
            const cards = Array(copie).fill(id);
            rows.push({ nome: `${id}x${copie}`, copie, carte: cards, deck: sostituisci(base, cards) });
        }
    });
    [
        { nome: 'secondo-leggero', main: [1269, 1270] },
        { nome: 'secondo-doppio', main: [1269, 1269, 1270, 1270] },
        { nome: 'primo-leggero-controllo', main: [1266, 1267, 1268] },
        { nome: 'primo-piu-girapagina', main: [1266, 1267, 1268, 1269] },
        { nome: 'primo-piu-soldato', main: [1266, 1267, 1268, 1270] },
        { nome: 'completo-leggero', main: [1266, 1267, 1268, 1269, 1270] }
    ].forEach((variant) => rows.push({
        nome: variant.nome, copie: null, carte: variant.main,
        deck: sostituisci(base, variant.main)
    }));
    return rows;
}

function pct(value, total) { return total ? Number((value * 100 / total).toFixed(1)) : 0; }
function average(values) { return Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2)); }

async function main() {
    const games = Math.max(1, Number(arg('partite', '50')) || 50);
    const seed = Number(arg('seme', '149000')) || 149000;
    const output = arg('output', 'reports/archetypes/TOON_SUPPORT_COMPLETE_1_2_3.json');
    const only = arg('solo', '').split(',').map((value) => value.trim()).filter(Boolean);
    const selected = varianti(pegasusHard()).filter((variant) => only.length === 0 || only.includes(variant.nome));
    const results = [];
    for (const variant of selected) {
        const outcomes = [];
        for (let opponentIndex = 0; opponentIndex < AVVERSARI.length; opponentIndex++) {
            for (let i = 0; i < games; i++) {
                const result = await giocaPartita({
                    avversario: AVVERSARI[opponentIndex], livello: 'hard', livelloGiocatore: 'hard',
                    mazzoGiocatore: variant.deck, seme: seed + opponentIndex * 10000 + i, turni: 80,
                    osservaPlayerIds: OSSERVATI
                }, 0);
                if (result.erroriCarte.length || result.invarianti.length) {
                    throw new Error(`${variant.nome}/${AVVERSARI[opponentIndex]}/${seed + i}: ${[...result.erroriCarte, ...result.invarianti].join(' | ')}`);
                }
                outcomes.push(result);
            }
        }
        const wins = outcomes.filter((result) => result.esito === true).length;
        const row = {
            variante: variant.nome, copie: variant.copie, carteAggiunte: variant.carte,
            partite: outcomes.length, vittoriePct: pct(wins, outcomes.length),
            turniMedi: average(outcomes.map((result) => result.turno || 0)),
            nonFinite: outcomes.filter((result) => result.esito !== true && result.esito !== false).length,
            vistePct: Object.fromEntries(OSSERVATI.map((id) => [id,
                pct(outcomes.filter((result) => (result.osservatiPlayerIds || []).includes(id)).length, outcomes.length)]))
        };
        results.push(row);
        console.log(`${variant.nome}: ${row.vittoriePct}% vittorie, ${row.turniMedi} turni medi`);
    }
    const report = {
        generatoIl: new Date().toISOString(),
        metodo: 'Pegasus Hard IA contro cinque deck Hard; stessi semi; secondo pacchetto Toon isolato e poi combinato col primo, sostituendo carte periferiche e preservando Toon e Abbandonato/Mille Occhi',
        gamesPerOpponent: games, seed, opponents: AVVERSARI, supportIds: SUPPORTI,
        observedIdentityIds: OSSERVATI, results
    };
    const destination = path.resolve(ROOT, output);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, JSON.stringify(report, null, 2) + '\n', 'utf8');
    console.log(`Report scritto in ${destination}`);
}

if (require.main === module) main().catch((error) => { console.error(error.stack || error); process.exit(1); });
module.exports = { pegasusHard, sostituisci, varianti };
