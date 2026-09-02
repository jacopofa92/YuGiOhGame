#!/usr/bin/env node
// tests/run-all.js
// =====================================================================
// Esegue ogni tests/specs/*.spec.js in una pagina Playwright isolata
// (un browser Chromium condiviso, una nuova pagina per ciascuno — così
// uno stato lasciato sporco da un test non contamina il successivo,
// stesso principio già imparato a caro prezzo in questa sessione con
// l'interferenza sulla Chain condivisa). Uscita 0 se tutti passano, 1 se
// anche uno solo fallisce — pensato per essere lanciato con `npm test`
// prima di ogni commit, non solo a mano quando ci si ricorda.
//
// Un file .spec.js esporta: `module.exports = { name: '...', run: async (t) => { ... t.assert(cond, msg); } }`
// Vedi tests/helpers/harness.js per cosa espone `t`.
// =====================================================================
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { openDuel, freezeNaturalGameLoop, makeAssert } = require('./helpers/harness');

const SPECS_DIR = path.join(__dirname, 'specs');

function discoverSpecs() {
    return fs.readdirSync(SPECS_DIR)
        .filter((f) => f.endsWith('.spec.js'))
        .sort()
        .map((f) => path.join(SPECS_DIR, f));
}

async function runOne(browser, specPath) {
    const spec = require(specPath);
    const relName = path.relative(process.cwd(), specPath);
    const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    const start = Date.now();
    try {
        await openDuel(page, spec.url);
        if (spec.freeze !== false) {
            await freezeNaturalGameLoop(page);
            // Breve assestamento SOLO dopo aver fermato il ciclo naturale
            // (non prima: vedi il commento in openDuel/harness.js) — lascia
            // completare un eventuale render/animazione già in corso senza
            // dare al ciclo naturale altro tempo per agire prima del freeze.
            await page.waitForTimeout(300);
        }

        const t = {
            page,
            assert: makeAssert(),
            evaluate: (fn, ...args) => page.evaluate(fn, ...args)
        };
        await spec.run(t);

        if (pageErrors.length > 0) {
            throw new Error(`Errori JS non gestiti nella pagina durante il test: ${pageErrors.join(' | ')}`);
        }
        const ms = Date.now() - start;
        console.log(`  \x1b[32m✓\x1b[0m ${spec.name || relName} \x1b[2m(${ms}ms)\x1b[0m`);
        return { ok: true, name: spec.name || relName };
    } catch (err) {
        const ms = Date.now() - start;
        console.log(`  \x1b[31m✗\x1b[0m ${spec.name || relName} \x1b[2m(${ms}ms)\x1b[0m`);
        console.log(`    \x1b[31m${err.message}\x1b[0m`);
        if (pageErrors.length > 0) {
            console.log(`    Errori pagina: ${pageErrors.join(' | ')}`);
        }
        return { ok: false, name: spec.name || relName, error: err.message };
    } finally {
        await page.close();
    }
}

async function main() {
    const specPaths = discoverSpecs();
    if (specPaths.length === 0) {
        console.log('Nessun file tests/specs/*.spec.js trovato.');
        process.exit(1);
    }

    console.log(`\nEsecuzione di ${specPaths.length} test da tests/specs/...\n`);
    const browser = await chromium.launch();
    const results = [];
    try {
        for (const specPath of specPaths) {
            results.push(await runOne(browser, specPath));
        }
    } finally {
        await browser.close();
    }

    const passed = results.filter((r) => r.ok).length;
    const failed = results.length - passed;
    console.log(`\n${passed}/${results.length} test passati.`);
    if (failed > 0) {
        console.log(`\x1b[31m${failed} test falliti:\x1b[0m`);
        results.filter((r) => !r.ok).forEach((r) => console.log(`  - ${r.name}: ${r.error}`));
        process.exit(1);
    }
    process.exit(0);
}

main().catch((err) => {
    console.error('Errore fatale nel runner dei test:', err);
    process.exit(1);
});
