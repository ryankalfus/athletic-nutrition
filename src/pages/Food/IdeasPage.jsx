import { useState } from "react";
import { Heart } from "lucide-react";
import { useStore, changeData } from "../../store.js";
import { useRoute } from "../../routing.js";
import { useAsyncAction } from "../../hooks/useAsyncAction.js";
import { getDateKey } from "../../domain/timing.js";
import { lowCostHiddenCount } from "../../domain/ranking.js";
import { ideasForMoment } from "../../domain/ideaMoments.js";
import { ingredientsForMeal, missingGroceries } from "../../domain/food.js";
import {
  planMeal,
  markPlanPacked,
  logPlanAsEaten,
  profileSignature,
  undoPlan,
} from "../../domain/plans.js";
import {
  formatTime,
  formatDate,
  formatPlanStatus,
  plural,
} from "../../format.js";
import { Dialog } from "../../components/Dialog.jsx";
import { LabelCheck } from "../../components/ui/LabelCheck.jsx";

export default function IdeasPage({ now, todayKey }) {
  const { current } = useStore();
  const data = current.data;
  const [, navigate] = useRoute();
  const { pending, run } = useAsyncAction();
  const [replace, setReplace] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [limit, setLimit] = useState(6);
  const query = new URLSearchParams(window.location.hash.split("?")[1]);
  const moment = ["now", "before", "after", "tomorrow"].includes(
    query.get("moment"),
  )
    ? query.get("moment")
    : "now";
  // Same ranking inputs as Today for every moment (P1-01, IDEA-01).
  const { date, event, guidance, ideas, inputs } = ideasForMoment({
    moment,
    now,
    todayKey,
    data,
  });
  const hiddenByLowCost = lowCostHiddenCount(inputs);
  const plans = data.mealPlans.filter((p) => p.date === date);
  const write = (key, fn, message) => run(key, () => changeData(fn, message));
  const addMissing = (idea) => {
    const count = missingGroceries(
      ingredientsForMeal(idea, data.groceryState.pantry, date),
      data.groceryState.items,
    ).length;
    return write(
      "groceries",
      (d) => {
        const additions = missingGroceries(
          ingredientsForMeal(idea, d.groceryState.pantry, date),
          d.groceryState.items,
        );
        d.groceryState.items.push(...additions);
      },
      count
        ? `Added ${count} ${plural(count, "item")} to groceries.`
        : "Everything is already on your list.",
    );
  };
  return (
    <div className="ideas-page">
      <div className="moment-picker" role="group" aria-label="Food moment">
        {[
          ["now", "Now"],
          ["before", "Before practice"],
          ["after", "After practice"],
          ["tomorrow", "Tomorrow"],
        ].map(([id, label]) => (
          <button
            key={id}
            aria-pressed={moment === id}
            onClick={() => {
              setLimit(6);
              setReplace(null);
              navigate(`food/ideas?moment=${id}`);
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <p>
        {moment === "now"
          ? guidance.label
          : `${formatDate(date)}${event ? ` · ${event.title} ${formatTime(event.startTime)}` : " · No activity scheduled"}`}
      </p>
      {guidance.travelMode && (
        <p>Away activity — showing foods that travel well.</p>
      )}
      {hiddenByLowCost > 0 && (
        <p className="idea-filter-note">
          Showing low-cost ideas.{" "}
          <button
            disabled={!!pending}
            onClick={() =>
              write(
                "cost",
                (d) => {
                  d.profile.lowCostIdeas = false;
                },
                "Showing all ideas.",
              )
            }
          >
            Show all
          </button>
        </p>
      )}
      {plans.length > 0 && (
        <section className="planned-meals" aria-label="Planned food">
          <h3>Planned {date === todayKey ? "today" : "tomorrow"}</h3>
          {plans.map((plan) => (
            <MealPlanCard
              key={plan.id}
              {...{
                plan,
                data,
                date,
                now,
                pending,
                write,
                addMissing,
                setReplace,
                setConfirm,
              }}
            />
          ))}
        </section>
      )}
      {replace && (
        <p role="status">
          Choose an idea to change{" "}
          {plans.find((p) => p.id === replace)?.template.name}.{" "}
          <button onClick={() => setReplace(null)}>Cancel</button>
        </p>
      )}
      {!ideas.length && !inputs.access.length && (
        <div className="empty-state">
          <h3>
            {guidance.inSchool
              ? "Nothing is available at school right now"
              : "Nothing is available on the way right now"}
          </h3>
          <p>Pack a snack next time — see ideas for tomorrow.</p>
          <button onClick={() => navigate("food/ideas?moment=tomorrow")}>
            Ideas for tomorrow
          </button>
        </div>
      )}
      {!ideas.length && inputs.access.length > 0 && (
        <div className="empty-state">
          <h3>No ideas fit these settings</h3>
          <p>Check your food needs and access, or choose a different moment.</p>
          <button onClick={() => navigate("you")}>Review food needs</button>
          <button onClick={() => navigate("food/log")}>
            Log food manually
          </button>
        </div>
      )}
      <div className="ideas-grid">
        {ideas.slice(0, limit).map((idea) => {
          const ingredients = ingredientsForMeal(
            idea,
            data.groceryState.pantry,
            date,
          );
          const missing = ingredients.filter((i) => !i.sufficient);
          const saved = data.favorites.some((f) => f.id === idea.id);
          return (
            <article className="idea-card" key={idea.id}>
              <p className="idea-readiness">
                {missing.length
                  ? `Buy ${missing.length} ${missing.length === 1 ? "item" : "items"}`
                  : "Ready — you have everything"}
              </p>
              <h3>{idea.name}</h3>
              <p>{idea.note}</p>
              <ul>
                {ingredients.map((i) => (
                  <li key={i.ingredientId}>
                    <span>{i.displayAmount}</span>
                    <small>{i.sufficient ? "At home" : "To buy"}</small>
                  </li>
                ))}
              </ul>
              <button
                className="primary"
                aria-label={`${replace ? "Change to" : "Plan"} ${idea.name}`}
                disabled={!!pending}
                onClick={() =>
                  write(
                    "plan",
                    (d) => planMeal(d, idea, date, guidance, replace),
                    "Food planned.",
                  ).then((ok) => {
                    if (ok) setReplace(null);
                  })
                }
              >
                {pending === "plan"
                  ? "Saving…"
                  : replace
                    ? "Change idea"
                    : "Plan this"}
              </button>
              <div className="idea-secondary">
                <button
                  aria-pressed={saved}
                  disabled={!!pending}
                  onClick={() =>
                    write(
                      "favorite",
                      (d) => {
                        d.favorites = saved
                          ? d.favorites.filter((f) => f.id !== idea.id)
                          : [
                              ...d.favorites,
                              { ...idea, source: "Meal example" },
                            ];
                      },
                      saved ? "Removed from saved ideas." : "Saved idea.",
                    )
                  }
                >
                  <Heart
                    size={20}
                    fill={saved ? "currentColor" : "none"}
                    aria-hidden="true"
                  />
                  {saved ? "Saved" : "Save"}
                </button>
                <button
                  disabled={!!pending}
                  onClick={() =>
                    write(
                      "hide",
                      (d) => {
                        d.profile.hiddenIdeas = [
                          ...(d.profile.hiddenIdeas || []),
                          idea.id,
                        ];
                      },
                      `Hidden ${idea.name}.`,
                    )
                  }
                >
                  Not for me
                </button>
              </div>
              <LabelCheck />
              <details>
                <summary>Preparation &amp; storage</summary>
                <p>
                  {idea.needsCold
                    ? "Keep refrigerated or pack with ice packs."
                    : idea.needsHeat
                      ? "Confirm kitchen or microwave access."
                      : "Pack in a sealed container when needed."}
                </p>
                {missing.length > 0 && (
                  <button disabled={!!pending} onClick={() => addMissing(idea)}>
                    Add missing to groceries
                  </button>
                )}
              </details>
            </article>
          );
        })}
      </div>
      {ideas.length > limit && (
        <button onClick={() => setLimit((n) => n + 6)}>Show more ideas</button>
      )}
      {ideas.length > 0 && (
        <p className="muted idea-guidance">
          Ideas are examples, not amounts you must eat. Check labels for
          allergens.
        </p>
      )}
      {confirm && (
        <Dialog title="Log what you ate" onClose={() => setConfirm(null)}>
          <p>Did you eat {confirm.template.name} as planned?</p>
          <LabelCheck />
          <button
            className="primary"
            disabled={!!pending}
            onClick={() =>
              write(
                "log",
                (d) => logPlanAsEaten(d, confirm.id, now),
                "Logged what you ate.",
              ).then((ok) => {
                if (ok) setConfirm(null);
              })
            }
          >
            Yes, as planned
          </button>
          <button
            onClick={() => {
              sessionStorage.setItem("nourally-log-plan", confirm.id);
              navigate("food/log");
              setConfirm(null);
            }}
          >
            Edit what I ate
          </button>
        </Dialog>
      )}
    </div>
  );
}
export function MealPlanCard({
  plan,
  data,
  date,
  now,
  pending,
  write,
  addMissing,
  setReplace,
  setConfirm,
}) {
  const missing = ingredientsForMeal(
    plan.template,
    data.groceryState.pantry,
    date,
  ).filter((i) => !i.sufficient);
  const early =
    date > getDateKey(now) ||
    (plan.eatAt &&
      plan.eatAt >
        `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`);
  const changed = profileSignature(data.profile) !== plan.profileSignature;
  return (
    <article className="meal-plan-card">
      <h3>{plan.template.name}</h3>
      <p>
        {plan.eatAt
          ? `Eat around ${formatTime(plan.eatAt)}`
          : "Eat when it fits your day"}{" "}
        · {formatPlanStatus(plan.status)}
      </p>
      <LabelCheck />
      {changed && (
        <p>
          Your food needs changed. Check this plan.{" "}
          <button onClick={() => setReplace(plan.id)}>Check</button>
          <button
            disabled={!!pending}
            onClick={() =>
              write(
                "keep",
                (d) => {
                  d.mealPlans.find((p) => p.id === plan.id).profileSignature =
                    profileSignature(d.profile);
                },
                "Kept this plan.",
              )
            }
          >
            Keep
          </button>
        </p>
      )}
      {plan.status !== "eaten" && (
        <button
          className="primary"
          disabled={
            !!pending || (plan.status === "packed" && early && !missing.length)
          }
          onClick={(event) =>
            event.detail > 1
              ? undefined
              : missing.length
                ? addMissing(plan.template)
                : plan.status === "packed"
                  ? setConfirm(plan)
                  : write(
                      "packed",
                      (d) => markPlanPacked(d, plan.id),
                      "Marked packed.",
                    )
          }
        >
          {missing.length
            ? `Add ${missing.length} ${missing.length === 1 ? "item" : "items"} to groceries`
            : plan.status === "packed"
              ? early
                ? `Eat around ${formatTime(plan.eatAt)}`
                : "Log it"
              : "Mark packed"}
        </button>
      )}
      <details>
        <summary>Plan options</summary>
        {plan.status !== "eaten" && (
          <button onClick={() => setReplace(plan.id)}>Change idea</button>
        )}
        <button
          disabled={!!pending}
          onClick={() =>
            write("undo-plan", (d) => undoPlan(d, plan.id), "Removed plan.")
          }
        >
          Remove plan
        </button>
      </details>
    </article>
  );
}
