import { createSignal } from 'solid-js'

export type NotificationType = 'success' | 'error' | 'info' | 'warning'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message?: string
  duration?: number
}

// Global notification state
const [notifications, setNotifications] = createSignal<Notification[]>([])

// Helper to generate unique IDs
const generateId = () => `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

export const notificationStore = {
  // Getters
  notifications,

  // Actions
  add(notification: Omit<Notification, 'id'>): string {
    const id = generateId()
    const newNotification: Notification = {
      id,
      duration: 3000, // Default 3 seconds
      ...notification,
    }

    console.log(`Adding notification ${id} with duration ${newNotification.duration}ms`)
    setNotifications(prev => [...prev, newNotification])

    return id
  },

  remove(id: string) {
    console.log(`Removing notification ${id}`)
    setNotifications(prev => prev.filter(n => n.id !== id))
  },

  clear() {
    console.log('Clearing all notifications')
    setNotifications([])
  },

  // Convenience methods
  success(title: string, message?: string, duration?: number): string {
    return notificationStore.add({ type: 'success', title, message, duration })
  },

  error(title: string, message?: string, duration?: number): string {
    return notificationStore.add({ type: 'error', title, message, duration })
  },

  info(title: string, message?: string, duration?: number): string {
    return notificationStore.add({ type: 'info', title, message, duration })
  },

  warning(title: string, message?: string, duration?: number): string {
    return notificationStore.add({ type: 'warning', title, message, duration })
  },
}
