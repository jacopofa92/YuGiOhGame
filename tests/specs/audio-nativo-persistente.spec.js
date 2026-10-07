const path = require('path');

module.exports = {
    standalone: true,
    name: 'Audio: nell\'APK la soundtrack usa il player nativo persistente',
    async run(t) {
        const radice = path.join(__dirname, '..', '..');
        const url = 'file:///' + path.join(radice, 'impostazioni.html').replace(/\\/g, '/');
        const page = await t.browser.newPage({ viewport: { width: 1000, height: 800 } });
        await page.addInitScript(() => {
            window.AUTH_GATE_SKIP = true;
            window.__nativeMusicCalls = [];
            const record = (method) => (payload) => {
                window.__nativeMusicCalls.push({ method, payload: payload || null });
                return Promise.resolve({});
            };
            window.Capacitor = {
                isNativePlatform: () => true,
                Plugins: {
                    NativeMusic: {
                        play: record('play'), pause: record('pause'), resume: record('resume'),
                        setVolume: record('setVolume'), setMuted: record('setMuted'), getState: record('getState')
                    }
                }
            };
        });
        try {
            await page.goto(url);
            await page.waitForFunction(() => window.DuelMusic && window.__nativeMusicCalls.some((c) => c.method === 'play'));
            await page.evaluate(() => {
                DuelMusic.setTrack('audio/soundtracks/30. Preliminaries.mp3', { restart: true });
                DuelMusic.setVolume(0.42);
                DuelMusic.setMuted(true);
            });
            const risultato = await page.evaluate(() => ({
                calls: window.__nativeMusicCalls,
                webSrc: document.getElementById('bgMusicAudio').getAttribute('src')
            }));
            const cambio = risultato.calls.find((c) => c.method === 'play' && c.payload && c.payload.restart);
            t.assert(cambio && cambio.payload.src.endsWith('/audio/soundtracks/30.%20Preliminaries.mp3'),
                'Il cambio traccia deve raggiungere NativeMusic con URL assoluta e restart');
            t.assert(risultato.calls.some((c) => c.method === 'setVolume' && c.payload.volume === 0.42),
                'Il volume deve essere inoltrato al player nativo');
            t.assert(risultato.calls.some((c) => c.method === 'setMuted' && c.payload.muted === true),
                'Il mute deve essere inoltrato al player nativo');
            t.assert(!risultato.webSrc, 'Nell\'APK il sottofondo web non deve partire in parallelo');
        } finally {
            await page.close();
        }
    }
};
