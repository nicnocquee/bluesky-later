# Bluesky Later Development Guidelines

This document provides guidelines and instructions for developing and maintaining the Bluesky Later project.

## Package Management

This project uses [pnpm](https://pnpm.io/) for package management. pnpm is a fast, disk space efficient package manager that creates a non-flat node_modules directory structure.

### Installation

If you don't have pnpm installed, you can install it using:

```bash
npm install -g pnpm
```

### Project Setup

The project is set up as a monorepo with the main app and API in separate packages. To install dependencies:

```bash
# Install all dependencies for both packages
pnpm install

# Install dependencies for a specific package
cd api
pnpm install
```

## Build/Configuration Instructions

### Environment Variables

Copy the `env.example` file to `.env` and adjust the values as needed:

```bash
cp env.example .env
```

Key environment variables:
- `VITE_STORAGE_MODE`: Set to `local` for browser mode or `remote` for self-hosted mode
- `VITE_API_URL`: URL of the API server (for self-hosted mode)
- `DATABASE_URL`: PostgreSQL connection string (for self-hosted mode)
- `CRON_SECRET`: Secret key for authenticating cron requests
- `VITE_METADATA_FETCHER_URL`: URL for fetching metadata for social cards
- `VITE_IMAGE_PROXY_URL`: URL for proxying images to avoid CORS issues

### Development

For local development in browser mode:

```bash
pnpm dev
```

For development in self-hosted mode with a local PostgreSQL database:

```bash
pnpm dev:remote
```

To stop the development environment:

```bash
pnpm dev:remote:down
```

### Production Build

To build the project for production:

```bash
pnpm build
```

### Docker Deployment

The project includes several Docker configurations:

1. **Simple deployment** using docker-compose-example.yml:
   ```bash
   docker-compose -f docker-compose-example.yml up -d
   ```

2. **Full deployment** with separate services:
   ```bash
   pnpm prod
   ```

   To stop:
   ```bash
   pnpm prod:down
   ```

## Testing

### Setting Up Tests

To add tests to the project, you can use Vitest, which works well with Vite projects:

```bash
pnpm add -D vitest
```

Add a test script to package.json:

```json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest"
}
```

### Writing Tests

Create a `tests` directory in the project root or within specific components:

```bash
mkdir -p src/tests
```

Example test file (src/tests/example.test.ts):

```typescript
import { describe, it, expect } from 'vitest';

describe('Example test', () => {
  it('should pass', () => {
    expect(1 + 1).toBe(2);
  });
});
```

### Running Tests

```bash
pnpm test
```

## Code Style and Development Guidelines

### TypeScript

The project uses TypeScript for type safety. Make sure to:
- Define proper types for all functions and variables
- Use interfaces for complex objects
- Avoid using `any` type when possible

### ESLint

The project uses ESLint for code linting. The configuration is in `eslint.config.js`.

To run the linter:

```bash
pnpm lint
```

### React Components

- Use functional components with hooks
- Keep components small and focused on a single responsibility
- Use proper prop types

### API Development

The API is built with Express and TypeScript:
- Routes are defined in separate files
- Database queries use the pg package
- Authentication is handled via app passwords from Bluesky

## Project Structure

- `/src`: Frontend code (React, Vite)
- `/api`: Backend API server (Express, TypeScript)
- `/public`: Static assets
- `/.junie`: Project documentation and guidelines

## Docker Images

The project includes several Dockerfile configurations:
- `Dockerfile.api`: Builds only the API server
- `Dockerfile.frontend`: Builds only the frontend
- `Dockerfile.combined`: Builds both frontend and API in a single image

All Docker configurations have been updated to use pnpm instead of npm.