// Scrape Wegwijzer024 Dukenburg activities via detail pages + seed into DB
const https = require('https');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://wegwijzer024.nl/activiteiten/';
const FILTER = '?jsf=jet-engine:listing_desktop&meta=locatie_activiteit!is_custom_checkbox:Dukenburg';
const OUT = path.join(__dirname, 'wegwijzer024-parsed.json');

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetch(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function extractActivityLinks(html) {
  // Match links to individual activity pages
  const regex = /href="(https:\/\/wegwijzer024\.nl\/activiteiten\/([a-z0-9][\w-]+)\/)"/gi;
  const links = new Map();
  let m;
  while ((m = regex.exec(html)) !== null) {
    const slug = m[2];
    // Skip non-activity pages
    if (['feed', 'page'].includes(slug) || slug.match(/^\d+$/)) continue;
    links.set(slug, m[1]);
  }
  return [...links.values()];
}

function parseActivityPage(html, url) {
  const result = { url };
  
  // Title from <h1> or og:title
  const ogTitle = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/);
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
  result.title = ogTitle ? ogTitle[1].replace(/ - Wegwijzer024$/, '').trim() 
    : h1Match ? h1Match[1].replace(/<[^>]+>/g, '').trim() : '';

  // Description from og:description or first <p> in content
  const ogDesc = html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]+)"/);
  if (ogDesc) {
    result.description = ogDesc[1].trim();
  } else {
    // Try to find main content text
    const contentMatch = html.match(/<div[^>]*class="[^"]*jet-listing-dynamic-field__content[^"]*"[^>]*>([\s\S]*?)<\/div>/);
    result.description = contentMatch ? contentMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 500) : '';
  }

  // Structured fields - look for "Stadsdeel:", "Kosten:", etc.
  const fieldPatterns = {
    stadsdeel: /Stadsdeel:\s*<\/[^>]+>\s*<[^>]+>([^<]+)/i,
    wijk: /Stadswijk:\s*<\/[^>]+>\s*<[^>]+>([^<]+)/i,
    targetGroup: /Leeftijd doelgroep:\s*<\/[^>]+>\s*<[^>]+>([^<]+)/i,
    costs: /Kosten:\s*<\/[^>]+>\s*<[^>]+>([^<]+)/i,
    referralNeeded: /Verwijzing:\s*<\/[^>]+>\s*<[^>]+>([^<]+)/i,
  };

  // Alternative: simpler text-based extraction
  const textContent = html.replace(/<[^>]+>/g, '\n').replace(/\n+/g, '\n');
  
  const simplePatterns = {
    stadsdeel: /Stadsdeel:\s*(.+)/i,
    wijk: /Stadswijk:\s*(.+)/i,
    targetGroup: /Leeftijd doelgroep:\s*(.+)/i,
    costs: /Kosten:\s*(.+)/i,
    referralNeeded: /Verwijzing:\s*(.+)/i,
  };

  for (const [key, regex] of Object.entries(fieldPatterns)) {
    const match = html.match(regex);
    if (match) {
      result[key] = match[1].trim();
    }
  }

  // Fallback to text-based
  for (const [key, regex] of Object.entries(simplePatterns)) {
    if (!result[key]) {
      const match = textContent.match(regex);
      if (match) result[key] = match[1].trim();
    }
  }

  // Address
  const addrMatch = html.match(/Adres:\s*([^<]+)/i) || textContent.match(/Adres:\s*(.+)/i);
  result.address = addrMatch ? addrMatch[1].trim() : '';

  // Organization - look for "Georganiseerd door" section
  const orgSection = html.match(/Georganiseerd door[\s\S]*?<h\d[^>]*>([\s\S]*?)<\/h\d>/i);
  result.organization = orgSection ? orgSection[1].replace(/<[^>]+>/g, '').trim() : '';

  // Contact email
  const emailMatch = html.match(/[\w.-]+@[\w.-]+\.\w{2,}/);
  result.contactEmail = emailMatch ? emailMatch[0] : '';

  // Contact phone
  const phoneMatch = textContent.match(/(0[0-9]{1,3}[-\s]?[0-9]{6,8}|06[-\s]?[0-9]{8})/);
  result.contactPhone = phoneMatch ? phoneMatch[1].trim() : '';

  // Categories from filter links or tags
  const catMatches = [...html.matchAll(/class="[^"]*jet-listing-dynamic-terms__link[^"]*"[^>]*>([^<]+)/g)];
  result.categories = catMatches.map(m => m[1].trim()).filter(Boolean);

  // Determine referralNeeded boolean
  result.needsReferral = result.referralNeeded ? 
    !result.referralNeeded.toLowerCase().includes('geen') : false;

  return result;
}

