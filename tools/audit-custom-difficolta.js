#!/usr/bin/env node
/**
 * Separa l'effetto del livello IA da quello della versione del deck.
 *
 * Il normale duello associa sempre Medio al deck Medio e Difficile al deck
 * Difficile. Quando una variante Hard rende peggio, quel confronto non dice
 * quale delle due variabili sia responsabile. Questa matrice 2x2 tiene fissi
 * gli stessi semi e incrocia esplicitamente IA e deck.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { giocaPartita } = require('./duello-senza-testa.js');
const { caricaCustom } = require('./audit-archetipi-classici.js');

const RADICE = path.join(__dirname, '..');
const LIVELLI = ['medium', 'hard'];
const CARTE_DIAGNOSTICHE = {
    kaiba: [1, 30, 40, 298, 317, 353, 389, 398, 506, 578, 793],
    pegasus: [38, 40, 123, 202, 382, 400, 416, 434, 466, 475, 485, 793, 820]
};

function valore(argv, nome, fallback) {
    const i = argv.indexOf('--' + nome);
    return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
}

function opzioniDa(argv) {
    return {
        duellanti: valore(argv, 'duellanti', 'kaiba,pegasus').split(',').map((x) => x.trim()).filter(Boolean),
        partite: Math.max(1, Number(valore(argv, 'partite', '50')) || 50),
        turni: Math.max(20, Number(valore(argv, 'turni', '80')) || 80),
        // L'audit generale usa seme base 141000 e riserva +90000 alla serie
        // Custom. Questo default riproduce quindi esattamente quei matchup.
        seme: Number(valore(argv, 'seme', '231000')) || 231000,
        salvataggio: valore(argv, 'salvataggio', null),
        deckCustom: valore(argv, 'deck-custom', null),
        output: valore(argv, 'output', 'reports/archetypes/CUSTOM_DIFFICULTY_FACTORIAL.json')
    };
}

function percentuale(parte, totale) {
    return totale ? Number((parte * 100 / totale).toFixed(1)) : 0;
}

function media(valori) {
    return valori.length ? Number((valori.reduce((a, b) => a + b, 0) / valori.length).toFixed(2)) : 0;
}

async function eseguiAudit(opzioni) {
    const custom = caricaCustom(opzioni);
    if (!custom) throw new Error('Serve --salvataggio oppure --deck-custom con il deck Custom.');
    const risultati = [];

    for (const duellante of opzioni.duellanti) {
        for (const livelloDeck of LIVELLI) {
            for (const livelloIA of LIVELLI) {
                process.stdout.write(`${duellante}: deck ${livelloDeck}, IA ${livelloIA}... `);
                const partite = [];
                for (let i = 0; i < opzioni.partite; i++) {
                    const esito = await giocaPartita({
                        avversario: duellante,
                        livello: livelloIA,
                        livelloDeckAvversario: livelloDeck,
                        livelloGiocatore: 'hard',
                        mazzoGiocatore: { main: custom.deck.main, extra: custom.deck.extra },
                        osservaBotIds: CARTE_DIAGNOSTICHE[duellante] || [],
                        seme: opzioni.seme + i,
                        turni: opzioni.turni
                    }, 0);
                    if (esito.erroriCarte.length || esito.invarianti.length) {
                        throw new Error(`${duellante}/${livelloDeck}/${livelloIA}/seme ${esito.seme}: ${[...esito.erroriCarte, ...esito.invarianti].join(' | ')}`);
                    }
                    partite.push(esito);
                }
                const customVittorie = partite.filter((p) => p.esito === true).length;
                const riga = {
                    duellante,
                    livelloDeck,
                    livelloIA,
                    partite: partite.length,
                    customVittorie,
                    customVittoriePct: percentuale(customVittorie, partite.length),
                    turniMedi: media(partite.map((p) => p.turno)),
                    nonFinite: partite.filter((p) => p.esito !== true && p.esito !== false).length,
                    carte: Object.fromEntries((CARTE_DIAGNOSTICHE[duellante] || []).map((id) => [id, {
                        manoInizialePct: percentuale(partite.filter((p) => p.manoBotInizialeIds.includes(id)).length, partite.length),
                        usataPct: percentuale(partite.filter((p) => p.osservatiBotIds.includes(id)).length, partite.length),
                        inManoAllaSconfittaPct: percentuale(
                            partite.filter((p) => p.esito === true && p.manoBotFinaleIds.includes(id)).length,
                            partite.filter((p) => p.esito === true).length
                        )
                    }])),
                    semiVintiDaCustom: partite.filter((p) => p.esito === true).map((p) => p.seme),
                    semiVintiDaAvversario: partite.filter((p) => p.esito === false).map((p) => p.seme)
                };
                risultati.push(riga);
                console.log(`Custom ${riga.customVittoriePct}%`);
            }
        }
    }

    return {
        generatoIl: new Date().toISOString(),
        metodo: 'matrice fattoriale IA medium/hard x deck medium/hard; stessi semi; Custom informativo',
        opzioni: {
            duellanti: opzioni.duellanti,
            partite: opzioni.partite,
            turni: opzioni.turni,
            seme: opzioni.seme,
            salvataggio: opzioni.salvataggio ? path.basename(opzioni.salvataggio) : null,
            deckCustom: opzioni.deckCustom ? path.basename(opzioni.deckCustom) : null
        },
        custom: { name: custom.deck.name, impronta: custom.impronta },
        risultati
    };
}

async function main() {
    const opzioni = opzioniDa(process.argv.slice(2));
    const report = await eseguiAudit(opzioni);
    console.table(report.risultati.map((r) => ({
        duellante: r.duellante,
        deck: r.livelloDeck,
        ia: r.livelloIA,
        vittorieCustom: r.customVittoriePct,
        turniMedi: r.turniMedi
    })));
    const destinazione = path.resolve(RADICE, opzioni.output);
    fs.mkdirSync(path.dirname(destinazione), { recursive: true });
    fs.writeFileSync(destinazione, JSON.stringify(report, null, 2) + '\n', 'utf8');
    console.log(`Report scritto in ${destinazione}`);
}

if (require.main === module) main().catch((e) => { console.error(e.stack || e); process.exit(1); });
module.exports = { opzioniDa, eseguiAudit, percentuale, media };

