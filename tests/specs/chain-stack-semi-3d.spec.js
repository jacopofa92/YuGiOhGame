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
                const result = {
                    visible: stack.classList.contains('show'),
                    items: items.length,
                    energy: stack.querySelectorAll('.chain-stack-energy').length,
                    resolving: stack.querySelectorAll('.chain-stack-item.resolving').length,
                    tilted: items.every((el) => !!el.style.getPropertyValue('--chain-yaw')),
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
            t.assert(r.inside, `Il box Catena esce dal viewport a ${w}x${h}: ${JSON.stringify(r)}`);
        }
    }
};
