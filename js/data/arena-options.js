/**
 * arena-options.js — Catalogo delle Arene (sfondi) e delle Colonne
 * Sonore selezionabili prima di un duello.
 * ---------------------------------------------------------------
 * Nasce per la Sala d'Attesa del Multiplayer, ma è deliberatamente
 * generico: le stesse due liste esistevano già scritte a mano, come
 * `<option>` HTML, in due punti distinti (la vista Duello Libero dentro
 * index.html e la pagina standalone duello-libero.html) — due copie
 * destinate a divergere, e aggiungerne una terza qui dentro sarebbe
 * stato il modo più rapido per ritrovarsi con tre elenchi diversi fra
 * loro.
 *
 * Quelle due pagine sono state migrate in una sessione successiva e ora
 * leggono da qui attraverso js/ui/duel-setup.js: aggiungere un'arena
 * (o una traccia) a questo file la fa comparire OVUNQUE la si possa
 * scegliere, senza toccare alcun HTML.
 *
 * Un dettaglio già sistemato passando di qui: nell'elenco esistente due
 * tracce diverse ("35. High Mages" e "37. Seto") portavano ENTRAMBE
 * l'etichetta "High Duel", quindi erano indistinguibili nel menu a
 * tendina.
 *
 * Le immagini esistono in due risoluzioni — `images/fields/` e
 * `images/fields/mobile/` — e l'arena sceglie da sé quale usare in base
 * al puntatore (vedi duelMonstersCore.html). Qui si conserva solo il
 * nome del file, mai il percorso: è l'unica cosa comune alle due.
 */
(function () {
    'use strict';

    const FIELDS = [
        { file: 'dirigibileKaiba.jpg', nome: 'Dirigibile di Kaiba' },
        { file: 'kaibaStadium_1.jpg', nome: 'Arena Kaiba' },
        { file: 'kaibaStadium_2.jpg', nome: 'Arena Kaiba — Notte' },
        { file: 'rovine_1.jpg', nome: 'Regno dei Duellanti' },
        { file: 'rovine_2.jpg', nome: 'Rovine dell\'Isola' },
        { file: 'castello_pegasus.jpg', nome: 'Castello di Pegasus' },
        { file: 'anticoEgittoGiorno_1.jpg', nome: 'Antico Egitto — Giorno' },
        { file: 'anticoEgittoGiorno_2.jpg', nome: 'Valle dei Re' },
        { file: 'anticoEgittoNotte_1.jpg', nome: 'Antico Egitto — Notte' },
        { file: 'anticoEgittoNotte_2.jpg', nome: 'Notte sul Nilo' },
        { file: 'anticoEgittoNotte_3.jpg', nome: 'Tempio Oscuro' },
        { file: 'anticoEgittoRovinePalazzo.jpg', nome: 'Palazzo in Rovina' }
    ];

    const TRACKS = [
        { file: '32. Seto Kaiba (Tournament Final) HD.mp3', nome: 'Seto Kaiba — Finale' },
        { file: '39. Free Duel.mp3', nome: 'Free Duel' },
        { file: '40. Free Duel (3D).mp3', nome: 'Free Duel (3D)' },
        { file: '42. Egyptian Duel (3D).mp3', nome: 'Duello Egizio' },
        { file: '31. Finals.mp3', nome: 'Finali' },
        { file: '34. Mages Duel.mp3', nome: 'Duello dei Maghi' },
        { file: '35. High Mages.mp3', nome: 'Alti Maghi' },
        { file: '37. Seto.mp3', nome: 'Seto' },
        { file: '43. Darknite-Nitemare (3D).mp3', nome: 'Darknite & Nitemare' },
        { file: 'mainTheme.mp3', nome: 'Battle for the Millennium' }
    ];

    /** Il valore con cui un'opzione dichiara "scegline una a caso al momento del duello". */
    const RANDOM = 'random';

    function pescaCasuale(lista) {
        return lista[Math.floor(Math.random() * lista.length)].file;
    }

    /**
     * Traduce una scelta (un nome di file, oppure RANDOM) nel file vero da
     * usare. Va risolta PRIMA di trasmetterla all'avversario: se ognuno
     * dei due risolvesse il proprio "casuale" per conto suo, si
     * ritroverebbero a duellare in due arene diverse con due musiche
     * diverse, ciascuno convinto di vedere la stessa cosa dell'altro.
     */
    function risolvi(scelta, lista) {
        if (!scelta || scelta === RANDOM) return pescaCasuale(lista);
        return lista.some((v) => v.file === scelta) ? scelta : pescaCasuale(lista);
    }

    window.ArenaOptions = {
        FIELDS: FIELDS,
        TRACKS: TRACKS,
        RANDOM: RANDOM,
        imageFor: (file) => `images/fields/${file}`,
        audioFor: (file) => `audio/soundtracks/${file}`,
        nomeCampo: (file) => (FIELDS.find((f) => f.file === file) || {}).nome || 'Arena',
        nomeTraccia: (file) => (TRACKS.find((t) => t.file === file) || {}).nome || 'Colonna sonora',
        risolviCampo: (scelta) => risolvi(scelta, FIELDS),
        risolviTraccia: (scelta) => risolvi(scelta, TRACKS)
    };
})();
