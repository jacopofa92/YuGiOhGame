// La schermata di fine duello regge anche con molti premi.
// =====================================================================
// Segnalato dall'utente: con parecchie ricompense gli elementi uscivano
// dallo schermo, pulsante "Continua" compreso — cioè l'unico modo di
// uscire dalla schermata. Misurato prima di correggere: dieci premi su
// una finestra alta 900px producevano un contenuto di 965px col pulsante
// a 879-932 (fuori), e su un telefono in orizzontale (852x393) il
// contenuto era alto 955px e il pulsante finiva 280px sopra il bordo.
//
// Quello che il test sorveglia è la PROPRIETÀ, non i numeri: il pulsante
// dev'essere davvero cliccabile. Non "esiste nel DOM" e nemmeno "ha le
// coordinate giuste" — si chiede al browser CHI c'è in quel punto, che è
// l'unico modo di accorgersi anche di un elemento coperto da un altro.
//
// I premi sono inventati qui e non presi da js/economy/rewards.js: serve
// un numero ALTO per esercitare il caso, e legarsi ai premi veri
// significherebbe che il test smette di provare qualcosa il giorno in
// cui quei premi cambiano.
const PREMI = [
    { icon: '💰', amount: 850, nome: 'Crediti', rule: 'Vittoria contro un Duellante della Storia.' },
    { icon: '⭐', amount: 12, nome: 'Stelle', rule: 'Bonus del torneo: hai vinto senza perdere Life Point.' },
    { icon: '🃏', amount: 3, nome: 'Carte rare', rule: 'Ritrovamento: una carta rara ogni tre duelli vinti di fila.' },
    { icon: '🏺', amount: 1, nome: 'Oggetto del Millennio', rule: 'Premio di fine capitolo della campagna.' },
    { icon: '🎖️', amount: 2, nome: 'Carte Localizzatrici', rule: 'Il tuo avversario le ha cedute perdendo.' },
    { icon: '📈', amount: 40, nome: 'Punti esperienza', rule: 'Duello portato a termine senza abbandonare.' },
    { icon: '🔥', amount: 200, nome: 'Crediti bonus', rule: 'Serie di cinque vittorie consecutive.' },
    { icon: '💎', amount: 1, nome: 'Busta rara', rule: 'Prima vittoria contro questo Duellante.' },
    { icon: '🛡️', amount: 60, nome: 'Crediti', rule: 'Hai chiuso il duello con più di 6000 Life Point.' },
    { icon: '📜', amount: 1, nome: 'Sfida completata', rule: 'Sconfiggi Kaiba tre volte: 3 su 3.' }
];

module.exports = {
    name: 'Fine duello: con molti premi il pulsante Continua resta raggiungibile',
    freeze: false,
    async run(t) {
        const page = t.page;
        const originale = page.viewportSize();

        async function misura(larghezza, altezza, quanti) {
            await page.setViewportSize({ width: larghezza, height: altezza });
            await page.evaluate((d) => {
                const vecchio = document.getElementById('duelOutcomeOverlay');
                if (vecchio) vecchio.remove();
                DuelCinematics.showOutcome({
                    playerWon: true,
                    opponent: { name: 'Seto Kaiba', title: 'Il Presidente', image: null, icon: '🧊' },
                    record: { wins: 12, losses: 3 },
                    rewards: d.premi.slice(0, d.quanti),
                    onContinue: () => {}
                });
            }, { premi: PREMI, quanti: quanti });
            // Il pulsante entra con una dissolvenza ritardata: misurarlo
            // prima vorrebbe dire misurare dove NON è ancora.
            await page.waitForTimeout(1700);
            return page.evaluate(() => {
                const btn = document.querySelector('.do-continue');
                if (!btn) return { pulsante: false };
                const r = btn.getBoundingClientRect();
                const x = r.left + r.width / 2;
                const y = r.top + r.height / 2;
                const sotto = (y >= 0 && y <= window.innerHeight) ? document.elementFromPoint(x, y) : null;
                return {
                    pulsante: true,
                    dentro: r.top >= 0 && r.bottom <= window.innerHeight + 1,
                    cliccabile: !!(sotto && (sotto === btn || btn.contains(sotto))),
                    riquadro: { top: Math.round(r.top), bottom: Math.round(r.bottom) },
                    schermo: window.innerHeight,
                    // Con molti premi l'elenco deve poter scorrere: è lui a
                    // cedere, ed è la prova che il meccanismo ha funzionato
                    // invece che il contenuto sia semplicemente entrato.
                    premiScorrono: (() => {
                        const box = document.querySelector('.do-rewards');
                        return box ? box.scrollHeight > box.clientHeight + 1 : false;
                    })()
                };
            });
        }

        try {
            // Pochi premi: la schermata dev'essere quella di sempre, senza
            // scorrimenti — se il fix avesse rotto il caso normale, si
            // vedrebbe qui.
            const pochi = await misura(1400, 900, 3);
            t.assert(pochi.pulsante && pochi.dentro && pochi.cliccabile,
                `Con pochi premi il pulsante deve stare dentro: ${JSON.stringify(pochi)}`);
            t.assert(!pochi.premiScorrono,
                'Con tre premi l\'elenco non deve scorrere: la schermata normale non va toccata');

            // I tre casi che si rompevano, uno per forma di schermo.
            for (const [nome, w, h] of [
                ['desktop', 1400, 900],
                ['telefono in verticale', 393, 852],
                ['telefono in orizzontale', 852, 393]
            ]) {
                const m = await misura(w, h, PREMI.length);
                t.assert(m.pulsante, `Nessun pulsante Continua (${nome})`);
                t.assert(m.dentro,
                    `Con ${PREMI.length} premi il pulsante Continua esce dallo schermo (${nome}): `
                    + `${m.riquadro.top}-${m.riquadro.bottom} su ${m.schermo}px`);
                t.assert(m.cliccabile,
                    `Il pulsante Continua non è cliccabile (${nome}): ${JSON.stringify(m)}`);
                t.assert(m.premiScorrono,
                    `Con ${PREMI.length} premi l'elenco deve scorrere invece di spingere fuori il resto (${nome})`);
            }
        } finally {
            await page.evaluate(() => {
                const ov = document.getElementById('duelOutcomeOverlay');
                if (ov) ov.remove();
            });
            if (originale) await page.setViewportSize(originale);
        }
    }
};
