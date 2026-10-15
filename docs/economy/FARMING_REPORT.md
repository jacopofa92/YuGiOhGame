# Audit farming carte speciali — 2026-10-06

Comando ripetibile:

```text
node tools/simula-farming-carte.js 50000
```

La simulazione usa 50.000 profili, seme fisso `0x5EEDC0DE` e legge le
probabilità direttamente da `CardAcquisition.RULES`. Non sostituisce le
partite reali: misura il numero di vittorie, non la durata dei caricamenti,
del deck o dell'avversario. Le ore sotto assumono 8 minuti per duello.

## Exodia

| Percorso | Media primo set | Mediana | 90% entro | Ore medie | Media tre set |
|---|---:|---:|---:|---:|---:|
| Qualunque avversario, Facile | 1.042 | 1.055 | 1.250 | 138,9 h | 3.128 |
| Qualunque avversario, Normale | 750 | 755 | 1.012 | 100 h | 2.253 |
| Qualunque avversario, Difficile | 497 | 488 | 735 | 66,3 h | 1.491 |
| Seeker, Difficile | 44 | 43 | 50 | 5,9 h | 130 |

Il pity limita il caso peggiore del primo set generico a 1.250 vittorie.
Contro Seeker la garanzia ogni dieci vittorie porta il primo set entro 50 e
tre copie di ogni pezzo entro 150; le probabilità triplicate anticipano la
media a 44 e 130 vittorie.

Valutazione: la probabilità generica è corretta come sorpresa passiva, ma non
come percorso da inseguire volontariamente. Il farming intenzionale deve
essere comunicato chiaramente come sfida a Seeker: circa 6 ore medie per il primo
set sono lunghe ma leggibili per la ricompensa più speciale del gioco. Non è
stato necessario cambiare le percentuali concordate.

## Traguardi deterministici

| Carta/traguardo | Vittorie richieste | Stima a 8 min |
|---|---:|---:|
| Parassita Paracida contro Weevil | 15 | 2 h |
| Golem di Lava contro Marik | 20 | 2,7 h |
| Destiny Board / Elefante Volante | 25 | 3,3 h |
| Prima carta firma | 50 | 6,7 h |
| Seconda soglia Kaiba/Yugi | 100 totali | 13,3 h totali |
| Slifer contro Strings | 30 | 4 h, oltre al capitolo |
| Ra contro Marik | 40 | 5,3 h, oltre a storia e 3 tornei |

Per Ra le dieci vittorie con perdita massima di 2000 LP sono comprese nelle
40: se il giocatore le manca, il tempo sale soltanto delle ulteriori partite
necessarie. Il costo dei tre tornei e della Storia è separato perché dipende
fortemente da sconfitte, rami e durata delle partite.

Parassita Paracida e Golem di Lava rappresentano il tempo minimo per ottenere
la **prima** copia: la simulazione conta vittorie, quindi le sconfitte
allungano il tempo reale. Il premio non si ripete; seconda e terza copia
dipendono poi da rotazione e buste, mantenendo valore sia al farming del
personaggio sia al Negozio.

## Esito

- Le soglie 25/40/50 sono nella stessa fascia di impegno e hanno una
  progressione comprensibile.
- Le seconde copie firma a 100 vittorie sono obiettivi di lungo periodo.
- Exodia è proibitiva per caso generico ma raggiungibile tramite Seeker;
  questa differenza è intenzionale e ora documentata anche in Cartoteca.
- Il prossimo audit utile, dopo dati reali, è confrontare durata e tasso di
  vittoria a Difficile: la simulazione attuale assume che ogni tentativo sia
  una vittoria e quindi rappresenta il minimo effettivo.
# Aggiornamento economia per difficolta' — 2026-10-10

La curva di riferimento ora privilegia esplicitamente il Difficile senza
rendere Facile e Normale equivalenti. Per una singola Stella casuale servono
in media 50 vittorie a Facile, 20 a Normale e circa 11,1 a Difficile. Questa
lotteria e' soltanto un'integrazione: la fonte deterministica resta il Regno
dei Duellanti, che paga 14/19/24 Stelle per completamento. In aggiunta, ogni
10 vittorie libere allo stesso livello pagano 1/2/3 Stelle e Battle City/
Torneo Kaiba ne pagano 3/5/8: il Regno resta il percorso piu' rapido, ma non
e' piu' obbligatorio.

