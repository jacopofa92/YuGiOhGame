/**
 * ai-shared.js — Euristiche condivise tra i livelli di difficoltà
 * dell'IA (js/ai/ai-medium.js, js/ai/ai-hard.js). Vanno caricate PRIMA
 * di entrambi (vedi <script> in duelMonstersCore.html).
 *
 * Il motore non introspeziona il vero "peso" di un effetto a runtime
 * (richiederebbe eseguirlo a vuoto per vedere cosa fa), quindi qui si
 * stima l'impatto di una carta leggendo PAROLE CHIAVE nel suo testo
 * effetto italiano (card.effect) — una stima grezza ma sufficiente per
 * far scegliere all'IA "Difficile" la carta più forte tra più candidate
 * invece della prima che capita, e per decidere se vale la pena
 * Settare/attivare una Magia o Trappola invece di trattenerla.
 */
(function () {
    'use strict';

    // Parola chiave -> punti d'impatto stimato. Più alto = più forte.
    // L'ordine di controllo conta poco: si sommano tutti i match trovati.
    const KEYWORD_WEIGHTS = [
        [/distrugg/i, 4],           // rimozione permanente
        [/bandisc/i, 4],            // rimozione ancora più definitiva
        [/nega/i, 3],               // negazione di un'attivazione/effetto
        [/prende il controllo|controllo del/i, 4], // furto di un mostro
        [/special summon/i, 2],
        [/danni|infligg/i, 2],
        [/pesca \d|pesca fino/i, 2],
        [/dimezza|guadagna \d+ atk|perde \d+ atk/i, 1],
        [/torna in mano|ritorna in mano/i, 1],
        [/mescola/i, 1]
    ];

    /**
     * Stima grezza dell'impatto di una carta guardando il suo testo
     * effetto — usata per ordinare più candidate tra loro (es. quale
     * Trappola Set attivare per rispondere, quale Magia in mano
     * attivare prima). Un mostro senza testo Magia/Trappola riceve un
     * punteggio base pari al suo ATK diviso 500, così un vanilla forte
     * non risulta mai "zero" rispetto a una Magia/Trappola debole.
     */
    function scoreCardImpact(card) {
        if (!card) return 0;
        if (card.type === 'monster') return (card.attack || 0) / 500;
        const text = card.effect || '';
        let score = 1; // punteggio base: attivarla è comunque quasi sempre un piccolo vantaggio
        KEYWORD_WEIGHTS.forEach(([re, weight]) => {
            if (re.test(text)) score += weight;
        });
        return score;
    }

    /**
     * Decide la "postura" di un mostro da Evocare per il bot: Attacco
     * scoperto, Difesa coperta (Set), o Difesa scoperta. Torna
     * { position: 'attack'|'defense', faceDown: bool }.
     *
     * Priorità (per richiesta esplicita dell'utente):
     *   1) Se il campo avversario ha già un mostro SCOPERTO la cui
     *      statistica rilevante (ATK se in Attacco, DEF se in Difesa) è
     *      INFERIORE all'ATK di questo mostro: mettilo comunque in
     *      Attacco scoperto — c'è un bersaglio favorevole da colpire in
     *      Battle Phase (vedi chooseAttackTarget in ai-medium.js/
     *      ai-hard.js, che lo raccoglierà da solo), non ha senso
     *      sprecare quell'ATK dietro uno scudo di Difesa.
     *   2) Altrimenti, se il mostro più forte scoperto dell'avversario
     *      lo distruggerebbe COMUNQUE (il suo ATK supera sia l'ATK sia
     *      la DEF di questo mostro): meglio la Difesa, anche se l'ATK di
     *      questo mostro è più alto della sua stessa DEF — morire in
     *      Attacco costa anche i Life Points della differenza, morire in
     *      Difesa no. Non evita la perdita del mostro (che comunque non
     *      si può prevedere del tutto), solo la perdita aggiuntiva di LP
     *      di una battaglia già persa in partenza.
     *   3) Altrimenti, se la DEF supera l'ATK (statisticamente un
     *      mostro "da Difesa"): Difesa COPERTA (Set) se ha 4 Stelle o
     *      meno (nessun costo aggiuntivo per nasconderlo), Difesa
     *      SCOPERTA se ne ha 5 o più (tipicamente arrivato tramite
     *      un'Evocazione Tributo: già "costoso" e visibile, coprirlo non
     *      aggiunge molto).
     *   4) Altrimenti (mostro da Attacco): Attacco scoperto.
     */
    function decideMonsterPosture(card, gameState, owner) {
        if (!card) return { position: 'attack', faceDown: false };
        const atk = card.attack || 0;
        const def = card.defense || 0;
        const opponentField = owner === 'player' ? gameState.botMonsterField : gameState.playerMonsterField;
        const hasFavorableTarget = (opponentField || []).some((slot) => {
            if (!slot || slot.isFaceDown) return false;
            const theirStat = slot.position === 'attack' ? (slot.card.attack || 0) : (slot.card.defense || 0);
            return theirStat < atk;
        });
        if (hasFavorableTarget) return { position: 'attack', faceDown: false };
        const strongestOpposingAtk = (opponentField || []).reduce((max, slot) => {
            if (!slot || slot.isFaceDown || slot.position !== 'attack') return max;
            return Math.max(max, slot.card.attack || 0);
        }, 0);
        const doomedEitherWay = strongestOpposingAtk > atk && strongestOpposingAtk > def;
        if (def > atk || doomedEitherWay) {
            const level = card.level || 0;
            return { position: 'defense', faceDown: level <= 4 };
        }
        return { position: 'attack', faceDown: false };
    }

    // Parole chiave che segnalano un effetto di RIMOZIONE mirata (distrugge/
    // bandisce/ruba UN mostro) — vedi isSingleTargetRemoval più sotto. "tutti
    // i mostri"/"ogni mostro" fa eccezione: un effetto di massa non va mai
    // trattenuto in attesa di un bersaglio "che valga abbastanza", colpisce
    // comunque tutto ciò che c'è.
    const REMOVAL_KEYWORD = /distrugg|bandisc|prende il controllo|controllo del/i;
    const MASS_EFFECT_KEYWORD = /tutti i mostri|ogni mostro|tutte le carte/i;

    /** Vero se `card` è una Magia/Trappola che rimuove UN mostro bersaglio (non un effetto di massa) — usata per decidere se vale la pena trattenerla per un bersaglio migliore invece di sprecarla subito. */
    function isSingleTargetRemoval(card) {
        if (!card || card.type === 'monster') return false;
        const text = card.effect || '';
        return REMOVAL_KEYWORD.test(text) && !MASS_EFFECT_KEYWORD.test(text);
    }

    /**
     * Vero se attivare/Settare ORA `card` (una rimozione a bersaglio
     * singolo) vale la pena, guardando la statistica migliore tra i
     * mostri SCOPERTI dell'avversario — se non è single-target-removal
     * (altra Magia/Trappola qualunque, o un mostro) torna sempre vero,
     * nessuna restrizione. Nata per correggere un difetto segnalato
     * dall'utente: il bot spendeva le proprie carte di rimozione sul
     * primo bersaglio disponibile fin dai primissimi turni, anche contro
     * un vanilla scarso — non "troppo" nel senso di troppe copie (il
     * dataset ne ha quante ne ha), ma nel senso di usarle senza alcun
     * discernimento sul VALORE del bersaglio. Un mostro coperto riceve
     * una stima prudente (1200, né "sempre sì" né "mai") perché il bot
     * non può sapere cosa nasconde ma non deve nemmeno ignorarlo del
     * tutto. `threshold` è deciso da chi chiama: IA_MEDIA usa un valore
     * fisso, IA_DIFFICILE lo scala in base a quanto sta andando bene la
     * partita (vedi AI_HARD.evaluateBoard) — più prudente da in vantaggio,
     * più disposta a "bruciare" pur di stabilizzarsi se in svantaggio.
     */
    function isRemovalWorthwhile(card, gameState, owner, threshold) {
        if (!isSingleTargetRemoval(card)) return true;
        const opponentField = owner === 'bot' ? gameState.playerMonsterField : gameState.botMonsterField;
        let bestStat = 0;
        let hasFaceDown = false;
        (opponentField || []).forEach((slot) => {
            if (!slot) return;
            if (slot.isFaceDown) { hasFaceDown = true; return; }
            const stat = slot.position === 'attack' ? (slot.card.attack || 0) : (slot.card.defense || 0);
            bestStat = Math.max(bestStat, stat);
        });
        if (hasFaceDown) bestStat = Math.max(bestStat, 1200);
        return bestStat >= threshold;
    }

    /**
     * Vero se `card` è normalmente Evocabile ORA da parte di `owner` —
     * SOLO per il vincolo "non può essere Evocata a meno che tu non
     * controlli scoperta [altra carta specifica]" (def.requiresFieldPresenceId,
     * vedi js/engine/card-effects.js — es. Guardiano Grarl id 284,
     * Guardiano Kay'est id 285), NON un controllo generico di legalità
     * (Tributi/slot liberi restano gestiti a parte da chi chiama). Usata
     * per filtrare i candidati del bot PRIMA di provare a Evocarli, così
     * l'IA non spreca un turno tentando un'Evocazione che verrebbe
     * comunque rifiutata da attemptMonsterSummon (actions.js).
     */
    function canNormalSummonNow(card, gameState, owner) {
        // Guardiano Falce del Terrore (id 282): "non puoi Evocare
        // Normalmente/Set altri mostri finché questa carta è in campo" —
        // stesso gameState.otherMonsterSummonsBlockedFor già consultato
        // lato giocatore in attemptMonsterSummon (actions.js) e da
        // ACTIONS.specialSummon (duel-engine.js).
        if (gameState.otherMonsterSummonsBlockedFor && gameState.otherMonsterSummonsBlockedFor[owner] && card.id !== 282) return false;
        const def = window.DuelEngine && DuelEngine.getDefinition(card.id);
        if (!def || !def.requiresFieldPresenceId) return true;
        // La carta richiesta può essere un mostro O una Magia/Trappola
        // (es. una Carta Equipaggiamento) — vedi lo stesso controllo su
        // entrambe le zone in attemptMonsterSummon, actions.js.
        const field = owner === 'player' ? gameState.playerMonsterField : gameState.botMonsterField;
        const stField = owner === 'player' ? gameState.playerSTField : gameState.botSTField;
        return field.some((s) => s && !s.isFaceDown && s.card.id === def.requiresFieldPresenceId)
            || stField.some((s) => s && !s.isFaceDown && s.card.id === def.requiresFieldPresenceId);
    }

    window.AI_SHARED = {
        scoreCardImpact: scoreCardImpact,
        decideMonsterPosture: decideMonsterPosture,
        canNormalSummonNow: canNormalSummonNow,
        isSingleTargetRemoval: isSingleTargetRemoval,
        isRemovalWorthwhile: isRemovalWorthwhile
    };
})();
