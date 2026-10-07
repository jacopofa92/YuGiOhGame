#!/usr/bin/env node
/**
 * Audit di bilanciamento della storia anime: ogni Starter/Structure Deck
 * Yu-Gi-Oh affronta, in ordine, tutti i duelli del percorso principale.
 * I rami paralleli sono racconto collaterale e non bloccano il completamento.
 *
 * Uso rapido (una matrice completa può richiedere tempo):
 *   node tools/simula-storia-deck.js --tentativi 20 --output report.json
 *   node tools/simula-storia-deck.js --deck starter_sdy_yugi --difficolta facile
 *
 * Il tempo riportato è sia reale (prestazioni del simulatore) sia virtuale
 * (durata degli eventi di gioco). Un duello perso viene ritentato con un
 * seme nuovo fino al limite indicato; così misuriamo davvero il farming.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { giocaPartita } = require('./duello-senza-testa.js');
const RADICE = path.join(__dirname, '..');

function caricaGlobale(file, espressione) {
    const contesto = { window: {} };
    vm.createContext(contesto);
    vm.runInContext(fs.readFileSync(path.join(RADICE, file), 'utf8'), contesto, { filename: file });
    return vm.runInContext(espressione, contesto);
}

function argomenti(argv) {
    const valore = (nome, fallback) => {
        const i = argv.indexOf('--' + nome);
        return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
    };
    return {
        deck: valore('deck', null),
        difficolta: valore('difficolta', null),
        tentativi: Math.max(1, Number(valore('tentativi', '20')) || 20),
        turni: Math.max(10, Number(valore('turni', '80')) || 80),
        limiteDuelli: Math.max(0, Number(valore('limite-duelli', '0')) || 0),
        seme: Number(valore('seme', '7000')) || 7000,
        output: valore('output', null)
    };
}

function duelliPrincipali(campagna) {
    const out = [];
    function visita(tappe, capitolo) {
        (tappe || []).filter((t) => t.parallelo !== true).forEach((t) => {
            if (t.kind === 'duel') out.push({ id: t.id, avversario: t.characterId, capitolo });
            if (t.kind === 'area' || t.kind === 'torneo') visita(t.tappe, capitolo);
        });
    }
    (campagna.capitoli || []).forEach((c) => visita(c.tappe, c.id));
    return out;
}

function specificaDeck(deck) {
    // buildDeckFromSpec accetta le stesse coppie id/qty del catalogo.
    return { main: deck.main || [], extra: deck.extra || [] };
}

async function simulaMatrice(opzioni) {
    const decks = caricaGlobale('js/data/starter-structure-decks.js', 'starterStructureDeckDatabase')
        // Le righe sono carte DISTINTE: un deck con 25 righe e varie
        // quantità 2/3 può essere regolarmente da 40 carte. Contare la
        // lunghezza dell'array escludeva quasi tutti gli Structure Deck.
        .filter((d) => (d.main || []).reduce((totale, carta) => totale + (Number(carta.qty) || 0), 0) >= 40)
        // La Grande Guerra usa un'origine esclusiva e non è un mazzo
        // ammesso nella storia anime oggetto di questa misurazione.
        .filter((d) => !String(d.packId).includes('ww1'))
        .filter((d) => !opzioni.deck || d.packId === opzioni.deck);
    const campagne = caricaGlobale('js/data/story-campaigns.js', 'window.storyCampaignsDatabase');
    const anime = campagne.find((c) => c.id === 'anime');
    const tuttiIDuelli = duelliPrincipali(anime);
    const duelli = opzioni.limiteDuelli ? tuttiIDuelli.slice(0, opzioni.limiteDuelli) : tuttiIDuelli;
    const livelli = [
        { id: 'facile', ia: 'easy' },
        { id: 'normale', ia: 'medium' },
        { id: 'difficile', ia: 'hard' }
    ].filter((l) => !opzioni.difficolta || l.id === opzioni.difficolta);
    if (!decks.length) throw new Error('Nessun deck corrisponde al filtro richiesto.');
    if (!livelli.length) throw new Error('Difficoltà non valida: usa facile, normale o difficile.');

    const risultati = [];
    let progressivo = 0;
    for (const deck of decks) {
        for (const livello of livelli) {
            const inizio = Date.now();
            let tentativiTotali = 0;
            let turniTotali = 0;
            let tempoVirtualeMs = 0;
            let bloccatoA = null;
            for (const duello of duelli) {
                let vinto = false;
                for (let tentativo = 1; tentativo <= opzioni.tentativi; tentativo++) {
                    tentativiTotali++;
                    const esito = await giocaPartita({
                        avversario: duello.avversario,
                        livello: livello.ia,
                        livelloGiocatore: livello.ia,
                        mazzoGiocatore: specificaDeck(deck),
                        seme: opzioni.seme + progressivo++,
                        turni: opzioni.turni
                    }, 0);
                    turniTotali += esito.turno || 0;
                    tempoVirtualeMs += esito.oraVirtualeMs || 0;
                    if (esito.esito === true) { vinto = true; break; }
                }
                if (!vinto) { bloccatoA = duello; break; }
            }
            risultati.push({
                deckId: deck.packId,
                deck: deck.name,
                difficolta: livello.id,
                completata: !bloccatoA,
                duelliCompletati: bloccatoA ? duelli.findIndex((d) => d.id === bloccatoA.id) : duelli.length,
                duelliTotali: duelli.length,
                tentativi: tentativiTotali,
                tentativiMediPerDuello: Number((tentativiTotali / Math.max(1, bloccatoA ? duelli.findIndex((d) => d.id === bloccatoA.id) + 1 : duelli.length)).toFixed(2)),
                turni: turniTotali,
                tempoVirtualeSecondi: Math.round(tempoVirtualeMs / 1000),
                tempoRealeMs: Date.now() - inizio,
                bloccatoA: bloccatoA ? `${bloccatoA.id} (${bloccatoA.avversario})` : null
            });
        }
    }
    return { generatoIl: new Date().toISOString(), opzioni, risultati };
}

async function main() {
    const opzioni = argomenti(process.argv.slice(2));
    const report = await simulaMatrice(opzioni);
    console.table(report.risultati);
    if (opzioni.output) {
        const destinazione = path.resolve(opzioni.output);
        fs.writeFileSync(destinazione, JSON.stringify(report, null, 2) + '\n', 'utf8');
        console.log(`Report scritto in ${destinazione}`);
    }
}

if (require.main === module) main().catch((e) => { console.error(e.stack || e); process.exit(1); });
module.exports = { argomenti, duelliPrincipali, simulaMatrice };
