/**
 * Feedback Section
 *
 * Provides users with a way to contact support, report bugs,
 * or request features.
 */

import { Button } from '@/components/ui/button';
import { EnvelopeSimple, Bug, Lightbulb } from '@phosphor-icons/react';

export function FeedbackSection() {
  const supportEmail = 'support@baseline-app.com';

  const feedbackLinks = [
    {
      label: 'Report a Bug',
      icon: Bug,
      subject: 'Bug Report',
      body: 'Please describe the bug you encountered:\n\n1. What were you trying to do?\n2. What happened instead?\n3. Steps to reproduce:\n\n',
    },
    {
      label: 'Request a Feature',
      icon: Lightbulb,
      subject: 'Feature Request',
      body: 'Please describe the feature you would like:\n\n1. What problem would this solve?\n2. How would you like it to work?\n\n',
    },
    {
      label: 'General Feedback',
      icon: EnvelopeSimple,
      subject: 'Feedback',
      body: '',
    },
  ];

  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-base font-medium">Feedback & Support</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Help us improve Baseline by sharing your thoughts.
        </p>
      </div>

      <div className="grid gap-2">
        {feedbackLinks.map((link) => {
          const Icon = link.icon;
          const mailtoUrl = `mailto:${supportEmail}?subject=${encodeURIComponent(link.subject)}&body=${encodeURIComponent(link.body)}`;

          return (
            <Button
              key={link.label}
              variant="outline"
              className="justify-start h-auto py-3"
              asChild
            >
              <a href={mailtoUrl}>
                <Icon className="mr-3 h-4 w-4 text-muted-foreground" />
                <div className="text-left">
                  <div className="font-medium">{link.label}</div>
                </div>
              </a>
            </Button>
          );
        })}
      </div>
    </section>
  );
}
