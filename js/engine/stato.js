/**
 * stato.js — lo stato del duello (gameState) e le costanti di regola.
 * =====================================================================
 * Nucleo senza testa (piano di attacco, Priorità 2): qui sta solo ciò
 * che serve alle REGOLE, nessun riferimento all'interfaccia. Prima tutto
 * questo viveva in cima a game-flow.js, mescolato ai riferimenti al DOM
 * presi al caricamento (la freccia d'attacco, il pannello del log).
 *
 * Script classico, non un modulo: `let gameState` è visibile a ogni altro
 * script della pagina come prima (stesso scope globale degli script),
 * quindi chi lo legge non cambia. Va caricato PRIMA di fasi.js e
 * game-flow.js (vedi il gruppo "partita" in scripts/gruppi-script.js).
 *
 * Le dichiarazioni qui sotto sono state spostate parola per parola da
 * game-flow.js (tools/sposta-funzioni.js); la prova che nulla è cambiato
 * è l'impronta di tools/impronta-funzioni.js, uguale prima e dopo.
 */

let gameState = {};

let phaseTransitionTimeout = null;

let pendingEffectDrawScheduled = false;

// I 5 pezzi di Exodia il Proibito (vedi js/data/cards-db.js, id 11 e 41-44):
// chi li ha tutti e 5 in mano vince il duello all'istante, a prescindere
// dai Life Points — regola storica della prima serie.
const EXODIA_PIECE_IDS = [11, 41, 42, 43, 44];

// Destiny Board (id 866) + le 4 carte Spirit Message "I"/"N"/"A"/"L" (id
// 867-870, vedi js/engine/card-effects.js): chi le ha tutte e 5 scoperte
// sulla propria zona Magia/Trappola contemporaneamente vince il duello
// all'istante — testo ufficiale di Destiny Board, verificato su
// db.yugioh-card.com. Stesso identico schema di EXODIA_PIECE_IDS/
// hasExodiaAssembled qui sopra, solo sulla zona Magia/Trappola invece
// che sulla mano.
const DESTINY_BOARD_CARD_IDS = [866, 867, 868, 869, 870];

const phaseOrder = ['draw', 'standby', 'main1', 'battle', 'main2', 'end'];
