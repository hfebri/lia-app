"use client";

import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

export function ToastProvider() {
  return (
    <Toaster
      position="bottom-right"
      expand={false}
      richColors
      closeButton
      toastOptions={{
        style: {
          background: "hsl(var(--background))",
          color: "hsl(var(--foreground))",
          border: "1px solid hsl(var(--border))",
        },
      }}
    />
  );
}

// Toast utilities for consistent usage across the app
export { toast } from "sonner";

// Predefined toast variants
export const toastSuccess = (message: string, description?: string) => {
  return toast.success(message, {
    description,
  });
};

export const toastError = (message: string, description?: string) => {
  return toast.error(message, {
    description,
  });
};

export const toastInfo = (message: string, description?: string) => {
  return toast.info(message, {
    description,
  });
};

export const toastWarning = (message: string, description?: string) => {
  return toast.warning(message, {
    description,
  });
};

export const toastLoading = (message: string) => {
  return toast.loading(message);
};

export const toastPromise = <T,>(
  promise: Promise<T>,
  {
    loading,
    success,
    error,
  }: {
    loading: string;
    success: string | ((data: T) => string);
    error: string | ((error: any) => string);
  }
) => {
  return toast.promise(promise, {
    loading,
    success,
    error,
  });
};
