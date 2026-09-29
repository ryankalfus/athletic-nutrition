import { useEffect, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { Shell } from "../../components/AppFrame.jsx";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog.jsx";
import {
  changeData,
  deleteCurrentProfile,
  selectProfile,
  useStore,
} from "../../store.js";
import { athleteLabel, athleteName } from "../../domain/you.js";
import { lastUsedText } from "../../domain/setup.js";
import { AthleteNameSheet } from "../You/AthleteNameSheet.jsx";

// Welcome and athlete chooser (6.1, ENTRY-01 to ENTRY-06). A first visit
// shows "Get started"; otherwise the athletes on this device, last used first.
export default function WelcomePage({ firstRun, onNavigate }) {
  const { doc } = useStore();
  const heading = useRef(null);
  const [adding, setAdding] = useState(false);
  const [naming, setNaming] = useState(null);
  const [removing, setRemoving] = useState(null);
  const athletes = Object.values(doc.profiles).sort((a, b) =>
    String(b.data.lastUsedAt || "").localeCompare(
      String(a.data.lastUsedAt || ""),
    ),
  );

  useEffect(() => {
    heading.current?.focus();
    // ENTRY-01: a first visit lands on #/welcome.
    if (firstRun && !/^#\/welcome/.test(window.location.hash))
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${window.location.search}#/welcome`,
      );
  }, [firstRun]);

  const start = () =>
    changeData((data) => {
      data.setupStep = Math.max(1, data.setupStep || 0);
    }, null).then((ok) => ok && onNavigate("setup"));

  // ENTRY-06: choosing an athlete always opens Today.
  const choose = (id) => {
    const at = new Date().toISOString();
    onNavigate("today");
    selectProfile(id);
    changeData((data) => {
      data.lastUsedAt = at;
    }, null);
  };

  return (
    <Shell navigation={false} footer={false} onNavigate={onNavigate}>
      <section className="welcome">
        <h1 ref={heading} tabIndex={-1}>
          Fuel for the day you actually have.
        </h1>
        <p className="welcome-promise">
          Nourally plans snacks and meals around school and practice.
        </p>
        {firstRun ? (
          <div className="welcome-start">
            <button type="button" className="primary" onClick={start}>
              Get started
            </button>
          </div>
        ) : (
          <section className="welcome-athletes" aria-labelledby="welcome-who">
            <h2 id="welcome-who">Who&apos;s using Nourally?</h2>
            <ul className="welcome-tiles">
              {athletes.map((athlete) => {
                const name = athleteLabel(athlete);
                const sport = athlete.data.profile.sport || "No sport set";
                const used = lastUsedText(athlete.data.lastUsedAt);
                return (
                  <li key={athlete.id} className="welcome-tile">
                    <button
                      type="button"
                      className="welcome-tile-open"
                      aria-label={[name, sport, used.toLowerCase()]
                        .filter(Boolean)
                        .join(", ")}
                      onClick={() => choose(athlete.id)}
                    >
                      <span className="welcome-avatar" aria-hidden="true">
                        {athleteName(athlete).charAt(0).toUpperCase()}
                      </span>
                      <span className="welcome-tile-text">
                        <strong>{name}</strong>
                        <span className="muted">
                          {[sport, used].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                    </button>
                    <details className="row-menu">
                      <summary aria-label={`${name} options`}>
                        <MoreHorizontal
                          size={20}
                          strokeWidth={1.75}
                          aria-hidden="true"
                        />
                      </summary>
                      <div className="row-menu-items">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.currentTarget
                              .closest("details")
                              ?.removeAttribute("open");
                            setNaming({
                              id: athlete.id,
                              name: athleteName(athlete),
                            });
                          }}
                        >
                          Rename
                        </button>
                        <button
                          type="button"
                          className="danger"
                          onClick={(event) => {
                            event.currentTarget
                              .closest("details")
                              ?.removeAttribute("open");
                            setRemoving({
                              id: athlete.id,
                              name: athleteName(athlete),
                            });
                          }}
                        >
                          Remove from this device
                        </button>
                      </div>
                    </details>
                  </li>
                );
              })}
            </ul>
            <button
              type="button"
              className="you-secondary"
              onClick={() => setAdding(true)}
            >
              Add another athlete
            </button>
          </section>
        )}
        <p className="welcome-privacy">
          Saved on this device only. No account or password. Anyone using this
          browser can open it. Nourally gives food ideas, not medical advice.
        </p>
        <a className="welcome-how" href="#/you/about">
          How Nourally works
        </a>
      </section>
      {adding && (
        <AthleteNameSheet
          onClose={() => setAdding(false)}
          onCreated={() => onNavigate("setup")}
        />
      )}
      {naming && (
        <AthleteNameSheet athlete={naming} onClose={() => setNaming(null)} />
      )}
      {removing && (
        <ConfirmDialog
          title={`Delete ${removing.name}'s data from this device?`}
          body={`Plans, food, and logs for ${removing.name} are removed. Other athletes stay. You can't undo this. A backup file downloads first.`}
          confirmLabel="Delete data"
          destructive
          requireText="DELETE"
          onCancel={() => setRemoving(null)}
          onConfirm={async () => {
            onNavigate("welcome");
            selectProfile(removing.id);
            if (await deleteCurrentProfile()) setRemoving(null);
          }}
        />
      )}
    </Shell>
  );
}
