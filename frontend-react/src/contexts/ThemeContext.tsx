import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";

// Vite `?url` imports — resolved to asset URLs at build time
import laraDarkAmber from "primereact/resources/themes/lara-dark-amber/theme.css?url";
import laraDarkBlue from "primereact/resources/themes/lara-dark-blue/theme.css?url";
import laraLightBlue from "primereact/resources/themes/lara-light-blue/theme.css?url";

// --------------- Types ---------------
export type ThemeName = "dark" | "dim" | "light";
export type FontSize = "small" | "medium" | "large";

interface ThemeContextValue {
  theme: ThemeName;
  fontSize: FontSize;
  setTheme: (t: ThemeName) => void;
  setFontSize: (s: FontSize) => void;
}

const THEME_KEY = "sv-theme";
const FONT_SIZE_KEY = "sv-font-size";
const LINK_ID = "sv-primereact-theme";

/** Map each app theme to the closest PrimeReact lara variant */
const PRIME_THEME_URL: Record<ThemeName, string> = {
  dark: laraDarkAmber,
  dim: laraDarkBlue,
  light: laraLightBlue,
};

// --------------- Context ---------------
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// --------------- Provider ---------------
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [theme, setThemeState] = useState<ThemeName>(() => {
    return (localStorage.getItem(THEME_KEY) as ThemeName) || "dark";
  });

  const [fontSize, setFontSizeState] = useState<FontSize>(() => {
    return (localStorage.getItem(FONT_SIZE_KEY) as FontSize) || "medium";
  });

  const setTheme = useCallback((t: ThemeName) => {
    setThemeState(t);
    localStorage.setItem(THEME_KEY, t);
  }, []);

  const setFontSize = useCallback((s: FontSize) => {
    setFontSizeState(s);
    localStorage.setItem(FONT_SIZE_KEY, s);
  }, []);

  // Apply data-theme attribute
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Swap PrimeReact theme stylesheet
  useEffect(() => {
    let link = document.getElementById(LINK_ID) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.id = LINK_ID;
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    link.href = PRIME_THEME_URL[theme];
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute("data-font-size", fontSize);
  }, [fontSize]);

  return (
    <ThemeContext.Provider value={{ theme, fontSize, setTheme, setFontSize }}>
      {children}
    </ThemeContext.Provider>
  );
};

// --------------- Hook ---------------
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
