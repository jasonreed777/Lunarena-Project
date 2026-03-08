/**
 * Turns a hexadecimal color into an "RGB" object.
 * @param hex hexadecimal color to convert
 * @returns Object containing r, g, and b values as numbers
 */
export const hexToRGB = (
  hex: string,
): {
  r: number;
  g: number;
  b: number;
} => {
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
