import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Textarea } from '../textarea'

describe('Textarea', () => {
  it('renders with default props', () => {
    render(<Textarea placeholder="Enter description" />)
    const textarea = screen.getByPlaceholderText('Enter description')
    expect(textarea).toBeInTheDocument()
    expect(textarea).toHaveClass('flex', 'min-h-[60px]', 'w-full')
  })

  it('forwards ref correctly', () => {
    const ref = { current: null }
    render(<Textarea ref={ref} />)
    expect(ref.current).toBeInstanceOf(HTMLTextAreaElement)
  })

  it('handles user input', async () => {
    const user = userEvent.setup()
    render(<Textarea placeholder="Type here" />)
    
    const textarea = screen.getByPlaceholderText('Type here')
    await user.type(textarea, 'Multi-line\ntext content')
    
    expect(textarea).toHaveValue('Multi-line\ntext content')
  })

  it('applies custom className', () => {
    render(<Textarea className="custom-textarea" />)
    const textarea = screen.getByRole('textbox')
    expect(textarea).toHaveClass('custom-textarea')
  })

  it('handles disabled state', () => {
    render(<Textarea disabled />)
    const textarea = screen.getByRole('textbox')
    expect(textarea).toBeDisabled()
  })

  it('respects rows attribute', () => {
    render(<Textarea rows={10} />)
    const textarea = screen.getByRole('textbox')
    expect(textarea).toHaveAttribute('rows', '10')
  })
})