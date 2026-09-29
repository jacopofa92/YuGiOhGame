module.exports = {
    name: 'Stepper fasi: stabile e senza overflow durante resize desktop/mobile',
    async run(t) {
        async function misura(width, height) {
            await t.page.setViewportSize({ width, height });
            await t.page.waitForTimeout(120);
            return t.evaluate(() => {
                gameState.currentPlayer = 'player';
                gameState.turn = 3;
                gameState.phase = 'main1';
                updatePhaseIndicator();
                const rail = document.getElementById('phaseStepper');
                const main = document.querySelector('.battlefield-main');
                const fieldRow = document.querySelector('#playerFieldBoard .field-row');
                const rr = rail.getBoundingClientRect();
                const mr = main.getBoundingClientRect();
                const fr = fieldRow.getBoundingClientRect();
                const steps = Array.from(rail.querySelectorAll('.phase-step'));
                const rects = steps.map((el) => el.getBoundingClientRect());
                const overlaps = rects.slice(1).some((r, i) => r.left < rects[i].right - 0.5);
                const rowSpread = Math.max(...rects.map((r) => r.top)) - Math.min(...rects.map((r) => r.top));
                return {
                    viewport: window.innerWidth,
                    rail: { left: rr.left, right: rr.right, width: rr.width, height: rr.height },
                    main: { left: mr.left, right: mr.right, width: mr.width },
                    fieldRow: { left: fr.left, right: fr.right, width: fr.width },
                    overlaps,
                    rowSpread,
                    active: steps.filter((el) => el.classList.contains('active')).map((el) => el.dataset.phase),
                    labelsVisible: getComputedStyle(steps[0].querySelector('.step-label')).display !== 'none',
                    labelsUseEllipsis: steps.some((el) => {
                        const label = el.querySelector('.step-label');
                        const style = getComputedStyle(label);
                        return style.display !== 'none' && style.textOverflow === 'ellipsis';
                    }),
                    svgCount: rail.querySelectorAll('.step-icon svg').length,
                    clickableKeyboard: steps.filter((el) => el.classList.contains('clickable'))
                        .every((el) => el.tabIndex === 0 && el.getAttribute('role') === 'button')
                };
            });
        }

        const casi = [
            { w: 1440, h: 900, mobile: false, maxH: 62 },
            { w: 393, h: 851, mobile: true, maxH: 50 },
            { w: 844, h: 390, mobile: true, maxH: 40 },
            { w: 1280, h: 720, mobile: false, maxH: 62 }
        ];

        for (const caso of casi) {
            const m = await misura(caso.w, caso.h);
            t.assert(m.rail.left >= -1 && m.rail.right <= m.viewport + 1,
                `Stepper fuori viewport a ${caso.w}x${caso.h}: ${JSON.stringify(m.rail)}`);
            t.assert(Math.abs(m.rail.left - m.fieldRow.left) <= 1.5
                && Math.abs(m.rail.right - m.fieldRow.right) <= 1.5,
                `I bordi dello stepper non coincidono con gli slot esterni a ${caso.w}x${caso.h}: rail=${JSON.stringify(m.rail)}, campo=${JSON.stringify(m.fieldRow)}`);
            t.assert(!m.overlaps && m.rowSpread <= 1,
                `Le sei fasi devono restare su una riga senza sovrapporsi a ${caso.w}x${caso.h}`);
            t.assert(m.rail.height <= caso.maxH,
                `Stepper troppo alto a ${caso.w}x${caso.h}: ${m.rail.height}px (max ${caso.maxH})`);
            t.assert(m.active.join(',') === 'main1' && m.svgCount === 6,
                'Stato attivo e sei icone SVG devono sopravvivere a ogni resize');
            t.assert(!m.labelsUseEllipsis,
                `Nessuna etichetta deve usare ellissi a ${caso.w}x${caso.h}`);
            if (caso.mobile) t.assert(!m.labelsVisible,
                `Su mobile le etichette devono lasciare spazio ai badge a ${caso.w}x${caso.h}`);
            t.assert(m.clickableKeyboard,
                'Gli step azionabili devono restare raggiungibili da tastiera');
        }
    }
};
