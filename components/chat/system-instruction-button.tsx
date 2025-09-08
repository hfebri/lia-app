"use client";

import { useState } from "react";
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
import { Settings2, X } from "lucide-react";
import { cn } from "@/lib/utils";

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

  const handleSave = () => {
    onSystemInstructionChange(tempInstruction);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setTempInstruction(systemInstruction);
    setIsOpen(false);
  };

  const handleClear = () => {
    setTempInstruction("");
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
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
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

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">System Instruction</label>
            <Textarea
              value={tempInstruction}
              onChange={(e) => setTempInstruction(e.target.value)}
              placeholder="Enter system instructions... e.g., 'You are a helpful coding assistant. Always provide clear explanations and follow best practices.'"
              className="min-h-[120px] resize-none"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              {tempInstruction.length} characters
            </p>
          </div>

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

        <DialogFooter className="gap-2">
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
