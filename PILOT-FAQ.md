# WijkConnect Pilot FAQ

## 1. Is dit bedoeld voor een pilot of voor definitief gebruik?

Voor een pilot. De huidige versie is geschikt om de werkwijze in een kleine setting te testen. Voor structurele inzet met gevoelige cliëntdata zijn nog aanvullende stappen nodig.

## 2. Is de app beveiligd?

Ja, op basisniveau wel:

- toegang via inloggen
- rolgebaseerde toegang
- HTTPS
- logging van belangrijke acties

Maar: dit is nog geen volledig afgeronde productie- en compliance-oplossing.

## 3. Waar staat de data?

De app draait op Vercel. De applicatiedata staat in een PostgreSQL-database. In de huidige configuratie wijst de database naar een omgeving in `eu-central-1` (waarschijnlijk Frankfurt).

## 4. Welke gegevens slaan jullie op?

- casusnummer
- initialen
- geboortejaar
- optioneel telefoonnummer
- thema's
- toelichting
- statusupdates en terugkoppelingen
- gebruikersgegevens van professionals

## 5. Slaan jullie medische gegevens op?

De app is daar niet voor bedoeld. Het uitgangspunt van de pilot is dat alleen minimale, functionele gegevens worden vastgelegd en dat overbodige medische details niet in vrije tekst worden gezet.

## 6. Is dit AVG-proof?

Dat moet je in deze fase niet te stellig claimen. Het is beter om te zeggen:

"We gebruiken dit als pilot in een kleine setting, met minimale gegevens en duidelijke afspraken. Voor bredere structurele inzet willen we eerst aanvullende technische en organisatorische maatregelen formaliseren."

## 6a. Is het waterdicht als we alleen invullen wat nu in de tool kan?

Nee, "waterdicht" zou ik niet zeggen.

Wel geldt:

- het risico wordt kleiner als je alleen minimale gegevens invult
- het voor een kleine, gecontroleerde pilot veel beter verdedigbaar is
- het in die vorm bruikbaar is om de workflow te testen

De eerlijke samenvatting is:

"Voor een kleine pilot met minimale gegevens en duidelijke afspraken is dit verantwoord genoeg om te testen, maar het is nog niet bedoeld als volledig waterdichte productieomgeving voor brede inzet met gevoelige cliëntdata."

## 7. Wie kan de gegevens zien?

Alleen ingelogde gebruikers binnen hun rol. Verwijzers zien hun eigen casussen, sociaal professionals hun toegewezen casussen, en admins hebben bredere toegang voor beheer en evaluatie.

## 8. Kun je data exporteren?

Ja. Admins kunnen verwijzingen en terugkoppelingen exporteren als CSV en PDF. Dat is handig voor evaluatie, maar vraagt ook extra zorg: exports zijn lokale kopieën en moeten veilig worden opgeslagen en gedeeld.

## 9. Kunnen we dit in de pilot gebruiken?

Ja, mits:

- de pilot klein en afgebakend blijft
- minimale gegevens worden vastgelegd
- vrije tekst terughoudend wordt gebruikt
- er duidelijke afspraken zijn over beheer en export

## 10. Wat moet er nog gebeuren voor bredere inzet?

- verdere aanscherping van account- en wachtwoordbeleid
- aanvullende privacy- en governance-afspraken
- duidelijke bewaartermijnen en exportafspraken
- extra security-ronde vóór structurele productie-inzet
