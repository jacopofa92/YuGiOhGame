/**
 * version.js â€” numero di versione del GIOCO (contenuto/motore), un solo
 * posto da aggiornare a mano ad ogni cambiamento significativo invece
 * di un numero enunciato solo nei messaggi di commit â€” cosÃ¬ chi gioca
 * puÃ² vedere da dentro il gioco stesso quale versione sta usando
 * (mostrato in index.html, footer del menu principale). Identico sia
 * aperto da browser sia dentro l'APK Android â€” SEPARATO e indipendente
 * dal versionCode/versionName nativi del wrapper Android
 * (android/app/build.gradle, fuori da questo repository): quello
 * traccia le build APK installabili sul telefono, questo traccia lo
 * stato del codice del gioco stesso. Aggiornare i due insieme quando
 * una sessione tocca entrambi (il caso comune), ma restano concetti
 * distinti â€” una modifica solo ai file web non richiede un nuovo
 * versionCode Android, e viceversa una modifica nativa (icona,
 * permessi...) senza toccare il gioco non richiede un nuovo
 * GAME_VERSION.
 *
 * Schema: SemVer (major.minor.patch). Dalla release stabile 1.0.0 non si
 * usa piÃ¹ il suffisso beta: le correzioni incrementano la patch, le nuove
 * funzionalitÃ  compatibili la minor e le rotture incompatibili la major.
 *
 * âš ï¸ QUESTA REGOLA NON Ãˆ STATA SEGUITA: il numero Ã¨ rimasto fermo a
 * beta.3 per 237 commit, cioÃ¨ per quasi tutto lo sviluppo â€” Tornei,
 * Sfide, Negozio, Multiplayer, ModalitÃ  Storia e altro sono usciti
 * tutti sotto lo stesso numero. Chi guardava il footer del menu vedeva
 * sempre la stessa versione mentre il gioco cambiava sotto i piedi, che
 * Ã¨ esattamente il problema che questo file doveva risolvere.
 *
 * Il salto a beta.20 Ã¨ una stima onesta di quelle sessioni, non un
 * conteggio: i numeri intermedi non sono mai esistiti e fingere di
 * ricostruirli uno per uno sarebbe peggio che ammettere il buco. Da qui
 * in avanti si incrementa DAVVERO ad ogni sessione con cambiamenti
 * visibili, e l'elenco qui sotto tiene traccia di cosa c'Ã¨ dentro.
 *
 * 1.0.7 â€” Mappa di Battle City: le caselle sono pedine 3D al posto delle
 *   emoji, e le destinazioni raggiungibili sono evidenti â€” accese, con un
 *   percorso e una freccia dal segnalino, uniche ad avere l'etichetta;
 *   tutte le altre restano visibili ma attenuate.
 *
 * 1.0.6 â€” Nuova cinematica per ogni Evocazione Rituale, con materiali e
 *   sigillo in prospettiva prima della comparsa del mostro; Tornado di
 *   Polvere e Piumino delle Arpie hanno effetti di vento dedicati e
 *   sincronizzano la distruzione con l'impatto visivo.
 *
 * 1.0.5 â€” Uscendo da un duello concluso, la pagina della partita viene
 *   rimossa dalla cronologia: Indietro del browser o dell'app Android non
 *   puo' piu' riaprire il duello precedente.
 *
 * 1.0.4 â€” Lo Structure Deck Invincible Fortress ha una regressione
 *   completa su Exxod e Drago Megaroccia; le statistiche variabili non
 *   mostrano piu' il valore sentinella -1/-1, ma ?/? finche' il loro
 *   effetto non le determina.
 *
 * 1.0.3 â€” La cache PWA/WebView viene rinnovata insieme alla versione del
 *   gioco, cosÃ¬ anche l'APK carica subito il revamp di Battle City e i
 *   relativi asset invece di conservare copie precedenti.
 *
 * 1.0.2 â€” Battle City si apre con un prologo dialogato sulla mappa della
 *   cittÃ  e la fase urbana occupa tutto lo schermo sul fondale citta.jpg;
 *   la navigazione Ã¨ un overlay leggero di segnali, non un pannello a griglia.
 *
 * 1.0.1 â€” L'autowin amministratore vale anche per tutti e tre i Tornei,
 *   mantenendo obbligatori sia l'interruttore locale sia i permessi admin;
 *   un torneo in corso si puÃ² inoltre abbandonare giÃ  dalla selezione.
 *   Nel Regno dei Duellanti bonus, malus e puntate aggiornano davvero il
 *   contatore della scalata, mostrato correttamente anche nella selezione;
 *   entrando nel Castello il sentiero dell'isola sparisce e gli sfidanti
 *   compaiono uno alla volta; quelli giÃ  battuti nel Castello restano sul
 *   tappeto rosso mentre il successivo appare piÃ¹ avanti. Una nuova
 *   scalata si apre con un prologo dialogato prima di mostrare la mappa.
 *
 * 1.0.0 â€” Prima release stabile. Le impostazioni grafiche, ologrammi,
 *   vibrazione, volume e mute di musica/SFX fanno parte del salvataggio:
 *   viaggiano con export/import e cloud, conservando le vecchie scelte.
 *
 * beta.80 â€” Configurazione del Duello Libero ripensata per arena, musica
 *   e difficoltÃ , piÃ¹ una morra cinese scenica e responsive anche sui
 *   telefoni in verticale e orizzontale.
 *
 * beta.79 â€” Catena piÃ¹ grande su desktop e targhette di nome/proprietario
 *   su un piano separato, non piÃ¹ coperte dalle carte in risoluzione.
 *
 * beta.78 â€” Nei duelli della Grande Guerra gli effetti sonori cercano
 *   prima la variante in audio/standard/ww1 e usano lo standard soltanto
 *   quando quella variante non esiste.
 *
 * beta.77 â€” Catena senza box e senza carte troncate, distruzione olografica
 *   per Magie/Trappole/Terreno e video di evocazione con prioritÃ  assoluta
 *   che sospendono il duello fino alla loro conclusione.
 *
 * beta.76 â€” I Duellanti parlano durante il duello con battute brevi legate
 *   a personalitÃ  e contesto; le evocazioni iconiche hanno frasi sempre
 *   presenti e i balloon compaiono accanto ai rispettivi avatar.
 *
 * beta.75 â€” Cinematiche di fusione e distruzione, audio delle evocazioni,
 *   ambienti di duello piÃ¹ vivi, stepper delle fasi e box delle Catene
 *   rinnovati, dialoghi della Storia piÃ¹ coinvolgenti e sbustamento del
 *   Negozio piÃ¹ leggibile e responsive.
 *
 * beta.74 â€” Un nodo della Storia senza campo/musica propri eredita
 *   quelli del suo CAPITOLO (stesse chiavi `field`/`music`), non solo
 *   quelli dell'intera campagna â€” utile per un capitolo che Ã¨ un'intera
 *   area/macromappa: basta dichiararli una volta sola lÃ¬.
 *
 * beta.73 â€” Nuovo campo "Industria KaibaCorp" nel catalogo Arene.
 *
 * beta.72 â€” Ritratti veri per Noah Kaiba, Gozaburo Kaiba e i Big Five
 *   (Gansley, Johnson, Nesbitt, Crump, Lector): non c'era piÃ¹ bisogno
 *   del sigillo dorato di ripiego con l'icona del personaggio.
 *
 * beta.71 â€” I due comandanti della Grande Guerra hanno ora un vero
 *   ritratto storico (di pubblico dominio, Wikimedia Commons) al posto
 *   del monogramma segnaposto.
 *
 * beta.70 â€” L'Editor Mappa (amministratore) puÃ² ora impostare il campo di
 *   battaglia e la musica di un duello/scena della Storia direttamente
 *   sul nodo, e "ðŸ“‚ Collega file" li scrive anche sul vero
 *   story-campaigns.js, non solo nella scheda aperta.
 *
 * beta.69 â€” Nella Grande Guerra giochi nei panni di chi comandava davvero:
 *   Luigi Cadorna dall'Isonzo a Caporetto, Armando Diaz dal Piave alla
 *   vittoria. Tolti cinque campi di battaglia (Dirigibile di Kaiba,
 *   Dirigibile KaibaCorp II, Arena Kaiba 1 e 2, Castello di Pegasus).
 *
 * beta.68 â€” Battle City si comincia con 1 Carta Locazione. Nuove Sfide
 *   delle Storie: completa ogni storia a Normale, a Difficile e a tutti e
 *   tre i livelli â€” e le Sfide delle Storie avanzano davvero (prima la
 *   pagina della Storia non le registrava). Controllate tutte le 51
 *   Carte Equipaggiamento: tre Magie che scartano una carta (Flamberge
 *   del Male Infranto, Tributo ai Dannati, Vortice Fulmineo) non si
 *   possono piÃ¹ attivare con in mano solo se stesse, dove si sprecavano.
 *
 * beta.67 â€” Il menu della Storia rinnovato: ogni campagna con la sua
 *   mappa, il protagonista, l'avanzamento per livello e un "Inizia" /
 *   "Continua". Le tappe della Storia usano finalmente il loro campo di
 *   battaglia (la Grande Guerra di giorno e di notte, ma anche le altre:
 *   prima restava sempre quello di default). Nel Profilo, al posto del
 *   record del Duello Libero, le tue statistiche.
 *
 * beta.66 â€” Barra in alto rinnovata: medaglione d'oro per tornare
 *   indietro, l'icona della pagina in un rombo (prima non si vedeva
 *   affatto), titolo nello stesso stile del logo, filo d'oro con un
 *   rombo al centro e un'ombra che si stacca quando scorri. I mazzi del
 *   Negozio chiedono piÃ¹ Stelle e piÃ¹ Carte Locazione / del Millennio.
 *
 * beta.65 â€” Le Sfide aperte dal menu mostrano finalmente le missioni di
 *   Oggi e della Settimana e la sezione Storie (erano rimaste alla
 *   versione vecchia), ed entrare nel Profilo non chiede piÃ¹ quale
 *   salvataggio tenere: se ne occupa l'accesso, tenendo il piÃ¹ recente.
 *
 * beta.64 â€” Logo nuovo: il Puzzle del Millennio d'oro con l'Occhio di
 *   Wedjat dentro due anelli di geroglifici, e la scritta DUEL ARENA con
 *   un riflesso di luce. All'apertura si compone davanti a chi guarda â€”
 *   gli anelli si tracciano, la piramide si riempie, l'Occhio si apre in
 *   un lampo e i raggi si accendono â€” e lo stesso logo Ã¨ ora nel menu.
 *
 * beta.63 â€” La Storia si gioca a tre livelli: Facile all'inizio, poi
 *   Normale e Difficile una volta finita (con un premio finale piÃ¹ ricco);
 *   la Grande Guerra resta com'Ã¨. Nel Mondo dei Ricordi il Faraone
 *   affronta finalmente Bakura â€” il Re dei Ladri, il sacrificio di Mahad,
 *   il Gioco delle Ombre â€” e il Duello Cerimoniale lo gioca Yugi.
 *
 * beta.62 â€” Mappe della Storia al loro posto anche sui monitor grandi,
 *   scene di un'area sul disegno della loro mappa (Croquet parla negli
 *   interni del castello), rileggere una scena non salta piÃ¹ le tappe,
 *   ologrammi su desktop piÃ¹ piccoli e ancorati alla propria carta, e
 *   niente piÃ¹ riquadro scuro dietro "Continua" a fine duello.
 *
 * beta.61 â€” Il Castello di Pegasus Ã¨ la seconda mappa del Regno dei
 *   Duellanti, non piÃ¹ un'isola a parte: battuto Kaiba sulla scalinata si
 *   varca il portone e si passa agli interni, con un cartello d'arrivo e
 *   un passaggio per tornare sull'isola quando si vuole.
 *
 * beta.60 â€” Battuto Kaiba al cancello, si entra nel Castello di Pegasus:
 *   un'area nuova con la mappa degli interni, la semifinale con Mai
 *   nell'arena e Pegasus nella sala del trono. Battle City (prima e
 *   seconda parte) e il Mondo Virtuale hanno i duelli sui luoghi veri
 *   delle loro mappe.
 *
 * beta.59 â€” La Storia di Yugi comincia dove deve: un prologo a Domino
 *   City con la sua mappa (il negozio del nonno, la scuola, e il primo
 *   duello contro Kaiba in cima alla KaibaCorp), una mappa grande a sei
 *   isole, il Regno dei Duellanti con i duelli sulle arene vere dell'isola,
 *   Freedom su una nuova mappa della valle del Nilo, e le battaglie
 *   notturne della Grande Guerra su un campo di notte. I progressi giÃ 
 *   fatti restano dove sono.
 *
 * beta.58 â€” 25 arene nuove fra cui scegliere (Regno dei Duellanti,
 *   Castello di Pegasus, Stadio Kaiba, Dirigibile, Torre dei Duelli,
 *   Mondo Virtuale, l'Antico Egitto e altre), i duelli della Grande Guerra
 *   su un vero campo di battaglia, e le cinque aree della Storia con la
 *   loro mappa disegnata.
 *
 * beta.57 â€” I mazzi dei Duellanti rifatti da capo, tre per personaggio e
 *   scritti a mano: fedeli al mazzo vero dell'anime o del gioco (Joey
 *   senza le carte di Yugi, Kaiba con i cannoni X/Y/Z da Normale in su,
 *   Noah con i Mostri Spirito, i Maghi di Forbidden Memories con il mazzo
 *   del loro terreno), e un Facile davvero facile: mostri deboli in
 *   prevalenza, pochi mostri da Tributo, al massimo una carta che
 *   distrugge mostri, Spada Rivelatrice e carte difensive. I mazzi della
 *   Grande Guerra restano com'erano. Sviluppato su branch.
 *
 * beta.56 â€” Nel Negozio, una carta della rotazione giornaliera sparisce
 *   dalla vetrina appena la compri (prima si poteva ricomprare piÃ¹ volte
 *   nello stesso giorno, finchÃ© bastavano i crediti) â€” torna in vendita
 *   solo con la rotazione nuova, a mezzanotte. Il numero di copie
 *   possedute era giÃ  mostrato per ogni carta, verificato dal vivo.
 *
 * beta.55 â€” Il mazzo Facile Ã¨ DAVVERO piÃ¹ debole ora: la versione
 *   precedente rispettava ogni regola scritta ma si fermava a un tetto
 *   fisso di scambi, lasciando i mostri deboli una minoranza marginale in
 *   mazzi come quello di Kaiba (quasi tutti Draghi forti) â€” segnalato
 *   dall'utente rileggendo il risultato vero. Ora il mazzo continua a
 *   indebolirsi finchÃ© i mostri deboli non sono davvero la maggioranza, e
 *   quando il pool del personaggio non basta pesca un mostro debole A
 *   TEMA (stessa razza/attributo prevalenti, stessa provenienza) dall'
 *   intero database delle carte invece di ripiegare subito su un
 *   riempitivo generico. Sviluppato su branch, non ancora sul gioco
 *   pubblicato.
 *
 * beta.54 â€” Creazione Deck mostra anche il mazzo Facile di ogni
 *   Duellante (prima solo Normale/Difficile) â€” consultabile come gli
 *   altri due, mai clonabile in blocco.
 *
 * beta.53 â€” Nuovo livello "Facile" in Duello Libero e nei Tornei: stessa
 *   IA di Normale, ma con un mazzo avversario molto piÃ¹ debole (mostri
 *   deboli prevalenti, niente ATK 1800/1900, Nega Attacco al posto di
 *   Forza dello Specchio) â€” richiesto perchÃ© i mazzi base restavano
 *   troppo forti per chi inizia a giocare. Normale riceve anche lui un
 *   piccolo assaggio in piÃ¹ (Spada Rivelatrice). Sviluppato su branch,
 *   non ancora sul gioco pubblicato.
 *
 * beta.52 â€” Il bot non Evoca piÃ¹ un mostro per poi distruggerselo da
 *   solo con Buco Nero: gli effetti "distruggi tutti i mostri" che
 *   colpiscono anche il proprio Terreno (a differenza di Raigeki) ora
 *   pesano il costo, e quando conviene davvero partono PRIMA
 *   dell'Evocazione del turno, non dopo.
 *
 * beta.51 â€” Fra due salvataggi non si chiede piÃ¹ MAI quale tenere:
 *   decide sempre la data, in ogni caso (anche a un minuto di distanza,
 *   anche con una data illeggibile). Il Profilo aveva una copia tutta
 *   sua di questo controllo, mai collegata alla regola vera: chiedeva
 *   sempre, a ogni salvataggio cloud trovato â€” ora usa la stessa regola
 *   del gate.
 *
 * beta.50 â€” Editor Mappa nella Storia: un amministratore puÃ² ora
 *   spostare, modificare, cancellare e creare i nodi di una campagna
 *   direttamente sullo schermo (trascinamento incluso), con un
 *   pulsante per esportare il codice pronto da incollare in
 *   story-campaigns.js. Spento di default, si accende dal Pannello
 *   Admin. Nessun salvataggio automatico sui contenuti: questo gioco
 *   non ha un backend per loro, solo per account e progressi.
 *
 * beta.49 â€” I 5 nodi della mappa grande della Storia dell'anime (Regno
 *   dei Duellanti, Battle City I/II, Mondo Virtuale, Mondo dei Ricordi)
 *   sono ora esattamente al centro dell'arena della propria isola â€” la
 *   mappa era stata rifatta con 5 isole nuove ma le coordinate dei nodi
 *   erano rimaste quelle del vecchio disegno a 7, e cadevano fra un'isola
 *   e l'altra invece che sopra.
 *
 * beta.48 â€” Gli Starter e gli Structure Deck costano di piÃ¹, e sempre di
 *   piÃ¹ a ogni acquisto dello stesso tipo â€” anche nelle Carte Locazione/
 *   del Millennio richieste dal secondo in poi. Una vittoria al Regno dei
 *   Duellanti resta abbastanza per il primo Starter Deck. La regola
 *   scritta nel Negozio non riportava piÃ¹ il numero vero di carte
 *   speciali richieste: ora lo legge dal catalogo invece di ripeterlo a
 *   mano.
 *
 * beta.47 â€” Le Sfide sono una griglia di riquadri, non piÃ¹ un elenco a
 *   righe: icona con anello di progresso, nome e conteggio, e al tocco
 *   un pannello con descrizione e ricompensa. Con una sessantina di
 *   Sfide la vecchia lista era alta undici-quindici schermate.
 *
 * beta.46 â€” La Storia dell'anime torna a seguire SOLO il percorso vero
 *   della prima serie: cinque aree, non piÃ¹ sette â€” Il Regno dei
 *   Duellanti (con dentro il prologo del Puzzle), Battle City Parte 1,
 *   Il Mondo Virtuale (Noah, i Big Five e Gozaburo), Battle City Parte 2
 *   e il viaggio nel passato per la battaglia finale. Il Risveglio dei
 *   Draghi e il Gran Premio KC restano fuori, e i loro otto duellanti
 *   sono usciti dal roster di Duello Libero.
 *
 * beta.45 â€” La storia dell'anime Ã¨ una mappa di mappe: sette isole, una
 *   per arco della serie, e ognuna si apre sul proprio percorso. Con le
 *   tre parti che mancavano â€” il Mondo Virtuale, Il Risveglio dei Draghi
 *   e il Gran Premio KC â€” e i loro otto duellanti, da Noah a Dartz.
 *
 * beta.44 â€” L'apertura delle bustine Ã¨ rifatta: una carta alla volta,
 *   grande al centro, con il mazzetto che cala e la fila in basso che si
 *   riempie â€” e non scorre piÃ¹ niente. L'acquisto di un mazzo mostra la
 *   scatola vera del mazzo che si apre. A fine duello sparisce la barra
 *   di scorrimento, e mentre gira un filmato di Evocazione il duello sta
 *   davvero fermo.
 *
 * beta.43 â€” Le carte si vedono muovere: quando vanno al Cimitero e
 *   quando ne risalgono, e quando un mostro rubato torna al suo
 *   proprietario. Le bustine si aprono davvero â€” la bustina si strappa e
 *   le carte si girano una alla volta, con un momento tutto suo per
 *   l'ultra rara â€” e comprare una carta o un mazzo non Ã¨ piÃ¹ solo un
 *   numero che cambia. La schermata di fine duello, su telefono girato,
 *   passa a due colonne: si leggono cinque ricompense invece di due.
 *
 * beta.42 â€” Il salvataggio non aspetta piÃ¹ che tu esca: arriva sul cloud
 *   mentre giochi, e quando rientri vince sempre il piÃ¹ recente invece di
 *   chiedertelo mostrando una data sola. Dal Profilo si puÃ² ricominciare
 *   da capo, azzerando il progresso senza perdere l'account. L'orologio
 *   del Negozio funziona davvero (prima dava sempre errore), e un
 *   amministratore ha il portafoglio pieno per provare le cose.
 *
 * beta.41 â€” In Duello Libero i Duellanti si guadagnano: si parte con
 *   Yugi Muto e suo nonno Solomon, e gli altri si sbloccano battendoli
 *   per la prima volta in un Torneo o nella ModalitÃ  Storia.
 *
 * beta.40 â€” L'autowin nelle Storie non Ã¨ piÃ¹ acceso per tutti: Ã¨ un
 *   interruttore del Pannello Admin, spento di default. Un giocatore
 *   normale duella sul serio anche se la scorciatoia Ã¨ ancora nel gioco.
 *
 * beta.39 â€” Il pulsante "Continua" a fine duello torna visibile: era
 *   coperto dalla sua stessa fascia sfumata. E quando le ricompense non
 *   ci stanno tutte, ora la schermata lo dice invece di sembrare finita.
 *
 * beta.38 â€” Gli ologrammi si leggono: il soggetto resta nitido al centro
 *   e si dissolve verso i bordi, invece di essere slavato allo stesso
 *   modo dappertutto.
 *
 * beta.37 â€” Le Sfide diventano quattro sezioni: le missioni di OGGI
 *   (tre, nuove ogni giorno), quelle della SETTIMANA (dieci), le Sfide di
 *   sempre e una sezione per ogni Storia. Le missioni ruotano con
 *   l'orario del server come le carte del Negozio, e il loro progresso
 *   scade col periodo. I mazzi chiedono ora anche piÃ¹ carte speciali man
 *   mano che se ne comprano, non piÃ¹ una sola per sempre.
 *
 * beta.36 â€” Nel Regno dei Duellanti il Castello di Pegasus ha la sua
 *   mappa: dal Cancello in poi il bosco lascia il posto alle sale. E le
 *   Stelle di quel torneo sono SUE â€” si parte sempre da zero, anche col
 *   portafoglio pieno, mentre ogni Stella vinta resta comunque al
 *   giocatore. Nel presente di Memorie Proibite si duella come Yugi Muto
 *   e non come Atem, torneo compreso. La schermata di fine duello si
 *   scorre da qualunque punto, col pulsante "Continua" appiccicato in
 *   fondo. I mazzi Starter e Structure costano di piÃ¹ e rincarano piÃ¹ in
 *   fretta.
 *
 * beta.35 â€” Il campo inclinato di beta.34 Ã¨ stato tolto su richiesta.
 *   Restano tre cose nuove: con l'ologramma acceso il mostro scoperto
 *   lascia nella carta un PORTALE nero al posto dell'illustrazione, da
 *   cui la proiezione esce; su schermo largo o in orizzontale la pila
 *   della Catena si sposta a sinistra, a metÃ  altezza, invece di stare in
 *   alto al centro; e una carta giÃ  sul Terreno si illumina per un secondo
 *   quando Ã¨ lei ad attivarsi, cosÃ¬ si vede QUALE delle cinque coperte si
 *   Ã¨ appena scoperta. Le carte della Grande Guerra dicono anche lo
 *   schieramento nella riga del tipo: [Aviazione Â· Italiana].
 *
 * beta.34 â€” Due scelte nuove in Impostazioni. "Campo inclinato" fa
 *   vedere il Terreno in prospettiva, come seduti a un vero tavolo da
 *   duello, invece che dall'alto â€” spenta di default, perche' cambia come
 *   si legge tutto il campo. E la proiezione sopra i mostri si vede
 *   finalmente anche su un monitor: c'era gia', ma era misurata sulla
 *   carta, e su desktop la carta e' piccola rispetto allo schermo.
 *
 * beta.33 â€” Anche gli ultimi tredici personaggi di Memorie Proibite
 *   hanno la loro faccia: i cinque Maghi delle terre, i cinque Alti
 *   Maghi, il Mago del Labirinto, Sebek e Neku, coi ritratti del gioco
 *   originale al posto del monogramma. Da qui nessun duellante della
 *   Storia Ã¨ piÃ¹ un cerchio vuoto.
 *
 * beta.32 â€” Il torneo di Memorie Proibite Ã¨ quello del gioco PS1: quattro
 *   preliminari (Rex, Weevil, Mai, Bandit Keith) e cinque finali, dove
 *   ognuno porta un Oggetto del Millennio â€” Shadi la Chiave, Yami Bakura
 *   l'Anello, Pegasus l'Occhio, Isis la Collana, Kaiba lo Scettro â€” e
 *   dopo Kaiba c'Ã¨ una scena che dice cos'era davvero quella notte.
 *   E nelle scene il protagonista ha finalmente la sua faccia e il suo
 *   nome, invece di un cerchio vuoto col sigillo.
 *
 * beta.31 â€” Le tappe di sola storia hanno il respiro di una scena:
 *   tutte e trentatrÃ©, in tutte e quattro le campagne, passano da due o
 *   tre battute a quattro o cinque. Non riempitivo â€” quello che prima
 *   restava fuori: perchÃ© Simon chiude il principe nel Puzzle proprio
 *   cosÃ¬, cosa Kaiba stia davvero cercando a Domino, quante divisioni
 *   Conrad abbia tolto al fronte russo per la Strafexpedition.
 *   Sull'elenco delle storie non restano piÃ¹ appesi in fondo i pulsanti
 *   della mappa, e sulla Grande Guerra dodici tappe si spostano dove
 *   stanno davvero: la Bainsizza sull'altopiano e non in pianura, il
 *   Montello sul Montello, Gorizia a Gorizia, la Valsugana in Valsugana.
 *   E il torneo di Kaiba, in Memorie Proibite, si puÃ² rifare: il nodo
 *   resta aperto anche dopo averlo vinto, il tabellone riparte dal primo
 *   incontro e rivincerlo non fa avanzare la storia una seconda volta.
 *   In una campagna non si duella piÃ¹ come sÃ© stessi: sei Yami Yugi nel
 *   Regno delle Ombre, Atem in Memorie Proibite, Giacobbo in Freedom, e
 *   nella Grande Guerra non sei nessuno in particolare â€” sei il Regio
 *   Esercito, con la bandiera al posto della faccia. I sei comandanti
 *   austro-ungarici hanno la loro fotografia d'epoca al posto del
 *   monogramma. E la schermata di fine duello regge anche con dieci
 *   ricompense: l'elenco scorre, il pulsante "Continua" non esce piÃ¹
 *   dallo schermo.
 *
 * beta.30 â€” La Grande Guerra ha la sua mappa disegnata del fronte
 *   italiano, e le tappe sono posate sui luoghi veri: l'Isonzo
 *   sull'Isonzo, la Strafexpedition sugli Altipiani, Caporetto a
 *   Caporetto, il Solstizio lungo il Piave, l'ultima offensiva dal
 *   Grappa a Trieste. Sei capitoli nell'ordine in cui le cose
 *   successero davvero â€” Gorizia e la Bainsizza non sono piÃ¹ una nota a
 *   margine â€” e prima di ogni duello si parla con chi si ha davanti.
 *   Sotto suona "Alba sul Montello", e nei duelli "La carica del Piave".
 *
 * beta.29 â€” Memorie Proibite: nel presente c'Ã¨ il TORNEO della Kaiba
 *   Corporation, una tappa che dentro ha il proprio tabellone su una
 *   mappa sua â€” cinque incontri fino a Kaiba, e chi perde ricomincia dal
 *   primo, come nel gioco originale. E prima di ognuno dei ventinove
 *   duelli della campagna si parla con l'avversario che si ha davanti.
 *
 * beta.28 â€” Le tappe di Memorie Proibite sono posate sui LUOGHI VERI
 *   della sua mappa: il palazzo dove c'Ã¨ il palazzo, i cinque Maghi
 *   ognuno sulla propria terra (mare, montagne, bosco, deserto, prati),
 *   il labirinto sotto la cittÃ  e gli ultimi due capitoli su per la
 *   fortezza oscura. Il percorso smette di essere una serpentina
 *   appoggiata sopra un disegno e diventa un viaggio dentro quel disegno.
 *
 * beta.27 â€” La campagna Freedom ha la sua mappa disegnata
 *   (images/maps/storia_freedom_1.jpeg): una mappa vera si stende intera
 *   sul mondo invece di essere piastrellata come le texture prese in
 *   prestito, e il mondo di quella campagna Ã¨ stato riportato alle
 *   proporzioni dell'arte. Le altre quattro campagne aspettano la loro
 *   con il nome giÃ  pronto.
 *
 * beta.26 â€” Storia: finito un duello si resta nella campagna invece di
 *   essere rispediti all'elenco; le tappe giÃ  superate si possono
 *   rigiocare (senza far avanzare la storia, che si sblocca solo
 *   giocando la tappa nuova); "Ricomincia" chiede conferma dicendo
 *   quante tappe si perdono.
 *
 * beta.25 â€” Rimpicciolendo, la mappa della Storia non mostra mai zone
 *   vuote: lo zoom si ferma dove smetterebbe di riempire lo schermo, e
 *   si rialza da solo ruotando il telefono. In orizzontale anche le
 *   informazioni sulla campagna si possono chiudere (lÃ¬ manca l'altezza,
 *   non la larghezza).
 *
 * beta.24 â€” La mappa della Storia si ingrandisce e si rimpicciolisce
 *   (pulsanti, Ctrl+rotellina, pizzico a due dita) e si prende tutta
 *   l'altezza dello schermo; su telefono le informazioni sulla campagna
 *   partono chiuse dietro una riga di riassunto, e la scelta si ricorda.
 *   Con l'autowin di prova la morra cinese non compare piÃ¹.
 *
 * beta.23 â€” ModalitÃ  Storia molto piÃ¹ viva: le scene sono intermezzi a
 *   dialoghi (luogo sullo sfondo, ritratto di chi parla, testo che si
 *   scrive una battuta alla volta, polvere dorata con i Dettagli video su
 *   "Alti"), un cartello annuncia ogni capitolo nuovo, la mappa anima il
 *   tratto verso la tappa viva e ci si posa sopra invece di saltarci, e
 *   una scena giÃ  vista si puÃ² rileggere. PiÃ¹ diciannove ritratti
 *   PROVVISORI per i personaggi che non ne avevano ancora uno.
 *   âš ï¸ In questa versione i duelli della Storia si vincono da soli
 *   (autowin di prova, richiesto per collaudarla): vedi
 *   js/dev/test-shortcuts.js.
 *
 * beta.22 â€” I menu non scorrono piÃ¹ di lato (era la stella del logo, che
 *   pulsando si allargava oltre il bordo dello schermo); ModalitÃ  Storia:
 *   ogni capitolo dice di cosa parla, e il capitolo dei Cinque Maghi
 *   Guerrieri non Ã¨ piÃ¹ dieci duelli di fila senza una parola in mezzo â€”
 *   cinque terre, ognuna aperta dalla voce del mago che la custodisce.
 *
 * beta.21 â€” Lo stiramento elastico a fine scorrimento se ne va davvero
 *   anche dentro l'APK (serviva una modifica NATIVA, la CSS da sola non
 *   poteva bastare â€” vedi MainActivity.java nel progetto Android); la
 *   campagna Grande Guerra si presenta raccontando il fronte italiano
 *   invece del set di carte.
 *
 * beta.20 â€” ModalitÃ  Storia (storia.html): 4 campagne giocabili (Il
 *   Regno delle Ombre, Memorie Proibite, Freedom, Grande Guerra) su
 *   mappa a nodi condivisa; carte ammesse per campagna con il nuovo
 *   campo `fazione` sul set WW1; Sfide da 14 a 66 con cinque modi nuovi
 *   di guadagnarle; Oggetti del Millennio come premio dei tornei; ogni
 *   torneo paga solo la propria valuta; niente piÃ¹ stiramento elastico
 *   a fine scroll su nessuna pagina.
 */
window.GAME_VERSION = '1.0.8';
