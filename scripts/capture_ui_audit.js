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
  console.log('Launching browser with Chrome at:', CHROME_PATH);
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();

  // Helper to set viewport and screenshot
  async function snap(filename, width = 1440, height = 900) {
    await page.setViewport({ width, height });
    await new Promise((r) => setTimeout(r, 1200)); // allow render & transitions
    const filepath = path.join(SCREENSHOT_DIR, filename);
    await page.screenshot({ path: filepath, fullPage: false });
    console.log(`Saved screenshot: ${filename} (${width}x${height})`);
  }

  // 1. Login Desktop
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
  await snap('01_login_desktop.png', 1440, 900);
  await snap('02_login_mobile.png', 390, 844);

  // 2. Authority Login Desktop & Mobile
  await page.goto(`${BASE_URL}/authority/login`, { waitUntil: 'networkidle2' });
  await snap('03_authority_login_desktop.png', 1440, 900);
  await snap('04_authority_login_mobile.png', 390, 844);

  // 3. Authority Portal Workflows
  console.log('Logging in as Authority...');
  await page.goto(`${BASE_URL}/authority/login`, { waitUntil: 'networkidle2' });
  await page.type('input[type="email"]', 'dev_authority_1@vvce.ac.in');
  await page.type('input[type="password"]', 'AuthorityDev123!');
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});
  await snap('05_authority_dashboard_desktop.png', 1440, 900);

  // Authority Accounts Tab
  await page.goto(`${BASE_URL}/authority/accounts`, { waitUntil: 'networkidle2' });
  await snap('06_authority_accounts_desktop.png', 1440, 900);

  // Authority Governance Tab
  await page.goto(`${BASE_URL}/authority/departments`, { waitUntil: 'networkidle2' });
  await snap('07_authority_governance_desktop.png', 1440, 900);

  // Authority Audit Tab
  await page.goto(`${BASE_URL}/authority/audit-logs`, { waitUntil: 'networkidle2' });
  await snap('08_authority_audit_desktop.png', 1440, 900);

  // 4. Faculty Portal Workflows
  console.log('Logging in as Faculty...');
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
  // Click Faculty tab
  const tabs = await page.$$('button');
  for (const t of tabs) {
    const text = await page.evaluate(el => el.textContent, t);
    if (text && text.includes('Faculty')) {
      await t.click();
      break;
    }
  }
  await page.type('input[type="email"]', 'faccse01@vvce.ac.in');
  await page.type('input[type="password"]', 'LwlRytDXLJZy1XBN');
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});
  await snap('09_faculty_dashboard_desktop.png', 1440, 900);
  await snap('10_faculty_dashboard_mobile.png', 390, 844);

  // Faculty Events
  await page.goto(`${BASE_URL}/events`, { waitUntil: 'networkidle2' });
  await snap('11_events_directory_desktop.png', 1440, 900);

  // Faculty Academic Reviews
  await page.goto(`${BASE_URL}/faculty/academic-reviews`, { waitUntil: 'networkidle2' });
  await snap('12_faculty_academic_reviews_desktop.png', 1440, 900);

  // 5. Student Portal Workflows
  console.log('Logging in as Student...');
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
  await page.type('input[type="email"]', 'vvcecse0001@vvce.ac.in');
  await page.type('input[type="password"]', 'QUGXl4lzVz-IJDzR');
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});
  await snap('13_student_dashboard_desktop.png', 1440, 900);
  await snap('14_student_dashboard_mobile.png', 390, 844);

  // Student Teams
  await page.goto(`${BASE_URL}/student/teams`, { waitUntil: 'networkidle2' });
  await snap('15_student_teams_desktop.png', 1440, 900);

  // Student Academics
  await page.goto(`${BASE_URL}/student/internships`, { waitUntil: 'networkidle2' });
  await snap('16_student_academics_desktop.png', 1440, 900);

  // Student Notifications
  await page.goto(`${BASE_URL}/notifications`, { waitUntil: 'networkidle2' });
  await snap('17_notifications_desktop.png', 1440, 900);

  await browser.close();
  console.log('UI visual audit complete. All screenshots captured.');
}

run().catch(err => {
  console.error('Error running UI audit script:', err);
  process.exit(1);
});
