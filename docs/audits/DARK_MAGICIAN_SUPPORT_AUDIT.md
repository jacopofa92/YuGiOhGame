# Audit supporti moderni Mago Nero

Stato: primo pacchetto implementato e testato in isolamento; economia e deck
avversari non ancora modificati.

## Primo pacchetto

| id | Carta | Effetto coperto | Stato |
|---:|---|---|---|
| 1254 | Bastone del Mago | ricerca all'Evocazione Normale; recupero dal Cimitero nel turno avversario offrendo un Incantatore | test isolato verde |
| 1255 | Cerchio Magico Oscuro | guarda le prime 3 e aggiunge una carta idonea; bandisce quando Mago Nero viene Evocato | test isolato verde |
| 1256 | Anima Eterna | Evoca Mago Nero o cerca le due Magie classiche; immunità dagli effetti avversari; distruzione dei propri mostri quando lascia il Terreno | test isolato verde |

Testi, statistiche e illustrazioni sono stati verificati il 2026-10-14
tramite YGOPRODeck. Le carte sono collocate prima del blocco WW1 senza
rinumerare gli id esistenti.

## Scelte tecniche

- `cardMentionsName` permette anche alle carte custom di dichiarare
  `mentionsNames`, senza dipendere dalla lingua o da una sottostringa fragile.
- L'immunità di Anima Eterna è per istanza e conserva il controllore: blocca
  soltanto gli effetti dell'avversario, non costi, battaglia o carte proprie.
- Il nuovo hook dal Cimitero è separato dagli effetti sul Terreno: soltanto
  chi dichiara `onCardActivatedWhileInGraveyard` può reagire da quella zona.
- Il Cerchio conserva l'ordine relativo delle carte non scelte. La libertà di
  riordinarle manualmente richiederebbe un nuovo picker ordinabile e viene
  rinviata alla fase di rifinitura UI, senza alterare quali carte si vedono o
  quale carta si può aggiungere.
- Starter, Structure, deck avversari, limiti copie e fonti economiche restano
  invariati fino all'audit comparativo 1/2/3 copie.

## Prossimo checkpoint

Eseguire l'audit deterministico 1/2/3 copie sul nucleo Yami Yugi; poi decidere
se proseguire con Salvation, Soul Servant, Secrets of Dark Magic e il boss
Fusione prima di formulare limiti e ottenibilità definitivi.
