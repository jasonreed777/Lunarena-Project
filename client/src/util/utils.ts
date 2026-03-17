import type { RGBColor } from "./types";

/**
 * Turns a hexadecimal color into an "RGB" object.
 * @param hex hexadecimal color to convert
 * @returns Object containing r, g, and b values as numbers
 */
export const hexToRGB = (hex: string): RGBColor => {
  const conversion = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!conversion || conversion.length < 4) {
    throw new Error("Invalid Conversion Attempted");
  }
  return {
    r: parseInt(conversion[1], 16),
    g: parseInt(conversion[2], 16),
    b: parseInt(conversion[3], 16),
  };
};

/**
 * A dummy function with no operation
 */
export const noOp = () => {};

/**
 * Capitalizes a piece of text.
 * @param text the text to capitalize
 * @returns capitalized text
 */
export const capitalizeText = (text: string): string => {
  return text.charAt(0).toUpperCase() + text.slice(1);
};

/**
 * Darkens an RGB color by 50 each.
 * @param color the color to darken
 * @returns darked color as an object with R, G, and B values
 */
export const darkenColor = (color: RGBColor): RGBColor => {
  const newColor = (color: number) => {
    return Math.abs(color - 50);
  };

  return { r: newColor(color.r), g: newColor(color.g), b: newColor(color.b) };
};
