

## Probleem: T+0 wordt meegeteld als tijdstap

De functie `generateExpectedHours` in `imweatherApi.ts` begint bij `fromHour` (= 0) voor de eerste range. Voor NAVGEM met `uniform(240, 6)` genereert dit: 0, 6, 12, ..., 180 = **31 stappen** (inclusief T+0). De API levert ook een T+0 layer, dus die telt als "beschikbaar". Het totaal zou 30 moeten zijn (zonder T+0), maar is 31.

Dit geldt voor alle modellen: overal is het totaal 1 te hoog.

### Oplossing

**Drie bestanden aanpassen:**

1. **`src/lib/imweatherApi.ts`** - `generateExpectedHours` functie (regel 41-50):
   - Eerste range start bij `fromHour + stepSize` in plaats van `fromHour`, zodat T+0 niet wordt meegenomen als verwachte tijdstap.
   - De API-layer voor T+0 (runtime timestamp zelf) wordt ook gefilterd uit de `availableLayers` check, zodat deze niet als "beschikbaar" meetelt.

2. **`src/lib/imweatherApi.ts`** - `buildModel` functie en `fetchRunElements`:
   - De T+0 layer (timestamp === runtime) wordt uitgefilterd van de beschikbare layers, zodat available count klopt.

3. **`src/components/ForecastTimeline.tsx`** - `parseSequences` functie (regel 32):
   - Count formule aanpassen: `Math.floor((to - from) / step)` (zonder +1) zodat de "Totaal: X tijdstappen" tekst consistent is.

### Impact

Alle modellen krijgen een totaal dat 1 lager is dan nu. Beschikbare count daalt ook met 1 (als T+0 beschikbaar was). Percentages blijven gelijk of veranderen minimaal. De ModelInfoDialog, NoProgressAlert, StatusTracker en alle andere plekken gebruiken dezelfde bron, dus die worden automatisch correct.

