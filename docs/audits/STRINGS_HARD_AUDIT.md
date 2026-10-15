# Audit Strings Difficile e Slifer

Data: 2026-10-15. Branch: `feature/supporti-archetipi-classici`.

## Domanda

Strings Difficile era molto debole contro il deck `Custom` e la sola presenza
di Slifer nella lista non dimostrava che l'IA riuscisse a Evocarlo o a usarlo
bene. L'audit distingue quindi tre eventi: Slifer osservato in una zona
pubblica, Slifer realmente Evocato e vittoria dopo la sua Evocazione.

## Metodo

- IA Difficile su entrambi i posti e limite di 80 turni;
- 50 semi per ciascuno di cinque deck ufficiali (250 duelli per variante);
- 50 semi separati contro il `Custom` di impronta `e1909a556263c979`;
- stessi semi per la lista pubblicata e due varianti lore-friendly;
- 900 duelli complessivi, senza errori di carta o violazioni delle invarianti.

Lo strumento riproducibile e' `tools/audit-strings-hard.js`; i dati grezzi
sono in `reports/archetypes/STRINGS_HARD_AUDIT.json`.

## Diagnosi e correzione

Prima della correzione, la lista pubblicata Evocava Slifer nel 36,0% dei
duelli ufficiali, ma Strings vinceva solo il 31,1% dei duelli nei quali era
riuscito a Evocarlo. Al momento dell'Evocazione restavano mediamente 2,53
carte in mano. Il comportamento Hard generico poteva poi attivare una Magia
e Settare una Trappola nello stesso turno, portando frequentemente Slifer a
0-1000 ATK/DEF.

La correzione non trucca pescate o statistiche: quando Strings controlla
Slifer scoperto, conserva le carte in mano. Puo' ancora usare una pescata a
vantaggio netto immediato (oggi Vaso dell'Avidita') e continua a rispondere
normalmente con le carte gia' Set.

## Risultato finale

| Lista | Vittorie Strings, deck ufficiali | Slifer Evocato | Vittorie dopo Slifer | Vittorie Custom |
| --- | ---: | ---: | ---: | ---: |
| Pubblicata | 23,2% | 36,0% | 40,0% | 98,0% |
| +1 Waboku | 23,2% | 36,8% | 38,0% | 98,0% |
| Protezione Tributi | 22,0% | 40,8% | 31,4% | 98,0% |

Rispetto alla misurazione precedente della stessa lista, la sola decisione IA
porta le vittorie complessive dal 20,0% al 23,2% e quelle condizionate
all'Evocazione di Slifer dal 31,1% al 40,0%.

## Decisione

Il deck pubblicato resta invariato. Le sostituzioni difensive aumentano un
po' la frequenza di Slifer ma non convertono quella frequenza in vittorie;
la variante piu' protettiva e' anzi peggiore dopo l'Evocazione. Non vengono
aggiunte staple estranee ne' copie ulteriori del Dio. `Custom` rimane una
metrica informativa estrema e non viene usato da solo per forzare un buff.
