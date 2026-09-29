const path = require('path');

module.exports = {
    standalone: true,
    name: 'Impostazioni: profilo, migrazione locale e import restano sincronizzati',
    async run(t) {
        const radice = path.join(__dirname, '..', '..');
        const url = 'file:///' + path.join(radice, 'impostazioni.html').replace(/\\/g, '/');
        const page = await t.browser.newPage({ viewport: { width: 1200, height: 900 } });
        await page.addInitScript(() => { window.AUTH_GATE_SKIP = true; });
        try {
            await page.goto(url);
            await page.waitForFunction(() => !!(window.SaveManager && window.VideoQuality && window.DuelMusic && window.DuelSFX));
            const risultato = await page.evaluate(() => {
                localStorage.clear();
                sessionStorage.clear();
                localStorage.setItem('ygoVideoDetail', 'alti');
                localStorage.setItem('duelArenaMusicVolume', '0.31');
                SaveManager.createNew('Tester');
                const migrato = SaveManager.load().settings;
                VideoQuality.set('normali');
                DuelMusic.setMuted(true);
                DuelMusic.setVolume(0.42);
                DuelSFX.setMuted(true);
                DuelSFX.setVolume(0.27);
                const salvato = SaveManager.load().settings;
                const esterno = JSON.parse(JSON.stringify(SaveManager.load()));
                esterno.settings = { videoDetail: 'alti', hologram: false, haptics: false,
                    musicVolume: 0.8, musicMuted: false, sfxVolume: 0.75, sfxMuted: false };
                SaveManager.applyExternalSave(esterno);
                return { migrato, salvato, importato: SaveManager.load().settings,
                    cacheVideo: localStorage.getItem('ygoVideoDetail'),
                    cacheMute: localStorage.getItem('duelArenaMusicMuted'),
                    vecchiaSessioneMute: sessionStorage.getItem('duelArenaMusicMuted') };
            });
            t.assert(risultato.migrato.videoDetail === 'alti' && risultato.migrato.musicVolume === 0.31,
                'Le vecchie preferenze locali devono migrare nel salvataggio nuovo');
            t.assert(risultato.salvato.videoDetail === 'normali' && risultato.salvato.musicMuted === true
                && risultato.salvato.musicVolume === 0.42 && risultato.salvato.sfxMuted === true
                && risultato.salvato.sfxVolume === 0.27,
            'Ogni controllo deve scrivere nella sezione settings del profilo');
            t.assert(risultato.importato.videoDetail === 'alti' && risultato.importato.hologram === false
                && risultato.importato.haptics === false && risultato.importato.musicVolume === 0.8,
            'Un salvataggio importato deve mantenere tutte le impostazioni');
            t.assert(risultato.cacheVideo === 'alti' && risultato.cacheMute === 'false'
                && risultato.vecchiaSessioneMute === null,
            'Import/cloud deve riallineare la cache e rimuovere il vecchio mute di sessione');
        } finally {
            await page.close();
        }
    }
};
