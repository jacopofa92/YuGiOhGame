# Audit supporti moderni Drago Bianco

Stato: primo pacchetto implementato e testato in isolamento; economia e deck
avversari non ancora modificati.

## Primo pacchetto

| id | Carta | Effetto coperto | Stato |
|---:|---|---|---|
| 1261 | La Melodia del Drago che si Risveglia | scarto come costo e ricerca fino a 2 Draghi 3000+ ATK / 2500- DEF | test isolato verde |
| 1262 | Drago Bianco Alternativo Occhi Blu | Evocazione dalla mano rivelando Drago Bianco; una volta per turno; distruzione mirata e divieto di attacco | test isolato verde |
| 1263 | Luce Autentica | protezione dal targeting avversario; Evocazione da mano/Cimitero oppure Posizionamento dal Deck; penalita' quando lascia scoperta la Zona Magie/Trappole | test isolato verde |

## Secondo pacchetto

| id | Carta | Effetto coperto | Stato |
|---:|---|---|---|
| 1264 | Fusione Definitiva | materiali da mano, Terreno e Cimitero rimescolati nel Deck; animazione prima della comparsa; rimozione opzionale in base ai materiali sul Terreno | test isolato verde |
| 1265 | Drago Bianco Alternativo Definitivo | tre materiali con nome effettivo; protezione da bersaglio e distruzione avversari; distruzione di 1 o 3 carte e divieto di attacco | test isolato verde |

Testi, statistiche e illustrazioni sono stati verificati il 2026-10-14 tramite
YGOPRODeck. Le carte sono collocate prima del blocco WW1 senza rinumerare gli
id esistenti.

## Scelte tecniche

- Il nome assunto dell'Alternativo e' modellato per zona: vale sul Terreno e
  nel Cimitero, ma non nella mano o nel Deck. Luce Autentica puo' quindi
  rianimarlo dal Cimitero, non Evocarlo direttamente dalla mano.
- La protezione di Luce Autentica usa il checkpoint comune dei bersagli e
  conserva il controllore: blocca soltanto gli effetti dell'avversario e non
  impedisce rimozioni non mirate, battaglia o effetti propri.
- La penalita' di Luce Autentica scatta solo quando la carta era scoperta e
  viene mandata dalla sua Zona Magie/Trappole al Cimitero; una copia ancora
  coperta non distrugge i propri mostri.
- Fusione Definitiva usa il vortice Fusione condiviso e inserisce il boss sul
  Terreno soltanto alla fine dell'animazione. Il ritorno dei materiali nel
  Deck non avvia un secondo volo concorrente, evitando sovrapposizioni UI.
- Drago Bianco Alternativo vale come materiale nominato soltanto dal Terreno
  o Cimitero, coerentemente col suo nome assunto; dalla mano conserva il nome
  originale. Il boss ricorda separatamente se un Alternativo originale e'
  stato davvero usato e concede i tre bersagli solo in quel caso.
- Starter, Structure, deck avversari, limiti copie e fonti economiche restano
  invariati fino ai rispettivi audit.

## Prossimo checkpoint

L'audit riproducibile `tools/audit-supporti-occhi-blu.js` ha eseguito 50 semi
contro ciascuno dei cinque avversari Hard Yami Yugi, Joey, Pegasus, Mako e
Bakura: 250 duelli per variante, 3.500 complessivi, senza errori di carta,
invarianti violate o partite non concluse. Dati completi in
`reports/archetypes/BLUE_EYES_SUPPORT_1_2_3.json`.

| Variante | Vittorie Kaiba | Turni medi | Carta vista |
|---|---:|---:|---:|
| baseline | 40,0% | 15,51 | - |
| Melodia 1 / 2 / 3 | 33,2% / 37,2% / 34,4% | 14,74 / 15,20 / 15,28 | 37,2% / 50,8% / 67,2% |
| Alternativo 1 / 2 / 3 | 31,2% / 33,2% / 29,2% | 14,79 / 15,19 / 15,23 | 6,0% / 8,4% / 12,4% |
| Luce Autentica 1 / 2 / 3 | 44,0% / 49,6% / 49,6% | 14,48 / 14,38 / 15,11 | 37,6% / 52,8% / 68,4% |
| pacchetto leggero 1+1+1 | 40,8% | 15,23 | 31,2% / 5,2% / 36,0% |
| pacchetto doppio 2+2+2 | 44,0% | 14,21 | 57,2% / 18,4% / 55,6% |
| consistenza 2+1+1 | 43,6% | 14,78 | 50,8% / 6,8% / 33,6% |
| alternativo 2+2+1 | 44,4% | 14,65 | 53,6% / 20,4% / 37,2% |

