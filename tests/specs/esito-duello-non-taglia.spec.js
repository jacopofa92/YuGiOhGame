// Le schermate di Vittoria / Sconfitta / Pareggio non tagliano nulla.
// Segnalato dall'utente ("in certe situazioni vengono tagliate"), misurato:
//  - su desktop "SCONFITTA" era larga 614px in un riquadro di 560 e
//    perdeva le lettere ai lati (il riquadro scorre, quindi taglia);
//  - su telefono in verticale il riquadro dei premi era largo il 92% dello
//    SCHERMO, più del contenitore, e sbordava di lato.
// Si controlla la PROPRIETÀ (niente oltre il riquadro, niente oltre lo
// schermo, "Continua" sempre visibile), non i numeri esatti, su tre formati
// che stanno ai limiti: desktop largo, telefono piccolo in verticale,
// telefono piccolo girato. Con dieci premi e il nome più lungo possibile.
const path = require('path');
const RADICE = path.join(__dirname, '..', '..');
const URL = 'file:///' + path.join(RADICE, 'duelMonstersCore.html').replace(/\\/g, '/');
const VISTE = [
    { n: 'desktop', w: 1366, h: 820 },
    { n: 'telefono verticale', w: 360, h: 640, m: true },
    { n: 'telefono orizzontale', w: 740, h: 360, m: true }
];

module.exports = {
    standalone: true,
    name: 'Esito del duello: titolo, premi e "Continua" restano dentro lo schermo su desktop e telefono',
    async run(t) {
        for (const v of VISTE) {
            const ctx = await t.browser.newContext({ viewport: { width: v.w, height: v.h }, isMobile: !!v.m, hasTouch: !!v.m });
            const page = await ctx.newPage();
            const errori = [];
            page.on('pageerror', (e) => errori.push(e.message));
            await page.addInitScript(() => { window.AUTH_GATE_SKIP = true; window.DUEL_FAST_OPENING = true; window.DUEL_RPS_SKIP = true; });
            try {
                await page.goto(URL);
                await page.waitForFunction(() => window.DuelCinematics && typeof gameState !== 'undefined' && gameState.playerHand && gameState.playerHand.length >= 5, null, { timeout: 30000 });
                for (const esito of [true, false, 'draw']) {
                    await page.evaluate((esito) => {
                        const rewards = [];
                        for (let i = 0; i < 10; i++) rewards.push({ currency: 'credits', amount: 50 + i, icon: '💰', nome: 'Crediti', rule: 'Vittoria a Difficile contro un Duellante del roster, con bonus della prima vittoria del giorno e rendimento decrescente.' });
                        DuelCinematics.showOutcome({
                            playerWon: esito,
                            session: { opponent: { id: 'highMageAnubisius', name: 'High Mage Anubisius, Signore della Foresta', icon: '🧙' } },
                            record: { wins: 12, losses: 7 },
                            rewards: rewards,
                            onContinue: () => {}
                        });
                    }, esito);
                    // Le animazioni d'entrata (scala del titolo) devono essere finite.
                    await page.waitForTimeout(1700);
                    const problemi = await page.evaluate(() => {
                        const ov = document.getElementById('duelOutcomeOverlay');
                        const content = ov.querySelector('.do-content');
                        const cr = content.getBoundingClientRect();
                        const out = [];
                        content.querySelectorAll('.do-title, .do-sub, .do-record, .do-rewards, .do-reward-row, .do-continue').forEach((el) => {
                            if (!el.getClientRects().length) return;
                            const r = el.getBoundingClientRect();
                            if (r.left < cr.left - 1 || r.right > cr.right + 1) out.push(`${el.className} oltre il riquadro (${Math.round(r.left)}..${Math.round(r.right)} vs ${Math.round(cr.left)}..${Math.round(cr.right)})`);
                            if (r.left < -1 || r.right > innerWidth + 1) out.push(`${el.className} oltre lo schermo`);
                        });
                        const titolo = content.querySelector('.do-title');
                        if (titolo.scrollWidth > titolo.clientWidth + 1) out.push(`titolo che trabocca (${titolo.scrollWidth} > ${titolo.clientWidth})`);
                        const btn = content.querySelector('.do-continue').getBoundingClientRect();
                        if (btn.top < 0 || btn.bottom > innerHeight + 1) out.push(`"Continua" fuori schermo (${Math.round(btn.top)}..${Math.round(btn.bottom)})`);
                        if (content.querySelector('.do-header').getBoundingClientRect().top < -1) out.push('intestazione sopra il bordo');
                        return out;
                    });
                    const nome = esito === 'draw' ? 'Pareggio' : (esito ? 'Vittoria' : 'Sconfitta');
                    t.assert(problemi.length === 0, `${nome} su ${v.n}: ${problemi.join(' | ')}`);
                }
                t.assert(errori.length === 0, `Nessun errore in pagina su ${v.n}: ${JSON.stringify(errori)}`);
            } finally {
                await ctx.close();
            }
        }
    }
};
