module.exports = {
    name: 'Video evocazione: priorità assoluta e duello sospeso fino alla fine',
    async run(t) {
        const result = await t.evaluate(async () => {
            const originalGetVideoFor = VisualEffects.getVideoFor;
            VisualEffects.getVideoFor = () => Promise.resolve('about:blank');
            const anchor = document.createElement('div');
            anchor.style.cssText = 'position:fixed;left:100px;top:100px;width:80px;height:110px';
            document.body.appendChild(anchor);
            FX.playMonsterSummonEffect({ id: 1, uid: 'video-lock-test', name: 'Test', level: 4 }, anchor);
            await Promise.resolve();
            await Promise.resolve();
            const backdrop = document.querySelector('.fx-video-backdrop');
            const during = {
                exists: !!backdrop,
                modal: backdrop && backdrop.getAttribute('aria-modal') === 'true',
                lock: window.DUEL_CINEMATIC_LOCK === true,
                cinematic: FX.isCinematicPlaying(),
                blocked: isBlockingModalOpen(),
                z: backdrop ? Number(getComputedStyle(backdrop).zIndex) : 0
            };
            if (backdrop) backdrop.querySelector('video').dispatchEvent(new Event('ended'));
            await new Promise((resolve) => setTimeout(resolve, 680));
            const after = {
                exists: !!document.querySelector('.fx-video-backdrop'),
                lock: window.DUEL_CINEMATIC_LOCK === true,
                cinematic: FX.isCinematicPlaying()
            };
            VisualEffects.getVideoFor = originalGetVideoFor;
            anchor.remove();
            return { during, after };
        });

        t.assert(result.during.exists && result.during.modal && result.during.lock
            && result.during.cinematic && result.during.blocked && result.during.z > 1000000,
            `Il video non domina e sospende tutta la UI: ${JSON.stringify(result)}`);
        t.assert(!result.after.exists && !result.after.lock && !result.after.cinematic,
            `Il gioco non riprende correttamente dopo il video: ${JSON.stringify(result)}`);
    }
};
