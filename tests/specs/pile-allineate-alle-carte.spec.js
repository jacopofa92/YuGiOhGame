// Carte e pile del campo allineate, e niente carte che restano sollevate
// dopo un tocco (segnalati dall'utente sul telefono vero, 2026-10-16).
// - Il dorso in cima a una pila (Deck, Cimitero, Extra Deck) deve avere la
//   stessa misura e la stessa posizione nella sua casella di una carta nella
//   casella accanto: prima la pila stava nell'angolo in alto a sinistra e la
//   carta al centro (6px di scarto su desktop).
// - Su un telefono il sollevamento "sotto il mouse" non deve scattare: dopo
//   un tocco la carta restava su.
// Vedi .deck-preview in duelMonstersCore.html e .card:hover in js/ui/card.css.
const { openDuel, freezeNaturalGameLoop } = require('../helpers/harness');

const SCHERMI = [
    { nome: 'desktop', width: 1400, height: 900, touch: false },
    { nome: 'verticale', width: 393, height: 852, touch: true },
    { nome: 'orizzontale', width: 844, height: 390, touch: true }
];

module.exports = {
    name: 'Pile allineate alle carte e niente sollevamento al tocco',
    standalone: true,
    async run({ browser, assert }) {
        for (const s of SCHERMI) {
            const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: s.width, height: s.height }, hasTouch: s.touch, isMobile: s.touch });
            const page = await context.newPage();
            try {
                await openDuel(page);
                await freezeNaturalGameLoop(page);
                await page.waitForTimeout(800);
                const m = await page.evaluate(() => {
                    const make = (id, uid) => ({ ...cardDatabase.find((c) => c.id === id), uid });
                    gameState.playerSTField = [{ card: make(40, 'st-allineamento'), isFaceDown: true }, null, null, null, null];
                    updateUI();
                    const b = (e) => e.getBoundingClientRect();
                    const riga = document.querySelectorAll('#playerFieldBoard .field-row')[1];
                    const carta = riga.querySelector('.field-slot[data-type="st"] .card');
                    const casella = carta.closest('.field-slot');
                    const mazzo = riga.querySelector('.field-slot[data-zone="deck"]');
                    const cima = mazzo.querySelector('.deck-preview');
                    return {
                        carta: { x: b(carta).left - b(casella).left, y: b(carta).top - b(casella).top, w: b(carta).width, h: b(carta).height },
                        pila: { x: b(cima).left - b(mazzo).left, y: b(cima).top - b(mazzo).top, w: b(cima).width, h: b(cima).height }
                    };
                });
                for (const k of ['x', 'y', 'w', 'h']) {
                    assert(Math.abs(m.carta[k] - m.pila[k]) <= 0.6, `${s.nome}: dorso in cima alla pila e carta devono coincidere (${k}: pila ${m.pila[k].toFixed(1)}, carta ${m.carta[k].toFixed(1)})`);
                }
                if (s.touch) {
                    const sel = '#playerFieldBoard .field-slot[data-type="st"] .card';
                    await page.locator(sel).tap();
                    await page.waitForTimeout(400);
                    const transform = await page.evaluate((q) => getComputedStyle(document.querySelector(q)).transform, sel);
                    assert(transform === 'none' || transform === 'matrix(1, 0, 0, 1, 0, 0)', `${s.nome}: dopo un tocco la carta non deve restare sollevata (transform ${transform})`);
                }
            } finally {
                await context.close();
            }
        }
    }
};