Per comprare il primo Starter da 18 Stelle partendo da zero servono quindi:

- una prima vittoria del Regno a qualunque difficolta' (il bonus iniziale
  porta Facile esattamente a 18);
- dopo la prima volta, due tornei a Facile oppure uno a Normale/Difficile;
- in alternativa un farming libero molto piu' lento e non garantito.

Crediti per vittoria libera: 30/50/80; completamento torneo: 650/825/1000.
Il bonus iniziale del torneo e' fisso (+500 crediti e la valuta tematica), non
un moltiplicatore: in questo modo il primo completamento resta importante ma
non trasforma il Difficile nella scorciatoia dominante che produrrebbe un x2.

### Scenario settimanale intensivo

`node tools/simula-economia.js` legge direttamente le tabelle usate dal gioco,
quindi non conserva una seconda copia dei prezzi. Con lo scenario predefinito
molto attivo — 10 vittorie libere al giorno per 7 giorni, un completamento di
ciascuno dei tre tornei e 15 duelli di torneo vinti — la stima e':

| Difficolta' | Crediti/settimana | Stelle/settimana | Locazioni | Millennio | Settimane per le Stelle di tutti i mazzi |
|---|---:|---:|---:|---:|---:|
| Facile | 6.025 | 35,07 | 3,06 | 1,53 | 27,3 |
| Normale | 7.600 | 53,17 | 4,00 | 1,52 | 18,0 |
| Difficile | 9.700 | 73,97 | 4,91 | 2,49 | 12,9 |

Lo scaffale attuale contiene 7 Starter realmente acquistabili e 11 Structure,
per 957 Stelle complessive: Starter 18→54 (+6), Structure 35→75 (+8, poi
tetto). La simulazione include 6,67 Stelle settimanali attese completando le
10 missioni estratte. La colonna finale resta un limite teorico: non sottrae
Stelle spese per carte/buste e non aggiunge premi delle Storie. E' inoltre uno
scenario intensivo (70 vittorie e tre tornei completi ogni settimana), quindi
non rappresenta il calendario di un giocatore occasionale.

## Aggiornamento supporti moderni classici — 2026-10-15

Le missioni degli id 1250-1276 sono deterministiche: le ore seguenti usano
lo stesso riferimento di 8 minuti per vittoria e non includono sconfitte né
il tempo necessario a completare i capitoli.

| Linea | Soglie cumulative | Tempo minimo dell'ultima soglia |
|---|---|---:|
| Occhi Rossi / Joey | 10, 20, 35, 50 | 6,7 h |
| Mago Nero / Yugi | 15, 30, 45, 60, 75, 90, 100 | 13,3 h |
| Drago Bianco / Kaiba | 15, 30, 45, 60, 75 | 10 h |
| Toon / Pegasus | 15, 25, 35, 45, 50 | 6,7 h |
| Attacco Forza del Tuono / Strings | 40 + Slifer | 5,3 h complessive contro Strings |
| Pugno del Fato / Kaiba | 80 + Obelisk | 10,7 h complessive contro Kaiba |
| Canto Antico / Marik | 50 + Ra | 6,7 h complessive contro Marik |
| Incrocio / Sfera / Fenice di Ra | 60, 75, 100 + catena delle ricompense | 8 h, 10 h, 13,3 h contro Marik |

Occhi Rossi e Toon terminano nella fascia delle vecchie carte firma da 50
vittorie. Drago Bianco e soprattutto Mago Nero sono progressioni più lunghe,
ma distribuiscono ricompense ogni 10-15 vittorie. Le mosse delle Divinità
riusano il totale storico già necessario ai relativi Dei: le soglie non si
sommano dopo lo sblocco. Il tempo reale sarà superiore in base al win rate a
Difficile e andrà confrontato con telemetria o prove manuali.

Le tre ricompense finali di Ra sono volutamente a una sola copia: non
generano farming ulteriore in busta e non possono saturare il deck. La catena
richiede prima Ra, poi Incrocio di Anime, quindi Modalità Sfera e infine
Fenice; i contatori storici di Marik vengono riutilizzati e non ripartono da
zero a ogni tappa.
