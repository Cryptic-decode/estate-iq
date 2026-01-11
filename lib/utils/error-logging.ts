/**
 * Error logging utility
 * Centralizes error logging for consistent error tracking
 */

type ErrorContext = {
  userId?: string
  organizationId?: string
  action?: string
  metadata?: Record<string, any>
}

/**
 * Log an error with context
 * In production, this can be extended to send to error tracking services
 */
export function logError(error: Error | unknown, context?: ErrorContext) {
  const errorMessage = error instanceof Error ? error.message : String(error)
  const errorStack = error instanceof Error ? error.stack : undefined

  const logData = {
    message: errorMessage,
    stack: errorStack,
    timestamp: new Date().toISOString(),
    context: context || {},
    environment: process.env.NODE_ENV,
  }

  // Log to console in all environments
  console.error('Error logged:', logData)

  // In production, you can send to error tracking service here
  // Example with Sentry:
  // if (typeof window !== 'undefined' && window.Sentry) {
  //   window.Sentry.captureException(error, {
  //     tags: {
  //       action: context?.action,
  //     },
  //     extra: context?.metadata,
  //     user: context?.userId ? { id: context.userId } : undefined,
  //   })
  // }

  return logData
}

/**
 * Log a warning (non-critical issues)
 */
export function logWarning(message: string, context?: ErrorContext) {
  const logData = {
    message,
    timestamp: new Date().toISOString(),
    context: context || {},
    environment: process.env.NODE_ENV,
  }

  console.warn('Warning logged:', logData)

  return logData
}

