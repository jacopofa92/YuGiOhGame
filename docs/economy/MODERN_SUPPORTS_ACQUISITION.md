# Economia dei supporti moderni classici

Stato: implementata sul branch `feature/supporti-archetipi-classici`.

## Regola comune

- La prima copia non può uscire da Negozio o buste: si ottiene tramite una
  missione tematica composta da capitolo della Storia e vittorie a Difficile.
- Dopo la prima copia, le copie successive possono apparire nella rotazione
  della relativa rarità e nelle buste coerenti col tema.
- Nelle buste, ogni supporto già sbloccato ha soltanto il 3,5% di probabilità
  di entrare nel pool del proprio slot; nelle Premium sale all'8%.
- Il limite 1/2 stabilito dagli audit vale sia nel deck sia nell'acquisizione:
  premi, Negozio, buste e deck acquistati non possono superarlo.
- La Cartoteca mostra requisito, progresso corrente e limite.

I contatori riusano le Sfide già presenti. Il farming completato prima
dell'aggiornamento viene quindi riconosciuto; gli autowin amministrativi
continuano a contare, come deciso per tutte le altre imprese.

## Missioni della prima copia

| ID | Carta | Rarità | Limite | Requisito |
|---:|---|---|---:|---|
| 1250 | La Pietra Nera della Leggenda | Super | 2 | Battle City I + 10 Joey Hard |
| 1251 | Intuito Occhi Rossi | Ultra | 2 | Battle City I + 20 Joey Hard |
| 1252 | Spirito Occhi Rossi | Super | 2 | Battle City I + 35 Joey Hard |
| 1253 | Drago Metallo Nero | Super | 2 | Battle City I + 50 Joey Hard |
| 1254 | Bastone del Mago | Super | 2 | Regno dei Duellanti + 15 Yugi Hard |
| 1255 | Cerchio Magico Oscuro | Ultra | 2 | Regno dei Duellanti + 30 Yugi Hard |
| 1256 | Anima Eterna | Ultra | 2 | Battle City I + 45 Yugi Hard |
| 1257 | Salvezza del Mago | Ultra | 1 | Battle City I + 60 Yugi Hard |
| 1258 | Servitore dell'Anima | Ultra | 1 | Battle City II + 75 Yugi Hard |
| 1259 | Segreti della Magia Oscura | Super | 2 | Battle City II + 90 Yugi Hard |
| 1260 | I Maghi Neri | Leggendaria | 1 | Battle City II + 100 Yugi Hard |
| 1261 | La Melodia del Drago che si Risveglia | Super | 2 | Battle City I + 15 Kaiba Hard |
| 1262 | Drago Bianco Alternativo Occhi Blu | Leggendaria | 2 | Battle City I + 30 Kaiba Hard |
| 1263 | Luce Autentica | Ultra | 2 | Battle City I + 45 Kaiba Hard |
| 1264 | Fusione Definitiva | Ultra | 1 | Battle City II + 60 Kaiba Hard |
| 1265 | Drago Bianco Alternativo Definitivo | Leggendaria | 1 | Battle City II + 75 Kaiba Hard |
| 1266 | Regno Toon | Ultra | 1 | Regno dei Duellanti + 15 Pegasus Hard |
| 1267 | Segnalibro Toon | Ultra | 2 | Regno dei Duellanti + 25 Pegasus Hard |
| 1268 | Signora Arpia Toon | Super | 2 | Regno dei Duellanti + 35 Pegasus Hard |
| 1269 | Gira-Pagina Toon | Ultra | 2 | Regno dei Duellanti + 45 Pegasus Hard |
| 1270 | Glorioso Soldato Nero Toon | Leggendaria | 1 | Regno dei Duellanti + 50 Pegasus Hard |
| 1271 | Attacco Forza del Tuono | Leggendaria | 1 | Battle City I + Slifer posseduto + 40 Strings Hard |
| 1272 | Pugno del Fato | Leggendaria | 1 | Battle City II + Obelisk posseduto + 80 Kaiba Hard |
| 1273 | Canto Antico | Leggendaria | 1 | Battle City II + Ra posseduto + 50 Marik Hard |

## Verifica

`supporti-moderni-economia.spec.js` controlla blocco iniziale, rarità, tutte
le prime copie, fonti leggibili e tetti economici. Restano verdi anche gli
spec di acquisizione storici, Cartoteca, buste tematiche ed editor deck.
Suite completa non eseguita.
