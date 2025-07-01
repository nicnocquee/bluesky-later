import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeAuthenticatedRequest, ApiCredentials } from '../api'

// Mock global fetch
global.fetch = vi.fn()

describe('api', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('makeAuthenticatedRequest', () => {
    const mockCredentials: ApiCredentials = {
      username: 'testuser',
      password: 'testpass',
    }

    it('should make authenticated request successfully', async () => {
      const mockResponse = new Response(JSON.stringify({ success: true }))
      ;(fetch as any).mockResolvedValue(mockResponse)

      const result = await makeAuthenticatedRequest(
        'https://api.example.com/test',
        { method: 'GET' },
        mockCredentials
      )

      expect(fetch).toHaveBeenCalledWith('https://api.example.com/test', {
        method: 'GET',
        headers: expect.any(Headers),
      })

      // Check that Authorization header is set correctly
      const callArgs = (fetch as any).mock.calls[0]
      const headers = callArgs[1].headers
      expect(headers.get('Authorization')).toBe('Basic ' + btoa('testuser:testpass'))
      expect(result).toBe(mockResponse)
    })

    it('should preserve existing headers', async () => {
      const mockResponse = new Response(JSON.stringify({ success: true }))
      ;(fetch as any).mockResolvedValue(mockResponse)

      await makeAuthenticatedRequest(
        'https://api.example.com/test',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Custom-Header': 'custom-value',
          },
        },
        mockCredentials
      )

      const callArgs = (fetch as any).mock.calls[0]
      const headers = callArgs[1].headers
      expect(headers.get('Authorization')).toBe('Basic ' + btoa('testuser:testpass'))
      expect(headers.get('Content-Type')).toBe('application/json')
      expect(headers.get('X-Custom-Header')).toBe('custom-value')
    })

    it('should handle Headers object as input', async () => {
      const mockResponse = new Response(JSON.stringify({ success: true }))
      ;(fetch as any).mockResolvedValue(mockResponse)

      const existingHeaders = new Headers()
      existingHeaders.set('Content-Type', 'application/json')

      await makeAuthenticatedRequest(
        'https://api.example.com/test',
        {
          method: 'POST',
          headers: existingHeaders,
        },
        mockCredentials
      )

      const callArgs = (fetch as any).mock.calls[0]
      const headers = callArgs[1].headers
      expect(headers.get('Authorization')).toBe('Basic ' + btoa('testuser:testpass'))
      expect(headers.get('Content-Type')).toBe('application/json')
    })

    it('should throw error when no credentials provided', async () => {
      await expect(
        makeAuthenticatedRequest('https://api.example.com/test')
      ).rejects.toThrow('No API credentials found')

      expect(fetch).not.toHaveBeenCalled()
    })

    it('should handle fetch errors', async () => {
      ;(fetch as any).mockRejectedValue(new Error('Network error'))

      await expect(
        makeAuthenticatedRequest(
          'https://api.example.com/test',
          { method: 'GET' },
          mockCredentials
        )
      ).rejects.toThrow('Network error')
    })

    it('should work with default empty options', async () => {
      const mockResponse = new Response(JSON.stringify({ success: true }))
      ;(fetch as any).mockResolvedValue(mockResponse)

      await makeAuthenticatedRequest(
        'https://api.example.com/test',
        undefined,
        mockCredentials
      )

      expect(fetch).toHaveBeenCalledWith('https://api.example.com/test', {
        headers: expect.any(Headers),
      })
    })

    it('should correctly encode special characters in credentials', async () => {
      const specialCredentials: ApiCredentials = {
        username: 'user@example.com',
        password: 'pass:word!',
      }

      const mockResponse = new Response(JSON.stringify({ success: true }))
      ;(fetch as any).mockResolvedValue(mockResponse)

      await makeAuthenticatedRequest(
        'https://api.example.com/test',
        { method: 'GET' },
        specialCredentials
      )

      const callArgs = (fetch as any).mock.calls[0]
      const headers = callArgs[1].headers
      const expectedAuth = 'Basic ' + btoa('user@example.com:pass:word!')
      expect(headers.get('Authorization')).toBe(expectedAuth)
    })
  })
})