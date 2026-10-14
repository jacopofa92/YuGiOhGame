#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { giocaPartita } = require('./duello-senza-testa.js');

const ROOT = path.join(__dirname, '..');
const SUPPORTI = [1254, 1255, 1256];
const AVVERSARI = ['joey', 'kaiba', 'pegasus', 'mako', 'bakura'];
// Tagli progressivi fra i corpi meno sinergici del mazzo. Non si toccano
// Mago Nero, Maga Oscura, le Magie che li citano, Fusioni/Rituali, Slifer
// o le difese firma: il confronto misura i supporti, non lo smantellamento
// del nucleo di Yami Yugi.
const TAGLI = [261, 712, 532, 533, 22, 115, 85, 112, 391];

function arg(name, fallback) {
    const index = process.argv.indexOf('--' + name);
    return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function yamiYugiHard() {
    const source = fs.readFileSync(path.join(ROOT, 'js/data/character-decks.js'), 'utf8');
    return JSON.parse(vm.runInNewContext(`${source}\nJSON.stringify(getCharacterDeck('yamiYugi', 'hard'));`, {}));
}

function sostituisci(base, additions) {
    const deck = JSON.parse(JSON.stringify(base));
    additions.forEach((id, index) => {
        const cut = TAGLI[index];
        const entry = deck.main.find((e) => e.id === cut && e.qty > 0);
        if (!entry) throw new Error(`Taglio ${cut} non disponibile nel deck Yami Yugi Hard.`);
        entry.qty--;
        if (entry.qty === 0) deck.main.splice(deck.main.indexOf(entry), 1);
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
    const seed = Number(arg('seme', '143000')) || 143000;
    const output = arg('output', 'reports/archetypes/DARK_MAGICIAN_SUPPORT_1_2_3.json');
    const results = [];
    for (const variant of varianti(yamiYugiHard())) {
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
            variante: variant.nome, copie: variant.copie, carteAggiunte: variant.carte,
            partite: outcomes.length, vittoriePct: pct(wins, outcomes.length),
            turniMedi: average(outcomes.map((r) => r.turno || 0)),
            nonFinite: outcomes.filter((r) => r.esito !== true && r.esito !== false).length,
            vistePct: Object.fromEntries(SUPPORTI.map((id) => [id,
                pct(outcomes.filter((r) => (r.osservatiPlayerIds || []).includes(id)).length, outcomes.length)]))
        };
        results.push(row);
        console.log(`${variant.nome}: ${row.vittoriePct}% vittorie, ${row.turniMedi} turni medi`);
    }
    const report = {
        generatoIl: new Date().toISOString(),
        metodo: 'Yami Yugi Hard IA contro cinque deck Hard; stessi semi; supporti sostituiscono carte non centrali',
        gamesPerOpponent: games, seed, opponents: AVVERSARI, supportIds: SUPPORTI, results
    };
    const destination = path.resolve(ROOT, output);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, JSON.stringify(report, null, 2) + '\n', 'utf8');
    console.log(`Report scritto in ${destination}`);
}

if (require.main === module) main().catch((error) => { console.error(error.stack || error); process.exit(1); });
module.exports = { yamiYugiHard, sostituisci, varianti };
