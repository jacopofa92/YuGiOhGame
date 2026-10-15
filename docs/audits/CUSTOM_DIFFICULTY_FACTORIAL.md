# Audit fattoriale Custom: Kaiba e Pegasus

Data: 2026-10-15. Dati grezzi:
`reports/archetypes/CUSTOM_DIFFICULTY_FACTORIAL.json`.

## Domanda

Nel benchmark principale `Custom` vinceva piu' spesso contro Kaiba e Pegasus
Difficili che contro le rispettive versioni Medie. Questo audit separa le due
variabili che normalmente cambiano insieme: livello dell'IA e versione del
deck avversario.

La matrice incrocia IA Media/Difficile e deck Medio/Difficile. Ogni cella usa
gli stessi 50 semi `231000-231049` del benchmark Custom. Una correzione al
simulatore costruisce il deck scelto prima della prima mescolata: specificare
esplicitamente lo stesso livello riproduce ora esattamente la partita naturale.

## Risultati

La percentuale indica le vittorie di `Custom`.

| Avversario | Deck | IA Media | IA Difficile |
|---|---|---:|---:|
| Kaiba | Medio | 76% | 78% |
| Kaiba | Difficile | 80% | 88% |
| Pegasus | Medio | 76% | 80% |
| Pegasus | Difficile | 88% | 88% |

L'IA Difficile non e' la causa del calo. A deck fisso non peggiora in modo
materiale e con Kaiba Hard migliora l'esito dell'avversario di otto punti.
La perdita di efficacia nasce soprattutto dalla composizione dei deck Hard.

## Kaiba

Rispetto al Medio, il deck Hard toglie un Signore dei D., un Flauto per
Evocare Draghi e tre mostri semplici; inserisce Obelisk, Paladino/Rituale del
Drago Bianco, Buco Trappola e Armatura Sakuretsu.

- Obelisk compare sul Terreno soltanto nel 2% delle partite e rimane in mano
  nel 31,8% delle sconfitte.
- Paladino e Rituale restano in mano rispettivamente nel 22,7% e 15,9% delle
  sconfitte: due slot che richiedono di trovarsi insieme.
- Il Drago Bianco resta in mano nel 70,5% delle sconfitte Hard.
- Buco Trappola e Armatura Sakuretsu vengono invece usate davvero e non
  risultano carte morte: il problema non e' il pacchetto difensivo.

Diagnosi: Hard somma tre piani costosi (Drago Bianco, Rituale, Obelisk) ma
riduce proprio la consistenza Signore/Flauto. L'IA Hard usa correttamente cio'
che riesce a mettere in moto; non puo' compensare mani strutturalmente pesanti.

## Pegasus

Il deck Hard aggiunge una seconda copia di Fusione, Abbandonato, Idolo dai
Mille Occhi e Riavvolgimento Toon, piu' Forza dello Specchio e Occhio della
Verita'. Per farlo rimuove Buco Trappola, Capro Espiatorio, Armatura
Sakuretsu, Nega Attacco e due corpi evocabili.

- La seconda Fusione aumenta la carta in mano iniziale dal 10% al 16%, ma
  resta in mano nel 54,5% delle sconfitte Hard e viene usata solo nell'8%
  delle partite.
- Abbandonato resta in mano nel 36,4% delle sconfitte Hard.
- Idolo dai Mille Occhi viene usato nel 66% delle partite Hard: il materiale
  non e' il collo di bottiglia; lo sono Fusione e l'accesso coerente alla
  combinazione completa.
- Le quattro difese rimosse dal Medio venivano tutte realmente utilizzate;
  Capro Espiatorio, in particolare, sviluppava anche Tributi e tempo.

Diagnosi: il deck Hard sovraccarica la linea Mille Occhi senza abbastanza
ricerca e paga il costo rimuovendo difese affidabili. Anche qui l'IA non e'
la causa primaria.

## Varianti verificate e promosse

Il confronto successivo e' in
`reports/archetypes/HARD_VARIANTS_CLASSIC.json`: 1.500 duelli con gli stessi
semi, IA Hard, cinque campioni ufficiali e `Custom` separato.

| Duellante | Lista | Vittorie avversario sui campioni | Vittorie Custom |
|---|---|---:|---:|
| Kaiba | precedente | 49,2% | 88% |
| Kaiba | pubblicata | 48,8% | 78% |
| Pegasus | precedente | 51,2% | 88% |
| Pegasus | nucleo doppio conservativo | 55,6% | 86% |
| Pegasus | pubblicata | 57,2% | 78% |

Le due varianti sono state promosse nei soli deck avversari Hard:

- Kaiba: -1 Paladino, -1 Rituale, +1 Signore dei D., +1 Flauto;
- Pegasus: -1 Fusione, -1 Abbandonato, +1 Capro Espiatorio, +1 Nega Attacco.

Kaiba conserva la resa generale entro 0,4 punti ma resiste molto meglio al
deck evoluto. Pegasus migliora sia contro il campione ufficiale sia contro
`Custom`. Starter, Structure, Facile e Medio restano invariati.

E' stata provata anche una variante che conservava 2x Fusione, 2x
Abbandonato e 2x Idolo, sostituendo soltanto un Riavvolgimento con Capro
Espiatorio. Migliorava i campioni ma lasciava `Custom` all'86%; il vecchio
vincolo 2x e' stato quindi sostituito da un guardrail piu' utile: 2 Idoli,
almeno una Fusione e un Abbandonato, piu' Occhio della Verita' obbligatorio.