// Map scraped categories to WijkConnect themes
function mapThemes(activity) {
  const themes = new Set();
  const text = `${activity.title} ${activity.description} ${(activity.categories || []).join(' ')}`.toLowerCase();
  
  if (text.match(/geld|schuld|financ|budget|belasting|inkomen|uitkering|kringloop|besparen/)) themes.add('FINANCIELE_ZORGEN');
  if (text.match(/eenzaam|ontmoet|samen|café|cafe|koffie|sociaal contact|verbind/)) themes.add('EENZAAMHEID');
  if (text.match(/dagbesteding|participat|meedoen|vrijwillig|activiteit|club|groep/)) themes.add('DAGINVULLING_PARTICIPATIE');
  if (text.match(/beweg|sport|wandel|fiets|gym|yoga|dans|zwem|fitness|volleybal|squash|pilates|hardlopen|atletiek/)) themes.add('BEWEGINGSARMOEDE');
  if (text.match(/psycho|stress|mentaal|depressie|angst|rouw|verlies|nah|hersenletsel|verslaving/)) themes.add('PSYCHOSOCIAAL_STRESS');
  if (text.match(/opvoed|gezin|kind|jeugd|ouder|baby|peuter|kleuter|huiswerk/)) themes.add('OPVOEDING_GEZIN');
  if (text.match(/woon|huis|hulpmiddel|klus|tuin|verhuis|rolstoel/)) themes.add('WONEN_HULPMIDDELEN');
  if (text.match(/werk|baan|sollicit|opleiding|taal|inburger|cv/)) themes.add('WERK_INKOMEN');
  if (text.match(/zingeving|spiritue|meditatie|mindfulness|levens|verhalen|cultuur|kunst|muziek|creatief/)) themes.add('ZINGEVING');
  
  if (themes.size === 0) themes.add('OVERIG');
  return [...themes];
}

async function main() {
  console.log('Fetching listing page...');
  const listPage = await fetch(BASE_URL + FILTER);
  
  const links = extractActivityLinks(listPage);
  console.log(`Found ${links.length} activity links`);
  
  // Also check page 2+
  const pageNums = [...listPage.matchAll(/pagenum=(\d+)/g)].map(m => parseInt(m[1]));
  const maxPage = pageNums.length > 0 ? Math.max(...pageNums) : 1;
  
  for (let p = 2; p <= maxPage; p++) {
    console.log(`Fetching page ${p}...`);
    const html = await fetch(`${BASE_URL}${FILTER}&pagenum=${p}`);
    const moreLinks = extractActivityLinks(html);
    for (const link of moreLinks) {
      if (!links.includes(link)) links.push(link);
    }
    await new Promise(r => setTimeout(r, 500));
  }
  
  console.log(`Total unique: ${links.length} activities`);
  
  const activities = [];
  for (let i = 0; i < links.length; i++) {
    const url = links[i];
    const slug = url.split('/').filter(Boolean).pop();
    console.log(`[${i+1}/${links.length}] ${slug}`);
    try {
      const html = await fetch(url);
      const parsed = parseActivityPage(html, url);
      parsed.themes = mapThemes(parsed);
      if (parsed.title) activities.push(parsed);
      else console.log(`  ⚠ No title found, skipping`);
    } catch (e) {
      console.error(`  ✗ Error: ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 300));
  }
  
  fs.writeFileSync(OUT, JSON.stringify(activities, null, 2), 'utf8');
  console.log(`\nSaved ${activities.length} activities to ${OUT}`);
}

main().catch(e => console.error('Fatal:', e));
