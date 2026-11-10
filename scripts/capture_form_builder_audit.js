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
  console.log('1. Setting up event and form data via backend API...');
  
  // Faculty login via API
  const facLoginRes = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'faccse01@vvce.ac.in', password: 'LwlRytDXLJZy1XBN' })
  });
  const facAuth = await facLoginRes.json();
  const facToken = facAuth.access_token;
  console.log('Faculty logged in successfully.');

  // Create an event for the form builder audit
  const evRes = await fetch(`${BACKEND_URL}/api/v1/events/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${facToken}`
    },
    body: JSON.stringify({
      name: 'VVCE Grand Hackathon 2026',
      description: 'Annual college-wide multi-track innovation hackathon with custom questionnaire screening.',
      event_type: 'HACKATHON',
      tier: 'COLLEGE',
      start_at: '2026-11-20T09:00:00Z',
      end_at: '2026-11-21T18:00:00Z',
      individual_enabled: true,
      team_enabled: true,
      min_team_size: 2,
      max_team_size: 4,
      max_participants: 200,
      department_eligibility: ['CSE', 'ISE', 'AIML', 'EC', 'EEE', 'ME', 'CV'],
      semester_eligibility: [4, 5, 6, 7, 8]
    })
  });
  const evData = await evRes.json();
  const eventId = evData.id;
  console.log(`Created Event ID: ${eventId}`);

  // Questions for v1: 6 diverse types, options, required, and conditional logic
  const questions_v1 = [
    {
      id: 'q_legal_name',
      type: 'short_text',
      title: 'Full Legal Name',
      description: 'As registered in institutional records',
      placeholder: 'e.g. Rahul Sharma',
      required: true,
      min_length: 3,
      max_length: 50
    },
    {
      id: 'q_alt_email',
      type: 'email',
      title: 'Secondary Contact Email',
      description: 'For emergency notifications and team communications',
      placeholder: 'student@example.com',
      required: true
    },
    {
      id: 'q_track',
      type: 'dropdown',
      title: 'Primary Innovation Track',
      description: 'Select the domain your project will address',
      placeholder: 'Choose track...',
      required: true,
      options: ['AI & Autonomous Agents', 'Web3 & Decentralized Apps', 'Cybersecurity & Privacy', 'CleanTech & Smart Campus']
    },
    {
      id: 'q_own_laptop',
      type: 'yes_no',
      title: 'Will you bring your own development laptop?',
      description: 'College provides power and lab facilities',
      required: true
    },
    {
      id: 'q_laptop_os',
      type: 'single_choice',
      title: 'Laptop Operating System',
      description: 'Required if bringing your own development machine',
      required: true,
      options: ['macOS (Apple Silicon)', 'Ubuntu / Linux', 'Windows 11'],
      conditional: {
        depends_on_question_id: 'q_own_laptop',
        operator: 'equals',
        value: 'Yes'
      }
    },
    {
      id: 'q_skill_rating',
      type: 'rating',
      title: 'Self-Assessed Full-Stack Competence',
      description: 'Rate your full-stack development capability (1 to 5 stars)',
      required: false,
      rating_max: 5
    }
  ];

  // Publish Form v1
  const pubRes = await fetch(`${BACKEND_URL}/api/v1/events/${eventId}/form`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${facToken}`
    },
    body: JSON.stringify({
      title: 'VVCE Grand Hackathon 2026 Registration Questionnaire',
      description: 'Complete the screening form below. All required questions must be answered truthfully.',
      questions: questions_v1
    })
  });
  const pubData = await pubRes.json();
  console.log(`Published Form v${pubData.version}`);

  console.log('2. Launching browser for visual audit...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();

  async function snap(filename, width = 1440, height = 900) {
    await page.setViewport({ width, height });
    await new Promise((r) => setTimeout(r, 1200));
    const filepath = path.join(SCREENSHOT_DIR, filename);
    await page.screenshot({ path: filepath, fullPage: false });
    console.log(`Saved screenshot: ${filename} (${width}x${height})`);
  }

  // --- Scenario A: Faculty Form Builder View ---
  console.log('Logging into frontend as Faculty...');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
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

  // Navigate to Event Form Builder tab
  console.log(`Navigating to /events/${eventId}?tab=builder...`);
  await page.goto(`${BASE_URL}/events/${eventId}?tab=builder`, { waitUntil: 'networkidle2' });
  await snap('18_form_builder_desktop.png', 1440, 900);
  await snap('19_form_builder_mobile.png', 390, 844);

  // Click Preview Form button in builder
  console.log('Opening Student Preview Mode...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find(x => x.textContent && x.textContent.includes('Preview Form'));
    if (b) b.click();
  });
  await snap('20_form_builder_preview.png', 1440, 900);

  // Close preview modal
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const closeBtn = btns.find(x => x.textContent === '✕');
    if (closeBtn) closeBtn.click();
  });

  // --- Scenario B: Student Registration View ---
  console.log('Logging in as Student to register...');
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
  await page.type('input[type="email"]', 'vvcecse0001@vvce.ac.in');
  await page.type('input[type="password"]', 'QUGXl4lzVz-IJDzR');
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});

  // Student opens the event register tab
  console.log(`Student opening /events/${eventId}?tab=register...`);
  await page.goto(`${BASE_URL}/events/${eventId}?tab=register`, { waitUntil: 'networkidle2' });
  await snap('21_student_dynamic_form_desktop.png', 1440, 900);
  await snap('22_student_dynamic_form_mobile.png', 390, 844);

  // Submit valid registration via API on behalf of student
  const sLoginRes = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'vvcecse0001@vvce.ac.in', password: 'QUGXl4lzVz-IJDzR' })
  });
  const sAuth = await sLoginRes.json();
  const sToken = sAuth.access_token;

  console.log('Submitting student registration with answers under v1...');
  const regSubmitRes = await fetch(`${BACKEND_URL}/api/v1/events/${eventId}/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sToken}`
    },
    body: JSON.stringify({
      answers: {
        q_legal_name: 'Aditi Rao',
        q_alt_email: 'aditi.rao@example.com',
        q_track: 'AI & Autonomous Agents',
        q_own_laptop: 'Yes',
        q_laptop_os: 'macOS (Apple Silicon)',
        q_skill_rating: 5
      }
    })
  });
  const regResult = await regSubmitRes.json();
  console.log(`Registration submitted successfully: ${regResult.registration_id}`);

  // Refresh page to show Registration Confirmed card
  await page.reload({ waitUntil: 'networkidle2' });
  await snap('23_student_registration_confirmed.png', 1440, 900);

  // --- Scenario C: Faculty Edits Form & Publishes v2 ---
  console.log('Faculty publishing revised Form v2 with new questions...');
  const questions_v2 = [
    ...questions_v1,
    {
      id: 'q_github_url',
      type: 'url',
      title: 'GitHub / Portfolio Profile URL',
      description: 'Provide a link to your public code repositories',
      placeholder: 'https://github.com/username',
      required: true
    },
    {
      id: 'q_stipend_note',
      type: 'currency',
      title: 'Expected Travel Reimbursement / Stipend',
      description: 'Estimated inter-city travel expenses if traveling from outside Mysuru',
      currency_symbol: '₹',
      required: false,
      min: 0,
      max: 10000
    }
  ];

  await fetch(`${BACKEND_URL}/api/v1/events/${eventId}/form`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${facToken}`
    },
    body: JSON.stringify({
      title: 'VVCE Grand Hackathon 2026 - Revised v2 Questionnaire',
      description: 'Updated registration questionnaire with GitHub verification requirement.',
      questions: questions_v2
    })
  });
  console.log('Form v2 published.');

  // Log back in as Faculty to view Version History & Inspect v1 Submission
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
  const fTabs = await page.$$('button');
  for (const t of fTabs) {
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

  // Go to builder tab and click History button
  await page.goto(`${BASE_URL}/events/${eventId}?tab=builder`, { waitUntil: 'networkidle2' });
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find(x => x.textContent && x.textContent.includes('History'));
    if (b) b.click();
  });
  await snap('24_form_version_history_modal.png', 1440, 900);

  // Close history modal
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const closeBtn = btns.find(x => x.textContent === '✕');
    if (closeBtn) closeBtn.click();
  });

  // Go to participants tab to inspect old submission bound to v1
  await page.goto(`${BASE_URL}/events/${eventId}?tab=participants`, { waitUntil: 'networkidle2' });
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find(x => x.textContent && x.textContent.includes('Inspect Answers'));
    if (b) b.click();
  });
  await snap('25_faculty_inspect_old_submission_v1.png', 1440, 900);

  await browser.close();
  console.log('Visual audit complete! All 8 form builder screenshots captured.');
}

run().catch(err => {
  console.error('Error running form builder visual audit:', err);
  process.exit(1);
});
