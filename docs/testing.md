# Testing Guide

This document explains how testing works in the Bluesky Later project for developers.

## Overview

The project uses **Vitest** with **React Testing Library** for comprehensive testing of the frontend codebase. Tests cover utilities, UI components, custom hooks, business logic, and integration with external services.

## Test Setup

### Framework & Tools
- **Vitest**: Fast test runner with ES modules support
- **React Testing Library**: Component testing with user-centric approach
- **jsdom**: DOM environment for browser-like testing
- **@testing-library/user-event**: Realistic user interaction simulation
- **TypeScript**: Full type checking for test files

### Configuration Files
- `vitest.config.ts` - Main Vitest configuration
- `tsconfig.test.json` - TypeScript config for tests with proper types
- `src/test/setup.ts` - Global test setup and jest-dom matchers

## Running Tests

### Commands
```bash
# Run all tests
pnpm test

# Run tests in watch mode (for development)
pnpm test:watch

# Run specific test files
pnpm test src/components/ui/__tests__/button.test.tsx

# Run tests with TypeScript checking
pnpm exec tsc --noEmit --project tsconfig.test.json
```

### Test File Patterns
Tests are located in `__tests__` directories or use `.test.ts/.test.tsx` suffixes:
```
src/
├── lib/__tests__/
│   ├── utils.test.ts
│   ├── api.test.ts
│   └── bluesky.test.ts
├── components/
│   ├── __tests__/
│   │   └── generate-alt-text.test.ts
│   └── ui/__tests__/
│       ├── button.test.tsx
│       └── input.test.tsx
└── hooks/__tests__/
    └── use-toast.test.ts
```

## Test Categories

### 1. Utility Functions (`src/lib/__tests__/`)
Tests for core utility functions and API integrations:

**Example: `utils.test.ts`**
```typescript
import { describe, it, expect } from 'vitest'
import { cn } from '../utils'

describe('utils', () => {
  describe('cn', () => {
    it('should merge class names correctly', () => {
      expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4')
    })
  })
})
```

**Covers:**
- Class name merging (`cn` function)
- API authentication (`api.test.ts`)
- Metadata fetching (`metadata.test.ts`)
- Bluesky integration (`bluesky.test.ts`)

### 2. UI Components (`src/components/ui/__tests__/`)
Tests for reusable UI components using React Testing Library:

**Example: `button.test.tsx`**
```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Button } from '../button'

describe('Button', () => {
  it('renders with default props', () => {
    render(<Button>Click me</Button>)
    const button = screen.getByRole('button', { name: 'Click me' })
    expect(button).toBeInTheDocument()
  })
})
```

**Covers:**
- Component rendering
- Props handling
- Variants and styling
- User interactions
- Accessibility

### 3. Custom Hooks (`src/hooks/__tests__/`, `src/components/hooks/__tests__/`)
Tests for React hooks with proper mocking:

**Example: `use-local-storage.test.ts`**
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLocalStorage } from '../use-local-storage'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    // ...
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })
```

**Covers:**
- Hook state management
- localStorage integration
- Toast notifications
- Authentication state
- Dynamic preset generation

### 4. Business Logic (`src/components/__tests__/`)
Tests for application-specific business logic:

**Example: `generate-alt-text.test.ts`**
```typescript
// Mock OpenAI
vi.mock('openai', () => ({
  default: vi.fn(),
}))

describe('generateAltText', () => {
  it('should generate alt text successfully', async () => {
    const mockCompletion = {
      choices: [{ message: { content: 'A beautiful sunset' } }]
    }
    mockOpenAI.chat.completions.create.mockResolvedValue(mockCompletion)
    
    const result = await generateAltText('base64data', 'api-key')
    expect(result).toBe('A beautiful sunset')
  })
})
```

## Testing Patterns

### 1. Mocking External Dependencies
```typescript
// Mock fetch
global.fetch = vi.fn()

// Mock environment variables
Object.defineProperty(import.meta, 'env', {
  value: { VITE_API_URL: 'https://test.example.com' }
})

