#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { giocaPartita } = require('./duello-senza-testa.js');
const { caricaCustom } = require('./audit-archetipi-classici.js');
const { yamiYugiHard } = require('./audit-supporti-mago-nero.js');

const RADICE = path.join(__dirname, '..');
const CAMPIONI = ['joey', 'kaiba', 'pegasus', 'mako', 'bakura'];
const OSSERVATI = [85, 112, 1277, 1278, 1279, 1280, 1281, 1282];

function sostituisci(base, tagli, aggiunte, extra) {
    const deck = JSON.parse(JSON.stringify(base));
    tagli.forEach((id) => {
        const voce = deck.main.find((entry) => Number(entry.id) === id && entry.qty > 0);
        if (!voce) throw new Error(`Taglio non disponibile nel deck Yami Yugi Hard: ${id}`);
        voce.qty--;
        if (!voce.qty) deck.main.splice(deck.main.indexOf(voce), 1);
    });
    aggiunte.forEach((id) => {
        const voce = deck.main.find((entry) => Number(entry.id) === id);
        if (voce) voce.qty++;
        else deck.main.push({ id, qty: 1 });
    });
    (extra || []).forEach((id) => deck.extra.push({ id, qty: 1 }));
    return deck;
}

function varianti() {
    const base = yamiYugiHard();
    return {
        pubblicato: base,
        soloGamma: sostituisci(base, [109], [1277]),
        magnetici: sostituisci(base, [109, 194], [1277, 1278]),
        cavalieri: sostituisci(base, [261, 712, 391], [1279, 1280, 1281], [1282]),
        cavalieriGamma: sostituisci(base, [109, 261, 712, 391], [1277, 1279, 1280, 1281], [1282]),
        completo: sostituisci(base, [109, 194, 261, 712, 391], [1277, 1278, 1279, 1280, 1281], [1282])
    };
}

function arg(nome, fallback) {
    const i = process.argv.indexOf('--' + nome);
    return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const percentuale = (n, totale) => totale ? Number((n * 100 / totale).toFixed(1)) : 0;
const media = (valori) => valori.length
    ? Number((valori.reduce((somma, valore) => somma + valore, 0) / valori.length).toFixed(2)) : 0;

async function serie(base, partite, seme, offset) {
    const risultati = [];
    for (let i = 0; i < partite; i++) {
        const risultato = await giocaPartita(Object.assign({}, base, {
            seme: seme + offset + i,
            turni: 80,
            osservaPlayerIds: OSSERVATI
        }), 0);
        if (risultato.erroriCarte.length || risultato.invarianti.length) {
            throw new Error(`seme ${risultato.seme}: ${[...risultato.erroriCarte, ...risultato.invarianti].join(' | ')}`);
        }
        risultati.push(risultato);
    }
    return risultati;
}

function riepiloga(risultati) {
    const vittorie = risultati.filter((r) => r.esito === true).length;
    return {
        partite: risultati.length,
        vittorie: vittorie,
        vittoriePct: percentuale(vittorie, risultati.length),
        turniMedi: media(risultati.map((r) => r.turno)),
        nonFinite: risultati.filter((r) => r.esito !== true && r.esito !== false).length,
        vistePct: Object.fromEntries(OSSERVATI.map((id) => [id,
            percentuale(risultati.filter((r) => r.osservatiPlayerIds.includes(id)).length, risultati.length)]))
    };
}

async function main() {
    const partite = Math.max(1, Number(arg('partite', '50')) || 50);
    const seme = Number(arg('seme', '191000')) || 191000;
    const salvataggio = arg('salvataggio', 'C:/Users/dange/Downloads/save_yugioh.json');
    const custom = caricaCustom({ salvataggio, deckCustom: arg('deck-custom', null) });
    if (!custom) throw new Error('Deck Custom non trovato nel salvataggio indicato.');
    const risultati = [];

    for (const [nome, deck] of Object.entries(varianti())) {
        process.stdout.write(`${nome}... `);
        const ufficiali = [];
        for (let c = 0; c < CAMPIONI.length; c++) {
            ufficiali.push(...await serie({
                avversario: CAMPIONI[c], livello: 'hard', livelloGiocatore: 'hard',
                giocatore: 'yamiYugi', mazzoGiocatore: deck
            }, partite, seme, c * 10000));
        }
        const controCustom = await serie({
            avversario: 'yamiYugi', livello: 'hard', livelloGiocatore: 'hard',
            giocatore: 'yamiYugi', mazzoGiocatore: deck,
            mazzoAvversario: { main: custom.deck.main, extra: custom.deck.extra }
        }, partite, seme, 90000);
        const riga = { variante: nome, ufficiale: riepiloga(ufficiali), controCustom: riepiloga(controCustom) };
        risultati.push(riga);
        console.log(`ufficiali ${riga.ufficiale.vittoriePct}% | Custom ${riga.controCustom.vittoriePct}%`);
    }

    const report = {
        generatoIl: new Date().toISOString(),
        metodo: 'Yami Yugi Hard IA contro cinque deck Hard; stessi semi; Custom solo metrica aggiuntiva',
        opzioni: { partitePerAvversario: partite, turni: 80, seme },
        custom: { nome: custom.deck.name, impronta: custom.impronta },
        varianti: {
            soloGamma: { rimosse: [109], aggiunte: [1277] },
            magnetici: { rimosse: [109, 194], aggiunte: [1277, 1278] },
            cavalieri: { rimosse: [261, 712, 391], aggiunte: [1279, 1280, 1281], extra: [1282] },
            cavalieriGamma: { rimosse: [109, 261, 712, 391], aggiunte: [1277, 1279, 1280, 1281], extra: [1282] },
            completo: { rimosse: [109, 194, 261, 712, 391], aggiunte: [1277, 1278, 1279, 1280, 1281], extra: [1282] }
        },
        risultati
    };
    const destinazione = path.join(RADICE, 'reports/archetypes/YAMI_MAGNETICI_CAVALIERI_AUDIT.json');
    fs.mkdirSync(path.dirname(destinazione), { recursive: true });
    fs.writeFileSync(destinazione, JSON.stringify(report, null, 2) + '\n', 'utf8');
    console.log(`Report scritto in ${destinazione}`);
}

if (require.main === module) main().catch((errore) => { console.error(errore.stack || errore); process.exit(1); });
module.exports = { sostituisci, varianti };
