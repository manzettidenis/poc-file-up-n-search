import { Component, For, Show, createSignal, createEffect, onCleanup } from 'solid-js'
import { notificationStore, Notification } from '../../core/stores/notifications'

const NotificationItem: Component<{ notification: Notification }> = props => {
  const [progress, setProgress] = createSignal(100)
  let progressInterval: ReturnType<typeof setInterval> | undefined

  // Handle both visual progress and auto-dismiss in the component
  createEffect(() => {
    const notification = props.notification

    // Clean up any existing interval
    if (progressInterval) {
      clearInterval(progressInterval)
      progressInterval = undefined
    }

    if (notification.duration && notification.duration > 0) {
      console.log(`Setting up auto-dismiss and progress for notification ${notification.id}`)

      const startTime = Date.now()
      const duration = notification.duration
      setProgress(100) // Reset progress

      // Update progress every 50ms
      progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTime
        const remaining = Math.max(0, duration - elapsed)
        const progressValue = (remaining / duration) * 100

        setProgress(progressValue)

        // Auto-dismiss when time is up
        if (remaining <= 0) {
          console.log(`Auto-dismissing notification ${notification.id}`)
          clearInterval(progressInterval!)
          progressInterval = undefined
          notificationStore.remove(notification.id)
        }
      }, 50)
    }
  })

  onCleanup(() => {
    console.log(`Cleaning up notification ${props.notification.id}`)
    if (progressInterval) {
      clearInterval(progressInterval)
    }
  })

  const getNotificationIcon = (type: Notification['type']): string => {
    switch (type) {
      case 'success':
        return '✅'
      case 'error':
        return '❌'
      case 'warning':
        return '⚠️'
      case 'info':
        return 'ℹ️'
      default:
        return 'ℹ️'
    }
  }

  const getNotificationColors = (type: Notification['type']): string => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800'
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800'
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800'
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800'
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800'
    }
  }

  const getCloseButtonColors = (type: Notification['type']): string => {
    switch (type) {
      case 'success':
        return 'text-green-400 hover:text-green-600'
      case 'error':
        return 'text-red-400 hover:text-red-600'
      case 'warning':
        return 'text-yellow-400 hover:text-yellow-600'
      case 'info':
        return 'text-blue-400 hover:text-blue-600'
      default:
        return 'text-gray-400 hover:text-gray-600'
    }
  }

  const getProgressBarColor = (type: Notification['type']): string => {
    switch (type) {
      case 'success':
        return 'bg-green-400'
      case 'error':
        return 'bg-red-400'
      case 'warning':
        return 'bg-yellow-400'
      case 'info':
        return 'bg-blue-400'
      default:
        return 'bg-gray-400'
    }
  }

  return (
    <div
      class={`border rounded-lg p-4 flex items-start space-x-3 shadow-lg transition-all duration-300 relative ${getNotificationColors(props.notification.type)}`}
    >
      {/* Progress bar - moved to top for better visibility */}
      <Show when={props.notification.duration && props.notification.duration > 0}>
        <div class="absolute top-0 left-0 h-1 bg-black bg-opacity-20 w-full">
          <div
            class={`h-full transition-all duration-75 ease-linear ${getProgressBarColor(props.notification.type)}`}
            style={{ width: `${progress()}%` }}
          />
        </div>
      </Show>

      <div class="text-xl flex-shrink-0">{getNotificationIcon(props.notification.type)}</div>
      <div class="flex-1 min-w-0">
        <h4 class="font-medium">{props.notification.title}</h4>
        <Show when={props.notification.message}>
          <p class="text-sm mt-1 opacity-90">{props.notification.message}</p>
        </Show>
      </div>
      <button
        onClick={() => {
          console.log(`Manually removing notification ${props.notification.id}`)
          notificationStore.remove(props.notification.id)
        }}
        class={`flex-shrink-0 transition-colors ${getCloseButtonColors(props.notification.type)}`}
      >
        ✕
      </button>
    </div>
  )
}

const NotificationToast: Component = () => {
  return (
    <div class="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      <For each={notificationStore.notifications()}>
        {notification => <NotificationItem notification={notification} />}
      </For>
    </div>
  )
}

export default NotificationToast
