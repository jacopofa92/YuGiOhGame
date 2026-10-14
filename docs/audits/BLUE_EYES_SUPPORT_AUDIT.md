# Audit supporti moderni Drago Bianco

Stato: primo pacchetto implementato e testato in isolamento; economia e deck
avversari non ancora modificati.

## Primo pacchetto

| id | Carta | Effetto coperto | Stato |
|---:|---|---|---|
| 1261 | La Melodia del Drago che si Risveglia | scarto come costo e ricerca fino a 2 Draghi 3000+ ATK / 2500- DEF | test isolato verde |
| 1262 | Drago Bianco Alternativo Occhi Blu | Evocazione dalla mano rivelando Drago Bianco; una volta per turno; distruzione mirata e divieto di attacco | test isolato verde |
| 1263 | Luce Autentica | protezione dal targeting avversario; Evocazione da mano/Cimitero oppure Posizionamento dal Deck; penalita' quando lascia scoperta la Zona Magie/Trappole | test isolato verde |

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
- Starter, Structure, deck avversari, limiti copie e fonti economiche restano
  invariati fino ai rispettivi audit.

## Prossimo checkpoint

Misurare Melodia, Alternativo e Luce Autentica a 1/2/3 copie sul deck Kaiba
Difficile invariato. Soltanto dopo si valutera' il secondo pacchetto con
Fusione Definitiva e un singolo boss, mantenendo separati l'effetto della
lista e quello dell'IA.
