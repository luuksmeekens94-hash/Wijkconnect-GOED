# WijkConnect - ontwerp projectmonitoring Beweeg Mee

## Doel

Deze uitbreiding maakt van WijkConnect naast een verwijsapp ook een beheersbare monitoringsomgeving voor het beweegspreekuur en het sociaal spreekuur. De praktijkmanager kan wekelijks bronregistraties controleren, vragenlijsten voorbereiden en rapportages maken zonder achteraf handmatig percentages te reconstrueren.

De inhoud is gebaseerd op:

- het VEZN-eindverslag Beweeg Mee van 30 april 2026;
- het KPI-overzicht over januari 2025 tot en met april 2026;
- de vijf vragenlijsten uit Q1 2026;
- de bekende registratieproblemen uit de evaluatie;
- de bestaande WijkConnect-code en privacy-uitgangspunten.

## Rollen

### ADMIN - technisch beheerder

- alle projectmonitoring;
- KPI-doelen en verslagperiodes;
- gebruikers en rollen;
- sociale kaart;
- exports en auditlog.

### DATA_MANAGER - Projectbeheerder

- registraties en afspraken;
- wekelijkse controle en afsluiting;
- vragenlijstuitnodigingen en respons;
- projectlogboek;
- rapportages en monitoringexport.

Deze rol kan geen gebruikers, beveiligingsinstellingen of sociale-kaartitems beheren.

### PILOT - meekijken

- alleen geanonimiseerde, geaggregeerde pilotinformatie;
- geen patiëntcode, initialen, geboortejaar, notities, details of exports.

### VERWIJZER en SOCIAAL

De bestaande verwijsworkflow blijft behouden. Een sociaal professional ziet alleen casussen die aan die persoon zijn toegewezen.

## Datadefinities

- **Unieke patiënt:** een onderscheidende, gehashte patiëntreferentie met minimaal één verschenen afspraak binnen de gekozen periode.
- **Verwijzing:** één nieuwe monitoringcasus met een vastgelegde verwijzings- of triagedatum.
- **Afspraakregistratie:** een geplande afspraak of eerste-contactmoment met status gepland, verschenen, no-show of geannuleerd.
- **Doorlooptijd beweegspreekuur:** aantal kalenderdagen tussen verwijzingsdatum en verschenen afspraak.
- **Binnen één week:** nul tot en met zeven kalenderdagen.
- **Doorlooptijd sociaal spreekuur:** voorlopig de afspraak- of eerste-contactdatum minus de verwijzingsdatum. In het overleg moet worden bevestigd of een mislukte contactpoging meetelt.
- **No-showpercentage:** no-shows gedeeld door verschenen plus no-show; geannuleerde en toekomstige afspraken tellen niet mee.
- **Open plekken:** vastgelegde weekcapaciteit minus niet-geannuleerde afspraken.
- **Weekcapaciteit:** standaard 6 plekken voor het beweegspreekuur en 4 voor het sociaal spreekuur. Een expliciete weekcontrole kan alleen bij een afwijkend rooster een andere capaciteit vastleggen.
- **Terugkoppelpercentage:** verschenen afspraken waarbij datum, ontvanger en kanaal van terugkoppeling zijn vastgelegd.

Percentages worden normaal afgerond. Afgeleide totalen en percentages worden nooit handmatig opgeslagen.

## Pseudonimisering

De projectbeheerder voert een intern patiëntnummer of andere stabiele lokale referentie in. De server maakt hiervan met HMAC-SHA256 een niet-terugrekenbare projectcode. De ingevoerde bronreferentie wordt niet opgeslagen.

Hiervoor is `MONITORING_PSEUDONYM_SECRET` verplicht. Het secret moet:

- apart van de database worden opgeslagen;
- lang en willekeurig zijn;
- niet tussentijds worden gewijzigd, omdat dezelfde patiënt dan een andere hash krijgt;
- niet in GitHub of exports terechtkomen.

Naam, BSN en medische details horen niet in de monitoringmodule.

## Registratieniveaus

### Patiënt

- uitsluitend gehashte patiëntcode;
- geen naam, BSN, adres of geboortedatum.

### Casus of verwijzing

- beweegspreekuur of sociaal spreekuur;
- verwijzingsdatum;
- herkomst en basis voor inplanning;
- klachtregio of sociale hulpvraagthema's;
- helderheid van de sociale overdracht;
- organisatie en toegewezen professional;
- optionele koppeling aan een bestaande WijkConnect-verwijzing.

### Afspraak of eerste contact

- datum;
- verschenen, no-show, gepland of geannuleerd;
- uitkomst en vervolgorganisatie;
- geschiktheid voor evaluatie;
- herinnering bij no-show;
- datum, ontvanger en kanaal van terugkoppeling.

### Weekcontrole

- capaciteit per spreekuur;
- wel of geen spreekuur gepland;
- status open, klaar voor controle of afgesloten;
- optionele weeknotitie;
- afsluiter en afsluitdatum.

## Datakwaliteit

Een week kan niet worden afgesloten bij:

- een verstreken afspraak die nog op gepland staat;
- een verschenen consult zonder uitkomst;
- een afspraak vóór de verwijzingsdatum;
- een beweegregistratie zonder klachtregio;
- een sociale registratie zonder hulpvraagthema;
- ontbrekende capaciteit terwijl wel een spreekuur gepland was.

Waarschuwingen, maar geen blokkade:

