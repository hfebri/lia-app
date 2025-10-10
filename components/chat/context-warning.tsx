"use client";

import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ContextWarningProps {
  messageCount: number;
  onStartNew: () => void;
  onDismiss?: () => void;
}

export function ContextWarning({
  messageCount,
  onStartNew,
  onDismiss,
}: ContextWarningProps) {
  // Don't show warning if less than 45 messages
  if (messageCount < 45) {
    return null;
  }

  const isStrongAlert = messageCount >= 50;
  const remainingMessages = isStrongAlert ? 0 : 50 - messageCount;

  return (
    <Alert
      variant={isStrongAlert ? "destructive" : "default"}
      className={`mb-4 ${
        isStrongAlert
          ? "border-red-500 bg-red-50 dark:bg-red-950"
          : "border-yellow-500 bg-yellow-50 dark:bg-yellow-950"
      }`}
    >
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>
        {isStrongAlert
          ? "Context Limit Reached"
          : "Approaching Context Limit"}
      </AlertTitle>
      <AlertDescription className="mt-2 flex flex-col gap-2">
        <p>
          {isStrongAlert ? (
            <>
              This conversation has reached <strong>{messageCount} messages</strong>.
              Starting a new conversation is recommended for better performance and response quality.
            </>
          ) : (
            <>
              This conversation has <strong>{messageCount} messages</strong>.
              You have approximately <strong>{remainingMessages} messages</strong> remaining
              before you should start a new conversation.
            </>
          )}
        </p>
        <div className="flex gap-2 mt-2">
          <Button
            onClick={onStartNew}
            variant={isStrongAlert ? "default" : "secondary"}
            size="sm"
          >
            Start New Conversation
          </Button>
          {!isStrongAlert && onDismiss && (
            <Button onClick={onDismiss} variant="ghost" size="sm">
              <X className="h-4 w-4 mr-1" />
              Dismiss
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}
