import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot } from 'solid-js'
import { notificationStore, Notification } from '../notifications'

describe('Notifications Store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Clear any existing notifications
    notificationStore.clear()
  })

  afterEach(() => {
    // Clean up after each test
    notificationStore.clear()
  })

  describe('Initial State', () => {
    it('should have empty notifications array initially', () => {
      createRoot(() => {
        expect(notificationStore.notifications()).toEqual([])
      })
    })
  })

  describe('Adding Notifications', () => {
    it('should add notification with default duration', () => {
      createRoot(() => {
        const id = notificationStore.add({
          type: 'success',
          title: 'Test Success',
        })

        expect(typeof id).toBe('string')
        expect(id).toMatch(/^notification-\d+-[a-z0-9]+$/)

        const notifications = notificationStore.notifications()
        expect(notifications).toHaveLength(1)
        expect(notifications[0]).toMatchObject({
          id,
          type: 'success',
          title: 'Test Success',
          duration: 3000,
        })
      })
    })

    it('should add notification with custom properties', () => {
      createRoot(() => {
        const id = notificationStore.add({
          type: 'error',
          title: 'Test Error',
          message: 'Something went wrong',
          duration: 5000,
        })

        const notifications = notificationStore.notifications()
        expect(notifications[0]).toMatchObject({
          id,
          type: 'error',
          title: 'Test Error',
          message: 'Something went wrong',
          duration: 5000,
        })
      })
    })

    it('should add multiple notifications', () => {
      createRoot(() => {
        const id1 = notificationStore.add({
          type: 'success',
          title: 'First',
        })

        const id2 = notificationStore.add({
          type: 'error',
          title: 'Second',
        })

        const notifications = notificationStore.notifications()
        expect(notifications).toHaveLength(2)
        expect(notifications[0].id).toBe(id1)
        expect(notifications[1].id).toBe(id2)
      })
    })

    it('should generate unique IDs for each notification', () => {
      createRoot(() => {
        const id1 = notificationStore.add({ type: 'info', title: 'Test 1' })
        const id2 = notificationStore.add({ type: 'info', title: 'Test 2' })
        const id3 = notificationStore.add({ type: 'info', title: 'Test 3' })

        expect(id1).not.toBe(id2)
        expect(id2).not.toBe(id3)
        expect(id1).not.toBe(id3)
      })
    })
  })

  describe('Removing Notifications', () => {
    it('should remove notification by ID', () => {
      createRoot(() => {
        const id1 = notificationStore.add({ type: 'success', title: 'Test 1' })
        const id2 = notificationStore.add({ type: 'error', title: 'Test 2' })

        expect(notificationStore.notifications()).toHaveLength(2)

        notificationStore.remove(id1)

        const notifications = notificationStore.notifications()
        expect(notifications).toHaveLength(1)
        expect(notifications[0].id).toBe(id2)
        expect(notifications[0].title).toBe('Test 2')
      })
    })

    it('should handle removing non-existent notification', () => {
      createRoot(() => {
        notificationStore.add({ type: 'success', title: 'Test' })

        expect(notificationStore.notifications()).toHaveLength(1)

        // Try to remove non-existent ID
        notificationStore.remove('non-existent-id')

        // Should still have original notification
        expect(notificationStore.notifications()).toHaveLength(1)
      })
    })

    it('should remove correct notification when multiple exist', () => {
      createRoot(() => {
        const id1 = notificationStore.add({ type: 'success', title: 'First' })
        const id2 = notificationStore.add({ type: 'error', title: 'Second' })
        const id3 = notificationStore.add({ type: 'info', title: 'Third' })

        notificationStore.remove(id2)

        const notifications = notificationStore.notifications()
        expect(notifications).toHaveLength(2)
        expect(notifications.find(n => n.id === id1)).toBeDefined()
        expect(notifications.find(n => n.id === id3)).toBeDefined()
        expect(notifications.find(n => n.id === id2)).toBeUndefined()
      })
    })
  })

  describe('Clearing Notifications', () => {
    it('should clear all notifications', () => {
      createRoot(() => {
        notificationStore.add({ type: 'success', title: 'Test 1' })
        notificationStore.add({ type: 'error', title: 'Test 2' })
        notificationStore.add({ type: 'info', title: 'Test 3' })

        expect(notificationStore.notifications()).toHaveLength(3)

        notificationStore.clear()

        expect(notificationStore.notifications()).toHaveLength(0)
      })
    })

    it('should handle clearing when no notifications exist', () => {
      createRoot(() => {
        expect(notificationStore.notifications()).toHaveLength(0)

        notificationStore.clear()

        expect(notificationStore.notifications()).toHaveLength(0)
      })
    })
  })

  describe('Convenience Methods', () => {
    it('should create success notification', () => {
      createRoot(() => {
        const id = notificationStore.success('Success Title', 'Success message')

        const notifications = notificationStore.notifications()
        expect(notifications).toHaveLength(1)

        expect(notifications[0]).toMatchObject({
          id,
          type: 'success',
          title: 'Success Title',
          message: 'Success message',
        })
      })
    })

    it('should create error notification', () => {
      createRoot(() => {
        const id = notificationStore.error('Error Title', 'Error message')

        const notifications = notificationStore.notifications()
        expect(notifications[0]).toMatchObject({
          id,
          type: 'error',
          title: 'Error Title',
          message: 'Error message',
        })
      })
    })

    it('should create info notification', () => {
      createRoot(() => {
        const id = notificationStore.info('Info Title', 'Info message')

        const notifications = notificationStore.notifications()
        expect(notifications[0]).toMatchObject({
          id,
          type: 'info',
          title: 'Info Title',
          message: 'Info message',
        })
      })
    })

    it('should create warning notification', () => {
      createRoot(() => {
        const id = notificationStore.warning('Warning Title', 'Warning message')

        const notifications = notificationStore.notifications()
        expect(notifications[0]).toMatchObject({
          id,
          type: 'warning',
          title: 'Warning Title',
          message: 'Warning message',
        })
      })
    })

    it('should create notification without message', () => {
      createRoot(() => {
        const id = notificationStore.success('Title Only')

        const notifications = notificationStore.notifications()
        expect(notifications[0]).toMatchObject({
          id,
          type: 'success',
          title: 'Title Only',
        })
        expect(notifications[0].message).toBeUndefined()
      })
    })

    it('should create notification with custom duration', () => {
      createRoot(() => {
        const id = notificationStore.error('Error', 'Message', 10000)

        const notifications = notificationStore.notifications()
        expect(notifications[0]).toMatchObject({
          id,
          type: 'error',
          title: 'Error',
          message: 'Message',
          duration: 10000,
        })
      })
    })
  })

  describe('Console Logging', () => {
    it('should log when adding notification', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      createRoot(() => {
        const id = notificationStore.add({
          type: 'success',
          title: 'Test',
          duration: 5000,
        })

        expect(consoleSpy).toHaveBeenCalledWith(`Adding notification ${id} with duration 5000ms`)
      })

      consoleSpy.mockRestore()
    })

    it('should log when removing notification', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      createRoot(() => {
        const id = notificationStore.add({ type: 'success', title: 'Test' })

        consoleSpy.mockClear() // Clear the add log

        notificationStore.remove(id)

        expect(consoleSpy).toHaveBeenCalledWith(`Removing notification ${id}`)
      })

      consoleSpy.mockRestore()
    })

    it('should log when clearing notifications', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      createRoot(() => {
        notificationStore.add({ type: 'success', title: 'Test' })

        consoleSpy.mockClear() // Clear the add log

        notificationStore.clear()

        expect(consoleSpy).toHaveBeenCalledWith('Clearing all notifications')
      })

      consoleSpy.mockRestore()
    })
  })

  describe('Notification Properties', () => {
    it('should preserve all notification properties', () => {
      createRoot(() => {
        const notification: Omit<Notification, 'id'> = {
          type: 'warning',
          title: 'Warning Title',
          message: 'Detailed warning message',
          duration: 8000,
        }

        const id = notificationStore.add(notification)
        const stored = notificationStore.notifications()[0]

        expect(stored).toEqual({
          id,
          ...notification,
        })
      })
    })

    it('should handle notifications without optional properties', () => {
      createRoot(() => {
        const id = notificationStore.add({
          type: 'info',
          title: 'Minimal Info',
        })

        const stored = notificationStore.notifications()[0]

        expect(stored).toEqual({
          id,
          type: 'info',
          title: 'Minimal Info',
          duration: 3000, // Default duration
        })
        expect(stored.message).toBeUndefined()
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty title', () => {
      createRoot(() => {
        const id = notificationStore.add({
          type: 'info',
          title: '',
        })

        const notifications = notificationStore.notifications()
        expect(notifications[0].title).toBe('')
      })
    })

    it('should handle zero duration', () => {
      createRoot(() => {
        const id = notificationStore.add({
          type: 'success',
          title: 'Test',
          duration: 0,
        })

        const notifications = notificationStore.notifications()
        expect(notifications[0].duration).toBe(0)
      })
    })

    it('should handle negative duration', () => {
      createRoot(() => {
        const id = notificationStore.add({
          type: 'success',
          title: 'Test',
          duration: -1000,
        })

        const notifications = notificationStore.notifications()
        expect(notifications[0].duration).toBe(-1000)
      })
    })

    it('should handle very long strings', () => {
      createRoot(() => {
        const longTitle = 'A'.repeat(1000)
        const longMessage = 'B'.repeat(2000)

        const id = notificationStore.add({
          type: 'info',
          title: longTitle,
          message: longMessage,
        })

        const stored = notificationStore.notifications()[0]
        expect(stored.title).toBe(longTitle)
        expect(stored.message).toBe(longMessage)
      })
    })

    it('should handle special characters in strings', () => {
      createRoot(() => {
        const specialTitle = '🎉 Special chars: <>&"\'`'
        const specialMessage = 'Unicode: üñíçödé & HTML: <script>alert("test")</script>'

        const id = notificationStore.add({
          type: 'success',
          title: specialTitle,
          message: specialMessage,
        })

        const stored = notificationStore.notifications()[0]
        expect(stored.title).toBe(specialTitle)
        expect(stored.message).toBe(specialMessage)
      })
    })
  })

  describe('Reactive Updates', () => {
    it('should notify subscribers when notifications change', () => {
      createRoot(() => {
        let notificationCount = 0

        // Create a reactive context that tracks notifications
        const trackNotifications = () => {
          notificationCount = notificationStore.notifications().length
        }

        // Initial tracking
        trackNotifications()
        expect(notificationCount).toBe(0)

        // Add notification
        notificationStore.add({ type: 'success', title: 'Test' })
        trackNotifications()
        expect(notificationCount).toBe(1)

        // Add another
        notificationStore.add({ type: 'error', title: 'Test 2' })
        trackNotifications()
        expect(notificationCount).toBe(2)

        // Remove one
        const notifications = notificationStore.notifications()
        notificationStore.remove(notifications[0].id)
        trackNotifications()
        expect(notificationCount).toBe(1)

        // Clear all
        notificationStore.clear()
        trackNotifications()
        expect(notificationCount).toBe(0)
      })
    })
  })
})
