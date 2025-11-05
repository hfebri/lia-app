"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const PATCH_NOTES_STORAGE_KEY = "lia-patch-notes-2025-11-05-dismissed";
const NOTES: Array<{ title: string; description: string }> = [
  {
    title: "Turn subtitles into Word files",
    description:
      "Upload .srt caption files in chat and download a ready-to-edit Word document in one click.",
  },
  {
    title: "Share any image without fuss",
    description: "Paste screenshots or drop in photos just work.",
  },
  {
    title: "Status messages now speak plainly",
    description:
      "The activity line uses clear language so you can tell at a glance if LIA is thinking, reading files, or writing.",
  },
  {
    title: "GPT-5 Pro stays in deep focus",
    description:
      "The Pro model now picks the best settings automatically, so you always get thoughtful replies without extra toggles.",
  },
  {
    title: "Claude extended thinking is steady",
    description:
      "Extended thinking has been tuned so Claude can stay in long-form mode without hiccups.",
  },
  {
    title: "Sharper text from images",
    description:
      "Uploads such as scans or diagrams are read more reliably, so you spend less time retyping details.",
  },
];

export function PatchNotesModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
    const hasDismissed = window.localStorage.getItem(PATCH_NOTES_STORAGE_KEY);
    if (!hasDismissed) {
      setIsOpen(true);
    }
  }, []);

  if (!hasHydrated) {
    return null;
  }

  const dismiss = () => {
    window.localStorage.setItem(PATCH_NOTES_STORAGE_KEY, "true");
    setIsOpen(false);
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(value) => {
        if (!value) {
          dismiss();
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>What’s new this week</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm text-muted-foreground">
          {NOTES.map((note) => (
            <div key={note.title}>
              <h3 className="text-sm font-medium text-foreground">
                {note.title}
              </h3>
              <p>{note.description}</p>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button onClick={dismiss}>Sounds good</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
