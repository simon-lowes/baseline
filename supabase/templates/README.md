# Baseline Email Templates

These email templates are styled to match the Baseline app's calming design system with:
- Soft teal primary color (#4db6ac)
- Warm cream backgrounds (#f8f5f0)
- Coral accent for important actions (#e07d5f)
- Source Sans 3 font family
- Rounded corners and subtle shadows

## How to Apply Templates to Supabase

### Step 1: Go to Email Templates
1. Open your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Authentication** > **Email Templates**

### Step 2: Update Each Template

For each template type below, copy the **Subject** and **HTML content** from the corresponding file:

| Template Type | File | Suggested Subject |
|--------------|------|-------------------|
| Confirm signup | `confirmation.html` | Welcome to Baseline - Confirm your email |
| Magic Link | `magic_link.html` | Sign in to Baseline |
| Reset Password | `recovery.html` | Reset your Baseline password |
| Change Email | `email_change.html` | Confirm your new email - Baseline |
| Invite User | `invite.html` | You're invited to Baseline |
| Reauthentication | `reauthentication.html` | Verify your identity - Baseline |

### Step 3: Copy HTML Content
1. Open the HTML file in a text editor
2. Copy the entire contents
3. Paste into the "Message body" field in Supabase
4. Click "Save"

## Template Variables

These templates use Supabase's template variables:
- `{{ .ConfirmationURL }}` - The confirmation link
- `{{ .Token }}` - 6-digit OTP code
- `{{ .Email }}` - User's email address
- `{{ .NewEmail }}` - New email (for email change)
- `{{ .SiteURL }}` - Your app's site URL

## Preview

The templates feature:
- Clean, modern card-based design
- Teal gradient header icons
- Prominent call-to-action buttons
- Fallback link text for accessibility
- OTP code display where applicable
- Subtle footer with security messaging
