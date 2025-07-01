import { describe, it, expect, vi, beforeEach } from 'vitest'
import { login, checkScheduledPosts, getPostData, getStoredCredentials } from '../bluesky'
import { BskyAgent, RichText } from '@atproto/api'
import { fetchUrlMetadata } from '../metadata'
import { createDatabase, db } from '../db'

// Mock dependencies
vi.mock('@atproto/api')
vi.mock('../metadata')
vi.mock('../db')

describe('bluesky', () => {
  const mockAgent = {
    login: vi.fn(),
    post: vi.fn(),
  } as any

  const mockDb = {
    getCredentials: vi.fn(),
    setCredentials: vi.fn(),
    getPostsToSend: vi.fn(),
    updatePost: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(db as any).mockReturnValue(mockDb)
    // Mock the agent singleton
    vi.mocked(BskyAgent).prototype.login = mockAgent.login
    vi.mocked(BskyAgent).prototype.post = mockAgent.post
  })

  describe('getStoredCredentials', () => {
    it('should return stored credentials', async () => {
      const mockCreds = { id: 1, identifier: 'test@example.com', password: 'password' }
      mockDb.getCredentials.mockResolvedValue(mockCreds)

      const result = await getStoredCredentials()

      expect(result).toBe(mockCreds)
      expect(mockDb.getCredentials).toHaveBeenCalled()
    })

    it('should handle no database', async () => {
      ;(db as any).mockReturnValue(null)

      const result = await getStoredCredentials()

      expect(result).toBeUndefined()
    })
  })

  describe('login', () => {
    it('should login and store credentials', async () => {
      mockAgent.login.mockResolvedValue(undefined)
      mockDb.setCredentials.mockResolvedValue(undefined)

      await login('test@example.com', 'password')

      expect(mockAgent.login).toHaveBeenCalledWith({
        identifier: 'test@example.com',
        password: 'password',
      })
      expect(mockDb.setCredentials).toHaveBeenCalledWith({
        identifier: 'test@example.com',
        password: 'password',
      })
    })

    it('should handle login failure', async () => {
      mockAgent.login.mockRejectedValue(new Error('Login failed'))

      await expect(login('test@example.com', 'wrong-password')).rejects.toThrow('Login failed')
    })
  })

  describe('checkScheduledPosts', () => {
    const mockCreds = { id: 1, identifier: 'test@example.com', password: 'password' }
    const mockPost = {
      id: 1,
      data: { text: 'Test post', createdAt: new Date().toISOString() },
    }

    it('should process scheduled posts successfully', async () => {
      mockDb.getPostsToSend.mockResolvedValue([mockPost])
      mockDb.getCredentials.mockResolvedValue(mockCreds)
      mockAgent.login.mockResolvedValue(undefined)
      mockAgent.post.mockResolvedValue(undefined)
      mockDb.updatePost.mockResolvedValue(undefined)

      await checkScheduledPosts()

      expect(mockDb.getPostsToSend).toHaveBeenCalled()
      expect(mockAgent.login).toHaveBeenCalledWith({
        identifier: 'test@example.com',
        password: 'password',
      })
      expect(mockAgent.post).toHaveBeenCalledWith(mockPost.data)
      expect(mockDb.updatePost).toHaveBeenCalledWith(1, { status: 'published' })
    })

    it('should handle no pending posts', async () => {
      mockDb.getPostsToSend.mockResolvedValue([])

      await checkScheduledPosts()

      expect(mockAgent.login).not.toHaveBeenCalled()
      expect(mockAgent.post).not.toHaveBeenCalled()
    })

    it('should handle no credentials', async () => {
      mockDb.getPostsToSend.mockResolvedValue([mockPost])
      mockDb.getCredentials.mockResolvedValue(null)

      await checkScheduledPosts()

      expect(mockAgent.login).not.toHaveBeenCalled()
      expect(mockAgent.post).not.toHaveBeenCalled()
    })

    it('should handle post creation error', async () => {
      mockDb.getPostsToSend.mockResolvedValue([mockPost])
      mockDb.getCredentials.mockResolvedValue(mockCreds)
      mockAgent.login.mockResolvedValue(undefined)
      mockAgent.post.mockRejectedValue(new Error('Post failed'))

      await checkScheduledPosts()

      expect(mockDb.updatePost).toHaveBeenCalledWith(1, { status: 'published' })
    })

    it('should work with worker credentials', async () => {
      const mockWorkerDb = { ...mockDb }
      const workerCredentials = { username: 'worker', password: 'worker-pass' }
      
      ;(createDatabase as any).mockReturnValue(mockWorkerDb)
      mockWorkerDb.getPostsToSend.mockResolvedValue([mockPost])
      mockWorkerDb.getCredentials.mockResolvedValue(mockCreds)

      await checkScheduledPosts(workerCredentials)

      expect(createDatabase).toHaveBeenCalledWith(workerCredentials)
    })
  })

  describe('getPostData', () => {
    const mockCreds = { id: 1, identifier: 'test@example.com', password: 'password' }
    const mockRichText = {
      text: 'Test post content',
      facets: [],
      detectFacets: vi.fn(),
    }

    beforeEach(() => {
      mockDb.getCredentials.mockResolvedValue(mockCreds)
      ;(RichText as any).mockImplementation(() => mockRichText)
    })

    it('should create post data with text only', async () => {
      const scheduledAt = new Date('2023-01-01T12:00:00Z')

      const result = await getPostData({
        content: 'Test post content',
        scheduledAt,
      })

      expect(RichText).toHaveBeenCalledWith({ text: 'Test post content' })
      expect(mockRichText.detectFacets).toHaveBeenCalled()
      expect(result).toEqual({
        text: 'Test post content',
        facets: [],
        createdAt: '2023-01-01T12:00:00.000Z',
      })
    })

    it('should create post data with URL embed', async () => {
      const scheduledAt = new Date('2023-01-01T12:00:00Z')
      const mockMetadata = {
        uri: 'https://example.com',
        title: 'Example',
        description: 'Test site',
      }

      ;(fetchUrlMetadata as any).mockResolvedValue(mockMetadata)

      const result = await getPostData({
        content: 'Check this out!',
        url: 'https://example.com',
        scheduledAt,
      })

      expect(fetchUrlMetadata).toHaveBeenCalledWith('https://example.com', expect.any(Object), mockCreds)
      expect(result.embed).toEqual({
        $type: 'app.bsky.embed.external',
        external: mockMetadata,
      })
    })

    it('should create post data with image embed', async () => {
      const scheduledAt = new Date('2023-01-01T12:00:00Z')
      const mockBlobRef = {
        $type: 'blob',
        ref: { $link: 'test-link' },
        mimeType: 'image/jpeg',
        size: 1024,
      }

      const result = await getPostData({
        content: 'Check out this image!',
        image: {
          blobRef: mockBlobRef,
          alt: 'Test image',
          localImageId: 123,
        },
        scheduledAt,
      })

      expect(result.embed).toEqual({
        $type: 'app.bsky.embed.images',
        images: [
          {
            alt: 'Test image',
            image: mockBlobRef,
            localImageId: 123,
          },
        ],
      })
    })

    it('should handle missing alt text for image', async () => {
      const scheduledAt = new Date('2023-01-01T12:00:00Z')
      const mockBlobRef = {
        $type: 'blob',
        ref: { $link: 'test-link' },
        mimeType: 'image/jpeg',
        size: 1024,
      }

      const result = await getPostData({
        content: 'Image without alt text',
        image: {
          blobRef: mockBlobRef,
          localImageId: 123,
        },
        scheduledAt,
      })

      expect(result.embed?.images?.[0].alt).toBe('')
    })

    it('should throw error when no credentials', async () => {
      mockDb.getCredentials.mockResolvedValue(null)

      await expect(
        getPostData({
          content: 'Test',
          scheduledAt: new Date(),
        })
      ).rejects.toThrow('No credentials set')
    })

    it('should prioritize URL over image when both provided', async () => {
      const scheduledAt = new Date('2023-01-01T12:00:00Z')
      const mockMetadata = { uri: 'https://example.com', title: 'Example', description: 'Test' }
      const mockBlobRef = { $type: 'blob', ref: { $link: 'test' }, mimeType: 'image/jpeg', size: 1024 }

      ;(fetchUrlMetadata as any).mockResolvedValue(mockMetadata)

      const result = await getPostData({
        content: 'Test with both URL and image',
        url: 'https://example.com',
        image: { blobRef: mockBlobRef, alt: 'Test image' },
        scheduledAt,
      })

      expect(result.embed).toEqual({
        $type: 'app.bsky.embed.external',
        external: mockMetadata,
      })
    })
  })
})