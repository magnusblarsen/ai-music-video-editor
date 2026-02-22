"use client";

import { CssBaseline } from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { ReactNode, useState, createContext, useEffect, useMemo } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppProvider } from "@/context/AppContext";

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


const queryClient = new QueryClient();

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
				<QueryClientProvider client={queryClient}>
					<AppProvider>
						<CssBaseline />
						{children}
					</AppProvider>
				</QueryClientProvider>
			</ThemeProvider>
		</ThemeModeContext.Provider>
	);
}
