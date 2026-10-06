#!/usr/bin/env node
/**
 * Simulazione riproducibile del farming delle acquisizioni speciali.
 * Legge le costanti vere da CardAcquisition.RULES: se una probabilità
 * cambia nel gioco, questo strumento non continua a misurare quella vecchia.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const context = { window: {}, console };
context.window.window = context.window;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, 'js/economy/card-acquisition.js'), 'utf8'), context);
const rules = context.window.CardAcquisition.RULES;

let seed = 0x5EEDC0DE;
function random() {
    seed |= 0;
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function quantile(sorted, q) { return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))]; }

function simulateExodia(rate, copies, seeker) {
    let wins = 0;
    let pity = 0;
    let drops = 0;
    while (drops < 5 * copies) {
        wins++;
        pity++;
        const guaranteed = seeker && wins % rules.seekerGuaranteeEvery === 0;
        if (guaranteed || pity >= rules.exodiaPity || random() < rate * (seeker ? rules.seekerMultiplier : 1)) {
            drops++;
            pity = 0;
        }
    }
    return wins;
}

function sample(rate, copies, seeker, runs) {
    const values = Array.from({ length: runs }, () => simulateExodia(rate, copies, seeker)).sort((a, b) => a - b);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return { mean: Math.round(mean), p50: quantile(values, .5), p90: quantile(values, .9), p99: quantile(values, .99) };
}

const runs = Number(process.argv[2]) || 50000;
const result = { runs, seed: '0x5EEDC0DE', exodia: {} };
Object.keys(rules.exodiaRates).forEach((difficulty) => {
    result.exodia[difficulty] = {
        oneSet: sample(rules.exodiaRates[difficulty], 1, false, runs),
        threeSets: sample(rules.exodiaRates[difficulty], 3, false, runs)
    };
});
result.exodia.SeekerDifficile = {
    oneSet: sample(rules.exodiaRates.Difficile, 1, true, runs),
    threeSets: sample(rules.exodiaRates.Difficile, 3, true, runs)
};
result.fixedWins = {
    destinyBoard: 25, flyingElephant: 25,
    signatureFirst: 50, signatureSecond: 100,
    sliferStrings: rules.slifer.stringsHard,
    raMarik: rules.ra.marikHard,
    raControlledAmongThose: rules.ra.controlled,
    raBattleCityTournaments: rules.ra.tournamentHard
};
console.log(JSON.stringify(result, null, 2));
