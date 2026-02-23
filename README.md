# ChatWeb - Fullstack Real-Time Chat Application

A Discord/Teams-like fullstack chat application built with Vue 3, Express.js, Socket.io, MongoDB, and Redis.

## Features

- **Real-Time Messaging** - Instant message delivery via WebSockets (Socket.io)
- **Channels** - Public and private channels with create/join/leave functionality
- **Threads** - Reply to messages in threaded conversations
- **Reactions** - React to messages with emojis
- **File Upload** - Share images and files with automatic image compression
- **User Management** - Registration, login, profile editing, password change
- **Online Status** - Real-time online/offline indicators
- **Typing Indicators** - See when someone is typing
- **Read Receipts** - Track message read status
- **Search** - Search messages within channels
- **Dark/Light Mode** - Theme toggle with system preference detection
- **Offline Queue** - Messages are queued when offline and sent on reconnect
- **Desktop Notifications** - Browser push notifications for new messages
- **Admin Controls** - Channel moderation: kick/ban members
- **Responsive Design** - Works on desktop and mobile

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vue 3, Pinia, Vue Router, TypeScript |
| Styling | TailwindCSS 3 (dark mode) |
| Backend | Express.js, TypeScript |
| Real-Time | Socket.io with Redis adapter |
| Database | MongoDB (Mongoose ODM) |
| Cache | Redis (online status, pub/sub) |
| Auth | JWT (access + refresh tokens), bcrypt |
| File Upload | Multer, Sharp (image compression) |
| Validation | Zod schemas |
| Testing | Vitest, Vue Test Utils |
| Dev Tools | Vite 4, ts-node-dev, concurrently |

## Prerequisites

- **Node.js** 16+ 
- **MongoDB** 5+ running locally (or MongoDB Atlas)
- **Redis** running locally

## Quick Start

### 1. Install dependencies

```bash
cd chat-web
npm run install:all
```

### 2. Set up the database

```bash
# Make sure MongoDB is running locally on port 27017
# The database will be auto-created on first connection

# Configure environment variables:
# Edit server/.env if needed (defaults work for local MongoDB)

# (Optional) Seed sample data:
npm run db:seed
```

### 3. Start the development servers

```bash
npm run dev
```

This starts:
- **Backend** on http://localhost:3001
- **Frontend** on http://localhost:5173 (with API proxy to backend)

### 4. Open the app

Navigate to **http://localhost:5173** in your browser.

If you ran the seed command, you can log in with:
- `alice@example.com` / `password123`
- `bob@example.com` / `password123`
- `charlie@example.com` / `password123`

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start both server and client in dev mode |
| `npm run install:all` | Install dependencies for root, server, and client |
| `npm run db:seed` | Seed the database with sample data |
| `npm run test` | Run all tests (server + client) |
| `npm run test:server` | Run server tests only |
| `npm run test:client` | Run client tests only |
| `npm run build` | Build the client for production |

## Project Structure

```
chat-web/
├── package.json              # Root: orchestrates server + client
├── server/                   # Express.js Backend
│   ├── src/
│   │   ├── index.ts          # App entry point
│   │   ├── config/           # DB (Mongoose), Redis, env config
│   │   ├── controllers/      # Request handlers
│   │   ├── db/schemas/       # Mongoose schemas (6 collections)
│   │   ├── db/seed.ts        # Database seeder
│   │   ├── middleware/       # Auth, validation, rate limiting, upload
│   │   ├── models/           # Mongoose query methods
│   │   ├── routes/           # Express route definitions
│   │   ├── services/         # Business logic layer
│   │   ├── socket/           # Socket.io handlers (chat, typing, presence)
│   │   ├── types/            # TypeScript type definitions
│   │   └── utils/            # JWT, hashing, logger utilities
│   ├── tests/                # Server tests
│   └── uploads/              # Local file storage
├── client/                   # Vue 3 Frontend
│   ├── src/
│   │   ├── components/       # Vue components
│   │   ├── composables/      # Vue composables
│   │   ├── router/           # Vue Router with auth guards
│   │   ├── services/         # Axios API service layer
│   │   ├── stores/           # Pinia state management
│   │   ├── types/            # TypeScript types
│   │   └── views/            # Page-level components
│   └── tests/                # Client component tests
└── README.md
```

## Environment Variables

See `server/.env.example` for all required environment variables with defaults.

Key variables:
- `MONGODB_URI` - MongoDB connection string (default: `mongodb://localhost:27017/chat_web`)
- `REDIS_HOST` / `REDIS_PORT` - Redis connection
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` - JWT signing secrets

## License

MIT
