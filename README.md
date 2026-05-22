# 🏆 MLBB Tournament Hub

A fully-featured MLBB-style tournament management website — runs on **GitHub Pages** with **GitHub as the database**.

---

## ✅ Features

- 🎮 Tournament creation, editing, deletion (Admin)
- 👥 Team registration & management (Admin)
- ⚔️ Match scheduling & result entry (Admin)
- 🗺️ Auto bracket generation (Single Elimination)
- 🔒 Bracket hidden from public until admin reveals it
- 🏅 Leaderboard with win rates & championships
- 📱 Mobile responsive, MLBB dark-gold UI

---

## 🚀 Setup Guide (Step by Step)

### Step 1 — Create Your GitHub Repository

1. Go to [github.com](https://github.com) and log in
2. Click **New repository**
3. Name it `mlbb-tournament` (or anything you want)
4. Set it to **Public**
5. Click **Create repository**

### Step 2 — Upload the Files

Upload all files from this zip keeping the folder structure:

```
mlbb-tournament/
├── index.html
├── tournaments.html
├── tournament.html
├── leaderboard.html
├── _config.yml
├── data/
│   ├── tournaments.json
│   ├── teams.json
│   ├── matches.json
│   └── settings.json
├── css/
│   ├── style.css
│   ├── bracket.css
│   └── admin.css
├── js/
│   ├── config.js
│   ├── github-db.js
│   ├── main.js
│   ├── tournaments.js
│   ├── tournament-detail.js
│   ├── bracket.js
│   ├── leaderboard.js
│   └── admin.js
└── admin/
    ├── login.html
    └── dashboard.html
```

You can drag-and-drop files in the GitHub web UI, or use Git.

### Step 3 — Edit `js/config.js`

Open `js/config.js` and update:

```js
const GITHUB_REPO = 'YOUR_GITHUB_USERNAME/YOUR_REPO_NAME';
// Example: 'jdelacruz/mlbb-tournament'

const ADMIN_CONFIG = {
  username: 'admin',
  password: 'YourSecurePassword'   // ← CHANGE THIS
};
```

### Step 4 — Enable GitHub Pages

1. Go to your repo → **Settings** → **Pages**
2. Under **Source**, select `Deploy from a branch`
3. Choose branch: `main`, folder: `/ (root)`
4. Click **Save**
5. Wait ~2 minutes, then visit: `https://YOUR_USERNAME.github.io/YOUR_REPO_NAME`

### Step 5 — Create a GitHub Personal Access Token

The admin panel needs a token to write data back to GitHub.

1. Go to [github.com/settings/tokens](https://github.com/settings/tokens)
2. Click **Generate new token (classic)**
3. Give it a name: `mlbb-tournament-admin`
4. Check the `repo` scope (full control of private repositories)
5. Click **Generate token**
6. **Copy the token** — you'll only see it once!

### Step 6 — Log In to Admin

1. Visit `https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/admin/login.html`
2. Enter:
   - **Username**: `admin` (or what you set in config.js)
   - **Password**: your password from config.js
   - **GitHub Token**: the token from Step 5
   - **GitHub Repo**: `YOUR_USERNAME/YOUR_REPO_NAME`
3. Click **Login to Admin**

---

## 🎮 How to Run a Tournament

1. **Admin → Tournaments → New Tournament** — fill in name, format, dates, prize
2. **Admin → Teams → Add Team** — add teams and assign to the tournament
3. **Admin → Brackets → Select Tournament → Generate Bracket** — auto-creates all matches
4. **Admin → Matches** — enter scores as matches are played
5. **Admin → Brackets → Make bracket public** — toggle when ready to show players
6. Players visit the public site and see the bracket live!

---

## 🔐 Security Notes

- Admin credentials are stored in `config.js` — keep your repo private if you want to hide them, OR use a separate private repo for data
- The GitHub token is only stored in `sessionStorage` (cleared when browser closes)
- Bracket is hidden from public by default — admin controls visibility per tournament

---

## 🛠️ Customization

| File | What to change |
|------|---------------|
| `js/config.js` | Repo, admin credentials |
| `css/style.css` | Colors, fonts, layout |
| `index.html` | Hero text, tagline |
| `data/settings.json` | Default site settings |

---

## ❓ Troubleshooting

**"Failed to load tournaments"** — Check that `data/tournaments.json` exists in your repo and GITHUB_REPO in config.js is correct.

**Admin saves fail** — Make sure your GitHub token has `repo` write scope and you entered the correct repo name at login.

**Bracket not showing** — Toggle "Make bracket public" in Admin → Brackets for that tournament.

**GitHub Pages 404** — Wait a few minutes after enabling Pages, then hard-refresh.
