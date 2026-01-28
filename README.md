# GastroPilot Frontend

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

> Next.js Web-Anwendung für das GastroPilot Restaurant Management System.

## Features

- **Responsive Design** – Mobile-First, optimiert für Tablets
- **Tischplan** – Drag & Drop Tischverwaltung
- **Reservierungen** – Kalenderansicht mit Zeitslots
- **Bestellungen** – Live-Tracking mit Status-Updates
- **Gästeverwaltung** – Vollständige Datenbank
- **Analytics** – Detaillierte Statistiken
- **NFC-Login** – Kontaktlose Authentifizierung

## Tech Stack

| Technologie  | Version | Verwendung             |
| ------------ | ------- | ---------------------- |
| Next.js      | 16      | Framework (App Router) |
| React        | 19      | UI Library             |
| TypeScript   | 5       | Type Safety            |
| Tailwind CSS | 4       | Styling                |
| shadcn/ui    | -       | UI Components          |
| @dnd-kit     | 6       | Drag & Drop            |

## Schnellstart

### Installation

```bash
# Dependencies installieren
npm install

# Environment konfigurieren
cp env.example .env.local

# Development Server
npm run dev
```

### Zugriff

- **App:** http://localhost:3001
- **Backend erforderlich:** http://localhost:8001

## Konfiguration

### Environment Variables

```env
NEXT_PUBLIC_API_URL=http://localhost:8001/api/v1
NEXT_PUBLIC_APP_VERSION=1.0.0
```

## Projektstruktur

```
frontend/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Login-Seiten
│   ├── dashboard/         # Dashboard-Routes
│   │   ├── reservations/
│   │   ├── orders/
│   │   ├── tables/
│   │   └── menu/
│   └── layout.tsx
├── components/            # React-Komponenten
│   ├── ui/               # shadcn/ui
│   └── ...
├── lib/                  # API-Client & Utilities
│   ├── api/
│   └── hooks/
└── public/               # Statische Assets
```

## Scripts

| Befehl          | Beschreibung       |
| --------------- | ------------------ |
| `npm run dev`   | Development Server |
| `npm run build` | Production Build   |
| `npm start`     | Production Server  |
| `npm run lint`  | ESLint             |

## Build & Deployment

### Production Build

```bash
npm run build
npm start
```

### Mit PM2

```bash
pm2 start npm --name "gastropilot-frontend" -- start
```

### Mit Screen

```bash
screen -dmS gastropilot-frontend bash -c "npm start"
```

### Vercel

1. Repository mit Vercel verbinden
2. Environment Variables setzen
3. Deploy

## Authentifizierung

1. Bedienernummer (4-stellig) und PIN eingeben
2. JWT Token wird als HTTP-Only Cookie gespeichert
3. Automatische Token-Erneuerung

## Troubleshooting

### API Connection Error

```bash
# Backend prüfen
curl http://localhost:8001/health

# .env.local prüfen
NEXT_PUBLIC_API_URL=http://localhost:8001/api/v1
```

### Build fehlgeschlagen

```bash
rm -rf node_modules .next
npm install
npm run build
```

### CORS Error

Backend `CORS_ORIGINS` muss Frontend-URL enthalten.

## Lizenz

[MIT](../LICENSE.md)
