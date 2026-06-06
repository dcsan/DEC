// Generic 2×2 quadrant grid — uses FourQuadrantDnDGrid + twobytwo.spec.ts.

import type { WidgetProps } from "./types";
import { FourQuadrantDnDGrid } from "./FourQuadrantDnDGrid";
import { blankTwoByTwoData, twoByTwoSpec } from "./twobytwo.spec";

const LABELS = ["TL", "TR", "BL", "BR"] as const;
const blank = blankTwoByTwoData("");

export function TwoByTwoWidget(props: WidgetProps) {
  return (
    <FourQuadrantDnDGrid
      {...props}
      dndMime="application/x-dec-widget-twobytwo-index"
      spec={twoByTwoSpec}
      initialTitle={blank.title}
      initialCells={blank.cells}
      quadrantLabels={LABELS}
      headerEmoji="⊞"
      hint={
        <>
          Drag <strong>⠿</strong> onto another cell to swap text.
        </>
      }
    />
  );
}
