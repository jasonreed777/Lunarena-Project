import type { SafeUserInfo } from "@gamenite/shared";
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
export const capitalize = (text: string): string => {
  return text.charAt(0).toUpperCase() + text.slice(1);
};

/**
 * Darkens an RGB color for light-mode contrast. Uses perceived luminance to
 * determine how much to darken — very light colors (like white) are darkened
 * aggressively so they remain visible against light backgrounds.
 * @param color the color to darken
 * @returns darkened color as an object with R, G, and B values
 */
export const darkenColor = (color: RGBColor): RGBColor => {
  const luminance = 0.299 * color.r + 0.587 * color.g + 0.114 * color.b;
  const amount = luminance > 200 ? 150 : luminance > 160 ? 100 : 50;
  return {
    r: Math.max(color.r - amount, 0),
    g: Math.max(color.g - amount, 0),
    b: Math.max(color.b - amount, 0),
  };
};

/**
 * Returns the correct profile picture based on the type (avatar or uploaded image).
 */
export const getProfilePicture = (user: SafeUserInfo) => {
  const { pfp } = user;
  return pfp?.type === "avatar" ? pfp?.avatarId : pfp?.uploadId;
};
