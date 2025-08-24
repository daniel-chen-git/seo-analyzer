export interface BaseComponentProps {
  className?: string
  children?: React.ReactNode
}

export interface LoadingState {
  isLoading: boolean
  error: string | null
}

export interface ProgressState {
  progress: number
  status: 'idle' | 'analyzing' | 'completed' | 'error'
  message: string
}