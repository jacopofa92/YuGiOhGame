/**
 * version.js — numero di versione del GIOCO (contenuto/motore), un solo
 * posto da aggiornare a mano ad ogni cambiamento significativo invece
 * di un numero enunciato solo nei messaggi di commit — così chi gioca
 * può vedere da dentro il gioco stesso quale versione sta usando
 * (mostrato in index.html, footer del menu principale). Identico sia
 * aperto da browser sia dentro l'APK Android — SEPARATO e indipendente
 * dal versionCode/versionName nativi del wrapper Android
 * (android/app/build.gradle, fuori da questo repository): quello
 * traccia le build APK installabili sul telefono, questo traccia lo
 * stato del codice del gioco stesso. Aggiornare i due insieme quando
 * una sessione tocca entrambi (il caso comune), ma restano concetti
 * distinti — una modifica solo ai file web non richiede un nuovo
 * versionCode Android, e viceversa una modifica nativa (icona,
 * permessi...) senza toccare il gioco non richiede un nuovo
 * GAME_VERSION.
 *
 * Schema: SemVer (major.minor.patch[-prerelease]) — "-beta.N" finché il
 * gioco resta sotto sviluppo attivo (il numero prima della release
 * 1.0.0 "vera"), incrementando N ad ogni sessione di lavoro con
 * cambiamenti visibili all'utente.
 *
 * ⚠️ QUESTA REGOLA NON È STATA SEGUITA: il numero è rimasto fermo a
 * beta.3 per 237 commit, cioè per quasi tutto lo sviluppo — Tornei,
 * Sfide, Negozio, Multiplayer, Modalità Storia e altro sono usciti
 * tutti sotto lo stesso numero. Chi guardava il footer del menu vedeva
 * sempre la stessa versione mentre il gioco cambiava sotto i piedi, che
 * è esattamente il problema che questo file doveva risolvere.
 *
 * Il salto a beta.20 è una stima onesta di quelle sessioni, non un
 * conteggio: i numeri intermedi non sono mai esistiti e fingere di
 * ricostruirli uno per uno sarebbe peggio che ammettere il buco. Da qui
 * in avanti si incrementa DAVVERO ad ogni sessione con cambiamenti
 * visibili, e l'elenco qui sotto tiene traccia di cosa c'è dentro.
 *
 * beta.20 — Modalità Storia (storia.html): 4 campagne giocabili (Il
 *   Regno delle Ombre, Memorie Proibite, Freedom, Grande Guerra) su
 *   mappa a nodi condivisa; carte ammesse per campagna con il nuovo
 *   campo `fazione` sul set WW1; Sfide da 14 a 66 con cinque modi nuovi
 *   di guadagnarle; Oggetti del Millennio come premio dei tornei; ogni
 *   torneo paga solo la propria valuta; niente più stiramento elastico
 *   a fine scroll su nessuna pagina.
 */
window.GAME_VERSION = '1.0.0-beta.20';