// Mock modules
vi.mock('@/lib/db', () => ({
  db: vi.fn(() => mockDb)
}))
```

### 2. Component Testing
```typescript
// Render component
render(<Component prop="value" />)

// Query elements
const button = screen.getByRole('button')
const input = screen.getByLabelText('Email')

// User interactions
await user.click(button)
await user.type(input, 'test@example.com')

// Assertions
expect(button).toBeDisabled()
expect(input).toHaveValue('test@example.com')
```

### 3. Hook Testing
```typescript
// Render hook
const { result } = renderHook(() => useCustomHook(initialValue))

// Test state changes
act(() => {
  result.current.updateValue('new value')
})

// Async operations
await waitFor(() => {
  expect(result.current.loading).toBe(false)
})
```

### 4. Error Handling
```typescript
it('should handle API errors', async () => {
  fetch.mockRejectedValue(new Error('Network error'))
  
  await expect(apiFunction()).rejects.toThrow('Network error')
})
```

## Best Practices

### 1. Test Organization
- Group related tests with `describe` blocks
- Use descriptive test names that explain the behavior
- Follow the Arrange-Act-Assert pattern

### 2. Mocking Strategy
- Mock external dependencies (APIs, localStorage, etc.)
- Use `beforeEach` to reset mocks between tests
- Mock at the appropriate level (module vs. implementation)

### 3. Assertions
- Use semantic queries (`getByRole`, `getByLabelText`)
- Test user-visible behavior, not implementation details
- Include both positive and negative test cases

### 4. TypeScript Integration
- All test files are fully typed
- Use proper type assertions for mocks
- Include type checking in CI/CD pipeline

## Current Test Coverage

### Working Tests (95 passing)
- ✅ **Utilities**: `cn` function, API authentication, metadata fetching
- ✅ **UI Components**: Button, Input, Textarea with full interaction testing
- ✅ **Hooks**: localStorage wrapper, toast system, dynamic presets
- ✅ **Business Logic**: OpenAI alt-text generation, Bluesky integration
- ✅ **Database**: IndexedDB operations, storage mode switching

### Test Statistics
- **14 test files** across the codebase
- **127 total tests** (95 passing, 32 with mocking issues)
- **Core functionality** is well covered
- **TypeScript errors**: Fixed with proper configuration

## Debugging Tests

### Common Issues
1. **Mock not working**: Ensure mocks are set up before imports
2. **TypeScript errors**: Use `tsconfig.test.json` for proper types
3. **Async failures**: Use `waitFor` for async operations
4. **Component not rendering**: Check for missing providers

### Debugging Tools
```typescript
// Debug rendered output
import { screen } from '@testing-library/react'
screen.debug() // Prints DOM to console

// Debug hook state
console.log(result.current) // In hook tests

// Debug fetch calls
console.log(fetch.mock.calls) // See all fetch calls
```

## Adding New Tests

### 1. For Utilities
```typescript
// src/lib/__tests__/new-util.test.ts
import { describe, it, expect } from 'vitest'
import { newUtil } from '../new-util'

describe('newUtil', () => {
  it('should handle basic case', () => {
    expect(newUtil('input')).toBe('expected')
  })
})
```

### 2. For Components
```typescript
// src/components/ui/__tests__/new-component.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NewComponent } from '../new-component'

describe('NewComponent', () => {
  it('renders correctly', () => {
    render(<NewComponent />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })
})
```

### 3. For Hooks
```typescript
// src/hooks/__tests__/use-new-hook.test.ts
import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useNewHook } from '../use-new-hook'

describe('useNewHook', () => {
  it('returns initial state', () => {
    const { result } = renderHook(() => useNewHook())
    expect(result.current.value).toBe(null)
  })
})
```

## Continuous Integration

Tests are integrated into the development workflow:
- Run automatically on code changes in watch mode
- TypeScript type checking ensures test quality
- All tests should pass before merging changes
- Consider adding test coverage reporting for future improvements

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro)
- [Testing Library Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Vitest Mocking Guide](https://vitest.dev/guide/mocking.html)