# WijkConnect MVP

## Concept
Digitale verwijstool voor casusoverdracht tussen huisarts/POH en sociaal domein, gestart binnen Beweeg Mee Dukenburg.

## Kernfunctie
- Huisarts/POH verwijst patiënt naar sociaalwerker (30 sec, 3-4 klikken)
- Sociaalwerker ziet binnenkomende casussen + kan status updaten
- Huisarts ziet terugkoppeling in dashboard
- Sociale kaart Dukenburg als uitbreiding (verwijzen buiten Beweeg Mee)

## Pilotpartners
- **Huisarts**: Iris Venderbosch — i.venderbosch@schakel-nijmegen.nl (Huisartsenpraktijk De Schakel)
- **Sociaalwerker**: Andrea Olfen — andrea.olfen@bindkracht10.nl (Bindkracht10, welzijnscoach)
- **Sociaalwerker 2**: Margot van Delft — margot.vandelft@buurtteamsvolwassenen.nl (Buurtteams Volwassenen / Incluzio)
- **Fysiotherapeut**: Tom van Haaren — tom@fysiotherapienijmegen.nl (Fy-fit / Beweegspreekuur)
- **Fysiotherapeut**: Fleur Frieling — fleur@fysiotherapienijmegen.nl (Fy-fit / Beweegspreekuur)

## Context: Beweeg Mee / Sociaal Spreekuur
- Wekelijks sociaal spreekuur in Huisartsenpraktijk De Schakel, Dukenburg
- Donderdag 13:45-16:15
- Uitgevoerd door welzijnscoach (Bindkracht10) + achterwacht Buurtteams Volwassenen (Incluzio)
- Verwijzing door huisarts of fysiotherapeut
- Warme overdracht = kernprincipe (geen kaartje meegeven, actieve begeleiding)
- Registratie + korte digitale terugkoppeling naar verwijzer
- Partners: De Schakel, Fy-fit, Bindkracht10, Buurtteams Volwassenen/Incluzio, GGD, Gemeente Nijmegen, VGZ

## Thema's sociaal spreekuur
Uit Beweeg Mee documentatie:
- Financiële zorgen / geldzaken
- Eenzaamheid
- Gebrek aan daginvulling / participatie
- Bewegingsarmoede
- Psychosociale problematiek
- Stress
- Opvoeding / gezin
- Wonen / hulpmiddelen
- Werk / inkomen
- Zingeving

## Beveiliging MVP
- Geen BSN, geen volledige naam, geen medische gegevens
- Pseudoniem: initialen + geboortejaar + thema + toelichting
- Pass-through principe
- TLS, rolgebaseerde toegang, audit log
- Hosting EU
- DPIA + verwerkersovereenkomst

## Sociale kaart bronnen
- Wegwijzer024 (Dukenburg): ~200 activiteiten, community/informeel
- VraagHulpNijmegen: 9 professionele organisaties (Buurtteams J&G, Buurtteams Volwassenen, Ouderenadviseurs, Financieel Experts, Wmo-consulenten, Stip, GGD, Bibliotheek, Ondernemerspunt Geldzorgen)

## Tech stack
- Next.js 14
- Prisma + PostgreSQL
- Authenticatie per professional
- Vercel of Hetzner hosting

## Status
- [ ] Sociale kaart data scrapen (Wegwijzer024 + VraagHulpNijmegen)
- [ ] Functioneel ontwerp schrijven
- [ ] Luuk review functioneel ontwerp
- [x] Tweede sociaalwerker naam/mail ontvangen
- [ ] MVP bouwen
- [ ] Pilot starten bij De Schakel
