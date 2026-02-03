# Valkyrris Monitor

Earthquake Monitor - Real-time earthquake tracking with Firebase notifications.

**URL:** `monitor.valkyrris.com`

## 🚀 Setup

### 1. GitHub Pages Setup
1. Settings → Pages → Source: GitHub Actions
2. Custom domain: `monitor.valkyrris.com`
3. Add GitHub Secret: `VITE_FIREBASE_CONFIG`

### 2. DNS Setup
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
