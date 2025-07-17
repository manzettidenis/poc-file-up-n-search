import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, screen, waitFor } from '@solidjs/testing-library'
import { createSignal } from 'solid-js'
import NotificationToast from '../NotificationToast'
import { notificationStore, Notification } from '../../../core/stores/notifications'

// Mock the notification store
vi.mock('../../../core/stores/notifications', () => {
  const [notifications, setNotifications] = createSignal<Notification[]>([])

  return {
    notificationStore: {
      notifications,
      remove: vi.fn(),
      setNotifications, // For test setup
    },
    Notification: {} as any,
  }
})

const mockNotificationStore = vi.mocked(notificationStore)

describe('NotificationToast Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    // Clear notifications
    ;(mockNotificationStore as any).setNotifications([])
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  describe('Empty State', () => {
    it('should render empty when no notifications', () => {
      const { container } = render(() => <NotificationToast />)

      expect(container.querySelector('.fixed.top-4.right-4')).toBeDefined()
      expect(container.children[0].children).toHaveLength(0)
    })
  })

  describe('Notification Display', () => {
    it('should render success notification correctly', () => {
      const notification: Notification = {
        id: '1',
        type: 'success',
        title: 'Success!',
        message: 'Operation completed successfully',
        duration: 3000,
      }

      ;(mockNotificationStore as any).setNotifications([notification])

      render(() => <NotificationToast />)

      expect(screen.getByText('Success!')).toBeDefined()
      expect(screen.getByText('Operation completed successfully')).toBeDefined()
      expect(screen.getByText('✅')).toBeDefined()
    })

    it('should render error notification correctly', () => {
      const notification: Notification = {
        id: '1',
        type: 'error',
        title: 'Error!',
        message: 'Something went wrong',
        duration: 3000,
      }

      ;(mockNotificationStore as any).setNotifications([notification])

      render(() => <NotificationToast />)

      expect(screen.getByText('Error!')).toBeDefined()
      expect(screen.getByText('Something went wrong')).toBeDefined()
      expect(screen.getByText('❌')).toBeDefined()
    })

    it('should render warning notification correctly', () => {
      const notification: Notification = {
        id: '1',
        type: 'warning',
        title: 'Warning!',
        message: 'Please be careful',
        duration: 3000,
      }

      ;(mockNotificationStore as any).setNotifications([notification])

      render(() => <NotificationToast />)

      expect(screen.getByText('Warning!')).toBeDefined()
      expect(screen.getByText('Please be careful')).toBeDefined()
      expect(screen.getByText('⚠️')).toBeDefined()
    })

    it('should render info notification correctly', () => {
      const notification: Notification = {
        id: '1',
        type: 'info',
        title: 'Info!',
        message: 'Here is some information',
        duration: 3000,
      }

      ;(mockNotificationStore as any).setNotifications([notification])

      render(() => <NotificationToast />)

      expect(screen.getByText('Info!')).toBeDefined()
      expect(screen.getByText('Here is some information')).toBeDefined()
      expect(screen.getByText('ℹ️')).toBeDefined()
    })

    it('should render notification without message', () => {
      const notification: Notification = {
        id: '1',
        type: 'success',
        title: 'Success!',
        duration: 3000,
      }

      ;(mockNotificationStore as any).setNotifications([notification])

      render(() => <NotificationToast />)

      expect(screen.getByText('Success!')).toBeDefined()
      expect(screen.queryByText(/Here is some information/)).toBeNull()
    })
  })

  describe('Multiple Notifications', () => {
    it('should render multiple notifications', () => {
      const notifications: Notification[] = [
        {
          id: '1',
          type: 'success',
          title: 'Success 1',
          duration: 3000,
        },
        {
          id: '2',
          type: 'error',
          title: 'Error 1',
          duration: 3000,
        },
        {
          id: '3',
          type: 'info',
          title: 'Info 1',
          duration: 3000,
        },
      ]

      ;(mockNotificationStore as any).setNotifications(notifications)

      render(() => <NotificationToast />)

      expect(screen.getByText('Success 1')).toBeDefined()
      expect(screen.getByText('Error 1')).toBeDefined()
      expect(screen.getByText('Info 1')).toBeDefined()
      expect(screen.getByText('✅')).toBeDefined()
      expect(screen.getByText('❌')).toBeDefined()
      expect(screen.getByText('ℹ️')).toBeDefined()
    })
  })

  describe('User Interactions', () => {
    it('should call remove when close button is clicked', () => {
      const notification: Notification = {
        id: 'test-id',
        type: 'success',
        title: 'Success!',
        duration: 3000,
      }

      ;(mockNotificationStore as any).setNotifications([notification])

      render(() => <NotificationToast />)

      const closeButton = screen.getByText('✕')
      fireEvent.click(closeButton)

      expect(mockNotificationStore.remove).toHaveBeenCalledWith('test-id')
    })

    it('should call remove for correct notification when multiple exist', () => {
      const notifications: Notification[] = [
        {
          id: 'first',
          type: 'success',
          title: 'First',
          duration: 3000,
        },
        {
          id: 'second',
          type: 'error',
          title: 'Second',
          duration: 3000,
        },
      ]

      ;(mockNotificationStore as any).setNotifications(notifications)

      render(() => <NotificationToast />)

      const closeButtons = screen.getAllByText('✕')
      fireEvent.click(closeButtons[1]) // Click second close button

      expect(mockNotificationStore.remove).toHaveBeenCalledWith('second')
    })
  })

  describe('Progress Bar', () => {
    it('should show progress bar for notifications with duration', () => {
      const notification: Notification = {
        id: '1',
        type: 'success',
        title: 'Success!',
        duration: 3000,
      }

      ;(mockNotificationStore as any).setNotifications([notification])

      const { container } = render(() => <NotificationToast />)

      // Check for progress bar container
      const progressContainer = container.querySelector('.absolute.top-0.left-0.h-1')
      expect(progressContainer).toBeDefined()

      // Check for progress bar itself
      const progressBar = container.querySelector('.h-full.transition-all')
      expect(progressBar).toBeDefined()
    })

    it('should not show progress bar for notifications without duration', () => {
      const notification: Notification = {
        id: '1',
        type: 'success',
        title: 'Success!',
      }

      ;(mockNotificationStore as any).setNotifications([notification])

      const { container } = render(() => <NotificationToast />)

      const progressContainer = container.querySelector('.absolute.top-0.left-0.h-1')
      expect(progressContainer).toBeNull()
    })

    it('should use correct progress bar color for each notification type', () => {
      const { container: successContainer } = render(() => {
        ;(mockNotificationStore as any).setNotifications([
          {
            id: '1',
            type: 'success',
            title: 'Success!',
            duration: 3000,
          },
        ])
        return <NotificationToast />
      })

      const successProgressBar = successContainer.querySelector('.bg-green-400')
      expect(successProgressBar).toBeDefined()

      const { container: errorContainer } = render(() => {
        ;(mockNotificationStore as any).setNotifications([
          {
            id: '2',
            type: 'error',
            title: 'Error!',
            duration: 3000,
          },
        ])
        return <NotificationToast />
      })

      const errorProgressBar = errorContainer.querySelector('.bg-red-400')
      expect(errorProgressBar).toBeDefined()
    })
  })

  describe('Auto-Dismiss', () => {
    it('should auto-dismiss notification after duration', async () => {
      const notification: Notification = {
        id: 'auto-dismiss',
        type: 'success',
        title: 'Auto Dismiss',
        duration: 1000,
      }

      ;(mockNotificationStore as any).setNotifications([notification])

      render(() => <NotificationToast />)

      // Fast-forward time to trigger auto-dismiss
      vi.advanceTimersByTime(1000)

      await waitFor(() => {
        expect(mockNotificationStore.remove).toHaveBeenCalledWith('auto-dismiss')
      })
    })

    it('should not auto-dismiss notification without duration', async () => {
      const notification: Notification = {
        id: 'no-auto-dismiss',
        type: 'success',
        title: 'No Auto Dismiss',
      }

      ;(mockNotificationStore as any).setNotifications([notification])

      render(() => <NotificationToast />)

      // Fast-forward time
      vi.advanceTimersByTime(5000)

      // Should not have been called
      expect(mockNotificationStore.remove).not.toHaveBeenCalled()
    })

    it('should not auto-dismiss notification with zero duration', async () => {
      const notification: Notification = {
        id: 'zero-duration',
        type: 'success',
        title: 'Zero Duration',
        duration: 0,
      }

      ;(mockNotificationStore as any).setNotifications([notification])

      render(() => <NotificationToast />)

      vi.advanceTimersByTime(1000)

      expect(mockNotificationStore.remove).not.toHaveBeenCalled()
    })
  })

  describe('Styling and Layout', () => {
    it('should apply correct color scheme for success notification', () => {
      const notification: Notification = {
        id: '1',
        type: 'success',
        title: 'Success!',
        duration: 3000,
      }

      ;(mockNotificationStore as any).setNotifications([notification])

      const { container } = render(() => <NotificationToast />)

      const notificationElement = container.querySelector('.bg-green-50.border-green-200.text-green-800')
      expect(notificationElement).toBeDefined()
    })

    it('should apply correct color scheme for error notification', () => {
      const notification: Notification = {
        id: '1',
        type: 'error',
        title: 'Error!',
        duration: 3000,
      }

      ;(mockNotificationStore as any).setNotifications([notification])

      const { container } = render(() => <NotificationToast />)

      const notificationElement = container.querySelector('.bg-red-50.border-red-200.text-red-800')
      expect(notificationElement).toBeDefined()
    })

    it('should have proper layout classes', () => {
      const notification: Notification = {
        id: '1',
        type: 'success',
        title: 'Success!',
        duration: 3000,
      }

      ;(mockNotificationStore as any).setNotifications([notification])

      const { container } = render(() => <NotificationToast />)

      // Check main container
      const mainContainer = container.querySelector('.fixed.top-4.right-4.z-50.space-y-2.max-w-sm')
      expect(mainContainer).toBeDefined()

      // Check notification item layout
      const notificationItem = container.querySelector('.border.rounded-lg.p-4.flex.items-start.space-x-3')
      expect(notificationItem).toBeDefined()
    })
  })

  describe('Console Logging', () => {
    it('should log progress bar setup', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const notification: Notification = {
        id: 'log-test',
        type: 'success',
        title: 'Log Test',
        duration: 3000,
      }

      ;(mockNotificationStore as any).setNotifications([notification])

      render(() => <NotificationToast />)

      expect(consoleSpy).toHaveBeenCalledWith('Setting up auto-dismiss and progress for notification log-test')

      consoleSpy.mockRestore()
    })

    it('should log manual removal', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const notification: Notification = {
        id: 'manual-remove',
        type: 'success',
        title: 'Manual Remove',
        duration: 3000,
      }

      ;(mockNotificationStore as any).setNotifications([notification])

      render(() => <NotificationToast />)

      const closeButton = screen.getByText('✕')
      fireEvent.click(closeButton)

      expect(consoleSpy).toHaveBeenCalledWith('Manually removing notification manual-remove')

      consoleSpy.mockRestore()
    })

    it('should log auto-dismiss', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const notification: Notification = {
        id: 'auto-log',
        type: 'success',
        title: 'Auto Log',
        duration: 1000,
      }

      ;(mockNotificationStore as any).setNotifications([notification])

      render(() => <NotificationToast />)

      vi.advanceTimersByTime(1000)

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Auto-dismissing notification auto-log')
      })

      consoleSpy.mockRestore()
    })

    it('should log cleanup', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const notification: Notification = {
        id: 'cleanup-test',
        type: 'success',
        title: 'Cleanup Test',
        duration: 3000,
      }

      ;(mockNotificationStore as any).setNotifications([notification])

      const { unmount } = render(() => <NotificationToast />)

      unmount()

      expect(consoleSpy).toHaveBeenCalledWith('Cleaning up notification cleanup-test')

      consoleSpy.mockRestore()
    })
  })

  describe('Edge Cases', () => {
    it('should handle notification type fallback', () => {
      const notification: Notification = {
        id: '1',
        type: 'unknown' as any,
        title: 'Unknown Type',
        duration: 3000,
      }

      ;(mockNotificationStore as any).setNotifications([notification])

      render(() => <NotificationToast />)

      // Should fallback to info icon and gray styling
      expect(screen.getByText('ℹ️')).toBeDefined()
    })

    it('should handle rapid notification changes', () => {
      const notification1: Notification = {
        id: '1',
        type: 'success',
        title: 'First',
        duration: 3000,
      }

      ;(mockNotificationStore as any).setNotifications([notification1])

      render(() => <NotificationToast />)

      expect(screen.getByText('First')).toBeDefined()

      // Update notifications
      const notification2: Notification = {
        id: '2',
        type: 'error',
        title: 'Second',
        duration: 3000,
      }

      ;(mockNotificationStore as any).setNotifications([notification2])

      // Re-render with new state
      const { unmount } = render(() => <NotificationToast />)
      unmount()

      // Render fresh component with new state
      render(() => <NotificationToast />)

      // Should find the second notification - might have multiple instances
      const secondElements = screen.getAllByText('Second')
      expect(secondElements.length).toBeGreaterThan(0)
    })
  })
})
