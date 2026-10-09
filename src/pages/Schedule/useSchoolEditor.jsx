import { useState } from "react";
import { schoolDayProblem } from "../../domain/setup.js";
import { SchoolDayEditor } from "./SchoolDayEditor.jsx";

const DEFAULT_ACCESS = {
  cafeteria: true,
  refrigerator: false,
  microwave: false,
  eatInClass: false,
};

// The School day sheet, shared by Schedule's school row and Today's Day rail
// (TODAY-02: the school row opens the same sheet).
export function useSchoolEditor({
  schoolSchedule,
  setSchoolSchedule,
  todayKey,
  initiallyOpen = false,
}) {
  const today = new Date(`${todayKey}T12:00:00`);
  const schoolYearStart =
    today.getMonth() >= 6 ? today.getFullYear() : today.getFullYear() - 1;
  const [showSchoolForm, setShowSchoolForm] = useState(initiallyOpen);
  const [schoolName, setSchoolName] = useState(
    schoolSchedule?.name || "School",
  );
  const [schoolStartDate, setSchoolStartDate] = useState(
    schoolSchedule?.startDate || `${schoolYearStart}-08-15`,
  );
  const [schoolEndDate, setSchoolEndDate] = useState(
    schoolSchedule?.endDate || `${schoolYearStart + 1}-06-15`,
  );
  const [schoolStartTime, setSchoolStartTime] = useState(
    schoolSchedule?.startTime || "08:00",
  );
  const [schoolEndTime, setSchoolEndTime] = useState(
    schoolSchedule?.endTime || "15:00",
  );
  const [schoolWeekdays, setSchoolWeekdays] = useState(
    schoolSchedule?.weekdays || [1, 2, 3, 4, 5],
  );
  const [lunchStartTime, setLunchStartTime] = useState(
    schoolSchedule?.lunchStartTime || "11:30",
  );
  const [lunchEndTime, setLunchEndTime] = useState(
    schoolSchedule?.lunchEndTime || "12:00",
  );
  const [morningSnackTime, setMorningSnackTime] = useState(
    schoolSchedule?.morningSnackTime || "",
  );
  const [afternoonSnackTime, setAfternoonSnackTime] = useState(
    schoolSchedule?.afternoonSnackTime || "",
  );
  const [commuteMinutes, setCommuteMinutes] = useState(
    String(schoolSchedule?.commuteMinutes ?? 20),
  );
  const [foodAccess, setFoodAccess] = useState(
    schoolSchedule?.foodAccess || DEFAULT_ACCESS,
  );
  const [schoolError, setSchoolError] = useState("");
  const [excludedRanges, setExcludedRanges] = useState(
    schoolSchedule?.excludedRanges || [],
  );
  // Days off start empty: no range is suggested until one is picked.
  const [daysOffStart, setDaysOffStart] = useState("");
  const [daysOffEnd, setDaysOffEnd] = useState("");
  const [pauseSchool, setPauseSchool] = useState(
    Boolean(schoolSchedule?.pausedUntil || schoolSchedule?.enabled === false),
  );
  const [pausedFrom, setPausedFrom] = useState(
    schoolSchedule?.pausedFrom || todayKey,
  );
  const [pausedUntil, setPausedUntil] = useState(
    schoolSchedule?.pausedUntil ||
      schoolSchedule?.endDate ||
      `${schoolYearStart + 1}-06-15`,
  );

  async function saveSchoolSchedule(event) {
    event.preventDefault();
    const dayError = schoolDayProblem({
      startDate: schoolStartDate,
      endDate: schoolEndDate,
      startTime: schoolStartTime,
      endTime: schoolEndTime,
      weekdays: schoolWeekdays,
      lunchStartTime,
      lunchEndTime,
    });
    if (dayError) {
      setSchoolError(dayError);
      return;
    }
    if (
      [morningSnackTime, afternoonSnackTime].some(
        (time) => time && (time < schoolStartTime || time > schoolEndTime),
      )
    ) {
      setSchoolError({
        message: "Optional snack times must fall inside the school day.",
        field: "snacks",
      });
      return;
    }
    const parsedCommuteMinutes = Number(commuteMinutes);
    if (
      !Number.isFinite(parsedCommuteMinutes) ||
      parsedCommuteMinutes < 0 ||
      parsedCommuteMinutes > 180
    ) {
      setSchoolError({
        message: "Commute time must be between 0 and 180 minutes.",
        field: "commute",
      });
      return;
    }
    if (pauseSchool && pausedUntil < pausedFrom) {
      setSchoolError({
        message: "Pause end must be on or after its start.",
        field: "pause",
      });
      return;
    }
    const saved = await setSchoolSchedule(
      {
        enabled: true,
        name: schoolName.trim() || "School",
        startDate: schoolStartDate,
        endDate: schoolEndDate,
        startTime: schoolStartTime,
        endTime: schoolEndTime,
        weekdays: [...schoolWeekdays].sort(),
        lunchStartTime,
        lunchEndTime,
        morningSnackTime,
        afternoonSnackTime,
        commuteMinutes: parsedCommuteMinutes,
        foodAccess,
        excludedDates: schoolSchedule?.excludedDates || [],
        excludedRanges,
        pausedFrom: pauseSchool ? pausedFrom : "",
        pausedUntil: pauseSchool ? pausedUntil : "",
      },
      "School day saved.",
    );
    if (saved) {
      setSchoolError("");
      setShowSchoolForm(false);
    }
  }

  function open(dateKey = todayKey) {
    if (schoolSchedule) {
      setSchoolName(schoolSchedule.name);
      setSchoolStartDate(schoolSchedule.startDate);
      setSchoolEndDate(schoolSchedule.endDate);
      setSchoolStartTime(schoolSchedule.startTime);
      setSchoolEndTime(schoolSchedule.endTime);
      setSchoolWeekdays(schoolSchedule.weekdays);
      setLunchStartTime(schoolSchedule.lunchStartTime || "11:30");
      setLunchEndTime(schoolSchedule.lunchEndTime || "12:00");
      setMorningSnackTime(schoolSchedule.morningSnackTime || "");
      setAfternoonSnackTime(schoolSchedule.afternoonSnackTime || "");
      setCommuteMinutes(String(schoolSchedule.commuteMinutes ?? 20));
      setFoodAccess(schoolSchedule.foodAccess || DEFAULT_ACCESS);
      setExcludedRanges(schoolSchedule.excludedRanges || []);
      setPauseSchool(
        Boolean(schoolSchedule.pausedUntil || schoolSchedule.enabled === false),
      );
      setPausedFrom(schoolSchedule.pausedFrom || todayKey);
      setPausedUntil(schoolSchedule.pausedUntil || schoolSchedule.endDate);
    }
    setDaysOffStart(dateKey);
    setDaysOffEnd(dateKey);
    setSchoolError("");
    setShowSchoolForm(true);
  }

  function toggleSchoolDay(day) {
    setSchoolWeekdays((days) =>
      days.includes(day) ? days.filter((item) => item !== day) : [...days, day],
    );
  }

  function toggleFoodAccess(option) {
    setFoodAccess((access) => ({ ...access, [option]: !access[option] }));
  }

  function addDaysOff() {
    if (!daysOffStart || !daysOffEnd || daysOffEnd < daysOffStart) {
      setSchoolError({
        message: "Choose a days-off range with an end on or after its start.",
        field: "daysOff",
      });
      return;
    }
    setExcludedRanges((ranges) =>
      ranges.some(
        (range) =>
          range.startDate === daysOffStart && range.endDate === daysOffEnd,
      )
        ? ranges
        : [...ranges, { startDate: daysOffStart, endDate: daysOffEnd }].sort(
            (a, b) => a.startDate.localeCompare(b.startDate),
          ),
    );
    setSchoolError("");
  }

  const element = showSchoolForm ? (
    <SchoolDayEditor
      model={{
        setShowSchoolForm,
        saveSchoolSchedule,
        schoolName,
        setSchoolName,
        schoolStartDate,
        setSchoolStartDate,
        schoolEndDate,
        setSchoolEndDate,
        schoolStartTime,
        setSchoolStartTime,
        schoolEndTime,
        setSchoolEndTime,
        schoolWeekdays,
        toggleSchoolDay,
        lunchStartTime,
        setLunchStartTime,
        lunchEndTime,
        setLunchEndTime,
        morningSnackTime,
        setMorningSnackTime,
        afternoonSnackTime,
        setAfternoonSnackTime,
        commuteMinutes,
        setCommuteMinutes,
        foodAccess,
        toggleFoodAccess,
        daysOffStart,
        setDaysOffStart,
        daysOffEnd,
        setDaysOffEnd,
        addDaysOff,
        excludedRanges,
        setExcludedRanges,
        pauseSchool,
        setPauseSchool,
        pausedFrom,
        setPausedFrom,
        pausedUntil,
        setPausedUntil,
        schoolError,
      }}
    />
  ) : null;

  return { open, element, isOpen: showSchoolForm };
}
