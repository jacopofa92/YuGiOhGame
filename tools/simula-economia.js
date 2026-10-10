#!/usr/bin/env node
/**
 * Stima riproducibile del farming settimanale leggendo le tabelle REALI.
 * Assunzione predefinita: 10 vittorie libere al giorno per 7 giorni, piu'
 * un completamento settimanale di ciascun torneo e 15 duelli di torneo
 * vinti in totale. Parametri: --vittorie-giorno N --giorni N
 * --tornei-settimana N --duelli-torneo N.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const RADICE = path.join(__dirname, '..');
function numero(nome, fallback) {
    const i = process.argv.indexOf('--' + nome);
    return i >= 0 ? Math.max(0, Number(process.argv[i + 1]) || 0) : fallback;
}
const vittorieGiorno = numero('vittorie-giorno', 10);
const giorni = numero('giorni', 7);
const torneiSettimana = numero('tornei-settimana', 1);
const duelliTorneo = numero('duelli-torneo', 15);

const ctx = { console };
ctx.window = ctx;
ctx.globalThis = ctx;
vm.runInNewContext(fs.readFileSync(path.join(RADICE, 'js/economy/rewards.js'), 'utf8'), ctx);
vm.runInNewContext(fs.readFileSync(path.join(RADICE, 'js/economy/shop-catalog.js'), 'utf8'), ctx);
vm.runInNewContext(fs.readFileSync(path.join(RADICE, 'js/data/starter-structure-decks.js'), 'utf8')
    + '\nglobalThis.__deckAudit = starterStructureDeckDatabase;', ctx);

const R = ctx.Rewards;
const prezzi = ctx.ShopCatalog.PREZZI_MAZZI;
const deck = ctx.__deckAudit.filter((d) => (d.main || []).length > 0);
const quantiStarter = deck.filter((d) => d.kind === 'starter' && d.packId !== 'starter_sdy_yugi').length;
const quantiStructure = deck.filter((d) => d.kind === 'structure').length;
const sommaStelle = (tipo, quanti) => {
    const p = prezzi[tipo];
    return Array.from({ length: quanti }, (_, i) => p.stelleBase + p.stellePerAcquisto * i)
        .reduce((a, b) => a + b, 0);
};
const stelleTuttiMazzi = sommaStelle('starter', quantiStarter) + sommaStelle('structure', quantiStructure);

const livelli = ['Facile', 'Medio', 'Difficile'];
const risultati = livelli.map((livello) => {
    const base = R.WIN_CREDITS[livello];
    const piene = Math.min(vittorieGiorno, R.DIMINISHING_AFTER_WINS);
    const ridotte = Math.max(0, vittorieGiorno - piene);
    const creditiLiberi = giorni * (piene * base
        + ridotte * Math.round(base * R.DIMINISHING_FACTOR)
        + (vittorieGiorno > 0 ? R.FIRST_WIN_OF_DAY_BONUS : 0));
    const vittorieLibere = vittorieGiorno * giorni;
    const pStella = R.STAR_DROP_CHANCE[livello];
    const stelleLibere = vittorieLibere * pStella;
    const locazioniLibere = vittorieLibere * (1 - pStella) * 0.03;
    const millennioLibere = vittorieLibere * (1 - pStella) * 0.97 * 0.008;
    const valore = (torneo, valuta) => R.TOURNAMENT_COMPLETION[torneo][valuta][livello] * torneiSettimana;
    const creditiTornei = ['duelistKingdom', 'battleCity', 'kaibaTournament']
        .reduce((tot, id) => tot + valore(id, 'credits'), 0)
        + duelliTorneo * R.TOURNAMENT_DUEL_CREDITS;
    const stelle = stelleLibere + valore('duelistKingdom', 'starChips');
    return {
        livello,
        crediti: creditiLiberi + creditiTornei,
        stelle,
        locazioni: locazioniLibere + valore('battleCity', 'locatorCards'),
        millennio: millennioLibere + valore('kaibaTournament', 'millenniumCards'),
        settimaneTuttiMazzi: stelleTuttiMazzi / stelle
    };
});

console.log(`Scenario: ${vittorieGiorno} vittorie libere/giorno x ${giorni} giorni, ${torneiSettimana} completamento/i per ciascun torneo, ${duelliTorneo} duelli di torneo vinti.`);
console.log(`Scaffale: ${quantiStarter} Starter acquistabili + ${quantiStructure} Structure = ${stelleTuttiMazzi} Stelle complessive.`);
console.table(risultati.map((r) => ({
    Difficolta: r.livello,
    Crediti_settimana: Math.round(r.crediti),
    Stelle_settimana: r.stelle.toFixed(2),
    Locazioni_settimana: r.locazioni.toFixed(2),
    Millennio_settimana: r.millennio.toFixed(2),
    Settimane_tutti_mazzi: r.settimaneTuttiMazzi.toFixed(1)
})));
