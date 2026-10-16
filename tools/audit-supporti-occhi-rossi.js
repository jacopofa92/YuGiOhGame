#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { giocaPartita } = require('./duello-senza-testa.js');

const ROOT = path.join(__dirname, '..');
const SUPPORTI = [1250, 1251, 1252, 1253];
const AVVERSARI = ['yamiYugi', 'kaiba', 'pegasus', 'mako', 'bakura'];
// Sostituzioni neutrali e progressive: non si toccano Occhi Rossi, Fusioni,
// carte firma vinte da Joey o il suo nucleo d'azzardo.
const TAGLI = [256, 101, 101, 477, 83, 269, 27, 27, 399, 879, 432, 440];

function arg(name, fallback) {
    const index = process.argv.indexOf('--' + name);
    return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function joeyHard() {
    const source = fs.readFileSync(path.join(ROOT, 'js/data/character-decks.js'), 'utf8');
    const deck = JSON.parse(vm.runInNewContext(`${source}\nJSON.stringify(getCharacterDeck('joey', 'hard'));`, {}));
    // Baseline storica precedente alla promozione del singolo Drago Metallo
    // Nero: necessaria per mantenere riproducibile l'audit 1/2/3 originale.
    const metallo = deck.main.find((c) => Number(c.id) === 1253);
    if (metallo) deck.main.splice(deck.main.indexOf(metallo), 1, { id: 256, qty: 1 });
    return deck;
}

function sostituisci(base, additions) {
    const deck = JSON.parse(JSON.stringify(base));
    const removeOne = (id) => {
        const entry = deck.main.find((e) => e.id === id && e.qty > 0);
        if (!entry) throw new Error(`Taglio ${id} non disponibile nel deck Joey Hard.`);
        entry.qty--;
        if (entry.qty === 0) deck.main.splice(deck.main.indexOf(entry), 1);
    };
    additions.forEach((id, index) => {
        removeOne(TAGLI[index]);
        const found = deck.main.find((e) => e.id === id);
        if (found) found.qty++;
        else deck.main.push({ id, qty: 1 });
    });
    return deck;
}

function varianti(base) {
    const rows = [{ nome: 'baseline', copie: 0, carte: [], deck: base }];
    SUPPORTI.forEach((id) => {
        for (let copie = 1; copie <= 3; copie++) {
            const cards = Array(copie).fill(id);
            rows.push({ nome: `${id}x${copie}`, copie, carte: cards, deck: sostituisci(base, cards) });
        }
    });
    for (let copie = 1; copie <= 3; copie++) {
        const cards = SUPPORTI.flatMap((id) => Array(copie).fill(id));
        rows.push({ nome: `pacchettox${copie}`, copie, carte: cards, deck: sostituisci(base, cards) });
    }
    return rows;
}

function pct(value, total) { return total ? Number((value * 100 / total).toFixed(1)) : 0; }
function average(values) { return Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2)); }

async function main() {
    const games = Math.max(1, Number(arg('partite', '50')) || 50);
    const seed = Number(arg('seme', '142000')) || 142000;
    const output = arg('output', 'reports/archetypes/RED_EYES_SUPPORT_1_2_3.json');
    const results = [];
    for (const variant of varianti(joeyHard())) {
        const outcomes = [];
        for (let opponentIndex = 0; opponentIndex < AVVERSARI.length; opponentIndex++) {
            for (let i = 0; i < games; i++) {
                const result = await giocaPartita({
                    avversario: AVVERSARI[opponentIndex], livello: 'hard', livelloGiocatore: 'hard',
                    mazzoGiocatore: variant.deck, seme: seed + opponentIndex * 10000 + i, turni: 80,
                    osservaPlayerIds: SUPPORTI
                }, 0);
                if (result.erroriCarte.length || result.invarianti.length) {
                    throw new Error(`${variant.nome}/${AVVERSARI[opponentIndex]}/${seed + i}: ${[...result.erroriCarte, ...result.invarianti].join(' | ')}`);
                }
                outcomes.push(result);
            }
        }
        const wins = outcomes.filter((r) => r.esito === true).length;
        const row = {
            variante: variant.nome,
            copie: variant.copie,
            carteAggiunte: variant.carte,
            partite: outcomes.length,
            vittoriePct: pct(wins, outcomes.length),
            turniMedi: average(outcomes.map((r) => r.turno || 0)),
            nonFinite: outcomes.filter((r) => r.esito !== true && r.esito !== false).length,
            vistePct: Object.fromEntries(SUPPORTI.map((id) => [id, pct(outcomes.filter((r) => (r.osservatiPlayerIds || []).includes(id)).length, outcomes.length)]))
        };
        results.push(row);
        console.log(`${variant.nome}: ${row.vittoriePct}% vittorie, ${row.turniMedi} turni medi`);
    }
    const report = { generatoIl: new Date().toISOString(), metodo: 'Joey Hard IA contro cinque deck Hard; stessi semi; supporti sostituiscono carte neutrali', gamesPerOpponent: games, seed, opponents: AVVERSARI, supportIds: SUPPORTI, results };
    const destination = path.resolve(ROOT, output);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, JSON.stringify(report, null, 2) + '\n', 'utf8');
    console.log(`Report scritto in ${destination}`);
}

if (require.main === module) main().catch((error) => { console.error(error.stack || error); process.exit(1); });
module.exports = { joeyHard, sostituisci, varianti };
