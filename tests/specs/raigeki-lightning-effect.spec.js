// Raigeki (id 409): il VFX deve attraversare tutti i cinque slot Mostro
// avversari e la distruzione deve avvenire sulla callback d'impatto, non
// prima. Il test separa volutamente regola e resa grafica per non dipendere
// dai millisecondi dell'animazione.
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'Raigeki: cinque fulmini sugli slot avversari e distruzione sincronizzata all impatto',
    async run(t) {
        const root = path.join(__dirname, '..', '..');
        const effects = fs.readFileSync(path.join(root, 'js', 'ui', 'effects.js'), 'utf8');
        const gsap = fs.readFileSync(path.join(root, 'js', 'ui', 'fx-gsap.js'), 'utf8');
        const css = fs.readFileSync(path.join(root, 'js', 'ui', 'effects.css'), 'utf8');
        t.assert(effects.includes('function playRaigeki(owner, onImpact)')
            && effects.includes('[data-type="monster"]'),
        'Il fallback Raigeki deve ricavare tutti gli slot Mostro del bersaglio');
        t.assert(gsap.includes('playRaigeki: function (owner, onImpact)')
            && gsap.includes('order.forEach((slotIndex, sequence)'),
        'Il backend GSAP deve creare una scarica distinta per ciascuno slot');
        t.assert(css.includes('.fx-raigeki-bolt') && css.includes('.fx-raigeki-impact'),
            'Raigeki deve avere stili dedicati per fulmine e impatto');

        const result = await t.evaluate(() => {
            const base = cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck);
            gameState.botMonsterField = [0, 1, 2].map((i) => ({
                card: { ...base, uid: `raigeki-target-${i}` },
                position: 'attack', isFaceDown: false, hasAttacked: false
            })).concat([null, null]);
            let impact = null;
            window.FX = {
                playRaigeki(owner, callback) { impact = { owner, callback }; }
            };
            const raigeki = { ...cardDatabase.find((c) => c.id === 409), uid: 'raigeki-test' };
            const ctx = DuelEngine.makeContext('player', { card: raigeki, index: 0 });
            DuelEngine.getDefinition(409).activate(ctx);
            const beforeImpact = gameState.botMonsterField.filter(Boolean).length;
            const targetedOwner = impact && impact.owner;
            if (impact) impact.callback();
            return {
                beforeImpact,
                targetedOwner,
                afterImpact: gameState.botMonsterField.filter(Boolean).length
            };
        });
        t.assert(result.targetedOwner === 'bot', 'Raigeki giocato dal player deve colpire la fila Mostro del bot');
        t.assert(result.beforeImpact === 3, 'I mostri devono restare sul campo fino al lampo d impatto');
        t.assert(result.afterImpact === 0, 'La callback d impatto deve distruggere tutti i mostri avversari');
    }
};
