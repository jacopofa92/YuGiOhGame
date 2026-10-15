#!/usr/bin/env node
/**
 * Confronta piccole varianti lore-friendly di Kaiba/Pegasus Hard con le
 * liste pubblicate. Nessuna variante viene scritta nel database del gioco.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { giocaPartita } = require('./duello-senza-testa.js');
const { caricaCustom } = require('./audit-archetipi-classici.js');

const RADICE = path.join(__dirname, '..');
const CAMPIONI = ['yamiYugi', 'joey', 'pegasus', 'mako', 'bakura'];

function caricaDeck(personaggio) {
    const sorgente = fs.readFileSync(path.join(RADICE, 'js/data/character-decks.js'), 'utf8');
    const contesto = {};
    vm.createContext(contesto);
    vm.runInContext(sorgente, contesto);
    return JSON.parse(JSON.stringify(contesto.getCharacterDeck(personaggio, 'hard')));
}

function cambia(deck, modifiche) {
    const copie = new Map((deck.main || []).map((c) => [Number(c.id), Number(c.qty) || 1]));
    for (const [idTesto, delta] of Object.entries(modifiche)) {
        const id = Number(idTesto);
        const nuova = (copie.get(id) || 0) + delta;
        if (nuova > 0) copie.set(id, nuova); else copie.delete(id);
    }
    return Object.assign({}, deck, {
        main: Array.from(copie, ([id, qty]) => ({ id, qty }))
    });
}

function varianti() {
    const kaibaPubblicato = caricaDeck('kaiba');
    const pegasusPubblicato = caricaDeck('pegasus');
    return {
        kaiba: {
            precedente: cambia(kaibaPubblicato, {
                398: 1,  // Paladino del Drago Bianco
                506: 1,  // Rituale del Drago Bianco
                353: -1, // una sola copia Signore dei D.
                578: -1  // una sola copia Flauto per Evocare Draghi
            }),
            pubblicato: kaibaPubblicato
        },
        pegasus: {
            precedente: cambia(pegasusPubblicato, {
                38: 1,   // seconda Fusione
                416: 1,  // secondo Abbandonato
                434: -1, // senza Capro Espiatorio
                820: -1  // senza Nega Attacco
            }),
            nucleoDoppio: cambia(pegasusPubblicato, {
                38: 1,   // conserva due Fusioni
                416: 1,  // conserva due Abbandonato
                485: -1, // un solo Riavvolgimento Toon
                820: -1  // recupera soltanto Capro Espiatorio
            }),
            pubblicato: pegasusPubblicato
        }
    };
}

function valore(argv, nome, fallback) {
    const i = argv.indexOf('--' + nome);
    return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
}

function opzioniDa(argv) {
    return {
        partite: Math.max(1, Number(valore(argv, 'partite', '50')) || 50),
        turni: Math.max(20, Number(valore(argv, 'turni', '80')) || 80),
        seme: Number(valore(argv, 'seme', '141000')) || 141000,
        salvataggio: valore(argv, 'salvataggio', null),
        deckCustom: valore(argv, 'deck-custom', null),
        output: valore(argv, 'output', 'reports/archetypes/HARD_VARIANTS_CLASSIC.json')
    };
}

function percentuale(n, totale) {
    return totale ? Number((n * 100 / totale).toFixed(1)) : 0;
}

function media(v) {
    return v.length ? Number((v.reduce((a, b) => a + b, 0) / v.length).toFixed(2)) : 0;
}

async function serie(base, opzioni, offset) {
    const risultati = [];
    for (let i = 0; i < opzioni.partite; i++) {
        const r = await giocaPartita(Object.assign({}, base, {
            seme: opzioni.seme + offset + i,
            turni: opzioni.turni
        }), 0);
        if (r.erroriCarte.length || r.invarianti.length) {
            throw new Error(`${base.avversario}/seme ${r.seme}: ${[...r.erroriCarte, ...r.invarianti].join(' | ')}`);
        }
        risultati.push(r);
    }
    return risultati;
}

function riepiloga(partite, vittoriaAvversario) {
    const vittorie = partite.filter((p) => vittoriaAvversario ? p.esito === false : p.esito === true).length;
    return {
        partite: partite.length,
        vittorie,
        vittoriePct: percentuale(vittorie, partite.length),
        turniMedi: media(partite.map((p) => p.turno)),
        nonFinite: partite.filter((p) => p.esito !== true && p.esito !== false).length
    };
}

async function eseguiAudit(opzioni) {
    const custom = caricaCustom(opzioni);
    if (!custom) throw new Error('Serve --salvataggio oppure --deck-custom con il deck Custom.');
    const catalogo = varianti();
    const risultati = [];

    for (const [duellante, liste] of Object.entries(catalogo)) {
        for (const [variante, deck] of Object.entries(liste)) {
            process.stdout.write(`${duellante}/${variante}... `);
            const ufficiali = [];
            for (let c = 0; c < CAMPIONI.length; c++) {
                ufficiali.push(...await serie({
                    avversario: duellante,
                    livello: 'hard',
                    livelloGiocatore: 'hard',
                    giocatore: CAMPIONI[c],
                    mazzoAvversario: deck
                }, opzioni, c * 10000));
            }
            const partiteCustom = await serie({
                avversario: duellante,
                livello: 'hard',
                livelloGiocatore: 'hard',
                mazzoGiocatore: { main: custom.deck.main, extra: custom.deck.extra },
                mazzoAvversario: deck
            }, opzioni, 90000);
            const riga = {
                duellante,
                variante,
                carteMain: deck.main.reduce((n, c) => n + c.qty, 0),
                ufficiale: riepiloga(ufficiali, true),
                custom: riepiloga(partiteCustom, false)
            };
            risultati.push(riga);
            console.log(`ufficiale ${riga.ufficiale.vittoriePct}% | Custom ${riga.custom.vittoriePct}%`);
        }
    }
    return {
        generatoIl: new Date().toISOString(),
        metodo: 'IA hard; 5 campioni ufficiali e Custom separato; stessi semi per lista pubblicata e candidata',
        opzioni: {
            partite: opzioni.partite,
            turni: opzioni.turni,
            seme: opzioni.seme,
            salvataggio: opzioni.salvataggio ? path.basename(opzioni.salvataggio) : null,
            deckCustom: opzioni.deckCustom ? path.basename(opzioni.deckCustom) : null
        },
        custom: { name: custom.deck.name, impronta: custom.impronta },
        modifiche: {
            kaiba: 'precedente -> pubblicato: -1 Paladino, -1 Rituale, +1 Signore dei D., +1 Flauto',
            pegasus: 'precedente -> pubblicato: -1 Fusione, -1 Abbandonato, +1 Capro Espiatorio, +1 Nega Attacco'
        },
        risultati
    };
}

async function main() {
    const opzioni = opzioniDa(process.argv.slice(2));
    const report = await eseguiAudit(opzioni);
    console.table(report.risultati.map((r) => ({
        duellante: r.duellante,
        variante: r.variante,
        vittorieAvversarioUfficiali: r.ufficiale.vittoriePct,
        vittorieCustom: r.custom.vittoriePct,
        turniUfficiali: r.ufficiale.turniMedi,
        turniCustom: r.custom.turniMedi
    })));
    const destinazione = path.resolve(RADICE, opzioni.output);
    fs.mkdirSync(path.dirname(destinazione), { recursive: true });
    fs.writeFileSync(destinazione, JSON.stringify(report, null, 2) + '\n', 'utf8');
    console.log(`Report scritto in ${destinazione}`);
}

if (require.main === module) main().catch((e) => { console.error(e.stack || e); process.exit(1); });
module.exports = { caricaDeck, cambia, varianti, opzioniDa, eseguiAudit };

