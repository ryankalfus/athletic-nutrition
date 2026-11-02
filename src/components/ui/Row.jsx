import { ChevronRight } from "lucide-react";
import { artForFood, artForIdea, foodInitial } from "../../domain/foodArt.js";

// Row (UX-CMP-02): the flat replacement for cards, one grammar for every
// list. A leading column (a time in Barlow, a glyph, or a check; 48px), a
// title (17/22 600, two lines at most), one meta sentence (14/20) and one
// trailing element: a value, a chevron, a status word, one icon button or a
// switch. Min height 56, inset hairline, no background, border or shadow.
// A row that opens something is one button (the whole row); its secondary
// action goes in `actions`, beside the button, never inside it.
//
// Food rows (UX-CMP-23) pass `food`: { key } for an ingredient or grocery
// item, { ideaId } for an idea, and `name` for the letter tile when nothing
// matches. The art is decorative: alt="" and aria-hidden.

const art = import.meta.glob("../../assets/food-art/*.svg", {
  eager: true,
  query: "?url",
  import: "default",
});

export function foodArtUrl(file) {
  return file ? art[`../../assets/food-art/${file}`] || null : null;
}

export function FoodArt({ food }) {
  const file = food.ideaId ? artForIdea(food.ideaId) : artForFood(food.key);
  const url = foodArtUrl(file);
  if (url)
    return (
      <span className="row-art" aria-hidden="true">
        <img src={url} alt="" width="32" height="32" />
      </span>
    );
  return (
    <span className="row-art row-art-letter" aria-hidden="true">
      {foodInitial(food.name)}
    </span>
  );
}

export function Row({
  as: Tag = "div",
  time,
  glyph,
  food,
  title,
  meta,
  value,
  status,
  chevron = false,
  trailing,
  actions,
  onClick,
  pressLabel,
  className = "",
  ...props
}) {
  const leading = food ? (
    <FoodArt food={food} />
  ) : time ? (
    <span className="row-time numeral">{time}</span>
  ) : glyph ? (
    <span className="row-glyph" aria-hidden="true">
      {glyph}
    </span>
  ) : null;
  const arrow = (chevron || onClick) && (
    <ChevronRight
      className="row-chevron"
      size={20}
      strokeWidth={1.75}
      aria-hidden="true"
    />
  );
  const trailingNode =
    trailing ??
    (value != null ? (
      <>
        <span className="row-value">{value}</span>
        {arrow}
      </>
    ) : status ? (
      <span className="row-status">{status}</span>
    ) : (
      arrow || null
    ));
  const body = (
    <>
      {leading && <span className="row-leading">{leading}</span>}
      <span className="row-text">
        <span className="row-title">{title}</span>
        {meta && <span className="row-meta">{meta}</span>}
      </span>
      {trailingNode && <span className="row-trailing">{trailingNode}</span>}
    </>
  );
  const classes = ["row", !leading && "row-no-leading", className]
    .filter(Boolean)
    .join(" ");
  return (
    <Tag className={classes} {...props}>
      {onClick ? (
        <button
          type="button"
          className="row-main row-press"
          aria-label={pressLabel}
          onClick={onClick}
        >
          {body}
        </button>
      ) : (
        <div className="row-main">{body}</div>
      )}
      {actions && <span className="row-actions">{actions}</span>}
    </Tag>
  );
}
