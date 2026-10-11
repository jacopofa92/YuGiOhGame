#!/usr/bin/env node
/**
 * verifica-pubblicazione.js — La copia in dist/ funziona come l'originale?
 * =====================================================================
 * Gira DOPO scripts/pubblica.js. Apre ogni pagina due volte, dall'originale
 * e dalla copia minificata, e confronta: un errore JavaScript o un file
 * mancante che c'è nella copia ma NON nell'originale vuol dire che la
 * minificazione (o l'elenco di ciò che entra) ha rotto qualcosa. Il
 * confronto, invece di un "zero errori" assoluto, serve a non bocciare la
 * copia per cose che succedono identiche anche nel gioco vero (un ritratto
 * facoltativo che non c'è ancora, una chiamata di rete che senza Supabase
 * fallisce): quelle non sono colpa della pubblicazione.
 *
 * In più, sul duello: deve partire (mano distribuita) e il motore deve
 * avere registrato lo STESSO numero di effetti carta dell'originale — se
 * un file delle carte si rompesse in minificazione, qui mancherebbero
 * decine di carte senza che nessuna pagina lo segnali.
 *
 * Uso: `node scripts/verifica-pubblicazione.js` (oppure
 * `npm run verifica-pubblicazione`). Esce con 1 se qualcosa non va.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const RADICE = path.join(__dirname, '..');
const DIST = path.join(RADICE, 'dist');
const url = (base, pagina) => 'file:///' + path.join(base, pagina).replace(/\\/g, '/');

async function visita(browser, base, pagina) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: 'block' });
    await ctx.addInitScript(() => {
        // Come la suite di test: niente controllo d'accesso, niente
        // cinematiche lunghe all'apertura del duello.
        window.AUTH_GATE_SKIP = true;
        window.DUEL_FAST_OPENING = true;
        window.DUEL_RPS_SKIP = true;
    });
    const page = await ctx.newPage();
    const errori = new Set();
    const mancanti = new Set();
    page.on('pageerror', (e) => errori.add(e.message));
    page.on('requestfailed', (r) => {
        const u = r.url();
        // Solo i veri "file non trovato": un audio o un video il cui
        // caricamento viene interrotto (ERR_ABORTED, ad esempio chiudendo
        // la pagina) non è un file mancante, e succede con tempi diversi da
        // un giro all'altro — prima di questo filtro sembrava che quattro
        // suoni mancassero solo nella copia, ed erano presenti in tutte e due.
        const motivo = (r.failure() && r.failure().errorText) || '';
        if (!/FILE_NOT_FOUND|ERR_FILE/i.test(motivo)) return;
        // Solo i file del progetto: la rete esterna (Supabase, font) è fuori
        // dal controllo, e uguale per originale e copia.
        if (u.startsWith('file:')) mancanti.add(decodeURIComponent(u.slice(u.indexOf(path.basename(base)) + path.basename(base).length)));
    });
    let extra = {};
    try {
        await page.goto(url(base, pagina), { waitUntil: 'load', timeout: 30000 });
        await page.waitForTimeout(1500);
        if (pagina === 'duelMonstersCore.html') {
            await page.waitForFunction(() => typeof gameState !== 'undefined' && gameState.playerHand && gameState.playerHand.length >= 5, null, { timeout: 30000 });
            extra = await page.evaluate(() => ({
                carteRegistrate: window.CardEffects && typeof CardEffects.registeredIds === 'function'
                    ? CardEffects.registeredIds().length
                    : (window.DuelEngine && DuelEngine.getDefinition ? cardDatabase.filter((c) => DuelEngine.getDefinition(c.id)).length : -1),
                mano: gameState.playerHand.length
            }));
        }
    } catch (e) {
        errori.add('La pagina non si è aperta come previsto: ' + e.message.split('\n')[0]);
    } finally {
        await ctx.close();
    }
    return { errori, mancanti, extra };
}

async function main() {
    if (!fs.existsSync(DIST)) {
        console.error('dist/ non esiste: lancia prima `node scripts/pubblica.js`.');
        process.exit(1);
    }
    const pagine = fs.readdirSync(DIST).filter((f) => f.endsWith('.html')).sort();
    const browser = await chromium.launch();
    const problemi = [];
    try {
        for (const pagina of pagine) {
            const orig = await visita(browser, RADICE, pagina);
            const copia = await visita(browser, DIST, pagina);
            const nuoviErrori = [...copia.errori].filter((e) => !orig.errori.has(e));
            const nuoviMancanti = [...copia.mancanti].filter((m) => !orig.mancanti.has(m));
            let esito = '✓';
            if (nuoviErrori.length || nuoviMancanti.length) {
                esito = '✗';
                nuoviErrori.forEach((e) => problemi.push(`${pagina}: errore solo nella copia — ${e}`));
                nuoviMancanti.forEach((m) => problemi.push(`${pagina}: file mancante solo nella copia — ${m}`));
            }
            if (pagina === 'duelMonstersCore.html') {
                if (copia.extra.carteRegistrate !== orig.extra.carteRegistrate) {
                    esito = '✗';
                    problemi.push(`${pagina}: effetti carta registrati ${copia.extra.carteRegistrate} nella copia contro ${orig.extra.carteRegistrate} nell'originale`);
                }
                if (!(copia.extra.mano >= 5)) {
                    esito = '✗';
                    problemi.push(`${pagina}: nella copia il duello non è partito (mano: ${copia.extra.mano})`);
                }
            }
            const nota = pagina === 'duelMonstersCore.html' ? ` (effetti carta: ${copia.extra.carteRegistrate}, mano: ${copia.extra.mano})` : '';
            console.log(`  ${esito} ${pagina}${nota}`);
        }
    } finally {
        await browser.close();
    }
    if (problemi.length) {
        console.log(`\nLa copia pubblicata NON va: ${problemi.length} problemi.`);
        problemi.forEach((p) => console.log('  - ' + p));
        process.exit(1);
    }
    console.log(`\nCopia pubblicata verificata: ${pagine.length} pagine, nessuna differenza dall'originale.`);
}

main().catch((e) => { console.error('Verifica interrotta:', e); process.exit(1); });
