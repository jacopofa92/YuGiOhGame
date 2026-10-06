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
    const RULES = Object.freeze({
        // Triplicate dopo il primo audit di farming: il percorso generico
        // resta raro, ma non è più soltanto una lotteria da centinaia di ore.
        exodiaRates: Object.freeze({ Facile: 0.0015, Medio: 0.0045, Difficile: 0.009 }),
        exodiaPity: 250,
        seekerMultiplier: 2,
        seekerGuaranteeEvery: 10,
        elephantPremiumChance: 0.002,
        ra: Object.freeze({ marikHard: 40, controlled: 10, maxLpLost: 2000, tournamentHard: 3 }),
        slifer: Object.freeze({ stringsHard: 30, healthyWins: 1, minFinalLp: 4000 })
    });

    function state() {
        const s = window.SaveManager && SaveManager.getCardAcquisitionState
            ? SaveManager.getCardAcquisitionState() : {};
        s.claimed = s.claimed || {};
        s.completedChapters = s.completedChapters || {};
        s.completedChaptersByDifficulty = s.completedChaptersByDifficulty || {};
        s.unlockedPacks = s.unlockedPacks || {};
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

    function animateDrop(entry) {
        if (window.CardDropAnimation && typeof CardDropAnimation.enqueue === 'function') {
            CardDropAnimation.enqueue(entry);
            return;
        }
        try {
            const key = 'duelArenaPendingCardDrops';
            const pending = JSON.parse(sessionStorage.getItem(key) || '[]');
            pending.push(entry);
            sessionStorage.setItem(key, JSON.stringify(pending));
        } catch (e) { /* L'accredito non dipende mai dalla cinematica. */ }
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
        animateDrop(entry);
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
            if ((o.lpLost || 0) <= RULES.ra.maxLpLost) s.counters.raMarikControlled = (s.counters.raMarikControlled || 0) + 1;
        }
        if (hard && opponent === 'strings') {
            s.counters.sliferStringsHard = (s.counters.sliferStringsHard || 0) + 1;
            if ((o.playerLP || 0) >= RULES.slifer.minFinalLp) s.counters.sliferStringsHealthy = (s.counters.sliferStringsHealthy || 0) + 1;
        }

        // Exodia può uscire da qualunque duellante PvE. Seeker raddoppia
        // la probabilità a Difficile e garantisce un pezzo mancante ogni
        // dieci vittorie difficili; il pity globale scatta alla 250ª.
        let chance = RULES.exodiaRates[o.difficulty] || 0;
        if (hard && opponent === 'seeker') {
            chance *= RULES.seekerMultiplier;
            s.counters.seekerHard = (s.counters.seekerHard || 0) + 1;
        }
        s.exodiaPity += 1;
        const pool = missingExodia();
        const seekerGuarantee = hard && opponent === 'seeker' && s.counters.seekerHard % RULES.seekerGuaranteeEvery === 0;
        if (pool.length && (Math.random() < chance || s.exodiaPity >= RULES.exodiaPity || seekerGuarantee)) {
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
            && (s.counters.sliferStringsHard || 0) >= RULES.slifer.stringsHard
            && (s.counters.sliferStringsHealthy || 0) >= RULES.slifer.healthyWins) {
            const got = award(31, 'Battle City I a Difficile e 30 vittorie difficili contro Strings, una con almeno 4000 LP', 'slifer');
            if (got) out.push(got);
        }
        if (s.completedChaptersByDifficulty['battlecity2:difficile']
            && (s.counters.battleCityHardWins || 0) >= RULES.ra.tournamentHard
            && (s.counters.raMarikHard || 0) >= RULES.ra.marikHard
            && (s.counters.raMarikControlled || 0) >= RULES.ra.controlled) {
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
    function unlockPack(id, source) {
        if (!id) return false;
        const s = state();
        if (s.unlockedPacks[id]) return false;
        s.unlockedPacks[id] = { unlockedAt: new Date().toISOString(), source: source || '' };
        save(s);
        return true;
    }
    function isPackUnlocked(id) { return !!state().unlockedPacks[id]; }

    const SOURCES = {
        30: 'Completa tutta la storia anime a Normale o Difficile.',
        31: 'Completa Battle City I a Difficile; batti Strings 30 volte a Difficile e almeno una volta termina con 4000 LP.',
        472: 'Completa Battle City II a Difficile, vinci 3 tornei Battle City a Difficile e batti Marik 40 volte a Difficile; in 10 vittorie perdi al massimo 2000 LP.',
        866: 'Sconfiggi Bakura 25 volte a Difficile.',
        867: 'Completa il capitolo Regno dei Duellanti.', 868: 'Completa Battle City I.',
        869: 'Completa il Mondo Virtuale.', 870: 'Completa Battle City II.',
        246: 'Prima copia: 25 vittorie contro Pegasus a Difficile; poi rarissima in offerte premium.',
        1: 'Ottieni una copia a 50 e una a 100 vittorie contro Kaiba a Difficile. Dopo il primo sblocco può apparire raramente nel Negozio, fino al limite di 3 copie.',
        2: 'Ottieni una copia a 50 e una a 100 vittorie complessive contro Yugi Muto o Yami Yugi a Difficile. Dopo il primo sblocco può apparire raramente nel Negozio.',
        12: 'Sconfiggi Joey 50 volte a Difficile. Dopo il primo sblocco può apparire raramente nel Negozio.',
        123: 'Sconfiggi Pegasus 50 volte a Difficile. Dopo il primo sblocco può apparire raramente nel Negozio.',
        291: 'Sconfiggi Mai 50 volte a Difficile. Dopo il primo sblocco può apparire raramente nel Negozio.'
    };

    EXODIA.forEach((id) => {
        SOURCES[id] = 'Drop dopo una vittoria PvE: 0,15% a Facile, 0,45% a Normale e 0,90% a Difficile. Contro Seeker a Difficile la probabilità raddoppia; ogni 10 vittorie è garantito un pezzo mancante. Pity globale dopo 250 vittorie valide senza un pezzo.';
    });

    function progressoSfida(id) {
        if (!window.SaveManager || typeof SaveManager.getChallengeProgress !== 'function') return 0;
        return Number((SaveManager.getChallengeProgress(id) || {}).count) || 0;
    }

    /** Progresso leggibile mostrato nella Cartoteca solo quando ha senso. */
    function progressFor(cardId) {
        const id = Number(cardId);
        const s = state();
        const c = s.counters;
        const sfide = {
            1: [['carta-kaiba-drago-bianco-50', 50], ['carta-kaiba-drago-bianco-100', 100]],
            2: [['carta-yugi-mago-nero-50', 50], ['carta-yugi-mago-nero-100', 100]],
            12: [['carta-joey-occhi-rossi-50', 50]],
            123: [['carta-pegasus-toon-50', 50]],
            246: [['carta-pegasus-elefante-25', 25]],
            291: [['carta-mai-piumino-50', 50]],
            866: [['carta-bakura-destiny-board-25', 25]]
        };
        if (sfide[id]) return sfide[id].map(([challengeId, target]) =>
            `${Math.min(progressoSfida(challengeId), target)}/${target}`).join(' · ');
        if (EXODIA.indexOf(id) !== -1) {
            return `Pity globale: ${Math.min(s.exodiaPity || 0, RULES.exodiaPity)}/${RULES.exodiaPity} · Seeker a Difficile: ${(c.seekerHard || 0) % RULES.seekerGuaranteeEvery}/${RULES.seekerGuaranteeEvery}`;
        }
        if (id === 31) return `Battle City I Difficile: ${s.completedChaptersByDifficulty['battlecity1:difficile'] ? 'completata' : 'da completare'} · Strings: ${Math.min(c.sliferStringsHard || 0, 30)}/30 · vittoria con almeno 4000 LP: ${Math.min(c.sliferStringsHealthy || 0, 1)}/1`;
        if (id === 472) return `Battle City II Difficile: ${s.completedChaptersByDifficulty['battlecity2:difficile'] ? 'completata' : 'da completare'} · tornei Battle City: ${Math.min(c.battleCityHardWins || 0, 3)}/3 · Marik: ${Math.min(c.raMarikHard || 0, 40)}/40 · vittorie controllate: ${Math.min(c.raMarikControlled || 0, 10)}/10`;
        if (id === 30) return `Ricompensa: ${s.claimed['obelisk-anime'] ? 'ottenuta' : 'non ancora ottenuta'}`;
        const capitolo = Object.keys(SPIRIT_BY_CHAPTER).find((key) => SPIRIT_BY_CHAPTER[key] === id);
        if (capitolo) return `Capitolo richiesto: ${s.completedChapters[capitolo] ? 'completato' : 'da completare'}`;
        return '';
    }

    window.CardAcquisition = {
        EXODIA: EXODIA, SIGNATURE_GATED: SIGNATURE_GATED, RULES: RULES,
        onDuelWin: onDuelWin, onStoryProgress: onStoryProgress,
        onTournamentWin: onTournamentWin, checkMilestones: checkMilestones,
        isSignatureUnlocked: isSignatureUnlocked, isChapterComplete: isChapterComplete,
        unlockPack: unlockPack, isPackUnlocked: isPackUnlocked,
        persistAnimation: animateDrop,
        progressFor: progressFor,
        sourceFor: (id) => {
            const db = typeof cardDatabase !== 'undefined' ? cardDatabase : (window.cardDatabase || []);
            const card = db.find((c) => c.id === id);
            if (card && card.origin === 'ww1') return 'Contenuto della Grande Guerra: non usa rotazioni, buste o requisiti Yu-Gi-Oh.';
            return SOURCES[id] || 'Buste tematiche, rotazione del Negozio o Sfide coerenti con la carta.';
        }
    };
})();
