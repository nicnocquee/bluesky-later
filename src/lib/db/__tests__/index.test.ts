import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createDatabase, db } from '../index'
import { LocalDB } from '../local'
import { RemoteDB } from '../remote'
import superjson from 'superjson'

// Mock dependencies
vi.mock('../local')
vi.mock('../remote')
vi.mock('superjson')

// Mock environment variables
const mockEnv = {
  VITE_STORAGE_MODE: 'local',
}

Object.defineProperty(import.meta, 'env', {
  value: mockEnv,
  configurable: true,
})

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

describe('db/index', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
    // Reset the module-level _db variable by re-importing
    vi.resetModules()
    mockEnv.VITE_STORAGE_MODE = 'local'
  })

  describe('createDatabase', () => {
    it('should create LocalDB when VITE_STORAGE_MODE is local', async () => {
      mockEnv.VITE_STORAGE_MODE = 'local'

      // Import fresh module to reset _db variable
      const { createDatabase: freshCreateDatabase } = await import('../index')
      const result = freshCreateDatabase()

      expect(LocalDB).toHaveBeenCalled()
      expect(result).toBeInstanceOf(LocalDB)
    })

    it('should create RemoteDB when VITE_STORAGE_MODE is remote with credentials', () => {
      mockEnv.VITE_STORAGE_MODE = 'remote'
      const credentials = { username: 'test', password: 'pass' }

      const result = createDatabase(credentials)

      expect(RemoteDB).toHaveBeenCalledWith(credentials)
      expect(result).toBeInstanceOf(RemoteDB)
    })

    it('should create RemoteDB using localStorage credentials when no credentials provided', () => {
      mockEnv.VITE_STORAGE_MODE = 'remote'
      const storedCreds = { username: 'stored', password: 'stored-pass' }
      const wrappedCreds = { type: 'value', value: storedCreds }

      localStorageMock.getItem.mockReturnValue('stored-creds-json')
      ;(superjson.parse as any).mockReturnValue(wrappedCreds)

      const result = createDatabase()

      expect(localStorageMock.getItem).toHaveBeenCalledWith('apiCredentials')
      expect(superjson.parse).toHaveBeenCalledWith('stored-creds-json')
      expect(RemoteDB).toHaveBeenCalledWith(storedCreds)
      expect(result).toBeInstanceOf(RemoteDB)
    })

    it('should return null when remote mode but no credentials available', () => {
      mockEnv.VITE_STORAGE_MODE = 'remote'
      localStorageMock.getItem.mockReturnValue(null)

      const result = createDatabase()

      expect(result).toBeNull()
      expect(RemoteDB).not.toHaveBeenCalled()
    })

    it('should return null when remote mode and credentials are cleared', () => {
      mockEnv.VITE_STORAGE_MODE = 'remote'
      const clearedCreds = { type: 'cleared' }

      localStorageMock.getItem.mockReturnValue('cleared-creds-json')
      ;(superjson.parse as any).mockReturnValue(clearedCreds)

      const result = createDatabase()

      expect(result).toBeNull()
      expect(RemoteDB).not.toHaveBeenCalled()
    })

    it('should reuse existing database instance', () => {
      mockEnv.VITE_STORAGE_MODE = 'local'

      const db1 = createDatabase()
      const db2 = createDatabase()

      expect(db1).toBe(db2)
      expect(LocalDB).toHaveBeenCalledTimes(1)
    })

    it('should reuse existing RemoteDB instance', () => {
      mockEnv.VITE_STORAGE_MODE = 'remote'
      const credentials = { username: 'test', password: 'pass' }

      const db1 = createDatabase(credentials)
      const db2 = createDatabase(credentials)

      expect(db1).toBe(db2)
      expect(RemoteDB).toHaveBeenCalledTimes(1)
    })
  })

  describe('db', () => {
    it('should be a wrapper around createDatabase', () => {
      mockEnv.VITE_STORAGE_MODE = 'local'

      const result = db()

      expect(LocalDB).toHaveBeenCalled()
      expect(result).toBeInstanceOf(LocalDB)
    })
  })

  describe('error handling', () => {
    it('should handle superjson parsing errors gracefully', () => {
      mockEnv.VITE_STORAGE_MODE = 'remote'
      localStorageMock.getItem.mockReturnValue('invalid-json')
      ;(superjson.parse as any).mockImplementation(() => {
        throw new Error('Parse error')
      })

      expect(() => createDatabase()).toThrow('Parse error')
    })

    it('should handle missing localStorage gracefully', () => {
      mockEnv.VITE_STORAGE_MODE = 'remote'
      
      // Mock localStorage to be unavailable
      Object.defineProperty(window, 'localStorage', {
        value: undefined,
        configurable: true,
      })

      expect(() => createDatabase()).toThrow()
    })
  })
})