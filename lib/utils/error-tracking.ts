/**
 * Error tracking utilities for the frontend.
 * 
 * This is a lightweight error tracking implementation that logs errors
 * to the console in development and can be extended to send errors to
 * a backend service in production.
 * 
 * Note: Sentry integration is available in the backend. For frontend
 * error tracking with Sentry, wait for @sentry/nextjs to support Next.js 16.
 */

type SeverityLevel = 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug';

interface ErrorContext {
  [key: string]: unknown;
}

// Store for user context
let currentUserContext: {
  id: string;
  role?: string;
  operator_number?: string;
} | null = null;

// Store for breadcrumbs
const breadcrumbs: Array<{
  message: string;
  category: string;
  data?: Record<string, unknown>;
  level: SeverityLevel;
  timestamp: number;
}> = [];

const MAX_BREADCRUMBS = 100;

/**
 * Capture an error with additional context.
 */
export function captureError(
  error: Error,
  context?: ErrorContext
): string | undefined {
  const errorId = crypto.randomUUID();
  
  console.error('[Error Captured]', {
    id: errorId,
    error: error.message,
    stack: error.stack,
    context,
    user: currentUserContext,
    breadcrumbs: breadcrumbs.slice(-10),
    timestamp: new Date().toISOString(),
  });
  
  // In production, you could send this to your backend
  if (process.env.NODE_ENV === 'production') {
    // Example: Send to backend error logging endpoint
    // fetch('/api/errors', { method: 'POST', body: JSON.stringify({ ... }) });
  }
  
  return errorId;
}

/**
 * Capture a message with a severity level.
 */
export function captureMessage(
  message: string,
  level: SeverityLevel = 'info',
  context?: ErrorContext
): string | undefined {
  const messageId = crypto.randomUUID();
  
  const logMethod = level === 'error' || level === 'fatal' 
    ? console.error 
    : level === 'warning' 
      ? console.warn 
      : console.log;
  
  logMethod(`[${level.toUpperCase()}]`, message, {
    id: messageId,
    context,
    user: currentUserContext,
    timestamp: new Date().toISOString(),
  });
  
  return messageId;
}

/**
 * Set user context for error tracking.
 */
export function setUserContext(user: {
  id: number | string;
  role?: string;
  operatorNumber?: string;
} | null): void {
  if (user) {
    currentUserContext = {
      id: String(user.id),
      role: user.role,
      operator_number: user.operatorNumber,
    };
  } else {
    currentUserContext = null;
  }
}

/**
 * Add breadcrumb for debugging context.
 */
export function addBreadcrumb(
  message: string,
  category: string,
  data?: Record<string, unknown>,
  level: SeverityLevel = 'info'
): void {
  breadcrumbs.push({
    message,
    category,
    data,
    level,
    timestamp: Date.now() / 1000,
  });
  
  // Keep only the last MAX_BREADCRUMBS
  if (breadcrumbs.length > MAX_BREADCRUMBS) {
    breadcrumbs.shift();
  }
}

/**
 * Error boundary fallback component props.
 */
export interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

/**
 * Report user feedback after an error.
 */
export function reportFeedback(
  eventId: string,
  feedback: {
    name?: string;
    email?: string;
    comments: string;
  }
): void {
  console.log('[User Feedback]', {
    eventId,
    feedback,
    timestamp: new Date().toISOString(),
  });
  
  // In production, send to backend
  if (process.env.NODE_ENV === 'production') {
    // fetch('/api/feedback', { method: 'POST', body: JSON.stringify({ eventId, ...feedback }) });
  }
}
