import type { WidgetProps } from "./types";
import { FourQuadrantDnDGrid } from "./FourQuadrantDnDGrid";
import { blankSwotData, swotSpec } from "./swot.spec";

const LABELS = ["Strengths", "Weaknesses", "Opportunities", "Threats"] as const;
const blank = blankSwotData("");

export function SwotWidget(props: WidgetProps) {
  return (
    <FourQuadrantDnDGrid
      {...props}
      dndMime="application/x-dec-widget-swot-index"
      spec={swotSpec}
      initialTitle={blank.title}
      initialCells={blank.cells}
      quadrantLabels={LABELS}
      headerEmoji="◇"
      accent="var(--dec-option)"
      hint={
        <>
          Drag <strong>⠿</strong> to swap notes between quadrants if you want to reshuffle ideas.
        </>
      }
    />
  );
}
