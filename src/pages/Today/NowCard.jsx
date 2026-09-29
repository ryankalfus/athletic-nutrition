import { formatClock, timeToMinutes } from "../../domain/timing.js";
import { formatPlanStatus } from "../../format.js";
import { availabilityLabel, minutesClock } from "../../domain/dayRail.js";
export default function NowCard({
  guidance,
  plan,
  stale,
  pending,
  write,
  idea,
  missing,
  ingredients = [],
  setChosen,
  onNavigate,
  early,
  primary,
  action,
  setWhy,
  todayKey,
}) {
  return (
    <section className="now-card" aria-labelledby="now-title">
      <p className="today-countdown">{guidance.label}</p>
      <h2 id="now-title">
        {plan
          ? `${plan.template.name} is ${formatPlanStatus(plan.status).toLowerCase()}`
          : guidance.title}
      </h2>
      <p>{guidance.explanation}</p>
      {stale && (
        <div role="status">
          <p>
            {guidance.event.title} moved to{" "}
            {formatClock(guidance.event.startTime)}. Update your snack time?
          </p>
          <button
            disabled={!!pending}
            onClick={() =>
              write(
                "update",
                (d) => {
                  const p = d.mealPlans.find((x) => x.id === plan.id);
                  p.eatAt = minutesClock(
                    timeToMinutes(guidance.event.startTime) - 90,
                  );
                  p.intendedTime = p.eatAt;
                  p.eventStartTime = guidance.event.startTime;
                },
                "Snack time updated.",
              )
            }
          >
            Update
          </button>
          <button
            disabled={!!pending}
            onClick={() =>
              write(
                "keep",
                (d) => {
                  d.mealPlans.find((x) => x.id === plan.id).eventStartTime =
                    guidance.event.startTime;
                },
                "Kept snack time.",
              )
            }
          >
            Keep
          </button>
        </div>
      )}
      {idea &&
        !["during", "late", "setup", "evening", "rest", "no_sport"].includes(
          guidance.state,
        ) && (
          <div className="today-pick">
            <strong>{idea.name}</strong>
            {ingredients.length > 0 ? (
              <ul className="today-availability" aria-label="What you have">
                {ingredients.map((i) => (
                  <li key={i.ingredientId} data-have={i.sufficient}>
                    {availabilityLabel(i)}
                  </li>
                ))}
              </ul>
            ) : (
              <p>
                {missing.length
                  ? `${missing.length} ${missing.length === 1 ? "item" : "items"} to buy`
                  : "Ready — you have everything"}
              </p>
            )}
            {!plan && (
              <div className="today-alternates">
                {guidance.allIdeas
                  .filter((i) => i.id !== idea.id)
                  .slice(0, 2)
                  .map((i) => (
                    <button key={i.id} onClick={() => setChosen(i.id)}>
                      {i.name}
                    </button>
                  ))}
                <button onClick={() => onNavigate("food/ideas")}>
                  More ideas
                </button>
              </div>
            )}
          </div>
        )}
      {guidance.state !== "late" && (
        <button
          className="primary today-primary"
          disabled={
            !!pending ||
            early ||
            (!idea &&
              !["setup", "during", "evening", "rest", "no_sport"].includes(
                guidance.state,
              ))
          }
          onClick={primary}
        >
          {pending ? "Saving…" : action}
        </button>
      )}
      <button className="today-text" onClick={() => setWhy(true)}>
        Why this?
      </button>
      {guidance.state === "rest" && (
        <button
          onClick={() =>
            write(
              "rest",
              (d) => {
                d.profile.restDays = (d.profile.restDays || []).filter(
                  (x) => x !== todayKey,
                );
              },
              "Rest day removed.",
            )
          }
        >
          Undo rest day
        </button>
      )}
    </section>
  );
}
