import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect } from "react";

// Matches --background in index.css, so the phone status bar blends with the page
const THEME_COLORS = { light: "#fafafa", dark: "#0e0e10" };

export function ThemeColorSync() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", resolvedTheme === "dark" ? THEME_COLORS.dark : THEME_COLORS.light);
  }, [resolvedTheme]);

  return null;
}

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Φωτεινό θέμα" : "Σκούρο θέμα"}
      title={isDark ? "Φωτεινό θέμα" : "Σκούρο θέμα"}
      data-testid="button-theme-toggle"
    >
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </Button>
  );
}
