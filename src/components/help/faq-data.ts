/**
 * FAQ Data
 *
 * Structured content for the Help Center FAQ section.
 * Organized by category for easy navigation.
 */

export interface FAQItem {
  question: string;
  answer: string;
}

export interface FAQCategory {
  title: string;
  items: FAQItem[];
}

export const faqCategories: FAQCategory[] = [
  {
    title: 'Getting Started',
    items: [
      {
        question: 'How do I create a new tracker?',
        answer:
          'From the dashboard, click "Add Tracker". You can choose from preset templates (like Pain, Mood, or Sleep) or describe what you want to track in your own words. Our AI will generate a customized tracker configuration for you.',
      },
      {
        question: 'What is a tracker?',
        answer:
          'A tracker is a customized form for logging a specific health metric. Each tracker has its own set of fields (intensity, location, triggers, notes) tailored to what you\'re tracking. You can create multiple trackers for different aspects of your health.',
      },
      {
        question: 'How do I log an entry?',
        answer:
          'Open a tracker from your dashboard, then click the "Log Entry" button. Fill in the details (intensity, any relevant locations, triggers, and notes) and save. Your entry will appear in the list and contribute to your analytics.',
      },
      {
        question: 'Can I edit or delete an entry?',
        answer:
          'Yes! Click on any entry card to see the options menu. You can edit the entry to update any field, or delete it entirely. Deleted entries cannot be recovered.',
      },
    ],
  },
  {
    title: 'Data & Privacy',
    items: [
      {
        question: 'Where is my data stored?',
        answer:
          'Your data is stored securely on Supabase servers with encryption at rest (AES-256) and in transit (TLS 1.2+). Each user\'s data is isolated using Row-Level Security (RLS), meaning you can only access your own data.',
      },
      {
        question: 'Can I export my data?',
        answer:
          'Yes! Go to Settings → Export Data. You can download all your trackers and entries in JSON or CSV format. This is useful for backup, sharing with healthcare providers, or if you want to leave the service.',
      },
      {
        question: 'Can I delete my account?',
        answer:
          'Yes. Go to Settings → Danger Zone → Delete Account. This permanently removes your account and all associated data. We recommend exporting your data first as this action cannot be undone.',
      },
      {
        question: 'Does Baseline share my data with third parties?',
        answer:
          'No. We do not sell your data or share it with advertisers. Your health data is only used to provide the service to you. When you use AI features, minimal data is sent to Google\'s Gemini for processing. See our Privacy Policy for details.',
      },
    ],
  },
  {
    title: 'Features',
    items: [
      {
        question: 'What do the analytics show?',
        answer:
          'Analytics provide visual insights into your tracking patterns. You\'ll see a heatmap calendar showing entry frequency and intensity, trend lines over time, distribution charts for triggers and locations, and correlation insights between different metrics.',
      },
      {
        question: 'What is Interlink?',
        answer:
          'Interlink is our correlation analysis tool. It compares two metrics (like pain and sleep quality) to identify patterns. For example, it might reveal that your pain tends to be higher on days when you slept poorly.',
      },
      {
        question: 'How do hashtags work?',
        answer:
          'You can add hashtags to any entry\'s notes (like #work or #exercise). These appear in your analytics as a word cloud, helping you identify common themes or contexts for your entries.',
      },
      {
        question: 'What are AI-generated trackers?',
        answer:
          'When you describe what you want to track, our AI creates a customized configuration with appropriate fields, labels, and suggested options. This saves you time and ensures the tracker is tailored to your specific needs.',
      },
    ],
  },
  {
    title: 'Troubleshooting',
    items: [
      {
        question: 'The app isn\'t loading. What should I do?',
        answer:
          'First, try refreshing the page. If you\'re offline, Baseline will work in offline mode with data syncing when you reconnect. If problems persist, try clearing your browser cache or using a different browser.',
      },
      {
        question: 'My entries aren\'t syncing.',
        answer:
          'If you\'re offline, entries are saved locally and will sync when you reconnect. You can check your connection status in the header. If online but still having issues, try refreshing the page. Offline entries are shown with a cloud icon.',
      },
      {
        question: 'I forgot my password.',
        answer:
          'On the sign-in screen, click "Forgot password?" and enter your email. You\'ll receive a link to reset your password. The link expires after 24 hours.',
      },
      {
        question: 'The charts aren\'t displaying correctly.',
        answer:
          'Try refreshing the page or switching themes. Some chart issues can occur when resizing the browser window. If using accessibility patterns, try toggling them off and on in the accessibility settings.',
      },
    ],
  },
  {
    title: 'Account',
    items: [
      {
        question: 'How do I change my password?',
        answer:
          'Go to Settings → Profile → Change Password. You\'ll need to enter your current password and then your new password twice to confirm.',
      },
      {
        question: 'Can I change my email address?',
        answer:
          'Email changes are not currently supported in the app. If you need to update your email, please contact support and we\'ll help you migrate your data.',
      },
      {
        question: 'How do I sign out?',
        answer:
          'Click the sign out button in the header (the door icon with an arrow). This will end your session. Your data remains safely stored and will be available when you sign back in.',
      },
    ],
  },
];
