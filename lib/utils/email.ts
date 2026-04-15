/**
 * Email sending utility using Resend
 * Server-only utility for sending reminder emails
 */

import { Resend } from 'resend'
import { logError } from './error-logging'

// Initialize Resend client (server-only)
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@estateiq.app'

export type EmailSendResult = {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Send an email using Resend
 * Returns success status and message ID or error
 */
export async function sendEmail(
  to: string,
  subject: string,
  body: string,
  options?: {
    replyTo?: string
    metadata?: Record<string, string>
  }
): Promise<EmailSendResult> {
  // Validate Resend is configured
  if (!resend) {
    const error = 'Email service not configured. RESEND_API_KEY is missing.'
    logError(new Error(error), { action: 'sendEmail' })
    return { success: false, error }
  }

  // Validate email address
  if (!to || !to.includes('@')) {
    return { success: false, error: 'Invalid recipient email address' }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject,
      text: body,
      replyTo: options?.replyTo,
      tags: options?.metadata
        ? Object.entries(options.metadata).map(([key, value]) => ({
            name: key,
            value: String(value),
          }))
        : undefined,
    })

    if (error) {
      logError(error, { action: 'sendEmail', metadata: { to, subject } })
      return { success: false, error: error.message || 'Failed to send email' }
    }

    if (!data?.id) {
      return { success: false, error: 'Email sent but no message ID returned' }
    }

    return { success: true, messageId: data.id }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    logError(err, { action: 'sendEmail', metadata: { to, subject } })
    return { success: false, error: errorMessage }
  }
}

/**
 * Validate email configuration
 * Returns true if email service is properly configured
 */
export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY && !!process.env.RESEND_FROM_EMAIL
}

