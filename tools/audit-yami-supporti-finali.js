#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { giocaPartita } = require('./duello-senza-testa.js');
const { caricaCustom } = require('./audit-archetipi-classici.js');
const magoNero = require('./audit-supporti-mago-nero.js');

const RADICE = path.join(__dirname, '..');
const CAMPIONI = ['joey', 'kaiba', 'pegasus', 'mako', 'bakura'];
const OSSERVATI = [2, 31, 1254, 1255, 1256, 1260];

function cambiaSenzaNuclei(base) {
    const deck = JSON.parse(JSON.stringify(base));
    const tagli = [261, 712, 109, 194];
    const aggiunte = [1254, 1254, 1255, 1256];
    tagli.forEach((id) => {
        const voce = deck.main.find((c) => Number(c.id) === id);
        if (!voce || voce.qty !== 1) throw new Error(`Taglio prudente non disponibile: ${id}`);
        deck.main.splice(deck.main.indexOf(voce), 1);
    });
    aggiunte.forEach((id) => {
        const voce = deck.main.find((c) => Number(c.id) === id);
        if (voce) voce.qty++; else deck.main.push({ id, qty: 1 });
    });
    deck.extra.push({ id: 1260, qty: 1 });
    return deck;
}

function varianti() {
    const base = magoNero.yamiYugiHard();
    return { pubblicato: base, prudente: cambiaSenzaNuclei(base) };
}

function valore(argv, nome, fallback) {
    const i = argv.indexOf('--' + nome);
    return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
}

function opzioniDa(argv) {
    return {
        partite: Math.max(1, Number(valore(argv, 'partite', '50')) || 50),
        turni: Math.max(20, Number(valore(argv, 'turni', '80')) || 80),
        seme: Number(valore(argv, 'seme', '181000')) || 181000,
        salvataggio: valore(argv, 'salvataggio', null),
        deckCustom: valore(argv, 'deck-custom', null),
        output: valore(argv, 'output', 'reports/archetypes/YAMI_SUPPORTS_FINAL_AUDIT.json')
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
            osservaPlayerIds: OSSERVATI
        }), 0);
        if (r.erroriCarte.length || r.invarianti.length) {
            throw new Error(`seme ${r.seme}: ${[...r.erroriCarte, ...r.invarianti].join(' | ')}`);
        }
        risultati.push(r);
    }
    return risultati;
}

function riepiloga(partite) {
    const vinte = partite.filter((p) => p.esito === true).length;
    return {
        partite: partite.length,
        vittorie: vinte,
        vittoriePct: pct(vinte, partite.length),
        turniMedi: media(partite.map((p) => p.turno)),
        nonFinite: partite.filter((p) => p.esito !== true && p.esito !== false).length,
        vistePct: Object.fromEntries(OSSERVATI.map((id) => [id,
            pct(partite.filter((p) => p.osservatiPlayerIds.includes(id)).length, partite.length)]))
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
                avversario: CAMPIONI[c], livello: 'hard', livelloGiocatore: 'hard',
                mazzoGiocatore: deck
            }, opzioni, c * 10000));
        }
        const controCustom = await serie({
            avversario: 'yamiYugi', livello: 'hard', livelloGiocatore: 'hard',
            mazzoGiocatore: deck,
            mazzoAvversario: { main: custom.deck.main, extra: custom.deck.extra }
        }, opzioni, 90000);
        const riga = { variante, ufficiale: riepiloga(ufficiali), controCustom: riepiloga(controCustom) };
        risultati.push(riga);
        console.log(`ufficiali ${riga.ufficiale.vittoriePct}% | contro Custom ${riga.controCustom.vittoriePct}%`);
    }
    return {
        generatoIl: new Date().toISOString(),
        metodo: 'Yami Yugi Hard; stessi semi; 5 avversari ufficiali e Custom separato',
        opzioni: { partite: opzioni.partite, turni: opzioni.turni, seme: opzioni.seme },
        custom: { name: custom.deck.name, impronta: custom.impronta },
        candidato: {
            aggiunteMain: [1254, 1254, 1255, 1256],
            tagliMain: [261, 712, 109, 194],
            aggiunteExtra: [1260]
        },
        risultati
    };
}

async function main() {
    const opzioni = opzioniDa(process.argv.slice(2));
    const report = await eseguiAudit(opzioni);
    console.table(report.risultati.map((r) => ({
        variante: r.variante,
        ufficiali: r.ufficiale.vittoriePct,
        controCustom: r.controCustom.vittoriePct,
        magoNero: r.ufficiale.vistePct[2],
        slifer: r.ufficiale.vistePct[31],
        bastone: r.ufficiale.vistePct[1254]
    })));
    const destinazione = path.resolve(RADICE, opzioni.output);
    fs.mkdirSync(path.dirname(destinazione), { recursive: true });
    fs.writeFileSync(destinazione, JSON.stringify(report, null, 2) + '\n', 'utf8');
    console.log(`Report scritto in ${destinazione}`);
}

if (require.main === module) main().catch((e) => { console.error(e.stack || e); process.exit(1); });
module.exports = { cambiaSenzaNuclei, varianti, opzioniDa, eseguiAudit };
