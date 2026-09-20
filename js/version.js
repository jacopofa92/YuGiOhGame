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
 * beta.25 — Rimpicciolendo, la mappa della Storia non mostra mai zone
 *   vuote: lo zoom si ferma dove smetterebbe di riempire lo schermo, e
 *   si rialza da solo ruotando il telefono. In orizzontale anche le
 *   informazioni sulla campagna si possono chiudere (lì manca l'altezza,
 *   non la larghezza).
 *
 * beta.24 — La mappa della Storia si ingrandisce e si rimpicciolisce
 *   (pulsanti, Ctrl+rotellina, pizzico a due dita) e si prende tutta
 *   l'altezza dello schermo; su telefono le informazioni sulla campagna
 *   partono chiuse dietro una riga di riassunto, e la scelta si ricorda.
 *   Con l'autowin di prova la morra cinese non compare più.
 *
 * beta.23 — Modalità Storia molto più viva: le scene sono intermezzi a
 *   dialoghi (luogo sullo sfondo, ritratto di chi parla, testo che si
 *   scrive una battuta alla volta, polvere dorata con i Dettagli video su
 *   "Alti"), un cartello annuncia ogni capitolo nuovo, la mappa anima il
 *   tratto verso la tappa viva e ci si posa sopra invece di saltarci, e
 *   una scena già vista si può rileggere. Più diciannove ritratti
 *   PROVVISORI per i personaggi che non ne avevano ancora uno.
 *   ⚠️ In questa versione i duelli della Storia si vincono da soli
 *   (autowin di prova, richiesto per collaudarla): vedi
 *   js/dev/test-shortcuts.js.
 *
 * beta.22 — I menu non scorrono più di lato (era la stella del logo, che
 *   pulsando si allargava oltre il bordo dello schermo); Modalità Storia:
 *   ogni capitolo dice di cosa parla, e il capitolo dei Cinque Maghi
 *   Guerrieri non è più dieci duelli di fila senza una parola in mezzo —
 *   cinque terre, ognuna aperta dalla voce del mago che la custodisce.
 *
 * beta.21 — Lo stiramento elastico a fine scorrimento se ne va davvero
 *   anche dentro l'APK (serviva una modifica NATIVA, la CSS da sola non
 *   poteva bastare — vedi MainActivity.java nel progetto Android); la
 *   campagna Grande Guerra si presenta raccontando il fronte italiano
 *   invece del set di carte.
 *
 * beta.20 — Modalità Storia (storia.html): 4 campagne giocabili (Il
 *   Regno delle Ombre, Memorie Proibite, Freedom, Grande Guerra) su
 *   mappa a nodi condivisa; carte ammesse per campagna con il nuovo
 *   campo `fazione` sul set WW1; Sfide da 14 a 66 con cinque modi nuovi
 *   di guadagnarle; Oggetti del Millennio come premio dei tornei; ogni
 *   torneo paga solo la propria valuta; niente più stiramento elastico
 *   a fine scroll su nessuna pagina.
 */
window.GAME_VERSION = '1.0.0-beta.25';
