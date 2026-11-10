import puppeteer from '../frontend/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://127.0.0.1:8000';
const SCREENSHOT_DIR = path.resolve(__dirname, '../screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function run() {
  console.log('Starting Portal Isolation Puppeteer Audit...');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  // 1. Campus Login Single Form (No role selector/tabs)
  console.log('Step 1: Capturing campus login single form...');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '29_campus_login_single_form.png') });
  console.log('Saved 29_campus_login_single_form.png');

  // 2. Reject Authority credentials on Campus Login (/login)
  console.log('Step 2: Submitting authority credentials on campus login...');
  await page.waitForSelector('input[type="email"]');
  await page.type('input[type="email"]', 'dev_authority_1@vvce.ac.in');
  await page.type('input[type="password"]', 'AuthorityDev123!');
  await page.click('button[type="submit"]');
  await page.waitForSelector('.bg-amber-50', { timeout: 5000 });
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '31_campus_login_authority_rejected.png') });
  console.log('Saved 31_campus_login_authority_rejected.png');

  // 3. Reject Student/Faculty credentials on Authority Login (/authority/login)
  console.log('Step 3: Submitting student credentials on authority login...');
  await page.goto(`${BASE_URL}/authority/login`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('input[type="email"]');
  await page.type('input[type="email"]', 'vvcecse0001@vvce.ac.in');
  await page.type('input[type="password"]', 'QUGXl4lzVz-IJDzR');
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => !document.querySelector('button[type="submit"]').textContent.includes('Authenticating'));
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '30_authority_login_cross_login_rejected.png') });
  console.log('Saved 30_authority_login_cross_login_rejected.png');

  // 4. Authenticated Student attempting to access Authority Portal (/authority/dashboard)
  console.log('Step 4: Authenticating student and attempting to open /authority/dashboard...');
  const studRes = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'vvcecse0001@vvce.ac.in', password: 'QUGXl4lzVz-IJDzR' })
  });
  const studData = await studRes.json();
  const studToken = studData.access_token;

  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });
  await page.evaluate((token) => {
    localStorage.setItem('ex_token', token);
    localStorage.setItem('ex_type', 'STUDENT');
  }, studToken);

  await page.goto(`${BASE_URL}/authority/dashboard`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('h1', { timeout: 5000 });
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '26_student_access_denied_authority_portal.png') });
  console.log('Saved 26_student_access_denied_authority_portal.png');

  // 5. Authenticated Faculty attempting to access Authority Portal (/authority/dashboard)
  console.log('Step 5: Authenticating faculty and attempting to open /authority/dashboard...');
  const facRes = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'faccse01@vvce.ac.in', password: 'LwlRytDXLJZy1XBN' })
  });
  const facData = await facRes.json();
  const facToken = facData.access_token;

  await page.evaluate((token) => {
    localStorage.setItem('ex_token', token);
    localStorage.setItem('ex_type', 'FACULTY');
  }, facToken);

  await page.goto(`${BASE_URL}/authority/dashboard`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('h1', { timeout: 5000 });
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '27_faculty_access_denied_authority_portal.png') });
  console.log('Saved 27_faculty_access_denied_authority_portal.png');

  // 6. Authenticated Authority attempting to access Campus Portal (/student/dashboard)
  console.log('Step 6: Authenticating authority and attempting to open /student/dashboard...');
  const authRes = await fetch(`${BACKEND_URL}/api/v1/authority/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'dev_authority_1@vvce.ac.in', password: 'AuthorityDev123!' })
  });
  const authData = await authRes.json();
  const authToken = authData.access_token;

  await page.evaluate((token) => {
    localStorage.setItem('ex_token', token);
    localStorage.setItem('ex_type', 'AUTHORITY');
  }, authToken);

  await page.goto(`${BASE_URL}/student/dashboard`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('h1', { timeout: 5000 });
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '28_authority_access_denied_campus_portal.png') });
  console.log('Saved 28_authority_access_denied_campus_portal.png');

  await browser.close();
  console.log('All 6 isolation screenshots captured successfully!');
}

run().catch((err) => {
  console.error('Audit failed:', err);
  process.exit(1);
});
