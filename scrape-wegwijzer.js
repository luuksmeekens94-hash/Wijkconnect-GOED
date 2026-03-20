// Scrape Wegwijzer024 Dukenburg activities - all pages + detail pages
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE = 'https://wegwijzer024.nl/activiteiten/?jsf=jet-engine:listing_desktop&meta=locatie_activiteit!is_custom_checkbox:Dukenburg';
const OUT = path.join(__dirname, 'wegwijzer024-dukenburg.json');

function fetch(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function extractLinks(html) {
  const regex = /href="(https:\/\/wegwijzer024\.nl\/activiteiten\/[^"]+\/)"/g;
  const links = new Set();
  let m;
  while ((m = regex.exec(html)) !== null) {
    if (!m[1].includes('?') && !m[1].includes('pagenum')) links.add(m[1]);
  }
  return [...links];
}

function extractDetail(html) {
  // Title
  const titleMatch = html.match(/<h1[^>]*class="[^"]*entry-title[^"]*"[^>]*>(.*?)<\/h1>/s) 
    || html.match(/<h1[^>]*>(.*?)<\/h1>/s);
  const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : '';

  // Content area
  const contentMatch = html.match(/<div[^>]*class="[^"]*elementor-widget-theme-post-content[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/);
  const content = contentMatch ? contentMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '';

  // Try to find categories/tags
  const catMatch = html.match(/class="[^"]*jet-listing-dynamic-terms[^"]*"[^>]*>([\s\S]*?)<\/div>/);
  const categories = catMatch ? catMatch[1].replace(/<[^>]+>/g, ',').split(',').map(s => s.trim()).filter(Boolean) : [];

  // Address/location
  const addrMatch = html.match(/(?:Adres|Locatie|Waar)[:\s]*([\w\s\d,.-]+(?:Nijmegen|Dukenburg)[\w\s\d,.-]*)/i);
  const address = addrMatch ? addrMatch[1].trim() : '';

  // Organization
  const orgMatch = html.match(/(?:Organisatie|Aanbieder|Georganiseerd door)[:\s]*([^<\n]+)/i);
  const organization = orgMatch ? orgMatch[1].trim() : '';

  return { title, content: content.substring(0, 500), categories, address, organization };
}

async function scrapeAll() {
  console.log('Fetching page 1...');
  const page1 = await fetch(BASE);
  
  // Find total pages
  const pageNums = [...page1.matchAll(/pagenum=(\d+)/g)].map(m => parseInt(m[1]));
  const maxPage = pageNums.length > 0 ? Math.max(...pageNums) : 1;
  console.log(`Found ${maxPage} pages`);
  
  // Collect all activity links from all pages
  let allLinks = extractLinks(page1);
  
  for (let p = 2; p <= maxPage; p++) {
    console.log(`Fetching page ${p}...`);
    const html = await fetch(`${BASE}&pagenum=${p}`);
    allLinks = allLinks.concat(extractLinks(html));
    await new Promise(r => setTimeout(r, 500)); // be polite
  }
  
  // Deduplicate
  allLinks = [...new Set(allLinks)];
  console.log(`Found ${allLinks.length} unique activities`);
  
  // Scrape each detail page
  const activities = [];
  for (let i = 0; i < allLinks.length; i++) {
    const url = allLinks[i];
    console.log(`Scraping ${i+1}/${allLinks.length}: ${url.split('/').slice(-2, -1)[0]}`);
    try {
      const html = await fetch(url);
      const detail = extractDetail(html);
      detail.url = url;
      activities.push(detail);
    } catch (e) {
      console.error(`Error scraping ${url}: ${e.message}`);
      activities.push({ url, title: '', error: e.message });
    }
    await new Promise(r => setTimeout(r, 300)); // rate limit
  }
  
  fs.writeFileSync(OUT, JSON.stringify(activities, null, 2), 'utf8');
  console.log(`\nDone! Saved ${activities.length} activities to ${OUT}`);
}

scrapeAll().catch(e => console.error('Fatal:', e));
