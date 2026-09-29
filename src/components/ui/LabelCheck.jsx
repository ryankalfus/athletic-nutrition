import { productAllergenText } from "../../domain/allergens.js";

// Every product view keeps the label line. When Open Food Facts lists
// allergens for the product, they show first, marked as possibly incomplete.
export function LabelCheck({ food = null }) {
  const listed = food ? productAllergenText(food) : null;
  return (
    <>
      {listed && <p className="label-allergens">{listed}</p>}
      <p className="label-check">Allergies: check every label.</p>
    </>
  );
}
