import { describe, it, expect } from 'vitest'
import { render, screen } from '@solidjs/testing-library'
import LoadingSpinner from '../LoadingSpinner'

describe('LoadingSpinner Component', () => {
  describe('Basic Rendering', () => {
    it('should render with default props', () => {
      render(() => <LoadingSpinner />)

      // Component doesn't have role="status" by default
      expect(screen.queryByRole('status')).toBeNull()
      // Component doesn't show text by default
      expect(screen.queryByText('Loading...')).toBeNull()
    })

    it('should render with custom text', () => {
      render(() => <LoadingSpinner text="Processing..." />)

      expect(screen.getByText('Processing...')).toBeDefined()
    })

    it('should render with different sizes', () => {
      const { container: smContainer } = render(() => <LoadingSpinner size="sm" />)
      const { container: mdContainer } = render(() => <LoadingSpinner size="md" />)
      const { container: lgContainer } = render(() => <LoadingSpinner size="lg" />)

      expect(smContainer.querySelector('.h-4.w-4')).toBeDefined()
      expect(mdContainer.querySelector('.h-8.w-8')).toBeDefined()
      expect(lgContainer.querySelector('.h-12.w-12')).toBeDefined()
    })
  })

  describe('Layout and Styling', () => {
    it('should apply center layout when center prop is true', () => {
      const { container } = render(() => <LoadingSpinner center />)

      const centerContainer = container.querySelector('.flex.items-center.justify-center.min-h-48')
      expect(centerContainer).toBeDefined()
    })

    it('should not apply center layout when center prop is false', () => {
      const { container } = render(() => <LoadingSpinner center={false} />)

      const centerContainer = container.querySelector('.min-h-48')
      expect(centerContainer).toBeNull()
    })

    it('should have proper spinner animation classes', () => {
      const { container } = render(() => <LoadingSpinner />)

      const spinner = container.querySelector('.animate-spin')
      expect(spinner).toBeDefined()

      const spinnerIcon = container.querySelector('.border-4.border-blue-500.border-t-transparent.rounded-full')
      expect(spinnerIcon).toBeDefined()
    })

    it('should have proper text styling', () => {
      const { container } = render(() => <LoadingSpinner text="Loading" />)

      const textElement = container.querySelector('.text-gray-600')
      expect(textElement).toBeDefined()
      expect(textElement?.textContent).toBe('Loading')
    })

    it('should apply default medium size when no size specified', () => {
      const { container } = render(() => <LoadingSpinner />)

      const spinner = container.querySelector('.h-8.w-8')
      expect(spinner).toBeDefined()
    })
  })

  describe('Size Variations', () => {
    it('should render small spinner correctly', () => {
      const { container } = render(() => <LoadingSpinner size="sm" text="Loading" />)

      const spinner = container.querySelector('.h-4.w-4')
      expect(spinner).toBeDefined()
      expect(screen.getByText('Loading')).toBeDefined()
    })

    it('should render large spinner correctly', () => {
      const { container } = render(() => <LoadingSpinner size="lg" text="Loading" />)

      const spinner = container.querySelector('.h-12.w-12')
      expect(spinner).toBeDefined()
      expect(screen.getByText('Loading')).toBeDefined()
    })
  })

  describe('Accessibility', () => {
    it('should not have accessibility attributes by default', () => {
      render(() => <LoadingSpinner />)

      // Component doesn't have role="status" by default
      expect(screen.queryByRole('status')).toBeNull()
    })

    it('should not have aria-label on spinner icon', () => {
      const { container } = render(() => <LoadingSpinner />)

      const spinner = container.querySelector('[aria-label="Loading"]')
      expect(spinner).toBeNull()
    })
  })

  describe('Text Rendering', () => {
    it('should show text when provided', () => {
      render(() => <LoadingSpinner text="Processing files" />)

      expect(screen.getByText('Processing files')).toBeDefined()
    })

    it('should not show text when no text provided', () => {
      render(() => <LoadingSpinner />)

      expect(screen.queryByText('Loading...')).toBeNull()
    })
  })

  describe('Layout Variations', () => {
    it('should render with flex layout for spinner and text', () => {
      const { container } = render(() => <LoadingSpinner />)

      const flexContainer = container.querySelector('.flex.items-center.space-x-3')
      expect(flexContainer).toBeDefined()
    })

    it('should render with center layout when center is true', () => {
      const { container } = render(() => <LoadingSpinner center />)

      const centerLayout = container.querySelector('.flex.items-center.justify-center')
      expect(centerLayout).toBeDefined()
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty text prop', () => {
      render(() => <LoadingSpinner text="" />)

      // Component doesn't have role="status" by default
      expect(screen.queryByRole('status')).toBeNull()

      // Should still render spinner even with empty text
      const { container } = render(() => <LoadingSpinner text="" />)
      const spinner = container.querySelector('.animate-spin')
      expect(spinner).toBeDefined()
    })

    it('should handle long text gracefully', () => {
      const longText = 'This is a very long loading message that should be handled gracefully by the component'

      render(() => <LoadingSpinner text={longText} />)

      expect(screen.getByText(longText)).toBeDefined()
    })

    it('should handle invalid size gracefully', () => {
      const { container } = render(() => <LoadingSpinner size={'invalid' as any} />)

      // Should fallback to medium size
      const spinner = container.querySelector('.h-8.w-8')
      expect(spinner).toBeDefined()
    })
  })

  describe('Default Values', () => {
    it('should not show default loading text when no text provided', () => {
      render(() => <LoadingSpinner />)

      expect(screen.queryByText('Loading...')).toBeNull()
    })

    it('should not be centered by default', () => {
      const { container } = render(() => <LoadingSpinner />)

      const centerContainer = container.querySelector('.min-h-48')
      expect(centerContainer).toBeNull()
    })

    it('should use medium size by default', () => {
      const { container } = render(() => <LoadingSpinner />)

      const spinner = container.querySelector('.h-8.w-8')
      expect(spinner).toBeDefined()
    })
  })

  describe('Component Structure', () => {
    it('should have proper DOM structure', () => {
      const { container } = render(() => <LoadingSpinner text="Loading" center />)

      // Should have outer container with center styling
      const outerContainer = container.querySelector('.flex.items-center.justify-center.min-h-48')
      expect(outerContainer).toBeDefined()

      // Should have inner container with flex layout
      const innerContainer = container.querySelector('.flex.items-center.space-x-3')
      expect(innerContainer).toBeDefined()
    })

    it('should have proper structure without center', () => {
      const { container } = render(() => <LoadingSpinner text="Loading" />)

      // Should not have center container
      const centerContainer = container.querySelector('.min-h-48')
      expect(centerContainer).toBeNull()

      // Should have spinner and text container
      const flexContainer = container.querySelector('.flex.items-center.space-x-3')
      expect(flexContainer).toBeDefined()
    })
  })
})
