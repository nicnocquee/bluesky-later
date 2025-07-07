import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useDynamicPresets } from '../use-dynamic-presets'
import { db } from '@/lib/db'
import { addMinutes, addHours } from 'date-fns'

// Mock dependencies
vi.mock('@/lib/db')
vi.mock('date-fns', async () => {
  const actual = await vi.importActual('date-fns')
  return {
    ...actual,
    addMinutes: vi.fn(),
    addHours: vi.fn(),
  }
})

describe('useDynamicPresets', () => {
  const mockDb = {
    getScheduledPosts: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(db as any).mockReturnValue(mockDb)
    ;(addMinutes as any).mockImplementation((date: Date, minutes: number) => 
      new Date(date.getTime() + minutes * 60 * 1000)
    )
    ;(addHours as any).mockImplementation((date: Date, hours: number) => 
      new Date(date.getTime() + hours * 60 * 60 * 1000)
    )
  })

  it('should return empty presets when no scheduled posts', async () => {
    mockDb.getScheduledPosts.mockResolvedValue([])

    const { result } = renderHook(() => useDynamicPresets())

    await waitFor(() => {
      expect(result.current).toEqual([])
    })

    expect(mockDb.getScheduledPosts).toHaveBeenCalled()
  })

  it('should return empty presets when db returns null', async () => {
    ;(db as any).mockReturnValue(null)

    const { result } = renderHook(() => useDynamicPresets())

    await waitFor(() => {
      expect(result.current).toEqual([])
    })
  })

  it('should generate presets based on latest scheduled post', async () => {
    const baseDate = new Date('2023-01-01T12:00:00Z')
    const timezone = 'America/New_York'
    
    const mockPosts = [
      {
        id: 1,
        scheduledFor: new Date('2023-01-01T10:00:00Z'),
        scheduledTimezone: 'UTC',
        status: 'pending' as const,
      },
      {
        id: 2,
        scheduledFor: baseDate,
        scheduledTimezone: timezone,
        status: 'pending' as const,
      },
      {
        id: 3,
        scheduledFor: new Date('2023-01-01T11:00:00Z'),
        scheduledTimezone: 'Europe/London',
        status: 'pending' as const,
      },
    ]

    mockDb.getScheduledPosts.mockResolvedValue(mockPosts)

    const { result } = renderHook(() => useDynamicPresets())

    await waitFor(() => {
      expect(result.current).toHaveLength(4)
    })

    const presets = result.current

    // Check preset labels
    expect(presets[0].label).toBe('5 minutes after the last pending post')
    expect(presets[1].label).toBe('10 minutes after the last pending post')
    expect(presets[2].label).toBe('30 minutes after the last pending post')
    expect(presets[3].label).toBe('1 hour after the last pending post')

    // Check that functions work
    expect(presets[0].getValue()).toEqual(new Date(baseDate.getTime() + 5 * 60 * 1000))
    expect(presets[1].getValue()).toEqual(new Date(baseDate.getTime() + 10 * 60 * 1000))
    expect(presets[2].getValue()).toEqual(new Date(baseDate.getTime() + 30 * 60 * 1000))
    expect(presets[3].getValue()).toEqual(new Date(baseDate.getTime() + 60 * 60 * 1000))

    // Check timezone functions
    expect(presets[0].getTimezone?.()).toBe(timezone)
    expect(presets[1].getTimezone?.()).toBe(timezone)
    expect(presets[2].getTimezone?.()).toBe(timezone)
    expect(presets[3].getTimezone?.()).toBe(timezone)

    // Verify date-fns functions were called
    expect(addMinutes).toHaveBeenCalledWith(baseDate, 5)
    expect(addMinutes).toHaveBeenCalledWith(baseDate, 10)
    expect(addMinutes).toHaveBeenCalledWith(baseDate, 30)
    expect(addHours).toHaveBeenCalledWith(baseDate, 1)
  })

  it('should use system timezone when post has no timezone', async () => {
    const baseDate = new Date('2023-01-01T12:00:00Z')
    const systemTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone

    const mockPosts = [
      {
        id: 1,
        scheduledFor: baseDate,
        scheduledTimezone: undefined,
        status: 'pending' as const,
      },
    ]

    mockDb.getScheduledPosts.mockResolvedValue(mockPosts)

    const { result } = renderHook(() => useDynamicPresets())

    await waitFor(() => {
      expect(result.current).toHaveLength(4)
    })

    const presets = result.current
    expect(presets[0].getTimezone?.()).toBe(systemTimezone)
  })

  it('should handle single post correctly', async () => {
    const baseDate = new Date('2023-01-01T12:00:00Z')
    const timezone = 'Asia/Tokyo'

    const mockPosts = [
      {
        id: 1,
        scheduledFor: baseDate,
        scheduledTimezone: timezone,
        status: 'pending' as const,
      },
    ]

    mockDb.getScheduledPosts.mockResolvedValue(mockPosts)

    const { result } = renderHook(() => useDynamicPresets())

    await waitFor(() => {
      expect(result.current).toHaveLength(4)
    })

    const presets = result.current
    expect(presets[0].getTimezone?.()).toBe(timezone)
  })

  it('should update when lastUpdated prop changes', async () => {
    const baseDate = new Date('2023-01-01T12:00:00Z')

    const mockPosts = [
      {
        id: 1,
        scheduledFor: baseDate,
        scheduledTimezone: 'UTC',
        status: 'pending' as const,
      },
    ]

    mockDb.getScheduledPosts.mockResolvedValue(mockPosts)

    const { result, rerender } = renderHook(
      ({ lastUpdated }) => useDynamicPresets(lastUpdated),
      { initialProps: { lastUpdated: 'v1' } }
    )

    await waitFor(() => {
      expect(result.current).toHaveLength(4)
    })

    expect(mockDb.getScheduledPosts).toHaveBeenCalledTimes(1)

    // Change lastUpdated prop
    rerender({ lastUpdated: 'v2' })

    await waitFor(() => {
      expect(mockDb.getScheduledPosts).toHaveBeenCalledTimes(2)
    })
  })

  it('should handle database errors gracefully', async () => {
    mockDb.getScheduledPosts.mockRejectedValue(new Error('Database error'))

    const { result } = renderHook(() => useDynamicPresets())

    // Should not crash and return empty array
    await waitFor(() => {
      expect(result.current).toEqual([])
    })
  })

  it('should find the latest post correctly with various date formats', async () => {
    const mockPosts = [
      {
        id: 1,
        scheduledFor: '2023-01-01T10:00:00Z',
        scheduledTimezone: 'UTC',
        status: 'pending' as const,
      },
      {
        id: 2,
        scheduledFor: new Date('2023-01-01T15:00:00Z'), // Latest
        scheduledTimezone: 'America/New_York',
        status: 'pending' as const,
      },
      {
        id: 3,
        scheduledFor: '2023-01-01T12:00:00Z',
        scheduledTimezone: 'Europe/London',
        status: 'pending' as const,
      },
    ]

    mockDb.getScheduledPosts.mockResolvedValue(mockPosts)

    const { result } = renderHook(() => useDynamicPresets())

    await waitFor(() => {
      expect(result.current).toHaveLength(4)
    })

    // Should use timezone from the latest post (id: 2)
    expect(result.current[0].getTimezone?.()).toBe('America/New_York')
  })
})