import type { WidgetProps } from "./types";
import { FourQuadrantDnDGrid } from "./FourQuadrantDnDGrid";
import { blankEisenhowerData, eisenhowerSpec } from "./eisenhower.spec";

const LABELS = ["Do 1st", "Delegate", "Schedule", "Eliminate"] as const;
const blank = blankEisenhowerData("");

export function EisenhowerWidget(props: WidgetProps) {
  return (
    <FourQuadrantDnDGrid
      {...props}
      dndMime="application/x-dec-widget-eisenhower-index"
      spec={eisenhowerSpec}
      initialTitle={blank.title}
      initialCells={blank.cells}
      quadrantLabels={LABELS}
      headerEmoji="◫"
      hint={
        <>
          Urgent vs important. Drag <strong>⠿</strong> to swap items between quadrants.
        </>
      }
    />
  );
}
