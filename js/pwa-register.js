/**
 * pwa-register.js — Registra sw.js (vedi il commento lì per la strategia
 * di cache) su ogni pagina che lo include. Percorso RELATIVO ('sw.js',
 * mai '/sw.js'): GitHub Pages serve questo progetto sotto un
 * sottopercorso (https://<utente>.github.io/<repo>/), non alla radice
 * del dominio.
 *
 * Il registro fallisce in silenzio ovunque i Service Worker non siano
 * supportati (es. browser molto vecchi) o la pagina sia aperta come file
 * locale (file://, dove i Service Worker non funzionano affatto) — niente
 * di grave, il gioco resta comunque giocabile online, solo senza cache
 * offline.
 */
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(() => { /* noop: vedi commento sopra */ });
    });
}
