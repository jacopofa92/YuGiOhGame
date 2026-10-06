// Negozio: solo l'admin può ricomprare all'infinito un deck già posseduto.
// =====================================================================
const path = require('path');

module.exports = {
    name: 'Negozio: riacquisto deck illimitato riservato agli admin',
    standalone: true,
    async run({ browser, assert }) {
        const root = path.join(__dirname, '..', '..');
        const url = 'file:///' + path.join(root, 'negozio.html').replace(/\\/g, '/');
        const context = await browser.newContext({
            viewport: { width: 1100, height: 900 },
            serviceWorkers: 'block'
        });
        await context.addInitScript(() => { window.AUTH_GATE_SKIP = true; });
        const page = await context.newPage();
        const pageErrors = [];
        page.on('pageerror', (error) => pageErrors.push(error.message));

        try {
            await page.goto(url);
            await page.waitForFunction(() => !!(window.ShopUI && window.ShopCatalog && window.SaveManager));

            const result = await page.evaluate(() => {
                if (!SaveManager.hasSave()) SaveManager.createNew('Admin test');
                ['credits', 'starChips', 'locatorCards', 'millenniumCards'].forEach((currency) => {
                    SaveManager.addCurrency(currency, 100000);
                });

                const deck = ShopCatalog.mazziInVendita().find((entry) => entry.kind === 'starter');
                const fullDeck = ShopCatalog.mazzoCompleto(deck.packId);
                SaveManager.addOwnedPack(deck.packId);

                const trackedId = fullDeck.main[0].id;
                const qtyPerPurchase = fullDeck.main.concat(fullDeck.extra || [])
                    .filter((entry) => entry.id === trackedId)
                    .reduce((sum, entry) => sum + (entry.qty || 0), 0);
                const before = Number(SaveManager.getCollection()[trackedId]) || 0;

                CloudSync.isAdmin = () => true;
                PackOpening.festeggiaMazzo = (product, cards, done) => { if (done) done(); };
                const mount = document.createElement('div');
                document.body.appendChild(mount);
                const shop = ShopUI.mount(mount);
                shop.refresh();

                function itemForDeck() {
                    return Array.from(mount.querySelectorAll('.shop-item.deck-box'))
                        .find((item) => item.querySelector('.shop-item-name').textContent === deck.nome);
                }
                function buyOnce() {
                    const item = itemForDeck();
                    const button = item.querySelector('.buy-btn:not(.ghost)');
                    if (!button || button.disabled) throw new Error('Pulsante riacquisto admin non disponibile');
                    button.click();
                }

                const adminLabel = itemForDeck().querySelector('.admin-rebuy-note').textContent;
                buyOnce();
                buyOnce();
                const after = Number(SaveManager.getCollection()[trackedId]) || 0;

                CloudSync.isAdmin = () => false;
                shop.refresh();
                const normalItem = itemForDeck();
                return {
                    adminLabel,
                    before,
                    after,
                    // Riacquistare resta consentito all'admin per fare
                    // prove di UI/economia, ma i deck non accumulano più
                    // doppioni: valgono come base minima della collezione.
                    expected: Math.max(before, Math.min(SaveManager.CARD_COPY_CAP, qtyPerPurchase)),
                    packRegistrations: SaveManager.getOwnedPacks().filter((id) => id === deck.packId).length,
                    normalHasBuyButton: !!normalItem.querySelector('.buy-btn:not(.ghost)'),
                    normalOwnedLabel: (normalItem.querySelector('.shop-owned-note') || {}).textContent || ''
                };
            });

            assert(/Admin.*senza limiti/i.test(result.adminLabel),
                `La vetrina non spiega il privilegio admin: "${result.adminLabel}"`);
            assert(result.after === result.expected,
                `I riacquisti admin non devono sommare doppioni del deck (${result.before} -> ${result.expected}, trovato ${result.after})`);
            assert(result.packRegistrations === 1,
                `Il pack deve restare registrato una sola volta (trovato ${result.packRegistrations})`);
            assert(!result.normalHasBuyButton && /Già acquistato/i.test(result.normalOwnedLabel),
                'Un giocatore normale non deve poter riacquistare il deck');
            assert(pageErrors.length === 0, 'Errori JS in pagina: ' + pageErrors.join(' | '));
        } finally {
            await context.close();
        }
    }
};
