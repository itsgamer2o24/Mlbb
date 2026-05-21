# ⚔️ MLBB Clash — Tournament Bracket

A fully self-contained **Mobile Legends Bang Bang** tournament bracket website, ready for **GitHub Pages**.

## 🚀 Deploy to GitHub Pages (3 steps)

1. **Create a new GitHub repo** (e.g. `mlbb-tournament`)
2. **Upload `index.html`** to the root of the repo
3. Go to **Settings → Pages → Source → Deploy from branch → `main` / `(root)`**

Your site will be live at:
```
https://<your-username>.github.io/<repo-name>/
```

---

## 🔑 Admin Login

Default password: **`admin123`**

> To change it, open `index.html` and find line:
> ```js
> const ADMIN_PASS = 'admin123';
> ```
> Replace with your own password.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🏆 Bracket | Visual single-elimination bracket with live/done/upcoming match states |
| 👥 Teams | Team cards with seeding, region, W/L, KDA |
| 📅 Schedule | Full match schedule with date/time and status badges |
| 📊 Standings | Ranked table with win-rate bars and points |
| ℹ️ Info | Prize pool, tournament rules, timeline |
| 🔑 Admin Panel | Password-protected — add/remove teams, set results, generate bracket |
| 🎰 Auto Spin | Animated wheel that randomly seeds teams into the bracket |

---

## 📁 File Structure

```
mlbb-tournament/
└── index.html   ← entire app (HTML + CSS + JS in one file)
└── README.md
```

Single file = zero dependencies, zero build step, works on GitHub Pages instantly.

---

## 🛠️ Customization

| What | Where in `index.html` |
|---|---|
| Admin password | `const ADMIN_PASS = 'admin123'` |
| Default teams | `let teams = [...]` array |
| Default bracket | `let bracket = {...}` object |
| Prize pool amounts | Info section HTML |
| Tournament name | Status bar + admin field |
