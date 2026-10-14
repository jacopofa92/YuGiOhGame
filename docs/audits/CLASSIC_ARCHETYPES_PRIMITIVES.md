# Primitive motore per gli archetipi classici

Audit eseguito il 2026-10-14 prima di aggiungere nuove carte. L'obiettivo e'
riusare il motore esistente e introdurre soltanto i mattoni realmente mancanti.

## Gia' disponibile

- ricerca con scelta reale nel Deck e aggiornamento del contatore;
- ricerca/recupero dal Cimitero con rispetto di Necrovalley;
- bando dal Cimitero, inclusi i costi di Evocazione Speciale;
- scelta di carte in mano, liste e Terreno tramite `Decisioni`;
- Evocazioni Speciali con zona di origine esplicita;
- tracciamento generico una volta per turno e una volta per Duello;
- restituzione in mano di mostri e Magie/Trappole con transizione visiva;
- sostituzioni/protezioni dalla distruzione gia' agganciate al motore.

## Lacuna chiusa

Il riconoscimento di una famiglia era sparso tra confronti sul nome e flag
locali. `CardEffectsShared` espone ora:

- `cardHasArchetype(card, tag)`: legge prima i tag `archetypes` opzionali dai
  dati o dalla definizione dell'effetto, poi applica soltanto fallback storici
  per Toon, Occhi Rossi, Occhi Blu e Mago Nero;
- `cardHasEffectiveName(card, nome)`: riconosce il nome stampato e gli alias
  opzionali `treatedAsNames`, senza cambiare id, UI o formato dei salvataggi.

Le carte custom non richiedono modifiche al motore: possono dichiarare i tag
quando ne hanno bisogno. Le carte WW1 non vengono classificate implicitamente.

## Decisioni di implementazione

- Nessun nuovo framework globale per i limiti: gli helper gia' presenti
  coprono sia la chiave per copia (`uid`) sia quella per nome/giocatore.
- Nessun refactor massivo dei vecchi effetti Toon in questa fase: i fallback
  attuali restano compatibili e verranno sostituiti solo nei file toccati dal
  pacchetto Toon, riducendo il rischio di regressioni.
- Le operazioni asincrone continuano a passare dagli helper di scelta; non si
  introducono rimozioni manuali da Deck/Cimitero nelle nuove carte.
- Gli effetti complessi non ancora richiesti dalle prime carte (per esempio
  usare materiali dal Deck o risolvere tributi dell'avversario) restano feature
  dedicate, con propri test, invece di essere anticipate nel nucleo.

Test mirato: `node tests/run-all.js identita-archetipi`.