Melodia e Alternativo isolati non sono potenziamenti automatici: sostituire
carte autonome con pezzi sinergici riduce il risultato, e l'Alternativo arriva
effettivamente in partita molto meno spesso delle altre due carte. Luce
Autentica e' il supporto piu' incisivo, ma il terzo esemplare non aumenta il
win rate rispetto al secondo. Il pacchetto completo resta controllato: la
composizione migliore provata raggiunge 44,4%, appena +4,4 punti sulla
baseline e senza stalli.

Decisione provvisoria dopo il primo pacchetto: nessun deck avversario viene
ancora modificato. Limiti giocatore consigliati per la futura economia:
Melodia 2, Alternativo 2, Luce Autentica 2. Fusione Definitiva e il boss sono
stati poi implementati e misurati separatamente nell'audit completo seguente.

## Audit completo

Il secondo audit aggiunge Fusione Definitiva e il boss alle prove 1/2/3 e
confronta tre pacchetti completi. Metodo invariato: 50 semi contro ciascuno
dei cinque avversari Hard, 250 duelli per variante, 23 varianti e 5.750
duelli complessivi. Nessun errore carta, stallo o invariante violata. Dati:
`reports/archetypes/BLUE_EYES_SUPPORT_COMPLETE.json`.

| Variante | Vittorie Kaiba | Turni medi | Lettura |
|---|---:|---:|---|
| baseline coeva | 38,4% | 15,52 | ripetuta due volte: risultato identico |
| Melodia 1 / 2 / 3 | 39,6% / 37,2% / 33,6% | 15,16 / 15,18 / 14,67 | una copia neutra, copie multiple peggiorano |
| Alternativo 1 / 2 / 3 | 37,6% / 33,2% / 30,8% | 15,14 / 15,38 / 15,33 | troppo raro da mettere in campo da solo |
| Luce Autentica 1 / 2 / 3 | 49,2% / 50,0% / 50,8% | 14,93 / 14,94 / 14,41 | principale fonte del guadagno |
| Fusione Definitiva 1 / 2 / 3 | 38,0% / 35,6% / 30,0% | 15,29 / 15,47 / 15,46 | una copia situazionale; oltre diventa morta |
| boss Extra 1 / 2 / 3 | 38,0% / 38,0% / 40,0% | 15,12 / 15,29 / 15,27 | quasi neutro senza supporto Main |
| completo leggero 1+1+1+1, boss 1 | 39,6% | 15,40 | non altera il bilanciamento |
| completo Luce 1+1+2+1, boss 1 | 48,8% | 14,70 | candidato massimo prudente |
| completo doppio 2+2+2+2, boss 1 | 53,2% | 15,06 | efficace, ma troppo carico per default |

La frequenza di comparsa del boss e' soltanto 1,2-1,6% nei pacchetti completi:
non e' lui a generare il salto. Il motore vede Fusione Definitiva nel 24,4%
del pacchetto leggero e nel 45,6% del doppio; la carta resta sana a una copia.
Il vero moltiplicatore e' Luce Autentica, che aumenta consistenza e resilienza
senza richiedere di sovraccaricare la lista di Fusioni.

Decisione: Facile e Medio invariati; nessuna modifica automatica neppure al
Difficile finche' manca il benchmark informativo `Custom`. Se quel confronto
confermera' che Kaiba Hard e' troppo facile, la sola candidata e' la lista
`completo-luce` (+10,4 punti sulla baseline coeva), non il pacchetto doppio.
Limiti provvisori per il giocatore: Melodia 2, Alternativo 2, Luce Autentica
2, Fusione Definitiva 1, Drago Bianco Alternativo Definitivo 1.
