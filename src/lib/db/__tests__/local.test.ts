import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LocalDB } from '../local'
import Dexie from 'dexie'

// Mock Dexie
vi.mock('dexie', () => {
  const mockTable = {
    add: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
    update: vi.fn(),
    clear: vi.fn(),
    toArray: vi.fn(),
    where: vi.fn(),
    toCollection: vi.fn(),
  }

  const mockDexie = vi.fn().mockImplementation(() => {
    return {
      version: vi.fn().mockReturnValue({
        stores: vi.fn().mockReturnThis(),
      }),
      posts: mockTable,
      credentials: mockTable,
    }
  })

  return {
    default: mockDexie,
  }
})

describe('LocalDB', () => {
  let localDB: LocalDB
  let mockPosts: any
  let mockCredentials: any

  beforeEach(() => {
    vi.clearAllMocks()
    localDB = new LocalDB()
    mockPosts = (localDB as any).db.posts
    mockCredentials = (localDB as any).db.credentials
  })

  describe('getPostsToSend', () => {
    it('should return pending posts scheduled for now or past', async () => {
      const mockPendingPosts = [
        { id: 1, status: 'pending', scheduledFor: new Date(Date.now() - 1000) },
        { id: 2, status: 'pending', scheduledFor: new Date(Date.now() - 5000) },
      ]

      const mockWhere = {
        equals: vi.fn().mockReturnThis(),
        and: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue(mockPendingPosts),
      }

      mockPosts.where.mockReturnValue(mockWhere)

      const result = await localDB.getPostsToSend()

      expect(mockPosts.where).toHaveBeenCalledWith('status')
      expect(mockWhere.equals).toHaveBeenCalledWith('pending')
      expect(mockWhere.and).toHaveBeenCalledWith(expect.any(Function))
      expect(result).toEqual(mockPendingPosts)
    })

    it('should filter posts by scheduled time correctly', async () => {
      const futurePost = { id: 1, status: 'pending', scheduledFor: new Date(Date.now() + 10000) }
      const pastPost = { id: 2, status: 'pending', scheduledFor: new Date(Date.now() - 1000) }

      const mockWhere = {
        equals: vi.fn().mockReturnThis(),
        and: vi.fn().mockImplementation((filterFn) => {
          // Test the filter function
          const filteredPosts = [futurePost, pastPost].filter(filterFn)
          return {
            toArray: vi.fn().mockResolvedValue(filteredPosts),
          }
        }),
      }

      mockPosts.where.mockReturnValue(mockWhere)

      const result = await localDB.getPostsToSend()

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe(2) // Only the past post should be returned
    })
  })

  describe('getScheduledPosts', () => {
    it('should return pending posts scheduled for future', async () => {
      const mockScheduledPosts = [
        { id: 1, status: 'pending', scheduledFor: new Date(Date.now() + 1000) },
        { id: 2, status: 'pending', scheduledFor: new Date(Date.now() + 5000) },
      ]

      const mockWhere = {
        equals: vi.fn().mockReturnThis(),
        and: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue(mockScheduledPosts),
      }

      mockPosts.where.mockReturnValue(mockWhere)

      const result = await localDB.getScheduledPosts()

      expect(mockPosts.where).toHaveBeenCalledWith('status')
      expect(mockWhere.equals).toHaveBeenCalledWith('pending')
      expect(result).toEqual(mockScheduledPosts)
    })
  })

  describe('getPublishedPosts', () => {
    it('should return published posts', async () => {
      const mockPublishedPosts = [
        { id: 1, status: 'published' },
        { id: 2, status: 'published' },
      ]

      const mockWhere = {
        equals: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue(mockPublishedPosts),
      }

      mockPosts.where.mockReturnValue(mockWhere)

      const result = await localDB.getPublishedPosts()

      expect(mockPosts.where).toHaveBeenCalledWith('status')
      expect(mockWhere.equals).toHaveBeenCalledWith('published')
      expect(result).toEqual(mockPublishedPosts)
    })
  })

  describe('getAllPosts', () => {
    it('should return all posts', async () => {
      const mockAllPosts = [
        { id: 1, status: 'pending' },
        { id: 2, status: 'published' },
        { id: 3, status: 'failed' },
      ]

      mockPosts.toArray.mockResolvedValue(mockAllPosts)

      const result = await localDB.getAllPosts()

      expect(mockPosts.toArray).toHaveBeenCalled()
      expect(result).toEqual(mockAllPosts)
    })
  })

  describe('createPost', () => {
    it('should create a new post and return it', async () => {
      const newPost = {
        scheduledFor: new Date(),
        status: 'pending' as const,
        data: { text: 'Test post', createdAt: new Date().toISOString() },
      }

      const createdPost = {
        id: 1,
        ...newPost,
        createdAt: new Date(),
      }

      mockPosts.add.mockResolvedValue(1)
      mockPosts.get.mockResolvedValue(createdPost)

      const result = await localDB.createPost(newPost)

      expect(mockPosts.add).toHaveBeenCalledWith({
        ...newPost,
        createdAt: expect.any(Date),
      })
      expect(mockPosts.get).toHaveBeenCalledWith(1)
      expect(result).toEqual(createdPost)
    })
  })

  describe('updatePost', () => {
    it('should update a post', async () => {
      const updateData = { status: 'published' as const }

      await localDB.updatePost(1, updateData)

      expect(mockPosts.update).toHaveBeenCalledWith(1, updateData)
    })
  })

  describe('deletePost', () => {
    it('should delete a post', async () => {
      await localDB.deletePost(1)

      expect(mockPosts.delete).toHaveBeenCalledWith(1)
    })
  })

  describe('getCredentials', () => {
    it('should return credentials when they exist', async () => {
      const mockCredentialsData = { id: 1, identifier: 'test@example.com', password: 'password' }
      
      const mockCollection = {
        first: vi.fn().mockResolvedValue(mockCredentialsData),
      }

      mockCredentials.toCollection.mockReturnValue(mockCollection)

      const result = await localDB.getCredentials()

      expect(mockCredentials.toCollection).toHaveBeenCalled()
      expect(mockCollection.first).toHaveBeenCalled()
      expect(result).toEqual(mockCredentialsData)
    })

    it('should return null when no credentials exist', async () => {
      const mockCollection = {
        first: vi.fn().mockResolvedValue(undefined),
      }

      mockCredentials.toCollection.mockReturnValue(mockCollection)

      const result = await localDB.getCredentials()

      expect(result).toBeNull()
    })
  })

  describe('setCredentials', () => {
    it('should clear existing credentials and set new ones', async () => {
      const newCredentials = { identifier: 'test@example.com', password: 'password' }

      mockCredentials.clear.mockResolvedValue(undefined)
      mockCredentials.add.mockResolvedValue(1)

      await localDB.setCredentials(newCredentials)

      expect(mockCredentials.clear).toHaveBeenCalled()
      expect(mockCredentials.add).toHaveBeenCalledWith({
        ...newCredentials,
        id: 1,
      })
    })
  })

  describe('deleteCredentials', () => {
    it('should clear all credentials', async () => {
      mockCredentials.clear.mockResolvedValue(undefined)

      await localDB.deleteCredentials()

      expect(mockCredentials.clear).toHaveBeenCalled()
    })
  })

  describe('database initialization', () => {
    it('should initialize database with correct schema', () => {
      expect(Dexie).toHaveBeenCalledWith('blueSkyDB')
      
      // Check that version and stores were called
      const mockInstance = (Dexie as any).mock.results[0].value
      expect(mockInstance.version).toHaveBeenCalledWith(2)
    })
  })
})