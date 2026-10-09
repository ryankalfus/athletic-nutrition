import { useEffect, useRef, useState } from "react";
import { Menu } from "../../components/ui/Menu.jsx";
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
import { Avatar } from "../../components/ui/Avatar.jsx";

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
        <header className="welcome-head">
          <h1 ref={heading} tabIndex={-1}>
            Fuel for the day you actually have.
          </h1>
          <p className="welcome-promise">
            Nourally plans snacks and meals around school and practice.
          </p>
        </header>
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
                      <Avatar
                        name={athleteName(athlete)}
                        size="lg"
                        className="welcome-avatar"
                      />
                      <span className="welcome-tile-text">
                        <strong>{name}</strong>
                        <span className="muted">{sport}</span>
                        {used && <span className="muted">{used}</span>}
                      </span>
                    </button>
                    <Menu
                      label={`${name} options`}
                      items={[
                        {
                          label: "Rename",
                          onSelect: () =>
                            setNaming({
                              id: athlete.id,
                              name: athleteName(athlete),
                            }),
                        },
                        {
                          label: "Remove from this device",
                          danger: true,
                          onSelect: () =>
                            setRemoving({
                              id: athlete.id,
                              name: athleteName(athlete),
                            }),
                        },
                      ]}
                    />
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
