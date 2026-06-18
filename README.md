# Recycle Me App

Digital scrap pickup management for **Customers**, **Admins**, and **Pickup Boys** — with a built-in **Anti-Scam Fortress** (OTP, mandatory camera photos, GPS geo-fence, 5-minute dispute window, auto-flagging).

## Tech Stack

| Layer | Technology |
|-------|------------|
| Mobile | React Native + Expo (Android) |
| Backend | Node.js + Express |
| Real-time | Firebase Firestore |
| Financial ledger | PostgreSQL |
| Auth | Phone OTP (Firebase) + JWT |
| Push | FCM (+ Twilio SMS fallback) |
| Maps | Google Maps / react-native-maps |

## Project Structure

```
RECYCLE ME APP/
├── backend/          # Express REST API
├── mobile/           # Expo React Native app (RBAC)
├── firebase/         # Firestore & Storage security rules
├── docker-compose.yml
└── .env.example
```

## Prerequisites

- Node.js 18+
- Docker Desktop (for PostgreSQL)
- Expo CLI (`npm install -g expo-cli`) or use `npx expo`
- Android Studio / emulator (optional)
- Firebase project (Auth, Firestore, Storage, FCM)
- Google Maps API key (for production maps)

## Local Setup

### 1. Clone & configure environment

```bash
cp .env.example .env
# Edit .env with your Firebase, Twilio, and Maps keys
```

Place Firebase service account JSON at `backend/firebase-service-account.json` (gitignored).

### 2. Start PostgreSQL

```bash
docker-compose up -d
```

### 3. Backend

```bash
cd backend
npm install
npm run migrate
npm run seed
npm run dev
```

API runs at `http://localhost:3001`

### 4. Mobile app

```bash
cd mobile
npm install
npx expo start
```

Press `a` for Android emulator. For physical device, set `EXPO_PUBLIC_API_URL` to your machine's LAN IP (e.g. `http://192.168.1.5:3001/api`).

### Dev login (no Firebase required)

Use seed phone numbers:

| Role | Phone | Name |
|------|-------|------|
| Admin | 9999900001 | Admin User |
| Customer | 9999900002 | Rajesh Kumar |
| Customer | 9999900003 | Priya Sharma |
| Pickup Boy | 9999900004 | Ramu Singh |
| Pickup Boy | 9999900005 | Suresh Patel |

## Anti-Scam Fortress (Server-Enforced)

1. **OTP Verification** — 4-digit OTP to customer before completion
2. **Mandatory Photos** — Camera-only (no gallery); scale + vehicle photos required
3. **Instant Receipt + Dispute** — 5-minute dispute window post-completion
4. **Auto-Flagging** — RED alert if actual weight < 50% of estimated
5. **GPS Geo-Fencing** — Must be within 100m of customer address to complete

## API Endpoints (Summary)

- `POST /api/auth/verify` — Login after Firebase OTP
- `POST /api/auth/dev-login` — Dev-only login (non-production)
- `GET/POST /api/users` — User CRUD (admin)
- `GET/POST /api/orders` — Orders lifecycle
- `POST /api/orders/:id/request-otp` — Send completion OTP
- `POST /api/orders/:id/complete` — Full anti-scam completion
- `POST /api/orders/:id/dispute` — Customer dispute (5 min window)
- `GET/PATCH /api/rates` — Scrap rates
- `GET /api/dashboard/stats` — Admin dashboard

## Firebase Rules

Deploy rules from `firebase/`:

```bash
firebase deploy --only firestore:rules,storage
```

## Build Android APK (EAS)

```bash
cd mobile
npm install -g eas-cli
eas build -p android --profile preview
```

## Architecture

- **PostgreSQL** = source of truth for money (earnings, commissions, settlements)
- **Firestore** = real-time sync for orders, rates, activity feed
- **Single mobile app** with RBAC — role from DB determines UI after login

## License

Private — Recycle Me App
