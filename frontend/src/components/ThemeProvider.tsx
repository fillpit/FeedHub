import { ThemeProvider as NextThemesProvider } from "next-themes";
import React from "react";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange={false}
      storageKey="node-template-theme"
    >
      {children}
    </NextThemesProvider>
  );
}
