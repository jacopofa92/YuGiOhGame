/**
 * ai-shared.js — Euristiche condivise tra i livelli di difficoltà
 * dell'IA (js/ai/ai-medium.js, js/ai/ai-hard.js). Vanno caricate PRIMA
 * di entrambi (vedi <script> in yugioh_game.html).
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
     * Vero se conviene Settare `card` coperta in Posizione di Difesa
     * invece di Evocarla scoperta in Attacco: la DEF supera l'ATK di
     * una soglia ragionevole, E il campo avversario ha già un mostro
     * scoperto che la distruggerebbe in Attacco (o il campo del bot è
     * ancora vuoto/debole, quindi non ha nulla da proteggere attaccando
     * subito). Pura euristica posizionale, non un vero calcolo di rischio.
     */
    function shouldSetFaceDown(card, gameState, owner) {
        if (!card) return false;
        const atk = card.attack || 0;
        const def = card.defense || 0;
        if (def <= atk) return false; // statisticamente un mostro da Attacco: nessun motivo di coprirlo
        const opponent = owner === 'player' ? 'bot' : 'player';
        const opponentField = owner === 'player' ? gameState.botMonsterField : gameState.playerMonsterField;
        const strongestOpponentAtk = (opponentField || []).reduce((max, slot) => {
            if (!slot || slot.isFaceDown) return max;
            return Math.max(max, slot.card.attack || 0);
        }, 0);
        // Un mostro da Difesa che verrebbe comunque distrutto in Attacco
        // dal più forte mostro avversario scoperto: meglio coprirlo.
        return strongestOpponentAtk > atk;
    }

    window.AI_SHARED = {
        scoreCardImpact: scoreCardImpact,
        shouldSetFaceDown: shouldSetFaceDown
    };
})();
