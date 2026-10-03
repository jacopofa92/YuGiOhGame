// Kaiba ha tre aspetti, scelti dal contesto:
//   - Regno dei Duellanti (torneo + Storia anime fino a fine Regno):
//     setoKaiba_duelist_Kingdom.png
//   - Torneo Kaiba e tappa del torneo in Memorie Proibite:
//     setoKaiba_forbiddenMemories.png
//   - ovunque altrove (Duello Libero, Battle City...): il ritratto del roster.
//
// Controlla i DATI (nessun Kaiba del Regno senza avatar, nessuno di
// Battle City con quello sbagliato), il meccanismo `ritratti` delle scene e
// l'esistenza dei file con i nomi giusti.
//
// `standalone`: la Storia vive su una pagina sua.
const path = require('path');
const fs = require('fs');

module.exports = {
    standalone: true,
    name: 'Kaiba: avatar del Regno dei Duellanti e di Forbidden Memories solo nei contesti giusti',
    async run(t) {
        const RADICE = path.join(__dirname, '..', '..');
        const DK = 'images/characters/setoKaiba_duelist_Kingdom.png';
        const FM = 'images/characters/setoKaiba_forbiddenMemories.png';

        t.assert(fs.existsSync(path.join(RADICE, DK)) && fs.existsSync(path.join(RADICE, FM)), 'I due avatar devono esistere in images/characters/');
        t.assert(!fs.existsSync(path.join(RADICE, 'images/characters/setoKaiba_duelist Kingdom.png')), 'Il vecchio nome con lo spazio non deve più esistere');

        const url = 'file:///' + path.join(RADICE, 'storia.html').replace(/\\/g, '/') + '?campaign=anime';
        const page = await t.browser.newPage({ viewport: { width: 1280, height: 900 } });
        const erroriPagina = [];
        page.on('pageerror', (e) => erroriPagina.push(e.message));
        await page.addInitScript(() => { window.AUTH_GATE_SKIP = true; });

        try {
            await page.goto(url);
            await page.waitForFunction(() => !!(window.StoryProgress && window.storyCampaignsDatabase && window.StoryCutscene), null, { timeout: 25000 });

            // Contesti dei tornei e roster.
            const v = await page.evaluate(() => ({
                regno: getCharacterImageFor('kaiba', 'duelistKingdom'),
                kaibaTorneo: getCharacterImageFor('kaiba', 'kaibaTournament'),
                battleCity: getCharacterImageFor('kaiba', 'battleCity'),
                libero: getCharacterImageFor('kaiba', undefined),
                altro: getCharacterImageFor('joey', 'duelistKingdom'),
                joeyRoster: characterDatabase.find((c) => c.id === 'joey').image
            }));
            t.assert(v.regno === DK, `Torneo Regno dei Duellanti: ${v.regno}`);
            t.assert(v.kaibaTorneo === FM, `Torneo Kaiba: ${v.kaibaTorneo}`);
            t.assert(v.battleCity === 'images/characters/setoKaiba.jpg' && v.libero === v.battleCity, `Battle City e Duello Libero restano col ritratto del roster: ${v.battleCity} / ${v.libero}`);
            t.assert(v.altro === v.joeyRoster, 'Gli altri personaggi non cambiano aspetto');

            // Storia: ogni nodo con Kaiba, per area.
            const nodi = await page.evaluate(() => {
                const out = [];
                const anime = storyCampaignsDatabase.find((c) => c.id === 'anime');
                const fm = storyCampaignsDatabase.find((c) => c.id === 'forbiddenMemories');
                const visita = (campagna, cap, t) => {
                    const ha = t.characterId === 'kaiba' || t.chiId === 'kaiba'
                        || (t.protagonista && /Kaiba/.test(t.protagonista.name));
                    if (ha) out.push({ campagna: campagna.id, cap: cap.id, id: t.id, avatar: (t.avatar && t.avatar.kaiba) || null, prot: t.protagonista ? t.protagonista.image : null });
                    (t.tappe || []).forEach((x) => visita(campagna, cap, x));
                };
                [anime, fm].forEach((c) => (c.capitoli || []).forEach((cap) => (cap.tappe || []).forEach((t) => visita(c, cap, t))));
                return out;
            });
            const regno = nodi.filter((n) => n.campagna === 'anime' && (n.cap === 'prologo' || n.cap === 'regno'));
            const fuori = nodi.filter((n) => n.campagna === 'anime' && !(n.cap === 'prologo' || n.cap === 'regno'));
            t.assert(regno.length >= 5, `Devono esserci i Kaiba del prologo e del Regno nel catalogo (trovati ${regno.length})`);
            regno.forEach((n) => {
                t.assert(n.avatar === DK || n.prot === DK, `Kaiba del Regno senza il suo avatar: ${n.id}`);
            });
            fuori.forEach((n) => {
                t.assert(n.avatar === null && n.prot !== DK && n.prot !== FM, `Kaiba di Battle City/dopo non deve avere l'avatar del Regno: ${n.id}`);
            });
            const fmKaiba = nodi.find((n) => n.id === 'fm-3t-kaiba');
            t.assert(fmKaiba && fmKaiba.avatar === FM, 'Il Kaiba del torneo di Forbidden Memories usa il suo avatar');

            // Le scene: `ritratti` cambia la faccia di chi parla.
            const fonte = await page.evaluate(async () => {
                StoryCutscene.play([{ chi: 'kaiba', testo: 'Prova.' }], { ritratti: { kaiba: 'images/characters/setoKaiba_forbiddenMemories.png' } });
                await new Promise((r) => setTimeout(r, 900));
                const el = document.querySelector('.sc-ritratto');
                return el ? el.dataset.fonte : null;
            });
            t.assert(fonte === FM, `La scena deve usare il ritratto passato in \`ritratti\`: ${fonte}`);

            // Il duello vero: l'avversario porta l'avatar del contesto.
            const duello = async (query) => {
                const p = await t.browser.newPage({ viewport: { width: 1280, height: 900 } });
                await p.addInitScript(() => { window.AUTH_GATE_SKIP = true; window.DUEL_FAST_OPENING = true; });
                try {
                    await p.goto('file:///' + path.join(RADICE, 'duelMonstersCore.html').replace(/\\/g, '/') + '?' + query);
                    await p.waitForFunction(() => window.DuelSession && DuelSession.opponent, null, { timeout: 25000 });
                    return await p.evaluate(() => DuelSession.opponent.image);
                } finally {
                    await p.close();
                }
            };
            const imgRegnoStoria = await duello('mode=story&campaign=anime&tappa=anime-1-kaiba&character=kaiba');
            const imgBattleCity = await duello('mode=story&campaign=anime&tappa=anime-4-kaiba&character=kaiba');
            const imgFmStoria = await duello('mode=story&campaign=forbiddenMemories&tappa=fm-3t-kaiba&character=kaiba');
            const imgTorneoKaiba = await duello('mode=tournament&tournament=kaibaTournament&character=kaiba');
            const imgTorneoRegno = await duello('mode=tournament&tournament=duelistKingdom&character=kaiba');
            const imgLibero = await duello('mode=free&character=kaiba');
            t.assert(imgRegnoStoria === DK, `Duello di Storia nel Regno: ${imgRegnoStoria}`);
            t.assert(imgBattleCity === 'images/characters/setoKaiba.jpg', `Duello di Storia a Battle City: ${imgBattleCity}`);
            t.assert(imgFmStoria === FM, `Duello di Storia nel torneo di Forbidden Memories: ${imgFmStoria}`);
            t.assert(imgTorneoKaiba === FM, `Duello del Torneo Kaiba: ${imgTorneoKaiba}`);
            t.assert(imgTorneoRegno === DK, `Duello del torneo Regno dei Duellanti: ${imgTorneoRegno}`);
            t.assert(imgLibero === 'images/characters/setoKaiba.jpg', `Duello Libero: ${imgLibero}`);

            t.assert(erroriPagina.length === 0, 'Nessun errore JS: ' + erroriPagina.join(' | '));
        } finally {
            await page.close();
        }
    }
};
