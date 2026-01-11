# Error Tracking & Monitoring

This document outlines the error tracking and monitoring setup for EstateIQ.

## Current Implementation

### Error Boundary

A React Error Boundary component (`components/error-boundary.tsx`) catches JavaScript errors in the component tree and displays a user-friendly error message.

**Usage:**
```tsx
import { ErrorBoundary } from '@/components/error-boundary'

<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>
```

### Error Logging Utility

A centralized error logging utility (`lib/utils/error-logging.ts`) provides consistent error logging across the application.

**Usage:**
```tsx
import { logError } from '@/lib/utils/error-logging'

try {
  // Your code
} catch (error) {
  logError(error, {
    userId: user.id,
    organizationId: org.id,
    action: 'createPayment',
    metadata: { paymentId: '...' },
  })
}
```

## Optional: Sentry Integration

For production error tracking, you can integrate Sentry:

### 1. Install Sentry

```bash
npm install @sentry/nextjs
```

### 2. Initialize Sentry

Create `sentry.client.config.ts`:
```typescript
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  debug: false,
})
```

Create `sentry.server.config.ts`:
```typescript
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
})
```

Create `sentry.edge.config.ts`:
```typescript
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
})
```

### 3. Update Error Logging Utility

Update `lib/utils/error-logging.ts` to use Sentry:

```typescript
import * as Sentry from '@sentry/nextjs'

export function logError(error: Error | unknown, context?: ErrorContext) {
  // ... existing code ...

  if (process.env.NODE_ENV === 'production') {
    Sentry.captureException(error, {
      tags: {
        action: context?.action,
      },
      extra: context?.metadata,
      user: context?.userId ? { id: context.userId } : undefined,
    })
  }
}
```

### 4. Environment Variables

Add to `.env.local`:
```
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn-here
```

### 5. Wrap App with Error Boundary

Update `app/app/layout.tsx` to include Sentry's error boundary:

```tsx
import * as Sentry from '@sentry/nextjs'
import { ErrorBoundary } from '@/components/error-boundary'

export default function AppLayout({ children }) {
  return (
    <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
      <ErrorBoundary>
        {children}
      </ErrorBoundary>
    </Sentry.ErrorBoundary>
  )
}
```

## Best Practices

1. **Log errors with context**: Always include user ID, organization ID, and action context
2. **Don't log sensitive data**: Avoid logging passwords, tokens, or PII
3. **Use appropriate log levels**: Use `logError` for errors, `logWarning` for warnings
4. **Monitor production**: Set up alerts in your error tracking service for critical errors
5. **Review regularly**: Periodically review error logs to identify patterns and fix root causes

## Server Action Error Handling

Server actions should return errors in a consistent format:

```typescript
return { data: null, error: 'User-friendly error message' }
```

Client components should handle these errors and log them:

```typescript
if (result.error) {
  logError(new Error(result.error), {
    userId: user.id,
    organizationId: org.id,
    action: 'createPayment',
  })
  toast.error(result.error)
}
```

