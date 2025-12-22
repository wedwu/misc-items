const ELBOW_MERGE_EPS = 12; // px tolerance to merge steps


function buildElbowPath(
  fc: Point,
  outJ: Point,
  laneY: number,
  inJ: Point,
  tc: Point
) {
  const dy = laneY - outJ.y;
  const horizontalClear = Math.abs(outJ.x - inJ.x) > STROKE_WIDTH;

  // Existing condition for stepped routing
  const needsStep =
    Math.abs(dy) >= MIN_ELBOW_DELTA && horizontalClear;

  // Candidate intermediate step
  const stepY = outJ.y + Math.sign(dy || 1) * STEP_OFFSET;

  // 🆕 NEW: can we merge the two verticals into one?
  const canMergeSteps =
    needsStep &&
    Math.abs(stepY - laneY) <= ELBOW_MERGE_EPS;

  // ─────────────────────────────────────────────
  // OUTCOME 1: merged single-elbow path
  // ─────────────────────────────────────────────
  if (canMergeSteps) {
    return `M ${fc.x} ${fc.y}
            L ${outJ.x} ${outJ.y}
            L ${outJ.x} ${laneY}
            L ${inJ.x} ${laneY}
            L ${inJ.x} ${inJ.y}
            L ${tc.x} ${tc.y}`;
  }

  // ─────────────────────────────────────────────
  // OUTCOME 2: original two-step elbow path
  // ─────────────────────────────────────────────
  if (needsStep) {
    return `M ${fc.x} ${fc.y}
            L ${outJ.x} ${outJ.y}
            L ${outJ.x} ${stepY}
            L ${inJ.x} ${stepY}
            L ${inJ.x} ${laneY}
            L ${inJ.x} ${inJ.y}
            L ${tc.x} ${tc.y}`;
  }

  // ─────────────────────────────────────────────
  // OUTCOME 3: simple elbow (no step needed)
  // ─────────────────────────────────────────────
  return `M ${fc.x} ${fc.y}
          L ${outJ.x} ${outJ.y}
          L ${outJ.x} ${laneY}
          L ${inJ.x} ${laneY}
          L ${inJ.x} ${inJ.y}
          L ${tc.x} ${tc.y}`;
}
