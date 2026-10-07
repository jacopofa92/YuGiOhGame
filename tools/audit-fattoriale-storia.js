#!/usr/bin/env node
/**
 * Separa le due componenti della difficoltà avversaria:
 *  A) stesso deck hard, IA easy/medium/hard;
 *  B) stessa IA hard, deck easy/medium/hard.
 * Lavora solo sui nodi risultati non monotoni nell'ultimo audit e lascia
 * fuori Pegasus/Toon, come richiesto.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { giocaPartita } = require('./duello-senza-testa.js');
const {
    caricaGlobale, duelliPrincipali, specificaDeck, semeComparabile
} = require('./simula-storia-deck.js');
const RADICE = path.join(__dirname, '..');
const LIVELLI = ['easy', 'medium', 'hard'];

function media(v) {
    return v.length ? Number((v.reduce((a, b) => a + b, 0) / v.length).toFixed(2)) : 0;
}

async function prova(opts, deck, indiceDeck, duello, indiceDuello, ia, livelloDeck) {
    let turni = 0;
    for (let tentativo = 1; tentativo <= opts.tentativi; tentativo++) {
        const esito = await giocaPartita({
            avversario: duello.avversario,
            livello: ia,
            livelloDeckAvversario: livelloDeck,
            livelloGiocatore: 'hard',
            mazzoGiocatore: specificaDeck(deck),
            seme: semeComparabile(opts.seme, indiceDeck, indiceDuello, tentativo),
            turni: opts.turni
        }, 0);
        turni += esito.turno || 0;
        if (esito.esito === true) return { vinto: true, tentativi: tentativo, turni };
    }
    return { vinto: false, tentativi: opts.tentativi, turni };
}

async function eseguiAudit(opts) {
    const catalogo = caricaGlobale('js/data/starter-structure-decks.js', 'starterStructureDeckDatabase');
    const decks = catalogo
        .filter((d) => (d.main || []).reduce((n, c) => n + (Number(c.qty) || 0), 0) >= 40)
        .filter((d) => !String(d.packId).includes('ww1') && d.packId !== 'starter_sdp_pegasus');
    const campagne = caricaGlobale('js/data/story-campaigns.js', 'window.storyCampaignsDatabase');
    const tutti = duelliPrincipali(campagne.find((c) => c.id === 'anime'));
    const precedente = JSON.parse(fs.readFileSync(path.join(RADICE, 'STORY_DECK_SIMULATION_REPORT.json'), 'utf8'));
    const anomalie = new Set(precedente.analisiIncontri
        .filter((x) => !x.progressioneCoerente && x.avversario !== 'pegasus')
        .map((x) => x.id));
    const duelli = tutti.filter((d) => anomalie.has(d.id));
    const righe = [];

    for (let indiceDuello = 0; indiceDuello < duelli.length; indiceDuello++) {
        const duello = duelli[indiceDuello];
        for (const asse of ['ia', 'deck']) {
            for (const livello of LIVELLI) {
                const campioni = [];
                for (let indiceDeck = 0; indiceDeck < decks.length; indiceDeck++) {
                    campioni.push(await prova(
                        opts, decks[indiceDeck], indiceDeck, duello, tutti.findIndex((d) => d.id === duello.id),
                        asse === 'ia' ? livello : 'hard',
                        asse === 'deck' ? livello : 'hard'
                    ));
                }
                righe.push({
                    id: duello.id,
                    avversario: duello.avversario,
                    asse,
                    livello,
                    campioni: campioni.length,
                    superatoDa: campioni.filter((x) => x.vinto).length,
                    tentativiMedi: media(campioni.map((x) => x.tentativi)),
                    alTetto: campioni.filter((x) => !x.vinto).length
                });
            }
        }
    }
    return {
        generatoIl: new Date().toISOString(),
        metodo: 'IA hard del giocatore; stessi semi; Pegasus escluso; asse IA con deck hard fisso, asse deck con IA hard fissa',
        opzioni: opts,
        deckCampione: decks.map((d) => d.packId),
        incontri: duelli.map((d) => ({ id: d.id, avversario: d.avversario })),
        risultati: righe
    };
}

async function main() {
    const valore = (nome, fallback) => {
        const i = process.argv.indexOf('--' + nome);
        return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
    };
    const opts = {
        tentativi: Number(valore('tentativi', '50')) || 50,
        turni: Number(valore('turni', '80')) || 80,
        seme: Number(valore('seme', '7000')) || 7000
    };
    const output = valore('output', 'STORY_DIFFICULTY_FACTORIAL_REPORT.json');
    const report = await eseguiAudit(opts);
    fs.writeFileSync(path.resolve(output), JSON.stringify(report, null, 2) + '\n', 'utf8');
    console.table(report.risultati);
    console.log(`Report scritto in ${path.resolve(output)}`);
}

if (require.main === module) main().catch((e) => { console.error(e.stack || e); process.exit(1); });
module.exports = { eseguiAudit };
