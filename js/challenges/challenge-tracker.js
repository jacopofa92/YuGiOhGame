/**
 * challenge-tracker.js — Motore di tracking delle Sfide (js/data/challenges-db.js).
 * =====================================================================
 * Un solo punto di aggancio generico, `recordProgress(type, params)`,
 * chiamato dagli hook nel motore di duello (oggi: js/duel-session.js
 * dopo una vittoria, js/engine/duel-engine.js dopo un'Evocazione) — fa
 * il matching contro il catalogo invece di avere una funzione dedicata
 * per ogni singola sfida, così una FUTURA sfida con un `type` già
 * esistente (es. un'altra carta da evocare N volte) non richiede
 * nessuna modifica qui, solo una nuova voce in challenges-db.js.
 *
 * Il progresso vive nel salvataggio persistente (js/save-manager.js,
 * SaveManager.getChallengeProgress/setChallengeProgress) — non in
 * memoria: sopravvive alla navigazione tra pagine, dato che il motore
 * di duello e la pagina sfide.html sono documenti separati.
 */
(function () {
    'use strict';

    // sessionStorage (non localStorage: solo per QUESTA sessione di
    // navigazione, si autopulisce riaprendo il browser) — vedi
    // announceCompletion()/drainPendingBanners() più sotto.
    const PENDING_KEY = 'duelArenaPendingChallengeBanners';

    function getDefinitions() {
        return (typeof challengesDatabase !== 'undefined') ? challengesDatabase : [];
    }

    function matchesDef(def, type, params) {
        if (def.type !== type) return false;
        const match = def.match || {};
        return Object.keys(match).every((key) => match[key] === params[key]);
    }

    /**
     * Punto unico di aggancio per OGNI evento di gioco trackabile da una
     * sfida. `type` è la categoria (es. 'defeatCharacter', 'summonMonster',
     * 'winDuels' — vedi il commento in cima a challenges-db.js), `params`
     * sono i dati dell'evento appena successo (es. { characterId: 'kaiba' }
     * o { cardId: 1 }) confrontati contro il campo `match` di ogni sfida
     * del catalogo. Una sfida già completata non viene più incrementata
     * (il contatore resta fermo al target).
     */
    function recordProgress(type, params) {
        if (!window.SaveManager) return;
        params = params || {};
        const defs = getDefinitions().filter((def) => matchesDef(def, type, params));
        if (defs.length === 0) return;

        defs.forEach((def) => {
            const progress = SaveManager.getChallengeProgress(def.id);
            if (progress.completed) return;
            const count = (progress.count || 0) + 1;
            const completed = count >= def.target;
            SaveManager.setChallengeProgress(def.id, {
                count: count,
                completed: completed,
                completedAt: completed ? new Date().toISOString() : null
            });
            if (!completed) return;
            // Prima si PAGA, poi si annuncia — e in questo ordine: il
            // banner mostra le voci ricevute, quindi devono esistere già.
            //
            // L'accredito passa da Rewards ed è l'unico punto che tocca
            // le valute per una Sfida: la regola in testa a
            // js/economy/rewards.js dice che nessuna pagina assegna
            // valute per conto proprio, e vale anche qui.
            //
            // Sta DENTRO il ramo "appena completata", che gira una volta
            // sola perché poco sopra si esce subito se la sfida risulta
            // già completata: senza quella guardia, ogni evento
            // successivo dello stesso tipo ripagherebbe lo stesso premio.
            const premi = (window.Rewards && typeof Rewards.forChallenge === 'function')
                ? Rewards.forChallenge(def)
                : [];
            announceCompletion(def, premi);
        });
    }

    /**
     * Mostra il banner "Sfida completata" SUBITO se la pagina corrente ha
     * caricato js/ui/challenge-banner.js — altrimenti la accoda in
     * sessionStorage perché la PROSSIMA pagina che carica il banner
     * (qualunque essa sia) la mostri al proprio avvio, invece di perderla
     * silenziosamente. Generico apposta: un futuro hook aggiunto su
     * un'altra pagina funziona allo stesso identico modo, senza bisogno
     * di toccare questa funzione.
     */
    function announceCompletion(def, premi) {
        // `premi` sono le voci GIÀ accreditate (vedi recordProgress): qui
        // si trasportano soltanto, perché il banner le mostri. Vanno in
        // coda insieme alla sfida se il banner non c'è su questa pagina —
        // altrimenti il giocatore vedrebbe più tardi "Sfida completata!"
        // senza sapere che cosa ha preso, e i crediti sarebbero comparsi
        // dal nulla.
        const voci = premi || [];
        if (window.ChallengeBanner && typeof ChallengeBanner.show === 'function') {
            ChallengeBanner.show(def, voci);
            return;
        }
        try {
            const pending = JSON.parse(sessionStorage.getItem(PENDING_KEY) || '[]');
            pending.push({ id: def.id, label: def.label, description: def.description, icon: def.icon, rewards: voci });
            sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending));
        } catch (e) { /* noop */ }
    }

    /** Chiamata da js/ui/challenge-banner.js al proprio avvio: ritorna e svuota le sfide completate altrove ma non ancora mostrate all'utente. */
    function drainPendingBanners() {
        let pending = [];
        try {
            pending = JSON.parse(sessionStorage.getItem(PENDING_KEY) || '[]');
            sessionStorage.removeItem(PENDING_KEY);
        } catch (e) { /* noop */ }
        return pending;
    }

    /** Per sfide.html: ogni sfida del catalogo con il proprio progresso attuale unito dentro (count/completed/completedAt), pronta da renderizzare. */
    function getAllWithProgress() {
        return getDefinitions().map((def) => {
            const progress = window.SaveManager ? SaveManager.getChallengeProgress(def.id) : { count: 0, completed: false, completedAt: null };
            return Object.assign({}, def, {
                count: Math.min(progress.count || 0, def.target),
                completed: !!progress.completed,
                completedAt: progress.completedAt || null
            });
        });
    }

    window.ChallengeTracker = {
        recordProgress: recordProgress,
        drainPendingBanners: drainPendingBanners,
        getAllWithProgress: getAllWithProgress
    };
})();
