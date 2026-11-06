import { Apple, Banana, Check, Pencil, Sandwich, Sunrise } from "lucide-react";
import { useState } from "react";
import { Row } from "./Row.jsx";
import { Section } from "./Section.jsx";
import { IconButton } from "./Button.jsx";
import { Tiles } from "./Tiles.jsx";

// Dev-only fixture (`?ui=rows`, U4-02): every Row variant on one page so
// browser-visual.js can measure them before the screens use them.
export default function RowsFixture() {
  const [on, setOn] = useState(true);
  const [foods, setFoods] = useState(["bananas"]);
  return (
    <main id="main-content" className="shell" data-layout="reading">
      <header>
        <h1>Rows</h1>
      </header>
      <Section title="Leading column">
        <ul className="row-list">
          <Row
            as="li"
            time="3:30 PM"
            title="Practice"
            meta="Away, leave by 3:05 PM"
            chevron
          />
          <Row
            as="li"
            glyph={<Check size={24} strokeWidth={2} />}
            title="Snack packed"
            meta="Banana + pretzels, about 2:30 PM"
            status="Done"
          />
          <Row
            as="li"
            glyph={<Sunrise size={24} strokeWidth={1.75} />}
            title="A title long enough to need a second line on a phone, and then some more words that get cut"
            meta="Meta stays on one line"
            value="2 left"
          />
        </ul>
      </Section>
      <Section title="Food rows" action={{ label: "See all", onClick() {} }}>
        <ul className="row-list">
          <Row
            as="li"
            food={{ key: "bananas", name: "Bananas" }}
            title="Bananas"
            meta="1 bunch, staple"
            value="Have"
          />
          <Row
            as="li"
            food={{ ideaId: "hummus-pita", name: "Hummus + pita" }}
            title="Hummus + pita"
            meta="Before practice, from home"
            onClick={() => {}}
          />
          <Row
            as="li"
            food={{ name: "Mystery granola bar" }}
            title="Mystery granola bar"
            meta="From search, no art yet"
            actions={
              <IconButton label="Edit Mystery granola bar" icon={Pencil} />
            }
          />
        </ul>
      </Section>
      <Section title="Trailing elements">
        <ul className="row-list">
          <Row
            as="li"
            title="Opens a sheet"
            meta="The whole row is the button"
            onClick={() => {}}
          />
          <Row
            as="li"
            title="Evening reminder"
            meta="7:30 PM"
            trailing={
              <input
                type="checkbox"
                role="switch"
                aria-label="Evening reminder"
                checked={on}
                onChange={(event) => setOn(event.target.checked)}
              />
            }
          />
          <Row as="li" title="Sport" value="Soccer, in season" chevron />
        </ul>
      </Section>
      <Section title="Food tiles">
        <Tiles
          label="Choose foods"
          items={[
            { id: "bananas", name: "Bananas", icon: Banana },
            { id: "apples", name: "Apples", icon: Apple },
            { id: "bread", name: "Bread", icon: Sandwich },
          ]}
          selected={foods}
          onChoose={(item) =>
            setFoods((current) =>
              current.includes(item.id)
                ? current.filter((id) => id !== item.id)
                : [...current, item.id],
            )
          }
        />
      </Section>
    </main>
  );
}
