"use client";

import { createContext, useContext, type ReactNode } from "react";

interface NavigationLoaderContextValue {
  isNavigating: boolean;
  startNavigation: () => void;
}

const NavigationLoaderContext = createContext<NavigationLoaderContextValue | null>(
  null
);

export function NavigationLoaderProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: NavigationLoaderContextValue;
}) {
  return (
    <NavigationLoaderContext.Provider value={value}>
      {children}
    </NavigationLoaderContext.Provider>
  );
}

export function useNavigationLoader() {
  const context = useContext(NavigationLoaderContext);

  if (!context) {
    return {
      isNavigating: false,
      startNavigation: () => {},
    } satisfies NavigationLoaderContextValue;
  }

  return context;
}
