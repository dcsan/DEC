/** Shared 2×2 cell tuple for Eisenhower, SWOT, generic quadrant widgets. */

export type FourCells = readonly [string, string, string, string];

export interface Quadrant4Data {
  title: string;
  cells: FourCells;
}

export function emptyFourCells(): FourCells {
  return ["", "", "", ""] as FourCells;
}
