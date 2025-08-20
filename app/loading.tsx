"use client";

import { PageLoader } from "@/components/shared/loading-spinner";

export default function LoadingPage() {
  return (
    <PageLoader text="Loading Application" variant="spin" fullScreen={true} />
  );
}
