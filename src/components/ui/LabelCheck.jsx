import { allergenLine } from "../../domain/search.js";

// Every product view keeps the label line. For a packaged product, the
// allergens from its label data show first, marked as possibly incomplete
// (SRCH-07, P1-09).
export function LabelCheck({ food = null }) {
  const listed = food ? allergenLine(food) : null;
  return (
    <>
      {listed && <p className="allergen-line">{listed}</p>}
      <p className="label-check">Allergies: check every label.</p>
    </>
  );
}
