module.exports = {
    name: 'UI Catena: box semi-3D leggibile e contenuto nel viewport',
    async run(t) {
        async function misura(width, height) {
            await t.page.setViewportSize({ width, height });
            return t.evaluate(async () => {
                const cards = [1, 2, 3].map((id, i) => ({
                    card: { ...cardDatabase.find((c) => c.id === id), uid: `chain-ui-${id}` },
                    owner: i === 1 ? 'bot' : 'player',
                    linkNumber: i + 1
                }));
                gameState.chain = { active: true, links: cards.slice(0, 2) };
                renderChainStack(cards[2]);
                await new Promise((resolve) => setTimeout(resolve, 500));
                const stack = document.getElementById('chainStack');
                const rect = stack.getBoundingClientRect();
                const items = Array.from(stack.querySelectorAll('.chain-stack-item'));
                const style = getComputedStyle(stack);
                const thumbs = Array.from(stack.querySelectorAll('.chain-stack-thumb')).map((el) => el.getBoundingClientRect());
                const metas = Array.from(stack.querySelectorAll('.chain-stack-meta')).map((el) => el.getBoundingClientRect());
                const textClear = metas.every((meta, index) => {
                    const own = thumbs[index];
                    const separatedFromOwnCard = !own || meta.top >= own.bottom - 1;
                    const uncoveredByCards = thumbs.every((card) => (
                        meta.right <= card.left || meta.left >= card.right || meta.bottom <= card.top || meta.top >= card.bottom
                    ));
                    return meta.width > 0 && meta.height > 0 && separatedFromOwnCard && uncoveredByCards;
                });
                const result = {
                    visible: stack.classList.contains('show'),
                    items: items.length,
                    energy: stack.querySelectorAll('.chain-stack-energy').length,
                    resolving: stack.querySelectorAll('.chain-stack-item.resolving').length,
                    tilted: items.every((el) => !!el.style.getPropertyValue('--chain-yaw')),
                    freeLayout: style.backgroundColor === 'rgba(0, 0, 0, 0)'
                        && parseFloat(style.borderTopWidth) === 0
                        && style.overflow === 'visible',
                    cardsUncut: thumbs.every((r) => r.width > 0 && r.height > 0
                        && r.left >= -1 && r.right <= innerWidth + 1
                        && r.top >= -1 && r.bottom <= innerHeight + 1),
                    textClear,
                    cardWidth: thumbs[0] ? thumbs[0].width : 0,
                    inside: rect.left >= -1 && rect.right <= innerWidth + 1
                        && rect.top >= -1 && rect.bottom <= innerHeight + 1
                };
                gameState.chain = { active: false, links: [] };
                renderChainStack();
                return result;
            });
        }

        for (const [w, h] of [[390, 844], [1366, 768]]) {
            const r = await misura(w, h);
            t.assert(r.visible && r.items === 3 && r.energy === 3 && r.resolving === 1 && r.tilted,
                `La composizione semi-3D non e' completa a ${w}x${h}: ${JSON.stringify(r)}`);
            t.assert(r.freeLayout && r.cardsUncut && r.textClear,
                `Le carte della Catena sono ancora chiuse o troncate a ${w}x${h}: ${JSON.stringify(r)}`);
            if (w >= 900) {
                t.assert(r.cardWidth >= 85,
                    `Le carte della Catena restano troppo piccole su desktop: ${JSON.stringify(r)}`);
            }
            t.assert(r.inside, `Il box Catena esce dal viewport a ${w}x${h}: ${JSON.stringify(r)}`);
        }
    }
};
