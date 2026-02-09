"use client";

import { CssBaseline } from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { ReactNode, useState, createContext, useEffect, useMemo } from "react";

type Mode = "light" | "dark"

const commonThemeSettings = {
  typography: {
    fontFamily: "Inter, sans-serif",
  },
  shape: {
    borderRadius: 12,
  },
}

const darkTheme = createTheme({
  palette: {
    mode: "dark",
  },
  ...commonThemeSettings,
})

const lightTheme = createTheme({
  palette: {
    mode: "light",
  },
  ...commonThemeSettings,
})

export const ThemeModeContext = createContext({
  toggleTheme: () => { },
})


export default function Providers({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>("light");

  const theme = useMemo(() => (mode === "dark" ? darkTheme : lightTheme), [mode]);

  return (
    <ThemeModeContext.Provider
      value={{
        toggleTheme: () => {
          setMode((prev) => prev === "light" ? "dark" : "light")
        },
      }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
}
