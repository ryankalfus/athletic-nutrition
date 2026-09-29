import { ChevronLeft } from "lucide-react";
import { Shell } from "../../components/AppFrame.jsx";

// You › About Nourally's guidance: the one full safety explanation (7.5 tier 1).
// `standalone` is the Welcome "How Nourally works" link: no app navigation,
// and Back returns to Welcome.
export function AboutPage({ onNavigate, standalone = false }) {
  return (
    <Shell
      onNavigate={onNavigate}
      navigation={!standalone}
      footer={!standalone}
    >
      <article className="you-page about-page">
        <button
          type="button"
          className="text-button you-back"
          onClick={() => onNavigate(standalone ? "welcome" : "you")}
        >
          <ChevronLeft size={18} aria-hidden="true" />{" "}
          {standalone ? "Back" : "You"}
        </button>
        <h1>About Nourally&apos;s guidance</h1>
        <p className="about-intro">
          Nourally gives food ideas and timing tips for busy school and sport
          days. It does not set calorie goals, track weight, or give medical
          advice.
        </p>
        <section aria-labelledby="about-does">
          <h2 id="about-does">What Nourally does</h2>
          <p>
            It times snacks and meals around school and practice. Ideas are
            examples you can swap, not rules.
          </p>
        </section>
        <section aria-labelledby="about-not">
          <h2 id="about-not">What it doesn&apos;t do</h2>
          <p>
            No calorie targets, weight tracking, food grades, or streaks. It
            doesn&apos;t diagnose or treat any condition.
          </p>
        </section>
        <section aria-labelledby="about-help">
          <h2 id="about-help">When to talk to someone</h2>
          <p>
            Talk to a doctor or registered dietitian, with a parent or guardian,
            about a medical condition, a food allergy, or worries about eating,
            weight, or energy. Follow your coach&apos;s or doctor&apos;s plan if
            you have one.
          </p>
        </section>
        <section aria-labelledby="about-allergies">
          <h2 id="about-allergies">Allergies</h2>
          <p>
            Allergy filters aren&apos;t ready yet, so ideas don&apos;t hide
            foods by allergy. Recipes and brands vary, and allergen info can be
            missing or wrong. Check every package.
          </p>
        </section>
        <section aria-labelledby="about-drinks">
          <h2 id="about-drinks">Drinks</h2>
          <p>
            Water works for most practices. Sports drinks can help in long or
            hot sessions. Nourally never suggests energy drinks.
          </p>
        </section>
        <section aria-labelledby="about-data">
          <h2 id="about-data">Your data</h2>
          <p>
            Plans and logs are saved in this browser, not in an account or
            cloud. Food search sends what you type to online food databases.
            Save a backup file in This device now and then.
          </p>
        </section>
      </article>
    </Shell>
  );
}
