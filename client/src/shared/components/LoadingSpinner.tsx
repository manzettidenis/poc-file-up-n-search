import { Component } from 'solid-js'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  text?: string
  center?: boolean
}

const LoadingSpinner: Component<LoadingSpinnerProps> = props => {
  const getSizeClasses = () => {
    switch (props.size || 'md') {
      case 'sm':
        return 'h-4 w-4'
      case 'md':
        return 'h-8 w-8'
      case 'lg':
        return 'h-12 w-12'
      default:
        return 'h-8 w-8'
    }
  }

  const containerClasses = () => {
    const base = 'flex items-center'
    const centered = props.center ? 'justify-center py-8' : ''
    const spacing = props.text ? 'space-x-2' : ''
    return `${base} ${centered} ${spacing}`.trim()
  }

  return (
    <div class={containerClasses()}>
      <div class={`animate-spin rounded-full border-b-2 border-blue-500 ${getSizeClasses()}`}></div>
      {props.text && <span class="text-gray-600">{props.text}</span>}
    </div>
  )
}

export default LoadingSpinner
