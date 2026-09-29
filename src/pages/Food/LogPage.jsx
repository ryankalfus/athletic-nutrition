import { useRoute } from "../../routing.js";
import { parseLogRoute } from "../../domain/log.js";
import { SegmentedControl } from "../../components/ui/SelectionControls.jsx";
import LogDay from "./LogDay.jsx";
import LogWeek from "./LogWeek.jsx";

// Food › Log (6.8): "Day · Week" (LOG-01).
export default function LogPage({ todayKey, now }) {
  const [, navigate, subroute] = useRoute();
  const { view, date } = parseLogRoute(subroute, todayKey);
  return (
    <div className="log-page">
      <SegmentedControl
        label="Log view"
        options={[
          ["day", "Day"],
          ["week", "Week"],
        ]}
        value={view}
        onChange={(next) =>
          navigate(
            next === "week"
              ? date === todayKey
                ? "food/log/week"
                : `food/log/week/${date}`
              : date === todayKey
                ? "food/log"
                : `food/log/${date}`,
          )
        }
      />
      {view === "week" ? (
        <LogWeek endKey={date} todayKey={todayKey} onNavigate={navigate} />
      ) : (
        <LogDay
          date={date}
          todayKey={todayKey}
          now={now}
          onNavigate={navigate}
        />
      )}
    </div>
  );
}