- basis voor inplanning ontbreekt;
- terugkoppeling nog niet vastgelegd;
- sociaal eerste contact later dan veertien dagen;
- no-show zonder vastgelegde herinnering;
- geen vragenlijst voorbereid.

Een slechte uitkomst of lage KPI-score is nooit een datakwaliteitsfout.

## Vragenlijsten

De vijf historische VEZN-vragenlijsten zijn als versie 1 opgenomen:

1. patiënten beweegspreekuur;
2. patiënten sociaal spreekuur;
3. huisartsen;
4. doktersassistenten;
5. welzijnscoaches en buurtteams.

Templates en vragen worden per versie bevroren. Een inhoudelijke aanpassing maakt later versie 2. De huidige versie ondersteunt:

- een persoonlijke, eenmalig bruikbare vragenlijstlink;
- patiëntuitnodigingen uitsluitend na een verschenen, evaluatiegeschikte afspraak;
- professionalcampagnes per kalenderkwartaal;
- transactionele verzending via Brevo en maximaal één herinnering;
- bezorgstatus, bounce-, spam- en afmeldsuppressie;
- antwoorden en geaggregeerde bevindingen in WijkConnect;
- automatische verwijdering van versleutelde contactgegevens na de bewaartermijn.

De mailtekst bevat geen spreekuur-, patiënt-, hulpvraag- of diagnosegegevens. Open- en kliktracking staan uit. Resultaten worden pas vanaf vijf antwoorden per vraag getoond; individuele open teksten blijven afgeschermd totdat een aparte redactieflow beschikbaar is.

## Projectlogboek

Ondersteunde typen:

- MDO;
- training of opfrissessie;
- evaluatie;
- implementatieactiviteit;
- knelpunt;
- financiering of borging;
- opschaling;
- overig.

Per item kunnen eigenaar, opvolgdatum en status worden bijgehouden.

## Rapportage

Het rapportagescherm toont per gekozen periode en spreekuur:

- unieke patiënten;
- verschenen afspraken;
- doorlooptijd binnen zeven dagen;
- sociale verwijzingen;
- eenmalige beweegconsulten;
- no-shows;
- terugkoppeling;
- open plekken;
- herkomst verwijzing;
- uitkomsten;
- klachtregio's;
- sociale hulpvraagthema's.

De CSV-export bevat alleen de gehashte patiëntcode. Iedere export wordt in de auditlog vastgelegd en CSV-formule-injectie wordt geneutraliseerd.

## Beveiligingsverbeteringen in deze uitbreiding

- publieke testwachtwoordhint verwijderd;
- hardcoded standaardwachtwoord verwijderd;
- seedwachtwoord alleen via omgevingsvariabele;
- publieke logininstructies met gedeelde wachtwoorden uit de repository verwijderd;
- wachtwoord verplicht bij nieuw account;
- accounts kunnen worden gedeactiveerd;
- sociaal professionals zien alleen toegewezen casussen;
- PILOT heeft geen persoonsrijke detailtoegang of export;
- Projectbeheerder heeft geen systeembeheerrechten;
- surveytokens worden alleen gehasht opgeslagen.

Alle eerder gebruikte gedeelde wachtwoorden moeten vóór livegang buiten de code om worden geroteerd. Verwijdering uit de huidige Git-versie wist bestaande Git-geschiedenis niet.

## Ingebruikname

1. Maak een databaseback-up.
2. Voeg `MONITORING_PSEUDONYM_SECRET` toe aan de productieomgeving.
3. Controleer dat `DATABASE_URL` naar de juiste database en het schema `wijkconnect` wijst.
4. Voer `npm run db:migrate` eenmalig uit tegen de beoogde database.
5. Voeg de survey- en Brevo-variabelen uit `.env.example` aan Vercel toe en verifieer SPF, DKIM en DMARC voor het verzenddomein.
6. Bouw en deploy daarna de applicatie.
7. Maak voor de praktijkmanager een account met rol `DATA_MANAGER`.
8. Laad vanuit het vragenlijstcentrum de vijf VEZN-templates.
9. Leg nieuwe KPI-doelen en verslagperiodes vast onder Projectinstellingen.
10. Roteer alle eerder gedeelde pilotwachtwoorden.
11. Voer een functionele acceptatietest uit met fictieve patiëntcodes en testadressen voordat echte registraties worden toegevoegd.

Vercel gebruikt `npm run vercel:build`. Alleen wanneer Vercel de omgeving als `production` markeert, worden eerst de goedgekeurde migraties uitgevoerd. Previewdeployments wijzigen geen database en moeten een aparte database of geen `DATABASE_URL` krijgen.

## Beslispunten voor het overleg met De Schakel

- Welke stabiele interne patiëntreferentie mag de praktijkmanager gebruiken voor hashing?
- Telt een sociale contactpoging of alleen daadwerkelijk contact voor de 14-dagennorm?
- Welke complete klachtregio-lijst wordt gebruikt?
- Welke sociale organisaties en uitkomsten moeten als vaste keuzelijst beschikbaar zijn?
- Wanneer wordt een casus inhoudelijk afgesloten?
- Welke terugkoppeling moet naar welke huisarts en binnen welke termijn?
- Wanneer wordt de patiëntvragenlijst aangeboden?
- Welk kanaal wordt gebruikt: e-mail, sms, QR-code of een combinatie?
- Hoeveel reminders zijn toegestaan?
- Hoe lang worden bronregistraties, surveyantwoorden en open tekst bewaard?
- Welke doelen en verslagperiode gelden vanaf juli 2026?
- Begint de structurele registratie in de week van 6 juli of 13 juli 2026?
