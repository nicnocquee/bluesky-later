import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchUrlMetadata } from '../metadata'
import { BskyAgent } from '@atproto/api'
import { uploadImage } from '../bluesky-image'
import { ImageStore } from '@/components/image-store'

// Mock dependencies
vi.mock('../bluesky-image')
vi.mock('@/components/image-store')

// Mock environment variables
Object.defineProperty(import.meta, 'env', {
  value: {
    VITE_METADATA_FETCHER_URL: 'https://metadata.example.com/?url=',
    VITE_IMAGE_PROXY_URL: 'https://proxy.example.com/?url=',
  },
})

// Mock global fetch
global.fetch = vi.fn()

describe('metadata', () => {
  const mockAgent = {} as BskyAgent
  const mockCreds = { id: 1, identifier: 'test', password: 'test' }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('fetchUrlMetadata', () => {
    it('should fetch metadata successfully', async () => {
      const mockMetadata = {
        title: 'Test Title',
        description: 'Test Description',
        image: undefined, // No image to avoid image fetch
        lang: 'en',
        author: 'Test Author',
        publisher: 'Test Publisher',
        url: 'https://example.com',
        date: '2023-01-01',
      }

      // Mock metadata fetch
      ;(fetch as any).mockResolvedValueOnce({
        json: () => Promise.resolve(mockMetadata),
      })

      const result = await fetchUrlMetadata('https://example.com', mockAgent, mockCreds)

      expect(result).toEqual({
        uri: 'https://example.com',
        title: 'Test Title',
        description: 'Test Description',
        thumb: undefined,
        websiteImageLocalId: undefined,
      })
    })

    it('should fetch metadata with image successfully', async () => {
      const mockMetadata = {
        title: 'Test Title',
        description: 'Test Description',
        image: 'https://example.com/image.jpg',
        lang: 'en',
        author: 'Test Author',
        publisher: 'Test Publisher',
        url: 'https://example.com',
        date: '2023-01-01',
      }

      const mockBlobRef = {
        $type: 'blob',
        ref: { $link: 'test-link' },
        mimeType: 'image/jpeg',
        size: 1024,
      }

      const mockImageStore = {
        saveImage: vi.fn().mockResolvedValue(123),
      }

      // Mock metadata fetch
      ;(fetch as any)
        .mockResolvedValueOnce({
          json: () => Promise.resolve(mockMetadata),
        })
        // Mock image fetch
        .mockResolvedValueOnce({
          ok: true,
          blob: () => Promise.resolve(new Blob(['test'], { type: 'image/jpeg' })),
        })

      ;(uploadImage as any).mockResolvedValue({ blobRef: mockBlobRef })
      ;(ImageStore as any).mockImplementation(() => mockImageStore)

      const result = await fetchUrlMetadata('https://example.com', mockAgent, mockCreds)

      expect(result).toEqual({
        uri: 'https://example.com',
        title: 'Test Title',
        description: 'Test Description',
        thumb: mockBlobRef,
        websiteImageLocalId: 123,
      })
    })

    it('should handle metadata fetch failure gracefully', async () => {
      ;(fetch as any).mockRejectedValue(new Error('Network error'))

      const result = await fetchUrlMetadata('https://example.com', mockAgent, mockCreds)

      expect(result).toEqual({
        uri: 'https://example.com',
        title: 'https://example.com',
        description: '',
        thumb: undefined,
        websiteImageLocalId: undefined,
      })
    })

    it('should handle image fetch failure gracefully', async () => {
      const mockMetadata = {
        title: 'Test Title',
        description: 'Test Description',
        image: 'https://example.com/image.jpg',
        lang: 'en',
        author: 'Test Author',
        publisher: 'Test Publisher',
        url: 'https://example.com',
        date: '2023-01-01',
      }

      // Mock metadata fetch success, image fetch failure
      ;(fetch as any)
        .mockResolvedValueOnce({
          json: () => Promise.resolve(mockMetadata),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
        })

      const result = await fetchUrlMetadata('https://example.com', mockAgent, mockCreds)

      expect(result).toEqual({
        uri: 'https://example.com',
        title: 'Test Title',
        description: 'Test Description',
        thumb: undefined,
        websiteImageLocalId: undefined,
      })
    })

    it('should handle empty metadata response', async () => {
      ;(fetch as any).mockResolvedValueOnce({
        json: () => Promise.resolve(null),
      })

      const result = await fetchUrlMetadata('https://example.com', mockAgent, mockCreds)

      expect(result).toEqual({
        uri: 'https://example.com',
        title: 'https://example.com',
        description: '',
        thumb: undefined,
        websiteImageLocalId: undefined,
      })
    })
  })
})