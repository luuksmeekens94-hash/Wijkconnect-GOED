# WijkConnect - ontwerp projectmonitoring Beweeg Mee

## Doel

Deze uitbreiding maakt van WijkConnect naast een verwijsapp ook een beheersbare monitoringsomgeving voor het beweegspreekuur en het sociaal spreekuur. De praktijkmanager krijgt één eenvoudige wekelijkse invoer. De admin beheert controles, vragenlijsten, rapportages, exports en instellingen zonder achteraf handmatig percentages te reconstrueren.

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

### DATA_MANAGER - Praktijkmanager

- snelle patiëntinvoer per geselecteerde week;
- versleutelde naam- en e-mailregistratie;
- keuze tussen beweegspreekuur en sociaal spreekuur;
- aanwezigheid, klachtregio of sociale hulpvraag;
- de juiste patiëntvragenlijst direct vanuit de invoer versturen;
- alleen een compact overzicht van patiënten uit de gekozen week.

Deze rol kan geen monitoringdashboard, losse registratiedetails, vragenlijstbeheer, projectlog, rapportages, exports, gebruikers, beveiligingsinstellingen of sociale-kaartitems openen.

### PILOT - meekijken

- alleen geanonimiseerde, geaggregeerde pilotinformatie;
- geen patiëntcode, initialen, geboortejaar, notities, details of exports.

### PHYSIOTHERAPIST - Fysiotherapeut

- ziet alleen verschenen patiënten van het beweegspreekuur;
- kiest een patiënt uit de gekoppelde werklijst;
- registreert oefeningen/advies, vervolgbeweegspreekuur, eerstelijnsfysiotherapie, sociaal domein, huisarts of een andere vervolgstap;
- kan een bestemming en korte toelichting toevoegen.

### VERWIJZER en SOCIAAL

De bestaande verwijsworkflow blijft technisch behouden voor `VERWIJZER`. `SOCIAAL` landt direct in de eenvoudige patiëntreisomgeving voor verschenen patiënten van het sociaal spreekuur. Daar kan een traject bij Buurtteams of welzijn, een andere instantie, follow-up, huisarts, advies, geen vervolg of onduidelijk worden vastgelegd.

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

## Patiëntkoppeling en versleuteling

De praktijkmanager voert naam en e-mailadres één keer in. Beide velden worden op applicatieniveau met AES-256-GCM versleuteld. Een HMAC-fingerprint van de genormaliseerde combinatie naam plus e-mail zorgt dat dezelfde patiënt opnieuw kan worden herkend zonder op leesbare persoonsgegevens te zoeken. De app maakt daarnaast een niet-herleidbare `WC-`projectcode.

Fysiotherapeuten en sociaal professionals typen naam of e-mail niet opnieuw. Zij kiezen de patiënt uit hun eigen rolgebonden werklijst; alle vervolgdata wordt via de interne casus-ID gekoppeld. Dat voorkomt dubbele patiënten en typefouten.

Naam en e-mail komen niet voor in de monitoringexport. De versleutelde contactvelden worden standaard na 365 dagen gewist; de projectcode en niet-herleidbare onderzoeksdata blijven bruikbaar. `MONITORING_CONTACT_ENCRYPTION_KEY` kan als aparte 32-byte sleutel worden ingesteld en valt anders terug op de bestaande `SURVEY_CONTACT_ENCRYPTION_KEY`. BSN, adres en uitgebreide medische details worden niet opgeslagen.

## Registratieniveaus

### Patiënt

- versleutelde naam en e-mail voor de actieve werklijst en vragenlijstverzending;
- niet-herleidbare projectcode voor analyse en export;
- geen BSN, adres of geboortedatum.

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

### Patiëntreis

- discipline fysiotherapie of sociaal domein;
- vaste vervolgstap uit een rolgebonden keuzelijst;
- datum van de vervolgstap;
- optionele ontvangende praktijk, instantie of professional;
- korte vrije toelichting;
- vastlegger, organisatie en auditmoment.

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

De mailtekst maakt zichtbaar of het om het beweegspreekuur of sociaal spreekuur gaat, maar bevat geen patiëntnaam, afspraak, hulpvraag of diagnose. Open- en kliktracking staan uit. Resultaten worden pas vanaf vijf antwoorden per vraag getoond; individuele open teksten blijven afgeschermd totdat een aparte redactieflow beschikbaar is.

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
- dekking en uitsplitsing van vervolgstappen in de patiëntreis.

De CSV-export bevat alleen de gehashte patiëntcode. Iedere export wordt in de auditlog vastgelegd en CSV-formule-injectie wordt geneutraliseerd.

## Beveiligingsverbeteringen in deze uitbreiding

- publieke testwachtwoordhint verwijderd;
- hardcoded standaardwachtwoord verwijderd;
- seedwachtwoord alleen via omgevingsvariabele;
- publieke logininstructies met gedeelde wachtwoorden uit de repository verwijderd;
- wachtwoord verplicht bij nieuw account;
- accounts kunnen worden gedeactiveerd;
- sociaal professionals zien in de bestaande verwijsworkflow alleen toegewezen casussen en in de patiëntreisomgeving alleen verschenen sociaalspreekuurcasussen;
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
7. Controleer de drie functionele pilotaccounts voor praktijkmanager, fysio en sociaal spreekuur en deel ieder startwachtwoord afzonderlijk.
8. Controleer dat alleen de projectbeheerder het bestaande `ADMIN`-account gebruikt.
9. Laad vanuit het vragenlijstcentrum de vijf VEZN-templates.
10. Leg nieuwe KPI-doelen en verslagperiodes vast onder Projectinstellingen.
11. Roteer alle eerder gedeelde pilotwachtwoorden.
12. Voer een functionele acceptatietest uit met fictieve namen en testadressen voordat echte registraties worden toegevoegd.

Vercel gebruikt `npm run vercel:build`. Alleen wanneer Vercel de omgeving als `production` markeert, worden eerst de goedgekeurde migraties uitgevoerd. Previewdeployments wijzigen geen database en moeten een aparte database of geen `DATABASE_URL` krijgen.

## Verwerkte besluiten uit het overleg met De Schakel

- registratie gebeurt standaard aan het einde van iedere week;
- de week wordt vóór de patiëntinvoer expliciet gekozen;
- het beweegspreekuur en sociaal spreekuur zitten in dezelfde snelle invoer;
- bij onduidelijke informatie is steeds een optie `Onduidelijk` beschikbaar;
- de juiste patiëntvragenlijst kan direct vanuit de registratie worden verstuurd;
- na zeven dagen volgt maximaal één automatische reminder;
- fysio en sociaal domein hebben ieder een eigen rolgebonden patiëntreisomgeving;
- naam en e-mail worden niet opnieuw overgetypt, maar via de interne casus gekoppeld;
- de CSV combineert spreekuur-, vragenlijststatus- en patiëntreisdata onder de niet-herleidbare patiëntcode.
