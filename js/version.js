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
 * beta.48 — Gli Starter e gli Structure Deck costano di più, e sempre di
 *   più a ogni acquisto dello stesso tipo — anche nelle Carte Locazione/
 *   del Millennio richieste dal secondo in poi. Una vittoria al Regno dei
 *   Duellanti resta abbastanza per il primo Starter Deck. La regola
 *   scritta nel Negozio non riportava più il numero vero di carte
 *   speciali richieste: ora lo legge dal catalogo invece di ripeterlo a
 *   mano.
 *
 * beta.47 — Le Sfide sono una griglia di riquadri, non più un elenco a
 *   righe: icona con anello di progresso, nome e conteggio, e al tocco
 *   un pannello con descrizione e ricompensa. Con una sessantina di
 *   Sfide la vecchia lista era alta undici-quindici schermate.
 *
 * beta.46 — La Storia dell'anime torna a seguire SOLO il percorso vero
 *   della prima serie: cinque aree, non più sette — Il Regno dei
 *   Duellanti (con dentro il prologo del Puzzle), Battle City Parte 1,
 *   Il Mondo Virtuale (Noah, i Big Five e Gozaburo), Battle City Parte 2
 *   e il viaggio nel passato per la battaglia finale. Il Risveglio dei
 *   Draghi e il Gran Premio KC restano fuori, e i loro otto duellanti
 *   sono usciti dal roster di Duello Libero.
 *
 * beta.45 — La storia dell'anime è una mappa di mappe: sette isole, una
 *   per arco della serie, e ognuna si apre sul proprio percorso. Con le
 *   tre parti che mancavano — il Mondo Virtuale, Il Risveglio dei Draghi
 *   e il Gran Premio KC — e i loro otto duellanti, da Noah a Dartz.
 *
 * beta.44 — L'apertura delle bustine è rifatta: una carta alla volta,
 *   grande al centro, con il mazzetto che cala e la fila in basso che si
 *   riempie — e non scorre più niente. L'acquisto di un mazzo mostra la
 *   scatola vera del mazzo che si apre. A fine duello sparisce la barra
 *   di scorrimento, e mentre gira un filmato di Evocazione il duello sta
 *   davvero fermo.
 *
 * beta.43 — Le carte si vedono muovere: quando vanno al Cimitero e
 *   quando ne risalgono, e quando un mostro rubato torna al suo
 *   proprietario. Le bustine si aprono davvero — la bustina si strappa e
 *   le carte si girano una alla volta, con un momento tutto suo per
 *   l'ultra rara — e comprare una carta o un mazzo non è più solo un
 *   numero che cambia. La schermata di fine duello, su telefono girato,
 *   passa a due colonne: si leggono cinque ricompense invece di due.
 *
 * beta.42 — Il salvataggio non aspetta più che tu esca: arriva sul cloud
 *   mentre giochi, e quando rientri vince sempre il più recente invece di
 *   chiedertelo mostrando una data sola. Dal Profilo si può ricominciare
 *   da capo, azzerando il progresso senza perdere l'account. L'orologio
 *   del Negozio funziona davvero (prima dava sempre errore), e un
 *   amministratore ha il portafoglio pieno per provare le cose.
 *
 * beta.41 — In Duello Libero i Duellanti si guadagnano: si parte con
 *   Yugi Muto e suo nonno Solomon, e gli altri si sbloccano battendoli
 *   per la prima volta in un Torneo o nella Modalità Storia.
 *
 * beta.40 — L'autowin nelle Storie non è più acceso per tutti: è un
 *   interruttore del Pannello Admin, spento di default. Un giocatore
 *   normale duella sul serio anche se la scorciatoia è ancora nel gioco.
 *
 * beta.39 — Il pulsante "Continua" a fine duello torna visibile: era
 *   coperto dalla sua stessa fascia sfumata. E quando le ricompense non
 *   ci stanno tutte, ora la schermata lo dice invece di sembrare finita.
 *
 * beta.38 — Gli ologrammi si leggono: il soggetto resta nitido al centro
 *   e si dissolve verso i bordi, invece di essere slavato allo stesso
 *   modo dappertutto.
 *
 * beta.37 — Le Sfide diventano quattro sezioni: le missioni di OGGI
 *   (tre, nuove ogni giorno), quelle della SETTIMANA (dieci), le Sfide di
 *   sempre e una sezione per ogni Storia. Le missioni ruotano con
 *   l'orario del server come le carte del Negozio, e il loro progresso
 *   scade col periodo. I mazzi chiedono ora anche più carte speciali man
 *   mano che se ne comprano, non più una sola per sempre.
 *
 * beta.36 — Nel Regno dei Duellanti il Castello di Pegasus ha la sua
 *   mappa: dal Cancello in poi il bosco lascia il posto alle sale. E le
 *   Stelle di quel torneo sono SUE — si parte sempre da zero, anche col
 *   portafoglio pieno, mentre ogni Stella vinta resta comunque al
 *   giocatore. Nel presente di Memorie Proibite si duella come Yugi Muto
 *   e non come Atem, torneo compreso. La schermata di fine duello si
 *   scorre da qualunque punto, col pulsante "Continua" appiccicato in
 *   fondo. I mazzi Starter e Structure costano di più e rincarano più in
 *   fretta.
 *
 * beta.35 — Il campo inclinato di beta.34 è stato tolto su richiesta.
 *   Restano tre cose nuove: con l'ologramma acceso il mostro scoperto
 *   lascia nella carta un PORTALE nero al posto dell'illustrazione, da
 *   cui la proiezione esce; su schermo largo o in orizzontale la pila
 *   della Catena si sposta a sinistra, a metà altezza, invece di stare in
 *   alto al centro; e una carta già sul Terreno si illumina per un secondo
 *   quando è lei ad attivarsi, così si vede QUALE delle cinque coperte si
 *   è appena scoperta. Le carte della Grande Guerra dicono anche lo
 *   schieramento nella riga del tipo: [Aviazione · Italiana].
 *
 * beta.34 — Due scelte nuove in Impostazioni. "Campo inclinato" fa
 *   vedere il Terreno in prospettiva, come seduti a un vero tavolo da
 *   duello, invece che dall'alto — spenta di default, perche' cambia come
 *   si legge tutto il campo. E la proiezione sopra i mostri si vede
 *   finalmente anche su un monitor: c'era gia', ma era misurata sulla
 *   carta, e su desktop la carta e' piccola rispetto allo schermo.
 *
 * beta.33 — Anche gli ultimi tredici personaggi di Memorie Proibite
 *   hanno la loro faccia: i cinque Maghi delle terre, i cinque Alti
 *   Maghi, il Mago del Labirinto, Sebek e Neku, coi ritratti del gioco
 *   originale al posto del monogramma. Da qui nessun duellante della
 *   Storia è più un cerchio vuoto.
 *
 * beta.32 — Il torneo di Memorie Proibite è quello del gioco PS1: quattro
 *   preliminari (Rex, Weevil, Mai, Bandit Keith) e cinque finali, dove
 *   ognuno porta un Oggetto del Millennio — Shadi la Chiave, Yami Bakura
 *   l'Anello, Pegasus l'Occhio, Isis la Collana, Kaiba lo Scettro — e
 *   dopo Kaiba c'è una scena che dice cos'era davvero quella notte.
 *   E nelle scene il protagonista ha finalmente la sua faccia e il suo
 *   nome, invece di un cerchio vuoto col sigillo.
 *
 * beta.31 — Le tappe di sola storia hanno il respiro di una scena:
 *   tutte e trentatré, in tutte e quattro le campagne, passano da due o
 *   tre battute a quattro o cinque. Non riempitivo — quello che prima
 *   restava fuori: perché Simon chiude il principe nel Puzzle proprio
 *   così, cosa Kaiba stia davvero cercando a Domino, quante divisioni
 *   Conrad abbia tolto al fronte russo per la Strafexpedition.
 *   Sull'elenco delle storie non restano più appesi in fondo i pulsanti
 *   della mappa, e sulla Grande Guerra dodici tappe si spostano dove
 *   stanno davvero: la Bainsizza sull'altopiano e non in pianura, il
 *   Montello sul Montello, Gorizia a Gorizia, la Valsugana in Valsugana.
 *   E il torneo di Kaiba, in Memorie Proibite, si può rifare: il nodo
 *   resta aperto anche dopo averlo vinto, il tabellone riparte dal primo
 *   incontro e rivincerlo non fa avanzare la storia una seconda volta.
 *   In una campagna non si duella più come sé stessi: sei Yami Yugi nel
 *   Regno delle Ombre, Atem in Memorie Proibite, Giacobbo in Freedom, e
 *   nella Grande Guerra non sei nessuno in particolare — sei il Regio
 *   Esercito, con la bandiera al posto della faccia. I sei comandanti
 *   austro-ungarici hanno la loro fotografia d'epoca al posto del
 *   monogramma. E la schermata di fine duello regge anche con dieci
 *   ricompense: l'elenco scorre, il pulsante "Continua" non esce più
 *   dallo schermo.
 *
 * beta.30 — La Grande Guerra ha la sua mappa disegnata del fronte
 *   italiano, e le tappe sono posate sui luoghi veri: l'Isonzo
 *   sull'Isonzo, la Strafexpedition sugli Altipiani, Caporetto a
 *   Caporetto, il Solstizio lungo il Piave, l'ultima offensiva dal
 *   Grappa a Trieste. Sei capitoli nell'ordine in cui le cose
 *   successero davvero — Gorizia e la Bainsizza non sono più una nota a
 *   margine — e prima di ogni duello si parla con chi si ha davanti.
 *   Sotto suona "Alba sul Montello", e nei duelli "La carica del Piave".
 *
 * beta.29 — Memorie Proibite: nel presente c'è il TORNEO della Kaiba
 *   Corporation, una tappa che dentro ha il proprio tabellone su una
 *   mappa sua — cinque incontri fino a Kaiba, e chi perde ricomincia dal
 *   primo, come nel gioco originale. E prima di ognuno dei ventinove
 *   duelli della campagna si parla con l'avversario che si ha davanti.
 *
 * beta.28 — Le tappe di Memorie Proibite sono posate sui LUOGHI VERI
 *   della sua mappa: il palazzo dove c'è il palazzo, i cinque Maghi
 *   ognuno sulla propria terra (mare, montagne, bosco, deserto, prati),
 *   il labirinto sotto la città e gli ultimi due capitoli su per la
 *   fortezza oscura. Il percorso smette di essere una serpentina
 *   appoggiata sopra un disegno e diventa un viaggio dentro quel disegno.
 *
 * beta.27 — La campagna Freedom ha la sua mappa disegnata
 *   (images/maps/storia_freedom_1.jpeg): una mappa vera si stende intera
 *   sul mondo invece di essere piastrellata come le texture prese in
 *   prestito, e il mondo di quella campagna è stato riportato alle
 *   proporzioni dell'arte. Le altre quattro campagne aspettano la loro
 *   con il nome già pronto.
 *
 * beta.26 — Storia: finito un duello si resta nella campagna invece di
 *   essere rispediti all'elenco; le tappe già superate si possono
 *   rigiocare (senza far avanzare la storia, che si sblocca solo
 *   giocando la tappa nuova); "Ricomincia" chiede conferma dicendo
 *   quante tappe si perdono.
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
window.GAME_VERSION = '1.0.0-beta.48';
