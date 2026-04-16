import { useTheme } from "next-themes";
import logoDark from "@/assets/imweatherwatcher-logo-black.jpg";
import logoLight from "@/assets/imweatherwatcher-logo-white.jpg";

export function useThemedLogo() {
  const { resolvedTheme } = useTheme();
  return resolvedTheme === "dark" ? logoDark : logoLight;
}
