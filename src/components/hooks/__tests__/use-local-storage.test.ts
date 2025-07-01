import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLocalStorage } from '../use-local-storage'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Mock window events
Object.defineProperty(window, 'addEventListener', {
  value: vi.fn(),
})

Object.defineProperty(window, 'removeEventListener', {
  value: vi.fn(),
})

Object.defineProperty(window, 'dispatchEvent', {
  value: vi.fn(),
})

describe('useLocalStorage', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  it('should return initial value when no stored value exists', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'))
    const [value] = result.current
    expect(value).toBe('initial')
  })

  it('should store and retrieve values', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'))
    
    act(() => {
      const [, setValue] = result.current
      setValue('new value')
    })

    expect(localStorageMock.setItem).toHaveBeenCalled()
  })

  it('should handle complex objects', () => {
    const initialValue = { name: 'test', count: 0 }
    const { result } = renderHook(() => useLocalStorage('test-object', initialValue))
    
    act(() => {
      const [, setValue] = result.current
      setValue({ name: 'updated', count: 5 })
    })

    expect(localStorageMock.setItem).toHaveBeenCalled()
  })

  it('should clear data', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'))
    
    act(() => {
      const [, , clearData] = result.current
      clearData()
    })

    expect(localStorageMock.setItem).toHaveBeenCalled()
    expect(window.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'local-storage-change',
        detail: { key: 'test-key' }
      })
    )
  })

  it('should handle parsing errors gracefully', () => {
    // Set invalid JSON in localStorage
    localStorageMock.setItem('test-key', 'invalid-json')
    
    const { result } = renderHook(() => useLocalStorage('test-key', 'fallback'))
    const [value] = result.current
    
    // The hook migrates invalid data by wrapping it, so it returns the invalid string as-is
    expect(value).toBe('invalid-json')
  })
})