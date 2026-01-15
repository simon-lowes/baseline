/**
 * Help Center Page
 *
 * FAQ section with accordion-style expandable answers.
 * Organized by category for easy navigation.
 */

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ArrowLeft, EnvelopeSimple } from '@phosphor-icons/react';
import { faqCategories } from './faq-data';

interface HelpCenterProps {
  onBack: () => void;
}

export function HelpCenter({ onBack }: HelpCenterProps) {
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

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Help & FAQ</h1>
          <p className="text-muted-foreground mt-1">
            Find answers to common questions about using Baseline.
          </p>
        </div>

        <ScrollArea className="h-[calc(100vh-280px)]">
          <div className="space-y-8 pr-4">
            {faqCategories.map((category) => (
              <section key={category.title}>
                <h2 className="text-lg font-medium mb-3 text-foreground">
                  {category.title}
                </h2>
                <Accordion type="single" collapsible className="space-y-2">
                  {category.items.map((item, index) => (
                    <AccordionItem
                      key={index}
                      value={`${category.title}-${index}`}
                      className="border rounded-lg px-4"
                    >
                      <AccordionTrigger className="text-left hover:no-underline py-4">
                        <span className="text-sm font-medium">
                          {item.question}
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground pb-4">
                        {item.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </section>
            ))}
          </div>
        </ScrollArea>

        {/* Contact support */}
        <div className="border-t pt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-lg bg-muted/50">
            <div>
              <h3 className="font-medium">Still need help?</h3>
              <p className="text-sm text-muted-foreground">
                Can't find what you're looking for? Contact our support team.
              </p>
            </div>
            <Button variant="outline" asChild>
              <a href="mailto:support@baseline-app.com">
                <EnvelopeSimple className="mr-2 h-4 w-4" />
                Contact Support
              </a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
