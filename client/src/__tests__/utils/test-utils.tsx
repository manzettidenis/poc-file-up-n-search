import { render } from '@solidjs/testing-library'
import { Component, JSX } from 'solid-js'

// Test wrapper for components that need providers
export const TestWrapper: Component<{ children: JSX.Element }> = props => {
  return <>{props.children}</>
}

// Custom render function with test wrapper
export function renderWithProviders(component: () => JSX.Element) {
  return render(() => <TestWrapper>{component()}</TestWrapper>)
}

// Mock file for testing file uploads
export function createMockFile(
  name: string = 'test.txt',
  content: string = 'test content',
  type: string = 'text/plain',
): File {
  const blob = new Blob([content], { type })
  return new File([blob], name, { type })
}

// Mock API responses
export const mockApiResponse = <T,>(data: T, success: boolean = true) => ({
  success,
  data,
  error: success ? undefined : 'Mock error',
})

// Mock fetch response
export function mockFetchResponse<T>(data: T, status: number = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: new Headers({
      'content-type': 'application/json',
    }),
    json: () => Promise.resolve(data),
  } as Response)
}
