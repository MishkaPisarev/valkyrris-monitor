# Valkyrris Monitor

Earthquake Monitor - Real-time earthquake tracking with Firebase notifications.

**URL:** `monitor.valkyrris.com`

## 🚀 Setup

### 1. Create Repository
1. Create new repository: `valkyrris-monitor`
2. Make it public (for free GitHub Pages)

### 2. Copy Files
Copy these files from `valkyrris-site`:
- `src/monitor/*` → `src/`
- `src/lib/firebase.ts` → `src/lib/firebase.ts`
- Config files: `package.json`, `vite.config.js`, `tsconfig.json`, `tailwind.config.js`, `index.html`
- Dependencies from `package.json`

### 3. Update Files
- Update `src/App.tsx` to only have monitor routes
- Update `vite.config.js` base path
- Update `package.json` name

### 4. GitHub Pages Setup
1. Settings → Pages → Source: GitHub Actions
2. Custom domain: `monitor.valkyrris.com`
3. Add GitHub Secret: `VITE_FIREBASE_CONFIG`

### 5. DNS Setup
Add CNAME record:
```
Type: CNAME
Name: monitor
Value: mishkapisarev.github.io
```

## 📁 Structure
```
valkyrris-monitor/
├── src/
│   ├── lib/
│   │   └── firebase.ts
│   ├── monitor/ (all monitor components)
│   ├── App.tsx
│   └── main.jsx
├── public/
├── .github/workflows/deploy.yml
└── package.json
```
