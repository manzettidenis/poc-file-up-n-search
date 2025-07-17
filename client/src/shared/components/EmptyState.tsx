import { Component, JSX } from 'solid-js'

interface EmptyStateProps {
  icon: string
  title: string
  description?: string
  action?: JSX.Element
}

const EmptyState: Component<EmptyStateProps> = props => {
  return (
    <div class="text-center py-8 text-gray-500">
      <div class="text-4xl mb-2">{props.icon}</div>
      <h3 class="text-lg font-medium text-gray-900 mb-1">{props.title}</h3>
      {props.description && <p class="text-sm text-gray-500 mb-4">{props.description}</p>}
      {props.action && <div class="mt-4">{props.action}</div>}
    </div>
  )
}

export default EmptyState
