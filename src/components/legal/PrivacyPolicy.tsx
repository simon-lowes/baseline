/**
 * Privacy Policy Page
 *
 * GDPR-compliant privacy policy for Baseline health tracking app.
 * Accessible from footer and required for app store submission.
 */

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft } from 'lucide-react';

interface PrivacyPolicyProps {
  onBack: () => void;
}

export function PrivacyPolicy({ onBack }: PrivacyPolicyProps) {
  const lastUpdated = 'January 15, 2026';
  const contactEmail = 'privacy@baseline-app.com';

  return (
    <div className="container max-w-2xl mx-auto px-6 py-8">
      <Button
        variant="ghost"
        onClick={onBack}
        className="mb-6 -ml-2"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      <ScrollArea className="h-[calc(100vh-200px)]">
        <article className="prose prose-sm dark:prose-invert max-w-none space-y-6">
          <h1 className="text-2xl font-semibold tracking-tight">Privacy Policy</h1>
          <p className="text-muted-foreground">Last updated: {lastUpdated}</p>

          <section>
            <h2 className="text-lg font-medium mt-8 mb-3">1. Introduction</h2>
            <p>
              Baseline ("we", "our", or "us") is committed to protecting your privacy.
              This Privacy Policy explains how we collect, use, and safeguard your
              personal information when you use our health tracking application.
            </p>
            <p>
              We understand that health data is particularly sensitive. We have designed
              Baseline with privacy as a core principle—your data belongs to you.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium mt-8 mb-3">2. Information We Collect</h2>

            <h3 className="text-base font-medium mt-4 mb-2">Account Information</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Email address (for authentication)</li>
              <li>Display name (optional)</li>
              <li>Password (encrypted, never stored in plain text)</li>
            </ul>

            <h3 className="text-base font-medium mt-4 mb-2">Health Data You Create</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Trackers you create (names, configurations)</li>
              <li>Entries you log (intensity, location, triggers, notes, timestamps)</li>
              <li>Custom fields and hashtags</li>
            </ul>

            <h3 className="text-base font-medium mt-4 mb-2">Technical Information</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Browser type and version</li>
              <li>Device type</li>
              <li>Error logs (to improve app stability)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-medium mt-8 mb-3">3. How We Use Your Information</h2>
            <p>We use your information to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Provide and maintain the Baseline service</li>
              <li>Authenticate your account</li>
              <li>Sync your data across devices</li>
              <li>Generate analytics and insights from your data (processed locally or on-demand)</li>
              <li>Improve app stability and fix bugs</li>
              <li>Respond to support requests</li>
            </ul>
            <p className="mt-3">
              <strong>We do not:</strong> sell your data, share it with advertisers,
              or use it for purposes other than providing the service to you.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium mt-8 mb-3">4. Data Storage & Security</h2>
            <p>
              Your data is stored on <strong>Supabase</strong>, a secure cloud platform
              with data centres in the United States. Supabase provides:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Encryption at rest (AES-256)</li>
              <li>Encryption in transit (TLS 1.2+)</li>
              <li>Row-Level Security (RLS) ensuring you can only access your own data</li>
              <li>Regular security audits and compliance certifications</li>
            </ul>
            <p className="mt-3">
              Your password is hashed using industry-standard algorithms and never
              stored in readable form.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium mt-8 mb-3">5. AI Features</h2>
            <p>
              Baseline uses AI (powered by Google Gemini) for certain optional features:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Generating custom tracker configurations from descriptions</li>
              <li>Creating tracker icons</li>
              <li>AI-powered health reports (when available)</li>
            </ul>
            <p className="mt-3">
              When you use AI features, relevant data is sent to Google's servers
              for processing. Google's privacy policy applies to this processing.
              We minimize data sent and do not send your full health history.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium mt-8 mb-3">6. Your Rights (GDPR)</h2>
            <p>Under GDPR and similar regulations, you have the right to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Access:</strong> Export all your data at any time (Settings → Export Data)</li>
              <li><strong>Rectification:</strong> Edit or correct any of your entries</li>
              <li><strong>Erasure:</strong> Delete your account and all data (Settings → Delete Account)</li>
              <li><strong>Portability:</strong> Download your data in JSON or CSV format</li>
              <li><strong>Objection:</strong> Contact us to object to specific processing</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-medium mt-8 mb-3">7. Data Retention</h2>
            <p>
              We retain your data for as long as your account is active. When you
              delete your account:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>All trackers and entries are permanently deleted</li>
              <li>Your email and profile are removed</li>
              <li>Deletion is irreversible and completed within 30 days</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-medium mt-8 mb-3">8. Cookies & Local Storage</h2>
            <p>
              Baseline uses local storage (not cookies) to:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Remember your authentication session</li>
              <li>Store your theme preferences</li>
              <li>Cache entries for offline use</li>
            </ul>
            <p className="mt-3">
              We do not use tracking cookies or third-party analytics that track
              you across websites.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium mt-8 mb-3">9. Children's Privacy</h2>
            <p>
              Baseline is not intended for users under 16 years of age. We do not
              knowingly collect data from children. If you believe a child has
              provided us with personal information, please contact us.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium mt-8 mb-3">10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify
              you of significant changes by posting a notice in the app. Continued
              use after changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium mt-8 mb-3">11. Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy or your data, contact us at:
            </p>
            <p className="mt-2">
              <a
                href={`mailto:${contactEmail}`}
                className="text-primary hover:underline"
              >
                {contactEmail}
              </a>
            </p>
          </section>
        </article>
      </ScrollArea>
    </div>
  );
}
