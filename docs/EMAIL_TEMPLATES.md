# EstateIQ Email Templates

This document contains email templates for Supabase Auth email confirmations.

## Setup Instructions

1. Go to your **Supabase Dashboard** → **Authentication** → **Email Templates**
2. Select **"Confirm signup"** template
3. Copy the HTML template below into the editor
4. Update the `{{ .SiteURL }}` variable if needed (or use your actual domain)
5. Save the template

## Signup Confirmation Email Template

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Confirm your EstateIQ account</title>
  </head>
  <body
    style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #fafafa;"
  >
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 40px 20px;">
          <table
            role="presentation"
            style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);"
          >
            <!-- Header -->
            <tr>
              <td
                style="padding: 40px 40px 32px; text-align: center; border-bottom: 1px solid #e4e4e7;"
              >
                <h1
                  style="margin: 0; font-size: 28px; font-weight: 600; color: #18181b; letter-spacing: -0.5px;"
                >
                  EstateIQ
                </h1>
                <p style="margin: 8px 0 0; font-size: 14px; color: #71717a;">
                  Rent Intelligence Platform
                </p>
              </td>
            </tr>

            <!-- Content -->
            <tr>
              <td style="padding: 40px 40px 32px;">
                <h2
                  style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #18181b; line-height: 1.3;"
                >
                  Confirm your email address
                </h2>
                <p
                  style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #52525b;"
                >
                  Thanks for signing up for EstateIQ! To complete your
                  registration and start managing your rent intelligence, please
                  confirm your email address by clicking the button below.
                </p>

                <!-- CTA Button -->
                <table role="presentation" style="width: 100%; margin: 32px 0;">
                  <tr>
                    <td style="text-align: center;">
                      <a
                        href="{{ .ConfirmationURL }}"
                        style="display: inline-block; padding: 12px 32px; background-color: #18181b; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 500; font-size: 15px; letter-spacing: 0.2px;"
                      >
                        Confirm Email Address
                      </a>
                    </td>
                  </tr>
                </table>

                <!-- Alternative Link -->
                <p
                  style="margin: 24px 0 0; font-size: 14px; line-height: 1.6; color: #71717a;"
                >
                  If the button doesn't work, copy and paste this link into your
                  browser:
                </p>
                <p
                  style="margin: 8px 0 0; font-size: 13px; line-height: 1.6; color: #a1a1aa; word-break: break-all;"
                >
                  <a
                    href="{{ .ConfirmationURL }}"
                    style="color: #3b82f6; text-decoration: none;"
                    >{{ .ConfirmationURL }}</a
                  >
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td
                style="padding: 32px 40px; background-color: #fafafa; border-top: 1px solid #e4e4e7; border-radius: 0 0 12px 12px;"
              >
                <p
                  style="margin: 0 0 8px; font-size: 13px; color: #71717a; text-align: center;"
                >
                  This confirmation link will expire in 24 hours.
                </p>
                <p
                  style="margin: 0; font-size: 12px; color: #a1a1aa; text-align: center;"
                >
                  If you didn't create an EstateIQ account, you can safely
                  ignore this email.
                </p>
              </td>
            </tr>
          </table>

          <!-- Bottom Spacing -->
          <table
            role="presentation"
            style="max-width: 600px; margin: 24px auto 0;"
          >
            <tr>
              <td style="text-align: center; padding: 0 20px;">
                <p style="margin: 0; font-size: 12px; color: #a1a1aa;">
                  © EstateIQ. All rights reserved.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

## Plain Text Version (Optional)

For email clients that don't support HTML:

```
EstateIQ - Rent Intelligence Platform

Confirm your email address

Thanks for signing up for EstateIQ! To complete your registration and start managing your rent intelligence, please confirm your email address by clicking the link below:

{{ .ConfirmationURL }}

This confirmation link will expire in 24 hours.

If you didn't create an EstateIQ account, you can safely ignore this email.

© EstateIQ. All rights reserved.
```

## Supabase Variables Reference

- `{{ .ConfirmationURL }}` - The confirmation link (automatically generated)
- `{{ .Email }}` - User's email address
- `{{ .SiteURL }}` - Your site URL (from Supabase project settings)
- `{{ .Token }}` - The confirmation token (usually not needed)

## Testing

After setting up the template:

1. Sign up with a test email
2. Check your inbox (or Supabase logs if using development mode)
3. Verify the email renders correctly
4. Click the confirmation link
5. Should redirect to `/auth/callback?next=/app` → then to `/app` → then to onboarding

## Notes

- The template uses a clean, professional design matching EstateIQ's aesthetic
- Dark mode friendly (uses neutral colors)
- Mobile responsive
- Includes both button and fallback link
- Clear expiration notice
- Security note for users who didn't sign up
