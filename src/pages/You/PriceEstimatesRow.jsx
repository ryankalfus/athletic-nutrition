import { changeData, useStore } from "../../store.js";
import { useAsyncAction } from "../../hooks/useAsyncAction.js";

// You › Food access & budget: price estimates stay off by default (GROC-05, YOU-04).
export function PriceEstimatesRow() {
  const { current } = useStore();
  const on = Boolean(current.data.groceryState?.showPrices);
  const { pending, run } = useAsyncAction();
  return (
    <section className="card you-row" aria-labelledby="you-budget-title">
      <div>
        <h2 id="you-budget-title">Food access &amp; budget</h2>
        <label className="check-row">
          <input
            type="checkbox"
            checked={on}
            disabled={Boolean(pending)}
            onChange={() =>
              run("prices", () =>
                changeData(
                  (d) => {
                    d.groceryState.showPrices = !on;
                  },
                  on ? "Price estimates off." : "Price estimates on.",
                ),
              )
            }
          />
          Show price estimates
        </label>
        <p className="muted">
          Groceries shows an estimated total when this is on.
        </p>
      </div>
    </section>
  );
}
