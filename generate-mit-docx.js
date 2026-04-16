const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle, TabStopPosition, TabStopType } = require("docx");
const fs = require("fs");

function h1(text) { return new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text, bold: true })] }); }
function h2(text) { return new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text, bold: true })] }); }
function h3(text) { return new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun({ text, bold: true })] }); }
function p(text) { return new Paragraph({ children: [new TextRun(text)], spacing: { after: 120 } }); }
function pBold(label, text) { return new Paragraph({ children: [new TextRun({ text: label, bold: true }), new TextRun(text)], spacing: { after: 120 } }); }
function bullet(text) { return new Paragraph({ children: [new TextRun(text)], bullet: { level: 0 }, spacing: { after: 60 } }); }
function empty() { return new Paragraph({ children: [] }); }

function nawTable(rows) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(([label, value]) => new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: label, bold: true })] })], width: { size: 30, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun(value)] })], width: { size: 70, type: WidthType.PERCENTAGE } }),
      ]
    }))
  });
}

function riskTable() {
  const header = new TableRow({
    children: ["Risico", "Impact", "Beheersmaatregel"].map(t => new TableCell({
      children: [new Paragraph({ children: [new TextRun({ text: t, bold: true })] })],
      shading: { fill: "D9E2F3" }
    }))
  });
  const rows = [
    ["Lage respons stakeholderinterviews", "Onvoldoende data voor adoptieanalyse", "Gebruik bestaand netwerk Beweeg Mee; sneeuwbalmethode"],
    ["Juridische complexiteit groter dan verwacht", "Vertraging", "Scope beperken tot hoofdvragen; extern adviseur als fallback"],
    ["Betalingsbereidheid laag", "Negatief go/no-go", "Valide uitkomst — doel is objectieve analyse"],
    ["Beperkte beschikbaarheid pilotgebruikers", "Vertraging validatie", "Flexibele planning; parallel aan andere fasen"],
  ].map(([a,b,c]) => new TableRow({
    children: [a,b,c].map(t => new TableCell({ children: [new Paragraph({ children: [new TextRun(t)] })] }))
  }));
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [header, ...rows] });
}

function budgetTable() {
  const header = new TableRow({
    children: ["Kostenpost", "Uren", "Tarief", "Bedrag"].map(t => new TableCell({
      children: [new Paragraph({ children: [new TextRun({ text: t, bold: true })] })],
      shading: { fill: "D9E2F3" }
    }))
  });
  const rows = [
    ["Externe projectleider (LS) — deskresearch, stakeholderanalyse, marktverkenning, businessmodel, juridische quickscan, rapportage", "~100 uur", "€125/u", "€12.500"],
    ["Interne uren Fy-fit (Marion, Tom) — interviews, validatie, coördinatie", "~100 uur", "€50/u", "€5.000"],
    ["Overige kosten (reiskosten, licenties)", "—", "—", "€2.500"],
  ].map(([a,b,c,d]) => new TableRow({
    children: [a,b,c,d].map(t => new TableCell({ children: [new Paragraph({ children: [new TextRun(t)] })] }))
  }));
  const totals = [
    ["Totaal subsidiabele kosten", "", "", "€20.000"],
    ["Subsidie (40%)", "", "", "€8.000"],
    ["Eigen bijdrage Fy-fit", "", "", "€12.000"],
  ].map(([a,b,c,d]) => new TableRow({
    children: [
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: a, bold: true })] })] }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun(b)] })] }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun(c)] })] }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: d, bold: true })] })] }),
    ]
  }));
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [header, ...rows, ...totals] });
}

function timeTable() {
  const header = new TableRow({
    children: ["Maand", "Fase", "Type"].map(t => new TableCell({
      children: [new Paragraph({ children: [new TextRun({ text: t, bold: true })] })],
      shading: { fill: "D9E2F3" }
    }))
  });
  const rows = [
    ["1-3", "Deskresearch en contextanalyse", "Haalbaarheidsstudie"],
    ["2-5", "Stakeholderonderzoek en adoptieanalyse", "Haalbaarheidsstudie"],
    ["4-7", "Marktverkenning en businessmodel", "Haalbaarheidsstudie"],
    ["7-9", "Synthese en go/no-go", "Haalbaarheidsstudie"],
  ].map(([a,b,c]) => new TableRow({
    children: [a,b,c].map(t => new TableCell({ children: [new Paragraph({ children: [new TextRun(t)] })] }))
  }));
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [header, ...rows] });
}

