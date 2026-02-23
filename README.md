# ChatWeb - Frontend-Only Realtime Chat

ChatWeb is now a frontend-only chat application built with Vue 3 and Firebase, optimized for deployment on Vercel.

## Features

- **Realtime Messaging** - Live message updates with Firestore listeners
- **Channels** - Public/private channels with create/join/leave
- **Reactions** - Emoji reactions on messages
- **User Accounts** - Username/password auth with Firebase Auth
- **Presence** - Online/offline user status
- **Typing Indicators** - Live typing state per channel
- **Search** - Channel message search (client-side)
- **Dark/Light Mode** - Theme toggle with persisted preference
- **Desktop Notifications** - Browser notifications for new messages
- **Responsive UI** - Desktop and mobile-friendly layout

## Removed from Legacy Version

The old backend stack and related features were removed:

- Express API, MongoDB, Redis, Socket.io
- Threads
- Polls
- File and image uploads
- Pinned messages
- Read receipts
- Offline queue

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vue 3, Pinia, Vue Router, TypeScript |
| Styling | TailwindCSS 3 |
| Realtime + Database | Firebase Firestore |
| Authentication | Firebase Auth |
| Build Tooling | Vite 4 |
| Testing | Vitest, Vue Test Utils |
| Deployment | Vercel |

## Prerequisites

- **Node.js 20+** (recommended for current Firebase SDK compatibility)
- A **Firebase project** with:
  - Authentication (Email/Password enabled)
  - Cloud Firestore enabled

## Quick Start

### 1. Install dependencies

```bash
cd chat-web
npm run install:all
```

### 2. Configure environment variables

Copy `client/.env.example` to `client/.env.development` and set your Firebase values:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

### 3. (Recommended) Apply Firestore rules

Use the rules in `client/firestore.rules` in your Firebase Console.

### 4. Start local development

```bash
npm run dev
```

Open `http://localhost:5173`.

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start the client app in dev mode |
| `npm run install:all` | Install dependencies (root + client) |
| `npm run test` | Run client tests |
| `npm run test:client` | Run client tests |
| `npm run build` | Build client for production |

## Project Structure

```txt
chat-web/
├── package.json
├── vercel.json
├── client/
│   ├── .env.example
│   ├── firestore.rules
│   ├── src/
│   │   ├── config/           # Firebase initialization
│   │   ├── components/       # Vue UI components
│   │   ├── composables/      # Vue composables
│   │   ├── router/           # Route definitions + guards
│   │   ├── services/         # Firebase service layer
│   │   ├── stores/           # Pinia stores (auth, channels, messages, realtime)
│   │   ├── types/            # Shared frontend types
│   │   └── views/            # Route-level views
│   └── tests/
└── README.md
```

## Vercel Deployment

1. Import the repository in Vercel.
2. Set all `VITE_FIREBASE_*` environment variables in Vercel project settings.
3. Build command: `npm run build`
4. Output directory: `client/dist`
5. The existing `vercel.json` contains SPA rewrite config.

## Notes

- Authentication is implemented as username + password in the UI.
- Internally, Firebase Auth uses a generated email format based on username.
- If tests fail in older Node versions, upgrade to Node 20+.

## License

MIT
