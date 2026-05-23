/**
 * ═══════════════════════════════════════════════════════
 * MLBB TOURNAMENT HUB — Configuration
 * ═══════════════════════════════════════════════════════
 * 
 * SETUP INSTRUCTIONS:
 * 1. Create a GitHub repository for your tournament data
 *    (can be the same repo or a separate one)
 * 2. Update GITHUB_REPO below with "username/repo-name"
 * 3. Set your admin username and password
 * 4. Push to GitHub Pages
 * 
 * Your GitHub Personal Access Token is entered at login.
 * ═══════════════════════════════════════════════════════
 */

const SITE_CONFIG = {
  title: 'MLBB Tournament Hub',
  season: 'Season 2025',
  description: 'The premier MLBB tournament platform'
};

// ── GitHub Database Settings ────────────────────────────
// This is the repo where tournament data (JSON files) will be stored.
// Format: "your-github-username/your-repo-name"
const GITHUB_REPO = 'https://github.com/itsgamer2o24/Mlbb';
qq
// The branch to read/write data on
const GITHUB_BRANCH = 'main';

// Path prefix for data files inside the repo
const DATA_PATH = 'data';

// ── Admin Credentials ───────────────────────────────────
// Change these before deploying!
const ADMIN_CONFIG = {
  username: 'admin',
  password: 'admin123'   // ← CHANGE THIS
};
