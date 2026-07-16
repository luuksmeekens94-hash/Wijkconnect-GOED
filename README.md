# WijkConnect

WijkConnect combineert de beveiligde verwijsworkflow met projectmonitoring voor het beweegspreekuur en het sociaal spreekuur.

De monitoring ondersteunt onder meer:

- een vaste weekcapaciteit van 6 plekken voor het beweegspreekuur en 4 voor het sociaal spreekuur;
- ingepland, verschenen, no-show, geannuleerd, open en overboekt per week;
- wekelijkse controle en afsluiting door `ADMIN` of `DATA_MANAGER`;
- vijf versieerbare VEZN-vragenlijsten voor patiënten en professionals;
- beveiligde vragenlijstlinks, Brevo-verzending en één automatische herinnering;
- bezorgstatus, bounce- en afmeldsuppressie, respons en geaggregeerde resultaten;
- automatische verwijdering van versleutelde contactgegevens na de bewaartermijn.

De functionele en privacykeuzes staan uitgebreider in [ADMIN-MONITORING-ONTWERP.md](./ADMIN-MONITORING-ONTWERP.md).

## Lokaal ontwikkelen

```bash
npm ci
cp .env.example .env
npm run db:migrate
npm run dev
```

Kwaliteitscontrole:

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build
```

## Productie op Vercel

Koppel Vercel aan `luuksmeekens94-hash/Wijkconnect-GOED`, branch `main`. De repository stelt via `vercel.json` deze Build Command in:

```text
npm run vercel:build
```

Deze opdracht voert alleen bij `VERCEL_ENV=production` eerst `npm run db:migrate` uit. Preview- en lokale builds wijzigen geen database en voeren alleen de applicatiebuild uit. Maak vóór een productie-merge een databaseback-up en geef previews nooit de productie-`DATABASE_URL`.

## Vragenlijsten verzenden via Brevo

Brevo wordt uitsluitend als transactionele e-mailprovider gebruikt. De antwoorden en rapportages blijven in WijkConnect. Brevo ontvangt alleen het e-mailadres, de neutrale e-mailtekst en een technische correlatiecode; de mail noemt geen patiënt, afspraak, spreekuur, hulpvraag of diagnose.

### Eenmalige inrichting

1. Maak in Brevo een account aan en verifieer een eigen verzenddomein of subdomein.
2. Publiceer de door Brevo opgegeven DKIM- en SPF-records en stel DMARC in. Gebruik daarna dat domein voor `BREVO_SENDER_EMAIL`.
3. Maak een Brevo API-key voor transactionele e-mail. Sla de key uitsluitend als versleutelde Vercel-variabele op, nooit in GitHub en nooit met het voorvoegsel `NEXT_PUBLIC_`.
4. Voeg alle variabelen uit `.env.example` toe aan de Production-omgeving. Gebruik voor `BREVO_WEBHOOK_SECRET`, `CRON_SECRET` en `SURVEY_TOKEN_SECRET` verschillende willekeurige waarden van minimaal 32 tekens.
5. Maak een transactionele Brevo-webhook naar `https://<APP_URL>/api/webhooks/brevo` voor `delivered`, `hardBounce`, `softBounce`, `blocked`, `spam`, `invalid` en `unsubscribed`. Beveilig deze met Bearer-authenticatie en dezelfde waarde als `BREVO_WEBHOOK_SECRET`.
6. Zet open- en kliktracking in Brevo uit. WijkConnect verwerkt deze events niet.
7. Gebruik een bewaakt adres als `BREVO_REPLY_TO_EMAIL`, zodat een afmeldverzoek per antwoord kan worden verwerkt. Hard bounces, spamklachten en Brevo-afmeldingen blokkeren vervolgverzending automatisch.

Voorbeeld van de webhookconfiguratie:

```json
{
  "url": "https://<APP_URL>/api/webhooks/brevo",
  "type": "transactional",
  "events": ["delivered", "hardBounce", "softBounce", "blocked", "spam", "invalid", "unsubscribed"],
  "auth": { "type": "bearer", "token": "<BREVO_WEBHOOK_SECRET>" }
}
```

Vercel roept dagelijks om 08:00 UTC `/api/cron/survey-reminders` aan. De taak:

- verstuurt maximaal één herinnering na `SURVEY_REMINDER_AFTER_DAYS` dagen;
- slaat geen open- of kliktracking op;
- wist versleutelde e-mailadressen na de ingestelde contactbewaartermijn;
- bewaart alleen fingerprint, suppressiestatus, antwoorden en noodzakelijke audit- en bezorgmetadata.

De verzendroute vereist een ingelogde `ADMIN` of `DATA_MANAGER`. Een patiëntuitnodiging kan alleen bij een daadwerkelijk bezochte, evaluatiegeschikte afspraak worden aangemaakt. Een professional ontvangt per template maximaal één uitnodiging per kalenderkwartaal.

## Adminwachtwoord eenmalig herstellen

Gebruik nooit `prisma db seed` om alleen een wachtwoord te herstellen: de seed kan projectdata wijzigen. Het herstelcommando past uitsluitend een bestaand `ADMIN`-account aan:

```bash
ADMIN_RESET_EMAIL="admin@wijkconnect.nl" \
ADMIN_RESET_PASSWORD="een-uniek-wachtwoord-van-minimaal-14-tekens" \
npm run admin:reset
```

Bij een Vercel-reset blijft de Build Command altijd `npm run vercel:build`. De repositoryconfiguratie in `vercel.json` heeft namelijk voorrang op een handmatige Build Command in het Vercel-dashboard.

1. voeg `ADMIN_RESET_EMAIL` en `ADMIN_RESET_PASSWORD` tijdelijk als versleutelde Production-variabelen toe;
2. start een nieuwe Production-redeployment zonder bestaande buildcache;
3. de productiebuild voert eerst de migraties en daarna automatisch `npm run admin:reset` uit wanneer beide resetvariabelen aanwezig zijn;
4. controleer in de buildlog dat `Adminwachtwoord is bijgewerkt` wordt weergegeven;
5. verwijder direct beide resetvariabelen;
6. start daarna een schone Production-redeployment, zodat de verwijderde geheimen niet meer in de actuele deploymentomgeving aanwezig zijn.

Als slechts één resetvariabele aanwezig is, stopt de productiebuild veilig met een fout. Preview- en lokale builds voeren nooit een adminreset uit. Het script toont of logt nooit het wachtwoord of de hash.
