// Guardrail statico sul flusso del Torneo Kaiba. I preliminari vivono nello
// stato persistito della pagina: questo test impedisce che un refactor torni
// silenziosamente a iniziare dai quarti o dimentichi una delle transizioni.
const fs = require('fs');
const path = require('path');

const RADICE = path.join(__dirname, '..', '..');

module.exports = {
    name: 'Torneo Kaiba: due preliminari prima dei quarti',
    async run(t) {
        const html = fs.readFileSync(path.join(RADICE, 'torneo-kaiba.html'), 'utf8');
        const elenco = fs.readFileSync(path.join(RADICE, 'tornei.html'), 'utf8');
        const dialoghi = fs.readFileSync(path.join(RADICE, 'js', 'data', 'tournament-dialogues.js'), 'utf8');

        t.assert(html.includes("round: 'preliminary1'"), 'Un nuovo Torneo Kaiba deve iniziare dal primo preliminare');
        t.assert(html.includes("state.round = 'preliminary2'"), 'Vinto il primo preliminare deve iniziare il secondo');
        t.assert(html.includes("state.round = 'quarter'"), 'Vinto il secondo preliminare si deve accedere ai quarti');
        t.assert(html.includes('preliminary1Winners: Array(16)') && html.includes('preliminary2Winners: Array(8)'),
            'I due preliminari devono persistere rispettivamente 16 e 8 vincitori');
        t.assert(html.includes('Array.from({ length: 16 }') && html.includes('Array.from({ length: 8 }'),
            'Le due colonne preliminari devono renderizzare tutti gli incontri ramificati');
        t.assert(html.includes("slots[16] = KAIBA_SEED"),
            'Kaiba deve restare testa di serie nel ramo opposto, compatibile con la finale');
        t.assert(html.includes("id !== 'yugiMuto' && id !== 'yamiYugi'")
            && html.includes("Math.random() < 0.5 ? 'yugiMuto' : 'yamiYugi'"),
        'Il sorteggio deve includere una sola forma tra Yugi Muto e Yami Yugi');
        t.assert(/kaiba: 112[\s\S]*yamiYugi: 104[\s\S]*yugiMuto: 100[\s\S]*marik: 94[\s\S]*pegasus: 89[\s\S]*bakura: 85/.test(html),
            'La forza simulata deve rispettare la gerarchia Kaiba, Yugi/Yami, Marik, Pegasus, Bakura');
        t.assert(dialoghi.includes('Le qualificazioni') && dialoghi.includes('Tabellone principale'), 'Devono esistere gli intermezzi per qualificazioni e accesso ai quarti');
        t.assert(elenco.includes("preliminary1: { badge:") && elenco.includes('totali: 5'), 'La pagina Tornei deve mostrare tutti e cinque i duelli');
    }
};
