import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useAuth } from '../use-auth'
import { useLocalStorage } from '../hooks/use-local-storage'
import { getStoredCredentials } from '@/lib/bluesky'

// Mock dependencies
vi.mock('../hooks/use-local-storage')
vi.mock('@/lib/bluesky')

// Mock environment variables
const mockEnv = {
  VITE_STORAGE_MODE: 'local',
  VITE_API_URL: 'https://api.example.com',
}

Object.defineProperty(import.meta, 'env', {
  value: mockEnv,
  configurable: true,
})

// Mock global fetch
global.fetch = vi.fn()

describe('useAuth', () => {
  const mockApiCredentials = { username: 'test', password: 'pass' }

  beforeEach(() => {
    vi.clearAllMocks()
    mockEnv.VITE_STORAGE_MODE = 'local'
    ;(useLocalStorage as any).mockReturnValue([mockApiCredentials])
  })

  describe('local storage mode', () => {
    it('should initialize with loading state', () => {
      ;(getStoredCredentials as any).mockResolvedValue(null)

      const { result } = renderHook(() => useAuth())

      expect(result.current.isLoading).toBe(true)
      expect(result.current.hasApiCredentials).toBe(true)
      expect(result.current.isApiAuthenticated).toBe(false)
    })

    it('should check Bluesky credentials and update state', async () => {
      const mockCredentials = { identifier: 'test@example.com', password: 'pass' }
      ;(getStoredCredentials as any).mockResolvedValue(mockCredentials)

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.identifier).toBe('test@example.com')
      expect(result.current.hasApiCredentials).toBe(true)
      expect(result.current.isApiAuthenticated).toBe(true)
    })

    it('should handle no Bluesky credentials', async () => {
      ;(getStoredCredentials as any).mockResolvedValue(null)

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.identifier).toBeUndefined()
      expect(result.current.hasApiCredentials).toBe(true)
      expect(result.current.isApiAuthenticated).toBe(true)
    })
  })

  describe('remote storage mode', () => {
    beforeEach(() => {
      mockEnv.VITE_STORAGE_MODE = 'remote'
    })

    it('should check API credentials and Bluesky auth in remote mode', async () => {
      const mockCredentials = { identifier: 'test@example.com', password: 'pass' }
      ;(getStoredCredentials as any).mockResolvedValue(mockCredentials)
      ;(fetch as any).mockResolvedValue({ status: 200 })

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(fetch).toHaveBeenCalledWith(
        'https://api.example.com/api/auth/check',
        expect.objectContaining({
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        })
      )

      expect(result.current.identifier).toBe('test@example.com')
      expect(result.current.hasApiCredentials).toBe(true)
      expect(result.current.isApiAuthenticated).toBe(true)
      expect(result.current.apiCredentials).toBe(mockApiCredentials)
    })

    it('should handle API credentials check failure', async () => {
      ;(getStoredCredentials as any).mockResolvedValue(null)
      ;(fetch as any).mockResolvedValue({ status: 401 })

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.hasApiCredentials).toBe(false)
      expect(result.current.isApiAuthenticated).toBe(true)
    })

    it('should handle no API credentials in remote mode', async () => {
      ;(useLocalStorage as any).mockReturnValue([null])
      ;(fetch as any).mockResolvedValue({ status: 200 })

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.identifier).toBeUndefined()
      expect(result.current.hasApiCredentials).toBe(true)
      expect(result.current.isApiAuthenticated).toBe(false)
    })

    it('should handle network errors when checking API credentials', async () => {
      ;(getStoredCredentials as any).mockResolvedValue(null)
      ;(fetch as any).mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.hasApiCredentials).toBe(false)
    })
  })

  describe('update functions', () => {
    it('should provide updateIdentifier function', async () => {
      ;(getStoredCredentials as any).mockResolvedValue(null)

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(typeof result.current.updateIdentifier).toBe('function')

      // Test the update function
      const newIdentifier = 'new@example.com'
      result.current.updateIdentifier(newIdentifier)

      expect(result.current.identifier).toBe(newIdentifier)
    })

    it('should provide updateIsApiAuthenticated function', async () => {
      ;(getStoredCredentials as any).mockResolvedValue(null)

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(typeof result.current.updateIsApiAuthenticated).toBe('function')

      result.current.updateIsApiAuthenticated(false)

      expect(result.current.isApiAuthenticated).toBe(false)
    })

    it('should provide updateHasApiCreds function', async () => {
      ;(getStoredCredentials as any).mockResolvedValue(null)

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(typeof result.current.updateHasApiCreds).toBe('function')

      result.current.updateHasApiCreds(false)

      expect(result.current.hasApiCredentials).toBe(false)
    })
  })

  describe('effect dependencies', () => {
    it('should re-run effect when apiCredentials change', async () => {
      const { rerender } = renderHook(() => useAuth())

      // Change the mock return value
      ;(useLocalStorage as any).mockReturnValue([{ username: 'new', password: 'new' }])

      rerender()

      await waitFor(() => {
        expect(getStoredCredentials).toHaveBeenCalled()
      })
    })
  })

  describe('memoization', () => {
    it('should memoize returned values correctly', async () => {
      ;(getStoredCredentials as any).mockResolvedValue(null)

      const { result, rerender } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const firstResult = result.current

      // Rerender without changing dependencies
      rerender()

      // Should return the same object reference
      expect(result.current).toBe(firstResult)
    })
  })
})