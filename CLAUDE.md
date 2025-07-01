# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `pnpm dev` - Start local development server (browser mode using IndexedDB)
- `pnpm dev:remote` - Start development with remote database (spins up Docker containers)
- `pnpm dev:remote:down` - Stop remote development containers
- `pnpm build` - Build frontend for production
- `pnpm lint` - Run ESLint
- `pnpm preview` - Preview production build locally

### API Development (in `api/` directory)
- `cd api && pnpm dev` - Start API server in development mode
- `cd api && pnpm build` - Build API server
- `cd api && pnpm start` - Start built API server

### Testing
- `pnpm test` - Run all tests
- `pnpm test:watch` - Run tests in watch mode

### Production Deployment
- `pnpm prod` - Start production environment with Docker Compose
- `pnpm prod:down` - Stop production containers

## Architecture

This is a Bluesky post scheduler with two operating modes:

### Browser Mode (Default)
- Frontend-only React app using Vite
- Data stored in browser's IndexedDB via Dexie
- Posts sent directly from browser to Bluesky API
- Requires browser tab to stay open for scheduled posts

### Self-Hosted Mode
- Full-stack application with Express API backend
- PostgreSQL database for persistent storage
- Cron-based scheduler runs independently of browser
- Admin authentication for API access

### Key Components

**Frontend (`src/`)**:
- Built with React 19, TypeScript, Tailwind CSS, Shadcn UI
- Database abstraction layer (`src/lib/db/`) supports both local (IndexedDB) and remote (API) storage
- Custom components include DateTimePicker with timezone support and preset functionality
- Image upload with alt-text generation via OpenAI API
- Link preview cards via external metadata service

**Backend (`api/`)**:
- Express server with TypeScript
- PostgreSQL integration for posts and credentials
- Cron endpoint for scheduled post publishing
- CORS-enabled API with basic auth

**Database Schema**:
- Posts: scheduled posts with status tracking, timezone info, rich text formatting
- Credentials: encrypted Bluesky app passwords
- Images: blob references with alt text

### Storage Modes
The app switches between storage modes via `VITE_STORAGE_MODE` environment variable:
- `local`: Uses IndexedDB (browser mode)
- `remote`: Uses API endpoints (self-hosted mode)

### External Dependencies
- Bluesky API via `@atproto/api`
- Timezone handling with `@vvo/tzdb` and `date-fns-tz`
- Image proxy and metadata fetcher services for link previews
- OpenAI for alt-text generation (optional, user-provided API key)

## Testing

The project uses Vitest with React Testing Library for testing:

- **Test files**: Place tests in `__tests__` directories or use `.test.ts/.test.tsx` suffix
- **Test setup**: Configuration in `vitest.config.ts` with setup file at `src/test/setup.ts`
- **Utilities tested**: Core utilities like `cn` function in `src/lib/utils.ts`
- **Components tested**: UI components like Button with variant and prop testing
- **Hooks tested**: Custom hooks like `useLocalStorage` with localStorage mocking
- **Test environment**: jsdom for DOM testing, with globals enabled for describe/it/expect