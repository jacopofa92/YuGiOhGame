# Audit supporti moderni Toon

Stato: primo pacchetto implementato e testato in isolamento; Starter,
Structure, deck Pegasus ed economia non modificati.

## Vincolo del progetto

I Toon mantengono la mediazione anime gia' approvata: con un Mondo Toon
attivo possono attaccare nel turno in cui vengono Evocati e non pagano il
vecchio costo per ogni attacco. Gli effetti ufficiali sostituiti restano in
`legacyOfficialEffect`, non mostrato nella UI. La linea Abbandonato /
Restrizione dai Mille Occhi resta indipendente e non viene rimossa.

## Primo pacchetto

| id | Carta | Implementazione | Stato |
|---:|---|---|---|
| 1266 | Regno Toon | Zona Terreno, costo iniziale di 3 carte, nome assunto Mondo dei Toon, protezione dal targeting e sostituzione della distruzione con la cima del Deck | test isolato verde |
| 1267 | Segnalibro Toon | ricerca Mondo/Regno o una carta che cita Mondo; una volta per turno; dal Cimitero protegge il Mondo dalla distruzione | test isolato verde |
| 1268 | Signora Arpia Toon | Evocazione Speciale con un Mondo attivo; rimozione M/T se esiste un altro Toon; una volta per turno; attacco immediato nella deroga del progetto | test isolato verde |

Testi, statistiche e immagini verificati il 2026-10-14 tramite YGOPRODeck.
Le nuove carte precedono il blocco WW1 e non rinumerano alcun id esistente.

## Infrastruttura condivisa

`DuelEngine.hasActiveToonWorld(owner)` riconosce sia il vecchio Mondo dei
Toon nella zona M/T sia Regno Toon nella Zona Terreno. Tutte le condizioni
Toon preesistenti ora passano da questo unico controllo: Sirena, Drago,
Teschio, Maschera e gli altri Toon continuano a funzionare con Mondo e
acquistano compatibilita' con Regno senza duplicare eccezioni.

La protezione resta distinta:

- Mondo dei Toon usa la deroga esistente: 500 LP, una volta per turno;
- Regno Toon bandisce una carta dalla cima del Deck per ogni Toon salvato;
- Segnalibro Toon protegge Mondo o Regno dagli effetti distruttivi bandendosi
  dal Cimitero.

## Prossimo checkpoint

L'audit `tools/audit-supporti-toon.js` ha eseguito 50 semi contro ciascuno dei
cinque avversari Hard Yami Yugi, Joey, Kaiba, Mako e Bakura: 250 duelli per
variante, 14 varianti e 3.500 duelli complessivi. Nessun errore carta,
invariante violata o partita non conclusa. Dati completi in
`reports/archetypes/TOON_SUPPORT_1_2_3.json`.

| Variante | Vittorie Pegasus | Turni medi |
|---|---:|---:|
| baseline | 39,6% | 16,77 |
| Regno 1 / 2 / 3 | 46,8% / 50,0% / 57,6% | 16,25 / 17,08 / 18,10 |
| Segnalibro 1 / 2 / 3 | 37,2% / 36,0% / 35,6% | 16,89 / 16,58 / 16,67 |
| Arpia 1 / 2 / 3 | 37,2% / 38,8% / 40,4% | 16,15 / 16,91 / 17,66 |
| pacchetto leggero 1+1+1 | 50,4% | 18,14 |
| pacchetto Regno 2+1+1 | 62,4% | 17,69 |
| pacchetto consistenza 1+2+1 | 62,4% | 17,72 |
| pacchetto doppio 2+2+2 | 58,0% | 16,71 |

Regno Toon e' il vero moltiplicatore: una copia porta un aumento controllato
di 7,2 punti, mentre tre copie arrivano gia' a +18 punti. Segnalibro da solo
peggiora un deck che possiede gia' tre Mondi; acquista valore solo insieme a
Regno. Signora Arpia e' neutra da sola e utile come corpo tematico, non come
staple generica.

La linea parallela resta viva: Abbandonato compare nel 28% della baseline e
nel 50% del pacchetto leggero; Restrizione dai Mille Occhi passa dal 6,4%
all'8,8%. I supporti non hanno quindi cancellato il secondo piano di Pegasus.

Decisione provvisoria: nessun deck avversario modificato. Facile e Medio
restano invariati; per il Difficile il massimo candidato futuro e' il
pacchetto leggero, non le varianti al 62%. Limiti giocatore proposti in attesa
dell'economia: Regno Toon 1, Segnalibro Toon 2, Signora Arpia Toon 2. Il
secondo pacchetto Page-Flip/Soldato Toon puo' ora essere implementato e
misurato separatamente.
