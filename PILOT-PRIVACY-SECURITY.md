# WijkConnect Pilot: Privacy, Veiligheid en Gebruik

## Korte samenvatting

WijkConnect is in de huidige vorm geschikt als **pilot/MVP** om de workflow tussen huisartspraktijk en sociaal domein te testen, **mits** er bewust en terughoudend met data wordt omgegaan.

De app is **nog niet klaar om zonder aanvullende maatregelen als volledig productieklare oplossing voor gevoelige cliëntdata te worden gepositioneerd**.

## Wat de app nu al doet

- De app draait via Vercel over HTTPS.
- Inloggen verloopt via `next-auth`.
- Wachtwoorden worden gehasht met `bcrypt`.
- Toegang is rolgebaseerd: verwijzer, sociaal professional, fysiotherapeut, praktijkmanager en admin.
- Er is een auditlog voor belangrijke acties zoals login en exports.
- Alleen admins kunnen exports downloaden van verwijzingen en terugkoppelingen.

## Welke data wordt opgeslagen

De huidige app slaat onder meer de volgende gegevens op:

- casusnummer
- patiëntinitialen
- geboortejaar
- optioneel telefoonnummer
- thema's van de hulpvraag
- notities/toelichting
- statusupdates en terugkoppelingen
- naam, e-mail en organisatie van gebruikers
- versleutelde patiëntnaam en e-mail voor de wekelijkse werklijst en vragenlijstverzending
- rolgebonden vervolgstappen in de patiëntreis

## Waar gaat de data heen

- De app zelf draait op Vercel.
- De applicatiedata staat in een PostgreSQL-database.
- In de huidige configuratie wijst de databaseverbinding naar een Neon-omgeving in `eu-central-1` (waarschijnlijk Frankfurt).

## Wat je hierover eerlijk kunt zeggen in de pilot

Je kunt zeggen:

- "We testen een beveiligde digitale verwijsroute in plaats van losse e-mails en losse terugkoppelingen."
- "Toegang is alleen voor ingelogde gebruikers met rollen."
- "Er is logging op belangrijke acties."
- "We beperken de vastgelegde cliëntinformatie tot wat voor deze pilot nodig is."

Je moet er ook eerlijk bij zeggen:

- "Dit is een pilot/MVP en nog geen volledig afgeronde productieomgeving."
- "We zijn de laatste beveiligings- en governanceverbeteringen nog aan het afronden."
- "Voor brede inzet met structurele cliëntdata willen we eerst extra maatregelen en formele afspraken borgen."

## Belangrijkste huidige beperkingen

- Er staan nog beveiligingsverbeteringen open voordat dit sterk genoeg is voor reguliere productie-inzet.
- Gegevens zoals notities en telefoonnummer worden wel opgeslagen, maar niet veldniveau-versleuteld door de applicatie zelf.
- Patiëntnaam en e-mail zijn wel veldniveau-versleuteld; korte vrije patiëntreisnotities niet en moeten daarom geen onnodige medische details bevatten.
- Exports maken lokale kopieën van data en vragen daarom extra zorg in gebruik.
- Organisatorische randvoorwaarden zoals afspraken over eigenaarschap, bewaartermijnen, exportgebruik en verwerkersafspraken moeten expliciet geregeld worden.

## Praktisch advies voor deze pilot

Gebruik de app in deze fase alleen onder de volgende voorwaarden:

- Werk met een kleine, afgebakende pilotgroep.
- Gebruik zo min mogelijk direct herleidbare gegevens.
- Zet geen overbodige medische details in vrije tekst.
- Spreek af wie admin is en wie exports mag maken.
- Spreek af dat exports alleen beveiligd worden opgeslagen en gedeeld.
- Gebruik voor fysiotherapeuten de rol `PHYSIOTHERAPIST`, voor sociaalspreekuurprofessionals `SOCIAAL` en voor de praktijkmanager `DATA_MANAGER`.
- Positioneer de app als pilotinstrument, niet als definitief product.

## Antwoord op de vraag: "Kan dit in deze pilotvorm?"

**Ja, voor een beperkte en zorgvuldig begeleide pilot kan het, mits je minimale gegevens gebruikt en duidelijke afspraken maakt.**

**Nee, het is op dit moment nog niet eerlijk om dit als volledig waterdichte of volledig productieklare oplossing voor gevoelige cliëntdata te positioneren.**

Dat betekent concreet:

- klein aantal gebruikers
- duidelijke afspraken
- minimale datavastlegging
- terughoudend gebruik van vrije notities
- geen brede uitrol zonder extra security- en compliance-ronde

## Aanbevolen vervolgstappen

1. Verwijder publieke testinlog of vervang die door veilige pilottoegang.
2. Herzie standaardwachtwoorden en accountuitgifte.
3. Leg afspraken vast over bewaartermijn, exportgebruik en beheer.
4. Beoordeel of aanvullende technische maatregelen nodig zijn voor structurele inzet.
5. Maak een korte gebruikersinstructie voor huisartsen en sociaal domein over wat wel en niet in notities hoort.
