#!/usr/bin/env node
/**
 * build-cards-data.js — Rigenera js/cards-data.generated.js a partire da
 * data/cards.json (la vera fonte di verità dell'anagrafica carte).
 *
 * PERCHÉ QUESTO PASSAGGIO IN PIÙ, invece di leggere data/cards.json
 * direttamente nel browser con fetch(): il Duello Demo e la Cartoteca
 * sono pensati per funzionare aprendo i file .html direttamente (vedi
 * README.md, "funzionano semplicemente aprendo i file .html nel
 * browser, senza bisogno di nulla") — un fetch() di un file locale viene
 * bloccato dal browser sotto il protocollo file:// (CORS). Per restare
 * compatibili SENZA server, data/cards.json resta la fonte editabile a
 * mano (o da un futuro editor UI), ma questo script la traduce in un
 * normale file .js caricato con un <script> come tutti gli altri —
 * niente richieste di rete, funziona identico a prima.
 *
 * USO: dopo aver modificato data/cards.json, esegui
 *   node scripts/build-cards-data.js
 * e ricarica la pagina. js/cards-data.generated.js NON va modificato a
 * mano: qualunque modifica verrebbe persa al prossimo rebuild.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const projectDir = path.join(__dirname, '..');
const jsonPath = path.join(projectDir, 'data', 'cards.json');
const outPath = path.join(projectDir, 'js', 'cards-data.generated.js');

function validate(cards) {
    const problems = [];
    const seenIds = new Set();
    if (!Array.isArray(cards)) {
        problems.push('data/cards.json non è un array.');
        return problems;
    }
    cards.forEach((c, index) => {
        const where = `voce ${index} (id ${c && c.id})`;
        if (!c || typeof c !== 'object') { problems.push(`${where}: non è un oggetto valido.`); return; }
        if (typeof c.id !== 'number') problems.push(`${where}: "id" mancante o non numerico.`);
        else if (seenIds.has(c.id)) problems.push(`${where}: id ${c.id} duplicato.`);
        else seenIds.add(c.id);
        if (!c.name) problems.push(`${where}: "name" mancante.`);
        if (!['monster', 'spell', 'trap'].includes(c.type)) problems.push(`${where}: "type" mancante o non valido (deve essere monster/spell/trap).`);
        if (c.type === 'monster' && typeof c.attack !== 'number') problems.push(`${where}: mostro senza "attack" numerico.`);
    });
    return problems;
}

const raw = fs.readFileSync(jsonPath, 'utf8');
const cards = JSON.parse(raw);

const problems = validate(cards);
if (problems.length > 0) {
    console.error(`❌ data/cards.json ha ${problems.length} problema/i di validazione:`);
    problems.forEach((p) => console.error(' - ' + p));
    process.exit(1);
}

const header = `/**
 * cards-data.generated.js — NON MODIFICARE A MANO.
 *
 * Generato automaticamente da data/cards.json tramite
 * scripts/build-cards-data.js. Per aggiungere o modificare una carta:
 * modifica data/cards.json, poi esegui \`node scripts/build-cards-data.js\`
 * e ricarica la pagina — non serve toccare nessun altro file del motore.
 *
 * Caricato PRIMA di js/cards-db.js (che contiene solo le funzioni di
 * supporto: buildDeckFromSpec, getTributesRequired, ecc. — vedi lì).
 */
`;

const body = `const cardDatabase = ${JSON.stringify(cards, null, 2)};\n`;

fs.writeFileSync(outPath, header + body, 'utf8');
console.log(`✅ Generato js/cards-data.generated.js (${cards.length} carte) da data/cards.json.`);
