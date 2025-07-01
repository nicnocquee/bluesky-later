import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateAltText, base64FromRemoteUrl, systemPrompt, defaultPrompt } from '../generate-alt-text'
import OpenAI from 'openai'

// Mock OpenAI
vi.mock('openai', () => {
  return {
    default: vi.fn(),
  }
})

// Mock global fetch
global.fetch = vi.fn()
global.FileReader = vi.fn(() => ({
  readAsDataURL: vi.fn(),
  result: '',
  onloadend: null,
  onerror: null,
})) as any

describe('generate-alt-text', () => {
  const mockOpenAI = {
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(OpenAI as any).mockImplementation(() => mockOpenAI)
  })

  describe('generateAltText', () => {
    it('should generate alt text successfully', async () => {
      const mockCompletion = {
        choices: [
          {
            message: {
              content: 'A beautiful sunset over mountains',
            },
          },
        ],
      }

      mockOpenAI.chat.completions.create.mockResolvedValue(mockCompletion)

      const result = await generateAltText('base64imagedata', 'test-api-key')

      expect(result).toBe('A beautiful sunset over mountains')
      expect(OpenAI).toHaveBeenCalledWith({
        apiKey: 'test-api-key',
        dangerouslyAllowBrowser: true,
      })
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: 'data:image/jpeg;base64,base64imagedata',
                },
              },
              {
                type: 'text',
                text: defaultPrompt,
              },
            ],
          },
        ],
        max_tokens: 100,
      })
    })

    it('should handle data URL input correctly', async () => {
      const mockCompletion = {
        choices: [{ message: { content: 'Alt text for data URL image' } }],
      }

      mockOpenAI.chat.completions.create.mockResolvedValue(mockCompletion)

      const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANS'
      await generateAltText(dataUrl, 'test-api-key')

      const calls = mockOpenAI.chat.completions.create.mock.calls[0][0]
      expect(calls.messages[1].content[0].image_url.url).toBe(dataUrl)
    })

    it('should use custom prompt when provided', async () => {
      const mockCompletion = {
        choices: [{ message: { content: 'Custom alt text' } }],
      }

      mockOpenAI.chat.completions.create.mockResolvedValue(mockCompletion)

      const customPrompt = 'Describe this image in detail'
      await generateAltText('base64data', 'api-key', customPrompt)

      const calls = mockOpenAI.chat.completions.create.mock.calls[0][0]
      expect(calls.messages[1].content[1].text).toBe(customPrompt)
    })

    it('should throw error when no content returned', async () => {
      const mockCompletion = {
        choices: [{ message: { content: null } }],
      }

      mockOpenAI.chat.completions.create.mockResolvedValue(mockCompletion)

      await expect(
        generateAltText('base64data', 'api-key')
      ).rejects.toThrow('Failed to generate alt text')
    })

    it('should handle OpenAI API errors', async () => {
      const apiError = new Error('API rate limit exceeded')
      mockOpenAI.chat.completions.create.mockRejectedValue(apiError)

      await expect(
        generateAltText('base64data', 'api-key')
      ).rejects.toThrow('API rate limit exceeded')
    })

    it('should handle invalid API key', async () => {
      const authError = new Error('Invalid API key')
      mockOpenAI.chat.completions.create.mockRejectedValue(authError)

      await expect(
        generateAltText('base64data', 'invalid-key')
      ).rejects.toThrow('Invalid API key')
    })
  })

  describe('base64FromRemoteUrl', () => {
    it('should fetch and convert remote image to base64', async () => {
      const mockBlob = new Blob(['fake image data'], { type: 'image/jpeg' })
      
      ;(fetch as any).mockResolvedValue({
        blob: () => Promise.resolve(mockBlob),
      })

      // Mock FileReader
      const mockFileReader = {
        readAsDataURL: vi.fn(),
        result: 'data:image/jpeg;base64,fakebase64data',
        onloadend: null as ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null,
        onerror: null as ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null,
      }

      global.FileReader = vi.fn(() => mockFileReader) as any

      // Simulate FileReader onloadend
      const promise = base64FromRemoteUrl('https://example.com/image.jpg')
      
      // Trigger the onloadend callback
      setTimeout(() => {
        if (mockFileReader.onloadend && typeof mockFileReader.onloadend === 'function') {
          mockFileReader.onloadend.call(mockFileReader as any, {} as ProgressEvent<FileReader>)
        }
      }, 0)

      const result = await promise

      expect(fetch).toHaveBeenCalledWith('https://example.com/image.jpg')
      expect(result).toBe('fakebase64data')
    })

    it('should handle fetch errors', async () => {
      ;(fetch as any).mockRejectedValue(new Error('Network error'))

      await expect(
        base64FromRemoteUrl('https://example.com/image.jpg')
      ).rejects.toThrow('Network error')
    })

    it('should handle FileReader errors', async () => {
      const mockBlob = new Blob(['fake image data'], { type: 'image/jpeg' })
      
      ;(fetch as any).mockResolvedValue({
        blob: () => Promise.resolve(mockBlob),
      })

      const mockFileReader = {
        readAsDataURL: vi.fn(),
        result: '',
        onloadend: null as ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null,
        onerror: null as ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null,
      }

      global.FileReader = vi.fn(() => mockFileReader) as any

      const promise = base64FromRemoteUrl('https://example.com/image.jpg')
      
      // Trigger the onerror callback
      setTimeout(() => {
        if (mockFileReader.onerror && typeof mockFileReader.onerror === 'function') {
          mockFileReader.onerror.call(mockFileReader as any, {} as ProgressEvent<FileReader>)
        }
      }, 0)

      await expect(promise).rejects.toBeTruthy()
    })
  })

  describe('constants', () => {
    it('should have correct system prompt', () => {
      expect(systemPrompt).toBe(
        'You are a helpful assistant that generates concise and descriptive alt text for images. Focus on the main elements and context of the image.'
      )
    })

    it('should have correct default prompt', () => {
      expect(defaultPrompt).toBe('Generate a concise alt text for this image.')
    })
  })
})