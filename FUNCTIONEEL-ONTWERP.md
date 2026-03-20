# WijkConnect MVP — Functioneel Ontwerp v1.0

## 1. Doel

Een webapp waarmee huisartsen/POH's in maximaal 30 seconden een patiënt kunnen doorverwijzen naar het sociaal domein, met gestructureerde terugkoppeling. Gestart binnen Beweeg Mee Dukenburg, met sociale kaart als uitbreiding.

---

## 2. Gebruikers en rollen

| Rol | Wie | Rechten |
|---|---|---|
| **Verwijzer** | Huisarts, POH, fysiotherapeut | Verwijzingen aanmaken, eigen casussen inzien, terugkoppeling ontvangen |
| **Sociaal professional** | Welzijnscoach (Bindkracht10), Buurtteam (Incluzio) | Binnenkomende verwijzingen inzien, status updaten, terugkoppelen |
| **Beheerder** | Luuk (initieel) | Gebruikers beheren, sociale kaart beheren, rapportages |

### Pilotgebruikers
- Iris Venderbosch (Huisartsenpraktijk De Schakel) — Verwijzer
- Tom van Haaren (Fysiotherapie Fy-fit / Beweegspreekuur) — Verwijzer
- Fleur Frieling (Fysiotherapie Fy-fit / Beweegspreekuur) — Verwijzer
- Andrea Olfen (Bindkracht10) — Sociaal professional
- Margot van Delft (Buurtteams Volwassenen / Incluzio) — Sociaal professional

---

## 3. Kernfunctionaliteit

### 3.1 Verwijzing aanmaken (Verwijzer)

**Flow: 3-4 klikken, < 30 seconden**

```
Stap 1: Dashboard → "Nieuwe verwijzing" [1 klik]

Stap 2: Selecteer thema(s) [1+ klik, MEERDERE SELECTEERBAAR]
         ┌─────────────────────────────────┐
         │ ☐ 💰 Financiële zorgen          │
         │ ☐ 🤝 Eenzaamheid               │
         │ ☐ 📋 Daginvulling / participatie │
         │ ☐ 🏃 Bewegingsarmoede           │
         │ ☐ 🧠 Psychosociaal / stress     │
         │ ☐ 👨‍👩‍👧 Opvoeding / gezin           │
         │ ☐ 🏠 Wonen / hulpmiddelen       │
         │ ☐ 💼 Werk / inkomen             │
         │ ☐ ✨ Zingeving                   │
         │ ☐ ❓ Overig                      │
         └─────────────────────────────────┘
         (minimaal 1 verplicht, meerdere mogelijk)

Stap 3: Selecteer ontvanger [0-1 klik]
         → Beweeg Mee professionals staan bovenaan (favorieten)
           • Andrea Olfen — Bindkracht10 (welzijnscoach)
           • Margot van Delft — Buurtteams Volwassenen
         → Sociale kaart Dukenburg (uitklapbaar)
           • Automatisch aanbevolen op basis van thema
           • Zoek op naam/organisatie

Stap 4: Patiëntgegevens (minimaal)
         • Initialen [verplicht, 2-4 letters]
         • Geboortejaar [verplicht, dropdown]
         • Geslacht [optioneel, M/V/X]
         • Telefoonnummer patiënt [optioneel, voor contact door sociaal prof.]
         • Urgentie [normaal / hoog] — default: normaal
         • Toelichting [optioneel, vrij tekstveld, max 500 tekens]

Stap 5: Verzend [1 klik]
```

**Na verzending:**
- Ontvanger krijgt e-mailnotificatie + melding in app
- Casus verschijnt in dashboard verwijzer met status "Verzonden"
- Uniek casus-ID wordt gegenereerd (WC-2026-0001)

### 3.2 Verwijzingen ontvangen en verwerken (Sociaal professional)

**Dashboard sociaal professional:**

```
┌──────────────────────────────────────────────────────┐
│ 📥 Binnenkomende verwijzingen                        │
├──────────────────────────────────────────────────────┤
│ WC-2026-0001 │ J.K. (1985) │ 💰 Financieel │ NIEUW  │
│ WC-2026-0002 │ M.V. (1972) │ 🤝 Eenzaamheid│ OPGEPAKT│
│ WC-2026-0003 │ A.B. (1990) │ 🧠 Stress     │ AFGEROND│
└──────────────────────────────────────────────────────┘
```

**Per casus kan de sociaal professional:**
1. Status updaten via dropdown:
   - `Ontvangen` → `Opgepakt` → `In behandeling` → `Doorverwezen` → `Afgerond`
   - Of: `Niet bereikbaar` / `Geen contact gewenst`
2. Terugkoppeling schrijven (optioneel, vrij tekstveld, max 500 tekens)
3. Naam behandelaar invullen (wie pakt het op)

