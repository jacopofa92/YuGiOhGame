#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { giocaPartita } = require('./duello-senza-testa.js');

const ROOT = path.join(__dirname, '..');
const SUPPORTI = [1261, 1262, 1263];
const AVVERSARI = ['yamiYugi', 'joey', 'pegasus', 'mako', 'bakura'];
// Si sostituiscono prima carte periferiche o ridondanti. Restano intatti i
// tre Draghi Bianchi, il pacchetto X/Y/Z, Obelisk, Paladino/Rituale, Fusione
// e le carte firma principali: l'audit deve misurare i supporti, non cambiare
// identita' al Kaiba gia' bilanciato.
const TAGLI = [431, 335, 454, 198, 320, 69, 631, 312, 40, 793, 8, 272, 607];

function arg(name, fallback) {
    const index = process.argv.indexOf('--' + name);
    return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function kaibaHard() {
    const source = fs.readFileSync(path.join(ROOT, 'js/data/character-decks.js'), 'utf8');
    return JSON.parse(vm.runInNewContext(`${source}\nJSON.stringify(getCharacterDeck('kaiba', 'hard'));`, {}));
}

function sostituisci(base, additions) {
    const deck = JSON.parse(JSON.stringify(base));
    additions.forEach((id, index) => {
        const cut = TAGLI[index];
        const entry = deck.main.find((e) => e.id === cut && e.qty > 0);
        if (!entry) throw new Error(`Taglio ${cut} non disponibile nel deck Kaiba Hard.`);
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
    [
        { nome: 'pacchetto-leggero', main: [1261, 1262, 1263] },
        { nome: 'pacchetto-doppio', main: [1261, 1261, 1262, 1262, 1263, 1263] },
        { nome: 'pacchetto-consistenza', main: [1261, 1261, 1262, 1263] },
        { nome: 'pacchetto-alternativo', main: [1261, 1261, 1262, 1262, 1263] }
    ].forEach((v) => rows.push({ nome: v.nome, copie: null, carte: v.main, deck: sostituisci(base, v.main) }));
    return rows;
}

function pct(value, total) { return total ? Number((value * 100 / total).toFixed(1)) : 0; }
function average(values) { return Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2)); }

async function main() {
    const games = Math.max(1, Number(arg('partite', '50')) || 50);
    const seed = Number(arg('seme', '146000')) || 146000;
    const output = arg('output', 'reports/archetypes/BLUE_EYES_SUPPORT_1_2_3.json');
    const only = arg('solo', '').split(',').map((x) => x.trim()).filter(Boolean);
    const selected = varianti(kaibaHard()).filter((variant) => only.length === 0 || only.includes(variant.nome));
    const results = [];
    for (const variant of selected) {
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
        metodo: 'Kaiba Hard IA contro cinque deck Hard; stessi semi; supporti sostituiscono carte periferiche senza modificare il nucleo anime',
        gamesPerOpponent: games, seed, opponents: AVVERSARI, supportIds: SUPPORTI, results
    };
    const destination = path.resolve(ROOT, output);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, JSON.stringify(report, null, 2) + '\n', 'utf8');
    console.log(`Report scritto in ${destination}`);
}

if (require.main === module) main().catch((error) => { console.error(error.stack || error); process.exit(1); });
module.exports = { kaibaHard, sostituisci, varianti };
