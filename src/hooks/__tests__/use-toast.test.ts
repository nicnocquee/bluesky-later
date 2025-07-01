import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useToast, toast, reducer } from '../use-toast'

// Mock timers
vi.useFakeTimers()

describe('use-toast', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.clearAllTimers()
  })

  describe('genId', () => {
    it('should generate unique IDs', () => {
      const toast1 = toast({ title: 'Test 1' })
      const toast2 = toast({ title: 'Test 2' })
      
      expect(toast1.id).not.toBe(toast2.id)
    })
  })

  describe('reducer', () => {
    const initialState = { toasts: [] }

    it('should add toast', () => {
      const newToast = {
        id: '1',
        title: 'Test Toast',
        open: true,
      }

      const action = {
        type: 'ADD_TOAST' as const,
        toast: newToast,
      }

      const result = reducer(initialState, action)

      expect(result.toasts).toHaveLength(1)
      expect(result.toasts[0]).toEqual(newToast)
    })

    it('should limit toasts to TOAST_LIMIT', () => {
      const existingToast = {
        id: '1',
        title: 'Existing Toast',
        open: true,
      }

      const stateWithToast = { toasts: [existingToast] }

      const newToast = {
        id: '2',
        title: 'New Toast',
        open: true,
      }

      const action = {
        type: 'ADD_TOAST' as const,
        toast: newToast,
      }

      const result = reducer(stateWithToast, action)

      // Should only keep the newest toast (TOAST_LIMIT = 1)
      expect(result.toasts).toHaveLength(1)
      expect(result.toasts[0]).toEqual(newToast)
    })

    it('should update toast', () => {
      const existingToast = {
        id: '1',
        title: 'Original Title',
        open: true,
      }

      const state = { toasts: [existingToast] }

      const action = {
        type: 'UPDATE_TOAST' as const,
        toast: {
          id: '1',
          title: 'Updated Title',
        },
      }

      const result = reducer(state, action)

      expect(result.toasts[0].title).toBe('Updated Title')
      expect(result.toasts[0].open).toBe(true) // Should preserve other properties
    })

    it('should dismiss specific toast', () => {
      const toast1 = { id: '1', title: 'Toast 1', open: true }
      const toast2 = { id: '2', title: 'Toast 2', open: true }

      const state = { toasts: [toast1, toast2] }

      const action = {
        type: 'DISMISS_TOAST' as const,
        toastId: '1',
      }

      const result = reducer(state, action)

      expect(result.toasts[0].open).toBe(false)
      expect(result.toasts[1].open).toBe(true)
    })

    it('should dismiss all toasts when no toastId provided', () => {
      const toast1 = { id: '1', title: 'Toast 1', open: true }
      const toast2 = { id: '2', title: 'Toast 2', open: true }

      const state = { toasts: [toast1, toast2] }

      const action = {
        type: 'DISMISS_TOAST' as const,
      }

      const result = reducer(state, action)

      expect(result.toasts.every(t => t.open === false)).toBe(true)
    })

    it('should remove specific toast', () => {
      const toast1 = { id: '1', title: 'Toast 1', open: true }
      const toast2 = { id: '2', title: 'Toast 2', open: true }

      const state = { toasts: [toast1, toast2] }

      const action = {
        type: 'REMOVE_TOAST' as const,
        toastId: '1',
      }

      const result = reducer(state, action)

      expect(result.toasts).toHaveLength(1)
      expect(result.toasts[0].id).toBe('2')
    })

    it('should remove all toasts when no toastId provided', () => {
      const toast1 = { id: '1', title: 'Toast 1', open: true }
      const toast2 = { id: '2', title: 'Toast 2', open: true }

      const state = { toasts: [toast1, toast2] }

      const action = {
        type: 'REMOVE_TOAST' as const,
      }

      const result = reducer(state, action)

      expect(result.toasts).toHaveLength(0)
    })
  })

  describe('toast function', () => {
    it('should create toast with update and dismiss functions', () => {
      const result = toast({ title: 'Test Toast' })

      expect(result.id).toBeDefined()
      expect(typeof result.update).toBe('function')
      expect(typeof result.dismiss).toBe('function')
    })

    it('should set onOpenChange handler', () => {
      const { result } = renderHook(() => useToast())
      
      act(() => {
        toast({ title: 'Test Toast' })
      })

      expect(result.current.toasts).toHaveLength(1)
      expect(typeof result.current.toasts[0].onOpenChange).toBe('function')

      // Test onOpenChange calls dismiss
      act(() => {
        result.current.toasts[0].onOpenChange?.(false)
      })

      expect(result.current.toasts[0].open).toBe(false)
    })

    it('should update toast', () => {
      const { result } = renderHook(() => useToast())
      
      let toastResult: any

      act(() => {
        toastResult = toast({ title: 'Original Title' })
      })

      act(() => {
        toastResult.update({ title: 'Updated Title' })
      })

      expect(result.current.toasts[0].title).toBe('Updated Title')
    })

    it('should dismiss toast', () => {
      const { result } = renderHook(() => useToast())
      
      let toastResult: any

      act(() => {
        toastResult = toast({ title: 'Test Toast' })
      })

      act(() => {
        toastResult.dismiss()
      })

      expect(result.current.toasts[0].open).toBe(false)
    })
  })

  describe('useToast hook', () => {
    it('should return current state and toast function', () => {
      const { result } = renderHook(() => useToast())

      expect(result.current.toasts).toEqual([])
      expect(typeof result.current.toast).toBe('function')
      expect(typeof result.current.dismiss).toBe('function')
    })

    it('should update when toasts are added', () => {
      const { result } = renderHook(() => useToast())

      act(() => {
        result.current.toast({ title: 'Test Toast' })
      })

      expect(result.current.toasts).toHaveLength(1)
      expect(result.current.toasts[0].title).toBe('Test Toast')
    })

    it('should dismiss all toasts', () => {
      const { result } = renderHook(() => useToast())

      act(() => {
        result.current.toast({ title: 'Toast 1' })
      })

      act(() => {
        result.current.dismiss()
      })

      expect(result.current.toasts[0].open).toBe(false)
    })

    it('should dismiss specific toast by ID', () => {
      const { result } = renderHook(() => useToast())

      let toastId: string

      act(() => {
        const toastResult = result.current.toast({ title: 'Test Toast' })
        toastId = toastResult.id
      })

      act(() => {
        result.current.dismiss(toastId)
      })

      expect(result.current.toasts[0].open).toBe(false)
    })

    it('should handle component unmounting', () => {
      const { result, unmount } = renderHook(() => useToast())

      act(() => {
        result.current.toast({ title: 'Test Toast' })
      })

      expect(result.current.toasts).toHaveLength(1)

      // Should not throw when unmounting
      expect(() => unmount()).not.toThrow()
    })
  })

  describe('timeout behavior', () => {
    it('should remove toast after timeout', () => {
      const { result } = renderHook(() => useToast())

      act(() => {
        const toastResult = toast({ title: 'Test Toast' })
        toastResult.dismiss()
      })

      expect(result.current.toasts[0].open).toBe(false)

      // Fast forward time
      act(() => {
        vi.advanceTimersByTime(1000000) // TOAST_REMOVE_DELAY
      })

      expect(result.current.toasts).toHaveLength(0)
    })

    it('should not set duplicate timeouts for same toast', () => {
      const { result } = renderHook(() => useToast())

      let toastResult: any

      act(() => {
        toastResult = toast({ title: 'Test Toast' })
      })

      act(() => {
        toastResult.dismiss()
        toastResult.dismiss() // Dismiss twice
      })

      // Should still only remove once after timeout
      act(() => {
        vi.advanceTimersByTime(1000000)
      })

      expect(result.current.toasts).toHaveLength(0)
    })
  })
})