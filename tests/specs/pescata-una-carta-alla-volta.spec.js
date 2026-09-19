// Una pescata da effetto distribuisce le carte UNA ALLA VOLTA.
// =====================================================================
// Bug segnalato dall'utente su una carta che fa pescare 2 (tipo Vaso
// dell'Avidità): "fa mostrare subito 2 carte e poi l'effetto di
// pescata".
//
// La causa: queste animazioni girano per forza DOPO updateUI(), che è il
// momento in cui le carte entrano davvero nel DOM della mano — quindi a
// quel punto sono già visibili, e l'animazione di ingresso arrivava
// dopo, su carte che il giocatore aveva già visto comparire. La mano
// iniziale non aveva il problema solo perché marcava le proprie carte
// `pending-deal` per conto suo; le pescate no.
//
// Ora il nascondere-e-rivelare vive dentro `dealCardsWithStagger`
// (game-flow.js), usata da tutte e tre le pescate.
//
// Il test misura l'OPACITÀ REALE fotogramma per fotogramma, non
// l'esistenza della classe CSS: è l'unico modo di provare cosa vede
// davvero il giocatore.
module.exports = {
    name: 'Pescata da effetto: le carte compaiono una alla volta, non tutte insieme',
    async run(t) {
        const campioni = await t.evaluate(() => new Promise((resolve) => {
            const manoPrima = gameState.playerHand.length;
            drawCardsToHand('player', 2);
            updateUI();
            animateEffectDraw('player', 2);

            const out = [];
            const t0 = performance.now();
            const giro = () => {
                const carte = [...document.querySelectorAll('#playerHand .card')].slice(manoPrima);
                out.push({
                    t: Math.round(performance.now() - t0),
                    opacita: carte.map((el) => parseFloat(getComputedStyle(el).opacity) || 0)
                });
                if (performance.now() - t0 < 1000) requestAnimationFrame(giro); else resolve(out);
            };
            requestAnimationFrame(giro);
        }));

        t.assert(campioni.length > 10, `Preparazione: servono abbastanza fotogrammi campionati (rilevati ${campioni.length})`);

        const primo = campioni[0].opacita;
        t.assert(primo.length === 2, `Preparazione: devono essere arrivate 2 carte nuove in mano (rilevate ${primo.length})`);
        t.assert(primo.every((o) => o < 0.5),
            `Appena pescate, NESSUNA delle due carte deve essere già visibile: l'animazione deve precedere la comparsa, ` +
            `non seguirla (opacità al primo fotogramma: ${JSON.stringify(primo)})`);

        const compareA = (indice) => {
            const c = campioni.find((s) => (s.opacita[indice] || 0) > 0.5);
            return c ? c.t : null;
        };
        const prima = compareA(0);
        const seconda = compareA(1);
        t.assert(prima !== null && seconda !== null,
            `Entrambe le carte devono finire per comparire (prima: ${prima}, seconda: ${seconda})`);
        // Lo sfalsamento è di 300ms: si accetta un margine largo, perché
        // sotto carico un fotogramma può slittare — quello che conta è
        // che la seconda arrivi NETTAMENTE dopo la prima, non insieme.
        t.assert(seconda - prima > 150,
            `La seconda carta deve comparire dopo la prima, non insieme (prima a +${prima}ms, seconda a +${seconda}ms)`);
    }
};
