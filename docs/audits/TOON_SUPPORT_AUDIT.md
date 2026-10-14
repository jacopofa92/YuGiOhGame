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

Eseguire l'audit 1/2/3 copie del primo pacchetto sul Pegasus Difficile
invariato, misurando separatamente Mondo/Regno, Toon giocati e frequenza della
linea Abbandonato/Mille Occhi. Solo dopo verranno valutati Toon Page-Flip e
Soldato dell'Oscuro Desiderio Toon.
