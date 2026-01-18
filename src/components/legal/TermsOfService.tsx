/**
 * Terms of Service Page
 *
 * Legal terms for using Baseline health tracking app.
 * Accessible from footer and required for app store submission.
 */

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft } from 'lucide-react';

interface TermsOfServiceProps {
  onBack: () => void;
}

export function TermsOfService({ onBack }: TermsOfServiceProps) {
  const lastUpdated = 'January 15, 2026';
  const contactEmail = 'legal@baseline-app.com';

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
          <h1 className="text-2xl font-semibold tracking-tight">Terms of Service</h1>
          <p className="text-muted-foreground">Last updated: {lastUpdated}</p>

          <section>
            <h2 className="text-lg font-medium mt-8 mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing or using Baseline ("the Service"), you agree to be bound
              by these Terms of Service ("Terms"). If you do not agree to these Terms,
              do not use the Service.
            </p>
            <p>
              We may modify these Terms at any time. Continued use of the Service
              after changes constitutes acceptance of the modified Terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium mt-8 mb-3">2. Description of Service</h2>
            <p>
              Baseline is a personal health tracking application that allows you to:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Create custom trackers for health metrics (pain, mood, sleep, etc.)</li>
              <li>Log daily entries with intensity, location, triggers, and notes</li>
              <li>View analytics and insights from your tracked data</li>
              <li>Export your data in various formats</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-medium mt-8 mb-3">3. Medical Disclaimer</h2>
            <p className="font-medium text-destructive">
              BASELINE IS NOT A MEDICAL DEVICE AND IS NOT INTENDED TO DIAGNOSE,
              TREAT, CURE, OR PREVENT ANY DISEASE OR HEALTH CONDITION.
            </p>
            <p className="mt-3">
              The Service is designed for personal tracking and informational
              purposes only. It is not a substitute for professional medical advice,
              diagnosis, or treatment. Always seek the advice of a qualified
              healthcare provider with any questions you may have regarding a
              medical condition.
            </p>
            <p className="mt-3">
              Do not disregard professional medical advice or delay seeking it
              because of information you have recorded or viewed in Baseline.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium mt-8 mb-3">4. Account Registration</h2>
            <p>To use Baseline, you must:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Be at least 16 years of age</li>
              <li>Provide a valid email address</li>
              <li>Create a secure password</li>
              <li>Maintain the security of your account credentials</li>
            </ul>
            <p className="mt-3">
              You are responsible for all activity that occurs under your account.
              Notify us immediately of any unauthorised use.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium mt-8 mb-3">5. User Responsibilities</h2>
            <p>You agree to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Use the Service only for lawful purposes</li>
              <li>Provide accurate information in your entries</li>
              <li>Not attempt to access other users' data</li>
              <li>Not interfere with or disrupt the Service</li>
              <li>Not reverse engineer or attempt to extract source code</li>
              <li>Not use automated tools to access the Service without permission</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-medium mt-8 mb-3">6. Your Data</h2>
            <p>
              You retain ownership of all data you create in Baseline. By using
              the Service, you grant us a limited license to store, process, and
              display your data solely to provide the Service to you.
            </p>
            <p className="mt-3">
              You can export or delete your data at any time through the Settings
              menu. See our Privacy Policy for details on how we handle your data.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium mt-8 mb-3">7. AI-Generated Content</h2>
            <p>
              Baseline uses AI to generate tracker configurations and icons. This
              AI-generated content is provided "as is" without warranty. You are
              responsible for reviewing and customising AI-generated content before use.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium mt-8 mb-3">8. Service Availability</h2>
            <p>
              We strive to maintain high availability but do not guarantee
              uninterrupted access. The Service may be temporarily unavailable for:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Scheduled maintenance</li>
              <li>Emergency repairs</li>
              <li>Circumstances beyond our control</li>
            </ul>
            <p className="mt-3">
              Baseline includes offline functionality to help you continue tracking
              even without an internet connection.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium mt-8 mb-3">9. Limitation of Liability</h2>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, BASELINE AND ITS CREATORS
              SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
              CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Loss of data</li>
              <li>Loss of profits</li>
              <li>Health outcomes based on tracked data</li>
              <li>Decisions made using insights from the Service</li>
            </ul>
            <p className="mt-3">
              Our total liability shall not exceed £100.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium mt-8 mb-3">10. Disclaimer of Warranties</h2>
            <p>
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES
              OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO
              WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE,
              AND NON-INFRINGEMENT.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium mt-8 mb-3">11. Termination</h2>
            <p>
              You may terminate your account at any time by deleting it through
              Settings. We may terminate or suspend your account if you violate
              these Terms or engage in harmful behaviour.
            </p>
            <p className="mt-3">
              Upon termination, your right to use the Service ceases immediately.
              Data deletion follows our Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium mt-8 mb-3">12. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with
              the laws of the United Kingdom, without regard to conflict of law
              principles. Any disputes shall be resolved in the courts of the
              United Kingdom.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium mt-8 mb-3">13. Severability</h2>
            <p>
              If any provision of these Terms is found to be unenforceable, the
              remaining provisions shall continue in full force and effect.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium mt-8 mb-3">14. Contact</h2>
            <p>
              For questions about these Terms, contact us at:
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
