"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Settings2, X, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toastError, toastSuccess } from "@/components/providers/toast-provider";

interface SystemInstructionButtonProps {
  systemInstruction: string;
  onSystemInstructionChange: (instruction: string) => void;
  disabled?: boolean;
  className?: string;
}

export function SystemInstructionButton({
  systemInstruction,
  onSystemInstructionChange,
  disabled = false,
  className,
}: SystemInstructionButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempInstruction, setTempInstruction] = useState(systemInstruction);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhancedSuggestion, setEnhancedSuggestion] = useState("");

  // Sync tempInstruction when systemInstruction prop changes (conversation switch)
  useEffect(() => {
    setTempInstruction(systemInstruction);
    setEnhancedSuggestion(""); // Clear any stale suggestions
  }, [systemInstruction]);

  const handleSave = () => {
    onSystemInstructionChange(tempInstruction);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setTempInstruction(systemInstruction);
    setEnhancedSuggestion("");
    setIsOpen(false);
  };

  const handleClear = () => {
    setTempInstruction("");
    setEnhancedSuggestion("");
  };

  const handleEnhance = async () => {
    if (!tempInstruction.trim()) {
      toastError("Please enter some text to enhance");
      return;
    }

    setIsEnhancing(true);
    setEnhancedSuggestion("");

    try {
      const response = await fetch("/api/ai/enhance-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: tempInstruction }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to enhance prompt");
      }

      const data = await response.json();
      setEnhancedSuggestion(data.enhancedPrompt);
      toastSuccess("Prompt enhanced successfully!");
    } catch (error) {
      console.error("Enhancement error:", error);
      toastError(error instanceof Error ? error.message : "Failed to enhance prompt");
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleUseSuggestion = () => {
    setTempInstruction(enhancedSuggestion);
    setEnhancedSuggestion("");
  };

  const hasInstruction = systemInstruction.trim().length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant={hasInstruction ? "default" : "outline"}
          size="sm"
          disabled={disabled}
          className={cn(
            "relative",
            hasInstruction && "bg-blue-600 hover:bg-blue-700 text-white",
            className
          )}
        >
          <Settings2 className="h-4 w-4 mr-2" />
          System Instruction
          {hasInstruction && (
            <Badge
              variant="secondary"
              className="ml-2 h-5 px-1.5 text-xs bg-blue-500 text-white hover:bg-blue-500"
            >
              ON
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            System Instructions
          </DialogTitle>
          <DialogDescription>
            Set custom system instructions to guide the AI's behavior throughout
            this conversation. These instructions will be applied to all
            messages in this conversation regardless of the selected model.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto flex-1">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">System Instruction</label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleEnhance}
                disabled={isEnhancing || !tempInstruction.trim()}
                className="h-7 text-xs"
              >
                {isEnhancing ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Enhancing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3 w-3 mr-1" />
                    Enhance
                  </>
                )}
              </Button>
            </div>
            <Textarea
              value={tempInstruction}
              onChange={(e) => setTempInstruction(e.target.value)}
              placeholder="Enter system instructions... e.g., 'You are a helpful coding assistant. Always provide clear explanations and follow best practices.'"
              className="min-h-[120px] max-h-[300px] overflow-y-auto resize-none"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              {tempInstruction.length} characters
            </p>
          </div>

          {/* Enhanced Suggestion */}
          {enhancedSuggestion && (
            <div className="space-y-2 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-blue-700 dark:text-blue-300 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Enhanced Suggestion
                </label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleUseSuggestion}
                    className="h-7 text-xs border-blue-300 dark:border-blue-700"
                  >
                    Use This
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEnhancedSuggestion("")}
                    className="h-7 w-7 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <div className="text-sm text-blue-900 dark:text-blue-100 whitespace-pre-wrap bg-white dark:bg-blue-900/20 p-3 rounded border border-blue-200 dark:border-blue-700">
                {enhancedSuggestion}
              </div>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                {enhancedSuggestion.length} characters
              </p>
            </div>
          )}

          <div className="bg-muted/30 p-3 rounded-lg">
            <h4 className="text-sm font-medium mb-2">Example Instructions:</h4>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>
                • "You are a prompt engineer specializing in AI optimization"
              </p>
              <p>
                • "Always respond in a professional tone with detailed
                explanations"
              </p>
              <p>
                • "Focus on code quality and best practices in all responses"
              </p>
              <p>
                • "Provide examples and step-by-step guidance when possible"
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 flex-shrink-0">
          <div className="flex-1">
            {tempInstruction.trim() && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="text-destructive hover:text-destructive"
              >
                <X className="h-4 w-4 mr-2" />
                Clear
              </Button>
            )}
          </div>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Instructions</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