**Bij elke statuswijziging:**
- Verwijzer ontvangt melding (in-app + optioneel e-mail)
- Dashboard verwijzer toont actuele status

### 3.3 Dashboard Verwijzer

```
┌──────────────────────────────────────────────────────────────┐
│ 📊 Mijn verwijzingen                     [+ Nieuwe verwijzing]│
├──────────────────────────────────────────────────────────────┤
│ Filters: [Alle] [Open] [Afgerond]  Zoek: [________]         │
├──────────────────────────────────────────────────────────────┤
│ WC-0001 │ J.K. │ 💰 Financieel │ Andrea O. │ ✅ Opgepakt    │
│ WC-0002 │ M.V. │ 🤝 Eenzaamh. │ Margot vD │ 🔄 In behandeling│
│ WC-0003 │ A.B. │ 🧠 Stress    │ Andrea O. │ ✅ Afgerond     │
│ WC-0004 │ P.L. │ 🏠 Wonen     │ —         │ 📨 Verzonden    │
└──────────────────────────────────────────────────────────────┘
```

**Snelknoppen bovenaan dashboard:**
- "Verwijs naar Andrea" — direct naar formulier met Andrea voorgeselecteerd
- "Verwijs naar Margot" — idem

### 3.4 Sociale kaart Dukenburg

**Beschikbaar als tab in de app voor alle gebruikers.**

Twee lagen:
1. **Professioneel** (uit VraagHulpNijmegen):
   - Buurtteams Jeugd en Gezin
   - Buurtteams Volwassenen
   - Ouderenadviseurs
   - Financieel Experts in de Wijk
   - Wmo-consulenten gemeente
   - Stip
   - GGD (beschermd wonen/thuis)
   - Bibliotheek / Informatiepunt Digitale Overheid
   - Ondernemerspunt Geldzorgen

2. **Informeel/community** (uit Wegwijzer024 Dukenburg):
   - ~200 activiteiten, gecategoriseerd per thema
   - Per activiteit: naam, beschrijving, locatie, tijden, organisatie, contactinfo
   - Filterbaar op thema, doelgroep, kosten

**Sociale kaart is doorzoekbaar en filterbaar op thema.** Bij het aanmaken van een verwijzing toont de app automatisch relevante sociale kaart-items op basis van het gekozen thema.

---

## 4. Notificaties

| Event | Ontvanger | Kanaal |
|---|---|---|
| Nieuwe verwijzing | Sociaal professional | E-mail + in-app |
| Statuswijziging | Verwijzer | In-app + optioneel e-mail |
| Geen actie na 48u | Sociaal professional | E-mail herinnering |
| Geen actie na 5 dagen | Verwijzer | In-app melding "geen reactie" |

---

## 5. Beveiliging & Privacy

### 5.1 Dataminimalisatie
- **Geen BSN** in het systeem
- **Geen volledige naam** — alleen initialen
- **Geen adres** van patiënt
- **Geen medische gegevens** — alleen thema en vrije toelichting
- Koppeling naar patiënt bestaat alleen in het HIS van de verwijzer

### 5.2 Technische beveiliging
- HTTPS/TLS (standaard)
- Authenticatie: e-mail + wachtwoord met magic link optie
- Rolgebaseerde toegang (verwijzer ziet alleen eigen casussen)
- Audit log (wie deed wat wanneer)
- Sessie-timeout na 30 minuten inactiviteit
- Hosting in EU (Vercel EU region of Hetzner)

### 5.3 Data retention
- Casussen worden automatisch gearchiveerd na 6 maanden
- Gearchiveerde casussen worden verwijderd na 12 maanden
- Audit logs: 24 maanden bewaren

### 5.4 Juridisch (voor pilot)
- Verwerkersovereenkomst tussen Luuk (aanbieder) en De Schakel / Bindkracht10 / Incluzio
- DPIA light (welke data, waarom, proportionaliteit)
- Gebruiksvoorwaarden: geen BSN of volledige namen invoeren
- Toestemmingsformulier voor patiënten (informatie over data-verwerking)

---

## 6. Technische architectuur

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│  Verwijzer   │────▶│   WijkConnect    │◀────│   Sociaal   │
│  (browser)   │     │   Next.js app    │     │ professional│
└─────────────┘     │                  │     │  (browser)  │
                    │  ┌────────────┐  │     └─────────────┘
                    │  │ PostgreSQL │  │
                    │  │  database  │  │
                    │  └────────────┘  │
                    │                  │
                    │  ┌────────────┐  │
                    │  │ E-mail     │  │
                    │  │ (Resend)   │  │
                    │  └────────────┘  │
                    │                  │
                    │  ┌────────────┐  │
                    │  │ Sociale    │  │
                    │  │ kaart JSON │  │
                    │  └────────────┘  │
                    └──────────────────┘
