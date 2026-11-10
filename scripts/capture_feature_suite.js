import puppeteer from '../frontend/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE_URL = 'http://localhost:5173';
const SCREENSHOT_DIR = path.resolve(__dirname, '../screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function run() {
  console.log('Capturing EventXTracker Feature Suite Screenshots...');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  try {
    // 1. Student Dedicated Login
    console.log('1. Capturing Student Login...');
    await page.goto(`${BASE_URL}/student/login`, { waitUntil: 'networkidle0' });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '35_student_login_portal.png') });

    // 2. Faculty Dedicated Login
    console.log('2. Capturing Faculty Login...');
    await page.goto(`${BASE_URL}/faculty/login`, { waitUntil: 'networkidle0' });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '36_faculty_login_portal.png') });

    // 3. Faculty Dashboard - Create Event Tab with all new controls
    console.log('3. Logging into Faculty Portal & Capturing Create Event Tab...');
    await page.waitForSelector('input[type="email"]');
    await page.type('input[type="email"]', 'faccse01@vvce.ac.in');
    await page.type('input[type="password"]', 'LwlRytDXLJZy1XBN');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {});
    await new Promise(r => setTimeout(r, 1500));

    // Click "Create Event" tab
    const createTabBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find(b => b.textContent && b.textContent.includes('Create Event'));
    });
    if (createTabBtn) {
      await createTabBtn.click();
      await new Promise(r => setTimeout(r, 800));
    }
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '37_faculty_create_event_enhanced.png'), fullPage: true });

    // 4. Student Dashboard
    console.log('4. Logging into Student Portal...');
    await page.goto(`${BASE_URL}/student/login`, { waitUntil: 'networkidle0' });
    await page.evaluate(() => localStorage.clear());
    await page.goto(`${BASE_URL}/student/login`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('input[type="email"]');
    await page.type('input[type="email"]', 'vvcecse0001@vvce.ac.in');
    await page.type('input[type="password"]', 'QUGXl4lzVz-IJDzR');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {});
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '38_student_dashboard_overview.png'), fullPage: true });

    // 5. Student Event Detail - Teams Tab (Pitch Deck & Single Dept Rule)
    console.log('5. Capturing Event Detail Teams Tab...');
    await page.goto(`${BASE_URL}/student/events/1`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1000));
    const teamsTabBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find(b => b.textContent && b.textContent.includes('Teams'));
    });
    if (teamsTabBtn) {
      await teamsTabBtn.click();
      await new Promise(r => setTimeout(r, 800));
    }
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '39_event_detail_teams_tab.png'), fullPage: true });

    // 6. Student Event Detail - Volunteers Tab (Verified Auto-fill & Phone)
    console.log('6. Capturing Event Detail Volunteers Tab...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(btn => btn.textContent && btn.textContent.includes('Volunteers'));
      if (b) b.click();
    });
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '40_event_detail_volunteers_tab.png'), fullPage: true });

    console.log('All screenshots captured successfully!');
  } catch (err) {
    console.error('Audit capture encountered error:', err);
  } finally {
    await browser.close();
  }
}

run();
