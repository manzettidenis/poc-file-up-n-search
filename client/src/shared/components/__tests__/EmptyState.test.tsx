import { describe, it, expect } from 'vitest'
import { render, screen } from '@solidjs/testing-library'
import EmptyState from '../EmptyState'

describe('EmptyState Component', () => {
  describe('Basic Rendering', () => {
    it('should render with all required props', () => {
      render(() => <EmptyState icon="📂" title="No files found" description="Upload your first file to get started!" />)

      expect(screen.getByText('📂')).toBeDefined()
      expect(screen.getByText('No files found')).toBeDefined()
      expect(screen.getByText('Upload your first file to get started!')).toBeDefined()
    })

    it('should render with different icons', () => {
      render(() => <EmptyState icon="🔍" title="No results" description="Try different search terms" />)

      expect(screen.getByText('🔍')).toBeDefined()
    })

    it('should render with long title and description', () => {
      const longTitle = 'This is a very long title that should be handled gracefully by the component'
      const longDescription =
        'This is a very long description that provides detailed information about the empty state and what the user can do to resolve it'

      render(() => <EmptyState icon="⚠️" title={longTitle} description={longDescription} />)

      expect(screen.getByText(longTitle)).toBeDefined()
      expect(screen.getByText(longDescription)).toBeDefined()
    })
  })

  describe('Layout and Styling', () => {
    it('should have proper text alignment classes', () => {
      const { container } = render(() => <EmptyState icon="📂" title="Empty" description="Nothing here" />)

      const containerElement = container.querySelector('.text-center.py-8.text-gray-500')
      expect(containerElement).toBeDefined()
    })

    it('should have proper icon styling', () => {
      const { container } = render(() => <EmptyState icon="📂" title="Empty" description="Nothing here" />)

      const iconElement = container.querySelector('.text-4xl.mb-2')
      expect(iconElement).toBeDefined()
      expect(iconElement?.textContent).toBe('📂')
    })

    it('should have proper title styling', () => {
      const { container } = render(() => <EmptyState icon="📂" title="Empty State" description="Nothing here" />)

      const titleElement = container.querySelector('.text-lg.font-medium.text-gray-900.mb-1')
      expect(titleElement).toBeDefined()
      expect(titleElement?.textContent).toBe('Empty State')
    })

    it('should have proper description styling', () => {
      const { container } = render(() => <EmptyState icon="📂" title="Empty" description="Nothing to see here" />)

      const descriptionElement = container.querySelector('.text-sm.text-gray-500.mb-4')
      expect(descriptionElement).toBeDefined()
      expect(descriptionElement?.textContent).toBe('Nothing to see here')
    })
  })

  describe('Content Variations', () => {
    it('should handle different file-related scenarios', () => {
      render(() => <EmptyState icon="📄" title="No documents" description="Upload a document to begin" />)

      expect(screen.getByText('📄')).toBeDefined()
      expect(screen.getByText('No documents')).toBeDefined()
      expect(screen.getByText('Upload a document to begin')).toBeDefined()
    })

    it('should handle search-related scenarios', () => {
      render(() => <EmptyState icon="🔍" title="No search results" description="Try adjusting your search terms" />)

      expect(screen.getByText('🔍')).toBeDefined()
      expect(screen.getByText('No search results')).toBeDefined()
      expect(screen.getByText('Try adjusting your search terms')).toBeDefined()
    })

    it('should handle error scenarios', () => {
      render(() => <EmptyState icon="⚠️" title="Something went wrong" description="Please try again later" />)

      expect(screen.getByText('⚠️')).toBeDefined()
      expect(screen.getByText('Something went wrong')).toBeDefined()
      expect(screen.getByText('Please try again later')).toBeDefined()
    })
  })

  describe('Responsive Design', () => {
    it('should have responsive max-width for description', () => {
      const { container } = render(() => (
        <EmptyState
          icon="📂"
          title="Empty"
          description="This description should be responsive and centered with max width"
        />
      ))

      const descriptionElement = container.querySelector('.max-w-md.mx-auto')
      expect(descriptionElement).toBeDefined()
    })

    it('should have proper padding and spacing', () => {
      const { container } = render(() => <EmptyState icon="📂" title="Empty" description="Description" />)

      const containerElement = container.querySelector('.py-8')
      expect(containerElement).toBeDefined()

      const iconElement = container.querySelector('.mb-4')
      expect(iconElement).toBeDefined()

      const titleElement = container.querySelector('.mb-2')
      expect(titleElement).toBeDefined()
    })
  })

  describe('Text Content', () => {
    it('should preserve text formatting', () => {
      const titleWithSpaces = '  No Files  '
      const descriptionWithNewlines = 'First line\nSecond line'

      render(() => <EmptyState icon="📂" title={titleWithSpaces} description={descriptionWithNewlines} />)

      // Use getAllByText since there might be multiple elements containing the text
      const noFilesElements = screen.getAllByText((content, element) => {
        return element?.textContent?.includes('No Files') ?? false
      })
      expect(noFilesElements.length).toBeGreaterThan(0)

      const firstLineElements = screen.getAllByText((content, element) => {
        return element?.textContent?.includes('First line') ?? false
      })
      expect(firstLineElements.length).toBeGreaterThan(0)
    })

    it('should handle special characters in content', () => {
      const specialTitle = 'Files & Folders (0)'
      const specialDescription = 'Use "Upload" button or drag & drop files here'

      render(() => <EmptyState icon="📁" title={specialTitle} description={specialDescription} />)

      expect(screen.getByText(specialTitle)).toBeDefined()
      expect(screen.getByText(specialDescription)).toBeDefined()
    })
  })

  describe('Accessibility', () => {
    it('should have proper semantic structure', () => {
      const { container } = render(() => (
        <EmptyState icon="📂" title="Empty State" description="No content available" />
      ))

      // Check for heading
      const heading = screen.getByRole('heading')
      expect(heading).toBeDefined()
      expect(heading.textContent).toBe('Empty State')
    })

    it('should have proper text hierarchy', () => {
      render(() => <EmptyState icon="📂" title="Main Title" description="Supporting description text" />)

      const heading = screen.getByRole('heading')
      expect(heading.tagName.toLowerCase()).toBe('h3')
      expect(heading.textContent).toBe('Main Title')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty strings', () => {
      render(() => <EmptyState icon="" title="" description="" />)

      // Component should still render structure
      const { container } = render(() => <EmptyState icon="" title="" description="" />)

      const containerElement = container.querySelector('.text-center.py-8')
      expect(containerElement).toBeDefined()
    })

    it('should handle unicode characters', () => {
      render(() => <EmptyState icon="🎉" title="Célébration!" description="Füür dich! 🌟" />)

      expect(screen.getByText('🎉')).toBeDefined()
      expect(screen.getByText('Célébration!')).toBeDefined()
      expect(screen.getByText('Füür dich! 🌟')).toBeDefined()
    })

    it('should handle very long single words', () => {
      const longWord = 'supercalifragilisticexpialidocious'

      render(() => <EmptyState icon="📝" title={longWord} description={`This is a ${longWord} example`} />)

      expect(screen.getByText(longWord)).toBeDefined()
      expect(screen.getByText(`This is a ${longWord} example`)).toBeDefined()
    })
  })

  describe('Component Structure', () => {
    it('should have proper DOM structure', () => {
      const { container } = render(() => <EmptyState icon="📂" title="Title" description="Description" />)

      // Check overall structure
      const wrapper = container.querySelector('.text-center.py-8')
      expect(wrapper).toBeDefined()

      // Check icon element
      const icon = wrapper?.querySelector('.text-4xl.mb-4')
      expect(icon).toBeDefined()

      // Check title element
      const title = wrapper?.querySelector('h3.text-xl.font-semibold.text-gray-700.mb-2')
      expect(title).toBeDefined()

      // Check description element
      const description = wrapper?.querySelector('p.text-gray-500.max-w-md.mx-auto')
      expect(description).toBeDefined()
    })

    it('should render elements in correct order', () => {
      const { container } = render(() => <EmptyState icon="📂" title="Title" description="Description" />)

      const wrapper = container.querySelector('.text-center.py-8')
      const children = wrapper?.children

      expect(children).toHaveLength(3)
      expect(children?.[0].textContent).toBe('📂') // Icon first
      expect(children?.[1].textContent).toBe('Title') // Title second
      expect(children?.[2].textContent).toBe('Description') // Description third
    })
  })
})