```

### Stack
- **Frontend + Backend**: Next.js 14 (App Router)
- **Database**: PostgreSQL (via Prisma ORM)
- **Auth**: NextAuth.js (magic link + credentials)
- **E-mail**: Resend (transactionele mails)
- **Hosting**: Vercel (EU) of Hetzner
- **Sociale kaart**: JSON dataset, beheerbaar via admin panel

### Datamodel (kern)

```
User
  id, email, name, role (VERWIJZER | SOCIAAL | ADMIN), organization, createdAt

Referral (Verwijzing)
  id, caseId (WC-2026-XXXX), 
  createdBy (User), assignedTo (User),
  theme (enum), urgency (NORMAL | HIGH),
  patientInitials, patientBirthYear, patientGender,
  note (optioneel),
  status (SENT | RECEIVED | PICKED_UP | IN_PROGRESS | REFERRED | COMPLETED | UNREACHABLE | DECLINED),
  createdAt, updatedAt

ReferralUpdate (Terugkoppeling)
  id, referralId, 
  updatedBy (User),
  previousStatus, newStatus,
  note (optioneel),
  handlerName (optioneel),
  createdAt

SocialResource (Sociale kaart)
  id, name, description, category, themes[],
  organization, contactEmail, contactPhone, 
  address, stadsdeel, wijk,
  targetGroup, costs, referralNeeded,
  type (PROFESSIONAL | COMMUNITY),
  source (VRAAGHULP | WEGWIJZER024 | MANUAL),
  url, updatedAt

AuditLog
  id, userId, action, entityType, entityId, details, createdAt
```

---

## 7. Schermen overzicht

| # | Scherm | Gebruiker | Beschrijving |
|---|---|---|---|
| 1 | Login | Alle | Magic link of wachtwoord |
| 2 | Dashboard Verwijzer | Verwijzer | Overzicht eigen verwijzingen + snelknoppen |
| 3 | Nieuwe Verwijzing | Verwijzer | 5-stappen flow (thema → ontvanger → gegevens → verzend) |
| 4 | Casus Detail | Alle | Status, historie, terugkoppelingen |
| 5 | Dashboard Sociaal | Sociaal | Binnenkomende verwijzingen, statusbeheer |
| 6 | Sociale Kaart | Alle | Doorzoekbaar overzicht van voorzieningen Dukenburg |
| 7 | Admin: Gebruikers | Admin | Gebruikers toevoegen/beheren |
| 8 | Admin: Sociale Kaart | Admin | Resources toevoegen/bewerken |

---

## 8. Wat dit NIET is (scope afbakening)

- ❌ Geen HIS-integratie (dat is fase 2)
- ❌ Geen FHIR-koppeling
- ❌ Geen burgerinterface voor zelf-aanmelding (fase 2)
- ❌ Geen AI-matching (handmatige selectie, met suggesties op basis van thema)
- ❌ Geen chat/messaging tussen professionals
- ❌ Geen EPD-functionaliteit
- ❌ Geen medische gegevensopslag

---

## 9. Wat het WÉL laat zien (toekomstige mogelijkheden)

- ✅ Sociale kaart Dukenburg — laat zien wat buiten Beweeg Mee mogelijk is
- ✅ Gestructureerd dashboard — laat zien hoe dit in een HIS-view eruit zou kunnen zien
- ✅ Thema-gebaseerde matching — fundament voor slimmere matching later
- ✅ Data over verwijspatronen — bewijs voor impact richting gemeente/VGZ

---

## 10. Fasering bouwen

### Fase 1: Core (week 1-2)
- Authenticatie + gebruikersbeheer
- Verwijzing aanmaken flow
- Dashboard verwijzer
- Dashboard sociaal professional  
- Statusupdates + terugkoppeling
- E-mailnotificaties

### Fase 2: Sociale kaart (week 2-3)
- Sociale kaart data importeren (Wegwijzer024 + VraagHulpNijmegen)
- Zoek- en filterfunctie
- Koppeling thema → relevante resources
- Admin panel voor beheer sociale kaart

### Fase 3: Polish + pilot-ready (week 3-4)
- UI/UX verfijning
- Mobiel-responsive
- Snelknoppen en favorieten
- Herinnerings-mails
- DPIA document
- Verwerkersovereenkomst template
- Testaccounts aanmaken voor pilotgebruikers

---

## 11. Succesindicatoren pilot

Na 3 maanden gebruik meten:
1. **Aantal verwijzingen** via WijkConnect (doel: minimaal 5/week)
2. **Terugkoppelpercentage** (doel: >80% casussen krijgen statusupdate)
3. **Doorlooptijd** van verwijzing tot "opgepakt" (doel: <48 uur)
4. **Gebruikerstevredenheid** (korte enquête na 3 maanden)
5. **Tijdsbesparing** verwijzer vs. beveiligde mail (subjectieve meting)
