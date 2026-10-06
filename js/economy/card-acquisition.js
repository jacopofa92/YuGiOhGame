/**
 * Fonte unica per le acquisizioni speciali delle carte.
 *
 * Qui vivono le regole che NON sono semplice commercio: ricompense dei
 * capitoli, Carte Dio, Exodia con pity e traguardi composti. Il Negozio
 * consulta questo modulo per non offrire una carta firma prima che il
 * giocatore ne abbia ottenuta almeno una dalla sua fonte narrativa.
 */
(function () {
    'use strict';

    const EXODIA = [11, 41, 42, 43, 44];
    const SPIRIT_BY_CHAPTER = { regno: 867, battlecity1: 868, virtuale: 869, battlecity2: 870 };
    const SIGNATURE_GATED = new Set([1, 2, 12, 123, 291]);
    const CARD_CAP = 3;

    function state() {
        const s = window.SaveManager && SaveManager.getCardAcquisitionState
            ? SaveManager.getCardAcquisitionState() : {};
        s.claimed = s.claimed || {};
        s.completedChapters = s.completedChapters || {};
        s.completedChaptersByDifficulty = s.completedChaptersByDifficulty || {};
        s.counters = s.counters || {};
        s.exodiaPity = Number(s.exodiaPity) || 0;
        return s;
    }

    function save(s) {
        if (window.SaveManager && SaveManager.setCardAcquisitionState) SaveManager.setCardAcquisitionState(s);
    }

    function cardName(id) {
        const db = typeof cardDatabase !== 'undefined' ? cardDatabase : (window.cardDatabase || []);
        const c = db.find((x) => x.id === id);
        return c ? c.name : `Carta #${id}`;
    }

    function announce(entry) {
        const def = { icon: '🃏', label: 'Carta ottenuta: ' + entry.nome, description: entry.rule };
        if (window.ChallengeBanner && typeof ChallengeBanner.show === 'function') {
            ChallengeBanner.show(def, [entry]);
            return;
        }
        // Stesso formato della coda del tracker: la pagina successiva che
        // monta il banner rende visibile anche un premio nato nella Storia.
        try {
            const key = 'duelArenaPendingChallengeBanners';
            const pending = JSON.parse(sessionStorage.getItem(key) || '[]');
            pending.push(Object.assign({}, def, { rewards: [entry] }));
            sessionStorage.setItem(key, JSON.stringify(pending));
        } catch (e) { /* sessionStorage non disponibile: il premio resta comunque accreditato. */ }
    }

    function award(id, rule, key, shouldAnnounce) {
        const s = state();
        if (key && s.claimed[key]) return null;
        if (!window.SaveManager || SaveManager.getOwnedCount(id) >= CARD_CAP) {
            if (key) { s.claimed[key] = true; save(s); }
            return null;
        }
        SaveManager.addOwnedCards(id, 1);
        if (key) { s.claimed[key] = true; save(s); }
        const entry = { cardId: id, amount: 1, icon: '🃏', nome: cardName(id), rule: rule };
        if (shouldAnnounce) announce(entry);
        return entry;
    }

    function missingExodia() {
        const maiOttenuti = EXODIA.filter((id) => !window.SaveManager || SaveManager.getOwnedCount(id) === 0);
        return maiOttenuti.length ? maiOttenuti
            : EXODIA.filter((id) => !window.SaveManager || SaveManager.getOwnedCount(id) < CARD_CAP);
    }

    /** Una vittoria PvE valida: anche l'autowin admin passa da questo punto. */
    function onDuelWin(opts) {
        const o = opts || {};
        const out = [];
        if (!o.difficulty || o.multiplayer || o.abbandono) return out;
        const s = state();
        const hard = o.difficulty === 'Difficile';
        const opponent = o.opponentId || '';

        if (hard && opponent === 'marik') {
            s.counters.raMarikHard = (s.counters.raMarikHard || 0) + 1;
            if ((o.lpLost || 0) <= 2000) s.counters.raMarikControlled = (s.counters.raMarikControlled || 0) + 1;
        }
        if (hard && opponent === 'strings') {
            s.counters.sliferStringsHard = (s.counters.sliferStringsHard || 0) + 1;
            if ((o.playerLP || 0) >= 4000) s.counters.sliferStringsHealthy = (s.counters.sliferStringsHealthy || 0) + 1;
        }

        // Exodia può uscire da qualunque duellante PvE. Seeker raddoppia
        // la probabilità a Difficile e garantisce un pezzo mancante ogni
        // dieci vittorie difficili; il pity globale scatta alla 250ª.
        const rates = { Facile: 0.0005, Medio: 0.0015, Difficile: 0.003 };
        let chance = rates[o.difficulty] || 0;
        if (hard && opponent === 'seeker') {
            chance *= 2;
            s.counters.seekerHard = (s.counters.seekerHard || 0) + 1;
        }
        s.exodiaPity += 1;
        const pool = missingExodia();
        const seekerGuarantee = hard && opponent === 'seeker' && s.counters.seekerHard % 10 === 0;
        if (pool.length && (Math.random() < chance || s.exodiaPity >= 250 || seekerGuarantee)) {
            const id = pool[Math.floor(Math.random() * pool.length)];
            const got = award(id, seekerGuarantee
                ? 'Pezzo di Exodia garantito: 10 vittorie contro Seeker a Difficile'
                : (s.exodiaPity >= 250 ? 'Pity Exodia: 250 vittorie valide senza un pezzo' : 'Drop rarissimo di Exodia'));
            if (got) out.push(got);
            s.exodiaPity = 0;
        }
        save(s);
        return out.concat(checkMilestones());
    }

    function onStoryProgress(campaignId, difficulty, completedChapterIds, campaignFinished) {
        if (campaignId !== 'anime') return [];
        const s = state();
        (completedChapterIds || []).forEach((id) => {
            s.completedChapters[id] = true;
            s.completedChaptersByDifficulty[`${id}:${difficulty}`] = true;
        });
        save(s);
        const out = [];
        Object.keys(SPIRIT_BY_CHAPTER).forEach((chapterId) => {
            if (!s.completedChapters[chapterId]) return;
            const got = award(SPIRIT_BY_CHAPTER[chapterId],
                `Ricompensa unica: completato il capitolo ${chapterId} del Regno delle Ombre`,
                `spirit-${chapterId}`, true);
            if (got) out.push(got);
        });
        if (campaignFinished && (difficulty === 'normale' || difficulty === 'difficile')) {
            const got = award(30, 'Completata l’intera storia anime a Normale o Difficile', 'obelisk-anime', true);
            if (got) out.push(got);
        }
        return out.concat(checkMilestones());
    }

    function onTournamentWin(tournamentId, difficulty) {
        const s = state();
        if (tournamentId === 'battleCity' && difficulty === 'Difficile') {
            s.counters.battleCityHardWins = (s.counters.battleCityHardWins || 0) + 1;
            save(s);
        }
        return checkMilestones();
    }

    function checkMilestones() {
        const s = state();
        const out = [];
        if (s.completedChaptersByDifficulty['battlecity1:difficile']
            && (s.counters.sliferStringsHard || 0) >= 50
            && (s.counters.sliferStringsHealthy || 0) >= 1) {
            const got = award(31, 'Battle City I a Difficile e 50 vittorie difficili contro Strings, una con almeno 4000 LP', 'slifer');
            if (got) out.push(got);
        }
        if (s.completedChaptersByDifficulty['battlecity2:difficile']
            && (s.counters.battleCityHardWins || 0) >= 3
            && (s.counters.raMarikHard || 0) >= 40
            && (s.counters.raMarikControlled || 0) >= 10) {
            const got = award(472, 'Battle City II e torneo a Difficile; 40 vittorie difficili contro Marik, 10 perdendo al massimo 2000 LP', 'ra');
            if (got) out.push(got);
        }
        return out;
    }

    function isSignatureUnlocked(cardId) {
        return !SIGNATURE_GATED.has(cardId)
            || !!(window.SaveManager && SaveManager.getOwnedCount(cardId) > 0);
    }

    function isChapterComplete(id) { return !!state().completedChapters[id]; }

    const SOURCES = {
        30: 'Completa tutta la storia anime a Normale o Difficile.',
        31: 'Completa Battle City I a Difficile; batti Strings 50 volte a Difficile e almeno una volta termina con 4000 LP.',
        472: 'Completa Battle City II a Difficile, vinci 3 tornei Battle City a Difficile e batti Marik 40 volte a Difficile; in 10 vittorie perdi al massimo 2000 LP.',
        866: 'Sconfiggi Bakura 25 volte a Difficile.',
        867: 'Completa il capitolo Regno dei Duellanti.', 868: 'Completa Battle City I.',
        869: 'Completa il Mondo Virtuale.', 870: 'Completa Battle City II.',
        246: 'Prima copia: 25 vittorie contro Pegasus a Difficile; poi rarissima in offerte premium.',
        1: 'Prima copia dalle sfide contro Kaiba; poi può apparire raramente nel Negozio.',
        2: 'Prima copia dalle sfide contro Yugi/Yami Yugi; poi può apparire raramente nel Negozio.',
        12: 'Prima copia dalle sfide contro Joey; poi può apparire raramente nel Negozio.',
        123: 'Prima copia dalle sfide contro Pegasus; poi può apparire raramente nel Negozio.',
        291: 'Prima copia dalle sfide contro Mai; poi può apparire raramente nel Negozio.'
    };

    window.CardAcquisition = {
        EXODIA: EXODIA, SIGNATURE_GATED: SIGNATURE_GATED,
        onDuelWin: onDuelWin, onStoryProgress: onStoryProgress,
        onTournamentWin: onTournamentWin, checkMilestones: checkMilestones,
        isSignatureUnlocked: isSignatureUnlocked, isChapterComplete: isChapterComplete,
        sourceFor: (id) => {
            const db = typeof cardDatabase !== 'undefined' ? cardDatabase : (window.cardDatabase || []);
            const card = db.find((c) => c.id === id);
            if (card && card.origin === 'ww1') return 'Contenuto della Grande Guerra: non usa rotazioni, buste o requisiti Yu-Gi-Oh.';
            return SOURCES[id] || 'Buste tematiche, rotazione del Negozio o Sfide coerenti con la carta.';
        }
    };
})();
