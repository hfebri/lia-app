"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ModelHelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ModelHelpDialog({ open, onOpenChange }: ModelHelpDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>Which AI Model Should I Use?</DialogTitle>
          <DialogDescription>
            Choose the right model for your task
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 space-y-6 mt-4">
          {/* OpenAI Models */}
          <div>
            <h3 className="font-semibold text-base mb-4 border-b pb-2">
              OpenAI Models
            </h3>

            <div className="space-y-4">
              {/* GPT-5 Pro */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm">GPT-5 Pro</h4>
                <p className="text-sm text-muted-foreground">
                  Best for complex work that needs deep thinking
                </p>
                <div className="text-sm">
                  <p className="font-medium mb-1">When to use:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                    <li>Analyzing lengthy reports or research papers</li>
                    <li>
                      Making important business decisions with multiple factors
                    </li>
                    <li>Reviewing legal documents or contracts</li>
                    <li>Solving complicated math or logic problems</li>
                    <li>Debugging difficult code issues</li>
                  </ul>
                  <p className="mt-2 italic text-muted-foreground">
                    Example: "Analyze this 50-page market research report and
                    give me the key insights for our strategy meeting"
                  </p>
                </div>
              </div>

              {/* GPT-5 */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm">GPT-5</h4>
                <p className="text-sm text-muted-foreground">
                  Great for most everyday tasks
                </p>
                <div className="text-sm">
                  <p className="font-medium mb-1">When to use:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                    <li>Writing essays or articles</li>
                    <li>Having natural conversations</li>
                    <li>Explaining concepts or teaching</li>
                    <li>Creating stories or creative content</li>
                    <li>Getting help with general homework</li>
                  </ul>
                  <p className="mt-2 italic text-muted-foreground">
                    Example: "Help me write a 5-paragraph essay about climate
                    change for my college assignment"
                  </p>
                </div>
              </div>

              {/* GPT-5 Mini */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm">GPT-5 Mini</h4>
                <p className="text-sm text-muted-foreground">
                  Good for quick, simple tasks
                </p>
                <div className="text-sm">
                  <p className="font-medium mb-1">When to use:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                    <li>Answering straightforward questions</li>
                    <li>Writing short emails or messages</li>
                    <li>Quick translations</li>
                    <li>Summarizing short texts</li>
                    <li>Simple calculations or conversions</li>
                  </ul>
                  <p className="mt-2 italic text-muted-foreground">
                    Example: "Summarize this meeting note into 3 bullet points"
                  </p>
                </div>
              </div>

              {/* GPT-5 Nano */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm">GPT-5 Nano</h4>
                <p className="text-sm text-muted-foreground">
                  Fastest for very basic tasks
                </p>
                <div className="text-sm">
                  <p className="font-medium mb-1">When to use:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                    <li>Yes/no questions</li>
                    <li>Quick fact checks</li>
                    <li>Categorizing or tagging items</li>
                    <li>Simple formatting tasks</li>
                    <li>When you need an instant response</li>
                  </ul>
                  <p className="mt-2 italic text-muted-foreground">
                    Example: "Is this email formal or casual?"
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Anthropic Models */}
          <div>
            <h3 className="font-semibold text-base mb-4 border-b pb-2">
              Anthropic Models
            </h3>

            <div className="space-y-4">
              {/* Claude 4.5 Sonnet */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Claude 4.5 Sonnet</h4>
                <p className="text-sm text-muted-foreground">
                  Excellent for detailed writing and coding
                </p>
                <div className="text-sm">
                  <p className="font-medium mb-1">When to use:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                    <li>Drafting business proposals or reports</li>
                    <li>Writing and reviewing code</li>
                    <li>Editing and proofreading documents</li>
                    <li>Following complex instructions step-by-step</li>
                    <li>Digesting long briefs or documents</li>
                  </ul>
                  <p className="mt-2 italic text-muted-foreground">
                    Example: "Review this project proposal and suggest
                    improvements to make it more persuasive"
                  </p>
                </div>
              </div>

              {/* Claude 4.5 Haiku */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Claude 4.5 Haiku</h4>
                <p className="text-sm text-muted-foreground">
                  Quick and reliable for daily work
                </p>
                <div className="text-sm">
                  <p className="font-medium mb-1">When to use:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                    <li>Quick professional emails</li>
                    <li>Simple code questions</li>
                    <li>Fast document reviews</li>
                    <li>Routine work tasks</li>
                    <li>When you need good quality fast</li>
                  </ul>
                  <p className="mt-2 italic text-muted-foreground">
                    Example: "Write a polite follow-up email to a client about
                    our meeting"
                  </p>
                </div>
              </div>

              {/* Claude 4 Sonnet */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Claude 4 Sonnet</h4>
                <p className="text-sm text-muted-foreground">
                  Best for tasks requiring careful reasoning
                </p>
                <div className="text-sm">
                  <p className="font-medium mb-1">When to use:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                    <li>Thinking through complex decisions</li>
                    <li>Planning multi-step projects</li>
                    <li>Advanced programming tasks</li>
                    <li>When quality matters more than speed</li>
                    <li>Problems that need extra thought</li>
                  </ul>
                  <p className="mt-2 italic text-muted-foreground">
                    Example: "Walk me through the pros and cons of each approach
                    and recommend the best solution"
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Tip - Fixed at bottom */}
        <div className="bg-background border-t px-6 py-4 mt-auto shrink-0">
          <div className="bg-muted/50 p-4 rounded-lg">
            <p className="text-sm font-medium mb-1">Quick Tip</p>
            <p className="text-sm text-muted-foreground">
              Not sure which to pick? Start with{" "}
              <strong className="text-primary">GPT-5 Pro</strong> for complex
              work, <strong className="text-primary">GPT-5</strong> for general
              tasks, or{" "}
              <strong className="text-primary">Claude 4.5 Sonnet</strong> for
              professional writing.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
