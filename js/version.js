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
 */
window.GAME_VERSION = '1.0.0-beta.3';
