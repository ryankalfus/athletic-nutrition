import { Apple, Banana, Carrot, Cherry, Sandwich, Wheat } from "lucide-react";
import { Tiles } from "./Tiles.jsx";

const FOOD_ICONS = {
  bananas: Banana,
  apples: Apple,
  "frozen-berries": Cherry,
  "baby-carrots": Carrot,
  bread: Sandwich,
  tortillas: Wheat,
};

// At home and search share food tiles, keeping their existing add action and
// accessible names. Foods beyond the initial basics use the grain icon.
export function QuickAddList({ items, onAdd, disabled = false, label }) {
  return (
    <Tiles
      label={label}
      items={items}
      iconFor={(item) => FOOD_ICONS[item.id] || Wheat}
      onChoose={onAdd}
      disabled={disabled}
      buttonLabel={(item) => `Add ${item.name}`}
    />
  );
}
