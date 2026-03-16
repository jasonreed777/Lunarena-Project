import React from "react";
import { Colors, type ColorTheme } from "../util/types";
import { noOp } from "../util/utils";

// Key to be used for theme context in local storage
export const THEME_KEY = "theme";

/**
 * Represents React context for themes. Allows for toggling between light mode and dark mode
 */
export const ThemeContext = React.createContext<{
  theme: ColorTheme;
  setTheme: React.Dispatch<React.SetStateAction<ColorTheme>>;
}>({
  theme: window.localStorage.getItem(THEME_KEY) === "light" ? Colors.light : Colors.dark,
  setTheme: noOp,
});
