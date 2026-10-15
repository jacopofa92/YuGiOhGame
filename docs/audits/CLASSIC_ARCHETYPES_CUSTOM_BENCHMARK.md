# Benchmark informativo del deck Custom

Data: 2026-10-15. Dati grezzi:
`reports/archetypes/CLASSIC_ARCHETYPES_WITH_CUSTOM.json`.

## Metodo

Il deck `Custom` e' stato caricato dall'esportazione reale del profilo del
giocatore. La lista usata ha 40 carte nel Main Deck, 3 nell'Extra Deck e
impronta riproducibile `e1909a556263c979`.

Ogni versione Facile, Media e Difficile dei sei avversari ha affrontato i
cinque campioni ufficiali della baseline (250 duelli per riga) e il deck
`Custom` (50 duelli per riga). Sono quindi stati eseguiti 5.400 duelli. Non
si sono verificati stalli, errori carta o partite non concluse. `Custom` e'
una metrica informativa: non sostituisce i campioni ufficiali e non determina
da solo modifiche ai deck.

## Risultati contro Custom

La percentuale indica le vittorie del deck `Custom`.

| Avversario | Facile | Medio | Difficile | Turni medi F/M/D |
|---|---:|---:|---:|---|
| Joey | 96% | 70% | 74% | 13,12 / 15,00 / 12,66 |
| Yami Yugi | 96% | 88% | 74% | 23,22 / 14,06 / 15,20 |
| Kaiba | 94% | 76% | 88% | 12,38 / 12,66 / 13,68 |
| Pegasus | 92% | 76% | 88% | 17,00 / 17,72 / 15,34 |
| Strings | 100% | 100% | 96% | 18,92 / 18,14 / 19,16 |
| Marik | 96% | 66% | 66% | 18,58 / 18,22 / 18,66 |
| **Media** | **95,7%** | **79,3%** | **81,0%** | — |

## Lettura

- Il salto Facile -> Medio e' netto: il win rate medio di `Custom` cala di
  16,4 punti. La difficolta' non e' quindi soltanto nominale.
- Difficile non migliora globalmente rispetto a Medio contro questa lista:
  `Custom` sale dal 79,3% all'81,0%. Il dato non dimostra da solo una
  regressione generale dell'IA, perche' i deck cambiano con la difficolta' e
  ogni matchup Custom contiene 50 partite.
- Yami Yugi mostra la progressione piu' pulita (96 -> 88 -> 74). Marik e' il
  muro piu' efficace: ferma `Custom` al 66% sia a Medio sia a Difficile.
- Kaiba e Pegasus sono le anomalie prioritarie: contro `Custom`, Hard perde
  12 punti rispetto a Medio. Il segnale compare anche nei campioni ufficiali
  soprattutto per Pegasus; va studiato sugli stessi semi prima di cambiare
  le liste.
- Strings resta troppo debole per un deck evoluto: Hard vince soltanto il 4%
  contro `Custom`. Tuttavia migliora contro i campioni ufficiali e realizza
  Slifer nel 46,8% dei duelli Hard: l'identita' funziona, ma la conversione
  in vittoria no.
- Joey Hard e Medio sono sostanzialmente vicini. Lo scarto di quattro punti
  su 50 partite non giustifica da solo modifiche.

## Composizione e limiti della metrica

`Custom` e' un deck Drago/XYZ con tre Drago Bianco, Slifer, rimozioni e
trappole molto efficienti. Contiene, tra le altre, tre Forza dello Specchio,
due Cilindro Magico, Raigeki, Piumino delle Arpie, Tempesta Pesante, Cambio di
Cuore, Vaso dell'Avidita' e Rinascita del Mostro. E' quindi un buon test di
pressione, ma non un deck neutrale: alcuni risultati misurano anche quanto il
singolo avversario soffra rimozioni di massa e difese reattive.

## Prossimo audit sicuro

1. [Completato] Isolare Kaiba e Pegasus Medio/Hard sugli stessi semi persi da
   Hard e vinti da Medio. L'audit fattoriale e' in
   `docs/audits/CUSTOM_DIFFICULTY_FACTORIAL.md`: la causa primaria sono i
   deck Hard, non l'IA Hard.
2. Verificare Strings Hard separando comparsa di Slifer, sua evocazione e
   vittoria successiva: aumentare la frequenza del Dio non basta.
3. Non inserire ancora automaticamente i nuovi supporti moderni nei deck
   avversari. Prima confrontare piccole sostituzioni lore-friendly solo su
   Hard e mantenere invariati Starter, Structure, Facile e inizialmente Medio.

