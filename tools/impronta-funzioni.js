#!/usr/bin/env node
/**
 * impronta-funzioni.js — "fotografia" del motore per dimostrare che uno
 * spostamento di codice non ha cambiato nulla.
 * =====================================================================
 * Apre duelMonstersCore.html in un browser senza finestra e salva, per
 * ogni funzione globale e per ogni carta registrata, il TESTO SORGENTE
 * (fn.toString()). Due fotografie uguali prima e dopo un refactor che
 * sposta funzioni fra file provano che il contenuto è identico: è molto
 * più forte di "i test passano". Usata per la divisione di card-effects.js
 * e per quella del nucleo (piano di attacco, Priorità 2).
 *
 * Uso:
 *   node tools/impronta-funzioni.js salva prima.json
 *   ... refactor ...
 *   node tools/impronta-funzioni.js salva dopo.json
 *   node tools/impronta-funzioni.js confronta prima.json dopo.json
 */
'use strict';

const fs = require('fs');
const path = require('path');

async function salva(destinazione) {
    const { chromium } = require('playwright');
    const browser = await chromium.launch();
    try {
        const page = await browser.newPage();
        await page.addInitScript(() => { window.AUTH_GATE_SKIP = true; window.DUEL_FAST_OPENING = true; });
        const url = 'file:///' + path.join(__dirname, '..', 'duelMonstersCore.html').replace(/\\/g, '/');
        await page.goto(url, { waitUntil: 'load' });
        // gameState è un `let` di primo livello: esiste nello scope globale
        // degli script ma NON come proprietà di window.
        await page.waitForFunction(() => typeof window.DuelEngine !== 'undefined' && typeof gameState !== 'undefined' && typeof cardDatabase !== 'undefined', null, { timeout: 30000 });
        const dati = await page.evaluate(() => {
            const funzioni = {};
            // Solo le proprietà PROPRIE di window che sono funzioni definite
            // dagli script del gioco (le native toString-ano "[native code]").
            Object.getOwnPropertyNames(window).forEach((k) => {
                let v;
                try { v = window[k]; } catch (e) { return; }
                if (typeof v !== 'function') return;
                const s = Function.prototype.toString.call(v);
                if (s.includes('[native code]')) return;
                funzioni[k] = s;
            });
            // Le API pubbliche degli oggetti del motore (DuelEngine.x, ...).
            ['DuelEngine', 'DuelEngineUI', 'CardEffectsShared', 'AI_SHARED', 'BotAI'].forEach((ns) => {
                const o = window[ns];
                if (!o) return;
                Object.keys(o).forEach((k) => {
                    if (typeof o[k] === 'function') funzioni[`${ns}.${k}`] = Function.prototype.toString.call(o[k]);
                });
            });
            const carte = {};
            cardDatabase.forEach((c) => {
                const def = window.DuelEngine.getDefinition(c.id);
                if (!def) return;
                const voce = {};
                Object.keys(def).sort().forEach((k) => {
                    voce[k] = typeof def[k] === 'function' ? Function.prototype.toString.call(def[k]) : JSON.stringify(def[k]);
                });
                carte[c.id] = voce;
            });
            return { funzioni, carte };
        });
        fs.writeFileSync(destinazione, JSON.stringify(dati));
        console.log(`Salvate ${Object.keys(dati.funzioni).length} funzioni e ${Object.keys(dati.carte).length} carte in ${destinazione}`);
    } finally {
        await browser.close();
    }
}

function confronta(a, b) {
    const A = JSON.parse(fs.readFileSync(a, 'utf8'));
    const B = JSON.parse(fs.readFileSync(b, 'utf8'));
    const diff = [];
    const chiavi = new Set([...Object.keys(A.funzioni), ...Object.keys(B.funzioni)]);
    chiavi.forEach((k) => {
        if (!(k in A.funzioni)) diff.push(`+ funzione nuova: ${k}`);
        else if (!(k in B.funzioni)) diff.push(`- funzione sparita: ${k}`);
        else if (A.funzioni[k] !== B.funzioni[k]) diff.push(`~ funzione cambiata: ${k}`);
    });
    const ids = new Set([...Object.keys(A.carte), ...Object.keys(B.carte)]);
    ids.forEach((id) => {
        const x = JSON.stringify(A.carte[id]);
        const y = JSON.stringify(B.carte[id]);
        if (x !== y) diff.push(`~ carta cambiata: ${id}`);
    });
    console.log(`${chiavi.size} funzioni, ${ids.size} carte confrontate: ${diff.length} differenze.`);
    diff.slice(0, 60).forEach((d) => console.log('  ' + d));
    process.exit(diff.length ? 1 : 0);
}

const [cmd, x, y] = process.argv.slice(2);
if (cmd === 'salva' && x) salva(x).catch((e) => { console.error(e); process.exit(1); });
else if (cmd === 'confronta' && x && y) confronta(x, y);
else { console.error('Uso: salva <file> | confronta <prima> <dopo>'); process.exit(1); }