const doc = new Document({
  sections: [{
    children: [
      h1("Model projectplan MIT Haalbaarheid"),
      empty(),
      p("Om uw subsidieaanvraag goed te kunnen beoordelen vragen wij u gebruik te maken van dit modelprojectplan. Na het invullen hiervan, moet u het projectplan uploaden bij uw subsidieaanvraag."),
      empty(),

      // NAW Aanvrager
      h2("NAW gegevens aanvrager"),
      nawTable([
        ["Bedrijf", "Fy-fit (Fysiotherapie Nijmegen)"],
        ["Contactpersoon", "Marion Brouwer"],
        ["Plaats", "Nijmegen"],
        ["Website", "fysiotherapienijmegen.nl"],
        ["E-mail adres", "marion@fysiotherapienijmegen.nl"],
      ]),
      empty(),

      // NAW Intermediair
      h2("NAW gegevens intermediair"),
      nawTable([
        ["Intermediair", "LS Project- en innovatiemanagement in de eerstelijnszorg"],
        ["Contactpersoon", "Luuk Smeekens"],
        ["Plaats", "Lent"],
        ["E-mail adres", "luuk.smeekens@outlook.com"],
      ]),
      empty(),

      // Algemene gegevens
      h2("Algemene gegevens project"),
      pBold("Projecttitel: ", "Haalbaarheidsonderzoek WijkConnect — Digitale verwijsroute tussen eerstelijnszorg en sociaal domein in de wijk"),
      empty(),
      pBold("Samenvatting project: ", "Fy-fit opereert als kartrekker van het samenwerkingsverband Beweeg Mee Dukenburg, waarin huisarts, fysiotherapeut en sociaal domein samenwerken rondom kwetsbare wijkbewoners. In de dagelijkse praktijk blijkt verwijzing en terugkoppeling tussen zorg- en welzijnsprofessionals gefragmenteerd, onbetrouwbaar en tijdrovend. Dit haalbaarheidsproject onderzoekt of een digitale verwijsroute (WijkConnect) technisch, organisatorisch, juridisch en economisch haalbaar is als structureel instrument voor domeinoverstijgende samenwerking in de wijk. Centraal staat de vraag of dit model opschaalbaar is naar andere wijken en regio's. Het onderzoek combineert deskresearch, stakeholderanalyse, marktverkenning en een beperkte technische pilotvalidatie."),
      empty(),
      pBold("Startdatum project: ", "[invullen — bijv. 1 mei 2026]"),
      pBold("Einddatum project: ", "[invullen — max. 1 jaar na start]"),
      empty(),

      // Beschrijving organisatie
      h3("Beschrijf kort uw organisatie"),
      p("Fy-fit is een eerstelijns fysiotherapiepraktijk gevestigd in Nijmegen (Dukenburg) met circa 35 medewerkers (KvK 52586790). De kernactiviteiten omvatten fysiotherapeutische zorg, het beweegspreekuur en actieve deelname aan wijkgerichte samenwerkingsverbanden. De onderneming heeft geen verbonden ondernemingen en valt ruim binnen de MKB-grenzen."),
      p("Fy-fit onderscheidt zich door een sterke oriëntatie op de verbinding tussen eerstelijnszorg en het sociaal domein. Als kartrekker van Beweeg Mee Dukenburg — een samenwerkingsverband met Huisartsenpraktijk De Schakel, Bindkracht10 (welzijnscoach), Buurtteams Volwassenen/Incluzio, GGD, Gemeente Nijmegen en zorgverzekeraar VGZ — heeft Fy-fit directe ervaring opgedaan met domeinoverstijgende samenwerking in de wijk."),
      p("De praktijk heeft geen eerdere ervaring met subsidies van Provincie Gelderland. Wel is Fy-fit onderdeel van een netwerk waarin innovatieprojecten in de eerstelijnszorg worden uitgevoerd (o.a. via SLIM-subsidie, STOZ-trajecten)."),
      empty(),

      // Aanleiding en KIA
      h2("Aanleiding en aansluiting bij de Kennis en Innovatie Agenda (KIA)"),
      h3("Wat zijn de aanleiding en reden voor uw project?"),
      p("Fy-fit is als fysiotherapiepraktijk kartrekker van Beweeg Mee Dukenburg, een wijkgericht samenwerkingsverband waarin huisarts, fysiotherapeut, welzijnscoach en sociaal werker samenwerken rondom kwetsbare wijkbewoners. Wekelijks vindt een Sociaal Spreekuur plaats in Huisartsenpraktijk De Schakel, waar patiënten met psychosociale, financiële of participatieproblemen worden doorverwezen naar het sociaal domein."),
      p("In de praktijk loopt dit samenwerkingsproces vast op drie structurele knelpunten:"),
      bullet("Verwijzing is informeel en foutgevoelig. Overdracht verloopt via beveiligde e-mail, mondeling of per briefje. Er is geen gestandaardiseerd proces, waardoor verwijzingen verloren gaan of vertraagd worden."),
      bullet("Terugkoppeling ontbreekt structureel. De verwijzende zorgprofessional heeft geen zicht op wat er met een verwijzing gebeurt. Dit ondermijnt het vertrouwen in de samenwerking en belemmert continuïteit van zorg."),
      bullet("Opschaling is onmogelijk zonder digitale infrastructuur. Het huidige model is afhankelijk van persoonlijke relaties en fysieke nabijheid. Uitbreiding naar andere wijken is zonder gestructureerde digitale verwijsroute niet realistisch."),
      empty(),
      pBold("Waarom is een haalbaarheidsproject noodzakelijk? ", "De vraag is niet óf digitale verwijzing technisch mogelijk is, maar of deze in de context van wijkgerichte eerstelijnszorg organisatorisch haalbaar is (adopteren professionals uit verschillende domeinen één gedeelde tool?), economisch haalbaar is (wie betaalt structureel?), juridisch haalbaar is bij opschaling (privacy, DPIA, verwerkersovereenkomsten over organisatiegrenzen heen), en overdraagbaar is naar andere wijken en regio's."),
      empty(),
      pBold("Waarom is de subsidie noodzakelijk? ", "Fy-fit is een MKB-praktijk met beperkte middelen voor niet-zorgactiviteiten. Het onderzoek naar haalbaarheid — inclusief stakeholderanalyse, juridische toetsing, marktverkenning en businessmodelontwikkeling — valt buiten de reguliere bedrijfsvoering en financieringsmogelijkheden. Zonder subsidie kan dit onderzoek niet worden uitgevoerd."),
      empty(),

      h3("Wat wilt u bereiken met uw project?"),
      pBold("Hoofddoelstelling: ", "Vaststellen of een digitale verwijsroute tussen eerstelijnszorg en sociaal domein technisch, organisatorisch, juridisch en economisch haalbaar is als structureel samenwerkingsinstrument, en of dit model opschaalbaar is naar andere wijken en regio's."),
      p("Subdoelstellingen:"),
      bullet("1. In kaart brengen van organisatorische randvoorwaarden voor adoptie door professionals uit verschillende domeinen"),
      bullet("2. Ontwikkelen en valideren van minimaal twee verdienmodellen voor structurele financiering"),
      bullet("3. Uitvoeren van een juridische haalbaarheidstoets (privacy, AVG, verwerkersovereenkomsten) voor opschaling"),
      bullet("4. Uitvoeren van een marktverkenning: behoefte bij gemeenten, zorgverzekeraars en eerstelijnspraktijken in andere regio's"),
      bullet("5. Opstellen van een concreet go/no-go advies met implementatieroadmap"),
      empty(),
      p("Fysieke resultaten:"),
      bullet("Haalbaarheidsrapport (technisch, organisatorisch, juridisch, economisch)"),
      bullet("Businesscase met minimaal twee verdienmodellen"),
      bullet("Stakeholderanalyse en adoptieonderzoek"),
      bullet("Juridisch advies (DPIA-raamwerk, verwerkersovereenkomst-template)"),
      bullet("Go/no-go advies met implementatieroadmap voor opschaling"),
      bullet("Marktverkenningsrapport (minimaal 2 regio's)"),
      empty(),

      h3("Beschrijf op welke wijze uw aanvraag aansluit bij de Kennis en Innovatie Agenda"),
      p("Dit project sluit aan bij de KIA Gezondheid & Zorg 2024-2027, specifiek:"),
      pBold("Missie II — De juiste zorg op de juiste plek: ", "De digitale verwijsroute is gericht op het verbinden van eerstelijnszorg met het sociaal domein, zodat patiënten met niet-medische problematiek sneller en effectiever terechtkomen bij de juiste ondersteuning. Dit draagt bij aan substitutie van zorg naar welzijn en aan de-medicalisering."),
      pBold("Missie IV — Gezondheid in de leefomgeving: ", "Beweeg Mee Dukenburg opereert op wijkniveau en verbindt zorg, welzijn en participatie. De digitale verwijsroute ondersteunt een wijkgerichte benadering van gezondheid waarin sociaal-economische determinanten (financiën, eenzaamheid, participatie) worden geadresseerd."),
      pBold("Aansluiting bij het Integraal Zorgakkoord (IZA): ", "Het IZA benadrukt samenwerking tussen domeinen en digitale ondersteuning van zorgprocessen. Een digitale verwijsroute tussen huisarts en sociaal domein is een directe invulling van deze ambitie."),
      pBold("Aansluiting bij KIA Digitalisering: ", "Het project onderzoekt de haalbaarheid van digitale innovatie ter ondersteuning van interprofessionele samenwerking (interoperabiliteit, standaardisatie, adoptie van digitale tools in de zorg)."),
      empty(),

      // Uitvoering
      h2("Uitvoering van het project"),
      p("Het haalbaarheidsproject bestaat voor tenminste 70% uit haalbaarheidsstudie (deskresearch, stakeholderanalyse, marktverkenning, juridisch onderzoek, businessmodelontwikkeling) en voor maximaal 30% uit experimentele ontwikkeling (technische validatie met pilotgebruikers)."),
      empty(),
      h3("Fase 1: Deskresearch en contextanalyse (maand 1-3) — Haalbaarheidsstudie (~30 uur extern)"),
      bullet("Literatuuronderzoek bestaande digitale verwijsoplossingen (inter)nationaal"),
      bullet("Inventarisatie vergelijkbare initiatieven (ZorgDomein, SamenBeter, Verwijsindex, gemeentelijke sociale kaarten, UK social prescribing platforms)"),
      bullet("Analyse beleidskaders: IZA, GALA, Wmo, Zvw — financieringsstructuur"),
      bullet("Concurrentieanalyse en positioneringsbepaling"),
      empty(),
      h3("Fase 2: Stakeholderonderzoek en adoptieanalyse (maand 2-5) — Haalbaarheidsstudie (~30 uur extern + 40 uur intern)"),
      bullet("Interviews pilotgebruikers Beweeg Mee Dukenburg (5 professionals)"),
      bullet("Interviews potentiële gebruikers buiten Dukenburg (minimaal 4: andere wijken/gemeenten)"),
      bullet("Interviews besluitvormers (minimaal 2: gemeente, zorgverzekeraar)"),
      bullet("Analyse adoptiebarrières en -voorwaarden"),
      bullet("Juridische quickscan: AVG-grondslag, DPIA-noodzaak, verwerkingsverantwoordelijkheid"),
      empty(),
      h3("Fase 3: Marktverkenning en businessmodel (maand 4-7) — Haalbaarheidsstudie (~25 uur extern + 20 uur intern)"),
      bullet("Marktverkenning in minimaal 2 regio's buiten Nijmegen"),
      bullet("Ontwikkeling van 2 verdienmodellen (SaaS en gemeentefinanciering)"),
      bullet("Financiële doorrekening per model"),
      bullet("Technische haalbaarheidscheck: eisen voor opschaling (HIS-integratie, multi-tenant)"),
      empty(),
      h3("Fase 4: Synthese en go/no-go (maand 7-9) — Haalbaarheidsstudie (~15 uur extern + 10 uur intern)"),
      bullet("Integratie deelresultaten in haalbaarheidsrapport"),
      bullet("SWOT-analyse en go/no-go advies"),
      bullet("Implementatieroadmap voor vervolgproject"),
      bullet("Presentatie aan samenwerkingspartners"),
      empty(),
      p("Totaal: ~100 uur extern (LS) + ~70 uur intern (Fy-fit) = 9 maanden doorlooptijd"),
      empty(),
      h3("Tijdsplanning"),
      timeTable(),
      empty(),

      // Criteria
      h2("Aansluiting bij de criteria"),
      h3("1. Waarom is uw project innovatief en uniek in Nederland?"),
      pBold("1a. De innovatie is uniek voor Nederland. ", "Er bestaat in Nederland geen geïntegreerde digitale verwijsroute die specifiek is ontworpen voor de overdracht tussen eerstelijnszorg en het informele/formele sociaal domein op wijkniveau, met gestructureerde terugkoppeling naar de verwijzer."),
      p("Bestaande oplossingen richten zich op:"),
      bullet("ZorgDomein: Verwijzingen binnen de zorg (huisarts → specialist). Geen sociaal domein-integratie."),
      bullet("Verwijsindex risicojongeren: Specifiek voor jeugd, signaleringssysteem, geen verwijstool."),
      bullet("Gemeentelijke sociale kaarten (bijv. Wegwijzer024): Informatieportalen, geen verwijsfunctionaliteit met terugkoppeling."),
      bullet("SamenBeter: Netwerkontwikkeling, geen digitale verwijstool."),
      p("WijkConnect combineert drie elementen die afzonderlijk bestaan maar nog niet geïntegreerd zijn aangeboden: (1) digitale verwijzing met gestructureerde terugkoppeling, (2) sociale kaart op wijkniveau (professioneel + informeel aanbod), (3) specifiek ontworpen voor de interface eerstelijnszorg ↔ sociaal domein."),
      empty(),
      pBold("1b. Onderscheid ten opzichte van (inter)nationale ontwikkelingen. ", "Internationaal bestaan vergelijkbare initiatieven in het Verenigd Koninkrijk ('social prescribing' platforms zoals Elemental, Joy) en Australië. Deze zijn echter ontworpen voor andere zorgsystemen en niet toepasbaar in de Nederlandse context met zijn specifieke structuur van huisartsenzorg, Wmo en lokale welzijnsorganisaties. Het haalbaarheidsonderzoek moet uitwijzen of de Nederlandse context deze integratie toelaat."),
      empty(),
      pBold("1c. Technologisch of organisatorisch risico. ", "Het risico is primair organisatorisch: professionals uit verschillende domeinen (zorg, welzijn, gemeente) werken met verschillende systemen, protocollen en culturen. De financieringsstructuur is complex (Zvw vs. Wmo/gemeente). Privacyregelgeving over domeingrenzen heen is een onopgelost vraagstuk."),
      empty(),

      h3("2. Economisch perspectief"),
      pBold("2a. Marktperspectief. ", "De markt is substantieel: ~5.000 huisartsenpraktijken, ~5.500 fysiotherapiepraktijken, 342 gemeenten met elk een sociaal domein. Toenemende druk vanuit IZA en GALA om domeinoverstijgend samen te werken. De behoefte is breed erkend maar nog niet digitaal opgelost."),
      empty(),
      pBold("2b. Verdienmodellen. ", "Drie modellen worden onderzocht: (1) SaaS-model met maandelijks abonnement per samenwerkingsverband (€200-500/maand), (2) Gemeentefinanciering als onderdeel van Wmo/GALA-middelen, (3) Hybride model met praktijkbijdrage, gemeentefinanciering en zorgverzekeraarsondersteuning."),
      empty(),
      pBold("2c. Stappen om marktperspectief inzichtelijk te maken. ", "Interviews met gemeenteambtenaren (Wmo, GALA) in minimaal 2 regio's, gesprekken met zorgverzekeraar(s), inventarisatie van bestaande contractstructuren, analyse van betalingsbereidheid. Fy-fit heeft via Beweeg Mee directe toegang tot potentiële klanten en financiers."),
      empty(),

      h3("3. Technisch-financieel uitvoerbaar"),
      pBold("3a. Realisatie binnen 12 maanden. ", "Het project is opgedeeld in 4 fasen met overlappende doorlooptijden. De activiteiten zijn overwegend deskresearch en interviews, wat geen technische doorlooptijdrisico's met zich meebrengt. Totale doorlooptijd: 9 maanden."),
      empty(),
      p("3b. Vakbekwaamheid uitvoerders:"),
      bullet("Luuk Smeekens (projectleider, extern — LS Project- en innovatiemanagement): Innovatie- en implementatiemanager eerstelijnszorg. Ervaring met subsidieprojecten (SLIM, STOZ), implementatie van digitale zorg, strategievorming in fysiotherapiepraktijken."),
      bullet("Marion Brouwer (Fy-fit, intern): Contactpersoon en projectcoördinator vanuit de praktijk."),
      bullet("Tom van Haaren (Fy-fit, intern): Fysiotherapeut en kartrekker Beweeg Mee. Directe kennis van dagelijkse praktijk en samenwerkingsprocessen."),
      empty(),
      p("3c. Risico's en beheersmaatregelen:"),
      riskTable(),
      empty(),

      h3("4. Impact op KIA Gezondheid & Zorg"),
      pBold("4a. Nieuwe toepassingen. ", "Het project genereert kennis over een nieuw toepassingsgebied: digitale ondersteuning van domeinoverstijgende samenwerking op wijkniveau. Resultaten zijn direct toepasbaar voor andere eerstelijns samenwerkingsverbanden, gemeenten en zorgverzekeraars."),
      empty(),
      pBold("4b. Impact op de KIA. ", "Concreet bewijs over haalbaarheid van digitale domeinoverstijgende verwijzing. Repliceerbare kennis (haalbaarheidsrapport en businesscase). Overbrugging van de kloof tussen beleid (IZA/GALA) en praktijk."),
      empty(),
      pBold("4c. Bijdrage aan missies. ", "Missie II (Juiste zorg op de juiste plek): directe bijdrage door verwijzing van zorg naar welzijn. Missie IV (Gezondheid in de leefomgeving): wijkgerichte samenwerking digitaal ondersteunen. KIA Digitalisering: interoperabiliteit en standaardisatie in domeinoverstijgende zorgprocessen."),
      empty(),

      // Vervolgproject
      h2("Beschrijving vervolgproject"),
      p("Bij een positief haalbaarheidsresultaat voorzien wij:"),
      pBold("Fase 1 — Doorontwikkeling (6-12 maanden na afronding): ", "Ontwikkeling volwaardig product, HIS-integratie via FHIR, multi-tenant architectuur, certificering NEN 7510 / ISO 27001."),
      pBold("Fase 2 — Pilotuitbreiding (12-18 maanden): ", "Uitrol naar 3-5 samenwerkingsverbanden in verschillende gemeenten, evaluatieonderzoek."),
      empty(),
      p("Mogelijke partners:"),
      bullet("Stradigi (Nijmegen) — techpartner, ervaring met digitale zorgoplossingen en FHIR-integratie"),
      bullet("Gemeente Nijmegen — pilotgemeente, GALA-middelen"),
      bullet("VGZ — zorgverzekeraar, betrokken bij Beweeg Mee"),
      bullet("Andere eerstelijnspraktijken en samenwerkingsverbanden via netwerk Fy-fit"),
      empty(),
      pBold("Aanvullende technologie: ", "FHIR-integratie voor HIS-koppeling, eventueel AI-ondersteunde matching (patiëntprofiel → relevant sociaal aanbod)."),
      pBold("Markt: ", "Eerstelijns samenwerkingsverbanden en gemeenten. Positionering als gespecialiseerde, laagdrempelige tool voor wijkgerichte samenwerking — niche die door bestaande oplossingen niet wordt bediend."),
      pBold("Marktstrategie: ", "Start Nijmegen/Gelderland, uitbreiden via netwerken eerstelijnszorg. Focus op gemeenten met GALA-ambities."),
      empty(),

      // Aanvullend
      h2("Aanvullende opmerkingen"),
      p("Fy-fit heeft als kartrekker van Beweeg Mee Dukenburg directe, dagelijkse ervaring met het probleem dat dit haalbaarheidsonderzoek adresseert. Het project komt niet voort uit een theoretische innovatieambitie, maar uit een concreet, ervaren knelpunt in de dagelijkse praktijk van wijkgerichte samenwerking. Dit maakt de onderzoeksvragen scherp, de toegang tot stakeholders direct, en de resultaten onmiddellijk toepasbaar."),
      empty(),

      // Begroting
      h2("Begroting"),
      budgetTable(),
      p("Interne uren Fy-fit tellen als eigen bijdrage. Juridische quickscan (AVG, DPIA, verwerkersovereenkomsten) wordt uitgevoerd door de externe projectleider."),
    ]
  }]
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync("C:\\Users\\luuks\\.openclaw\\workspace\\wijkconnect\\MIT-projectplan-fy-fit-concept.docx", buf);
  console.log("DONE — MIT-projectplan-fy-fit-concept.docx generated");
});
