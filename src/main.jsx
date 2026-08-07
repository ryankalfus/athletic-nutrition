import { StrictMode, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BarcodeDetector as WasmBarcodeDetector } from 'barcode-detector/ponyfill';
import './styles.css';

function getDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function readStoredValue(key, legacyKey) {
  return localStorage.getItem(key) ?? localStorage.getItem(legacyKey);
}

function loadSchedule() {
  return JSON.parse(readStoredValue('nourally-schedule', 'fuel-schedule') || '[]');
}

function loadSchoolSchedule() {
  return JSON.parse(localStorage.getItem('nourally-school-schedule') || 'null');
}

function loadDailyLogs() {
  const saved = JSON.parse(readStoredValue('nourally-daily-logs', 'fuel-daily-logs') || 'null');
  if (saved) return saved;

  const legacy = JSON.parse(readStoredValue('nourally-entries', 'fuel-entries') || '[]');
  const userEntries = legacy.filter((entry) => !(
    (entry.id === 1 && entry.name === 'Breakfast') ||
    (entry.id === 2 && entry.name === 'Chicken rice bowl')
  ));

  return userEntries.length ? {
    [getDateKey()]: {
      goal: Number(readStoredValue('nourally-goal', 'fuel-goal')) || 2400,
      entries: userEntries,
    },
  } : {};
}

function App() {
  const [step, setStep] = useState(() => readStoredValue('nourally-step', 'fuel-step') || 'account');
  const [view, setView] = useState('today');
  const [todayKey, setTodayKey] = useState(getDateKey);
  const [goal, setGoal] = useState(() => Number(readStoredValue('nourally-goal', 'fuel-goal')) || 2400);
  const [waterGoal, setWaterGoal] = useState(() => Number(readStoredValue('nourally-water-goal', 'fuel-water-goal')) || 80);
  const [dailyLogs, setDailyLogs] = useState(loadDailyLogs);
  const [schedule, setSchedule] = useState(loadSchedule);
  const [schoolSchedule, setSchoolSchedule] = useState(loadSchoolSchedule);

  useEffect(() => localStorage.setItem('nourally-step', step), [step]);
  useEffect(() => localStorage.setItem('nourally-goal', goal), [goal]);
  useEffect(() => localStorage.setItem('nourally-water-goal', waterGoal), [waterGoal]);
  useEffect(() => localStorage.setItem('nourally-daily-logs', JSON.stringify(dailyLogs)), [dailyLogs]);
  useEffect(() => localStorage.setItem('nourally-schedule', JSON.stringify(schedule)), [schedule]);
  useEffect(() => localStorage.setItem('nourally-school-schedule', JSON.stringify(schoolSchedule)), [schoolSchedule]);
  useEffect(() => {
    const timer = window.setInterval(() => setTodayKey(getDateKey()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  const todayLog = dailyLogs[todayKey] || { goal, entries: [], water: 0, waterGoal };

  function saveGoal() {
    setDailyLogs((logs) => ({
      ...logs,
      [todayKey]: { ...logs[todayKey], goal, entries: logs[todayKey]?.entries || [], water: logs[todayKey]?.water || 0, waterGoal: logs[todayKey]?.waterGoal || waterGoal },
    }));
    setStep('dashboard');
    setView('today');
  }

  function setTodayEntries(update) {
    setDailyLogs((logs) => {
      const current = logs[todayKey] || { goal, entries: [] };
      const entries = typeof update === 'function' ? update(current.entries) : update;
      return { ...logs, [todayKey]: { ...current, goal, entries } };
    });
  }

  function setTodayHydration(update) {
    setDailyLogs((logs) => {
      const current = logs[todayKey] || { goal, entries: [], water: 0, waterGoal };
      const hydration = { water: current.water || 0, waterGoal: current.waterGoal || waterGoal };
      const next = typeof update === 'function' ? update(hydration) : update;
      return { ...logs, [todayKey]: { ...current, ...next } };
    });
  }

  function updateWaterGoal(nextGoal) {
    setWaterGoal(nextGoal);
    setTodayHydration((hydration) => ({ ...hydration, waterGoal: nextGoal }));
  }

  if (step === 'account') return <AccountScreen onContinue={() => setStep('goal')} />;
  if (step === 'goal') return <GoalScreen goal={goal} setGoal={setGoal} onContinue={saveGoal} />;
  if (view === 'history') return <History dailyLogs={dailyLogs} todayKey={todayKey} fallbackWaterGoal={waterGoal} onBack={() => setView('today')} />;
  if (view === 'weekly') return <WeeklyProgress dailyLogs={dailyLogs} todayKey={todayKey} fallbackGoal={goal} fallbackWaterGoal={waterGoal} onBack={() => setView('today')} />;
  if (view === 'calendar') return <ScheduleCalendar events={schedule} setEvents={setSchedule} schoolSchedule={schoolSchedule} setSchoolSchedule={setSchoolSchedule} todayKey={todayKey} onBack={() => setView('today')} />;
  return <Dashboard goal={todayLog.goal || goal} entries={todayLog.entries} setEntries={setTodayEntries} water={todayLog.water || 0} waterGoal={todayLog.waterGoal || waterGoal} setHydration={setTodayHydration} onSetWaterGoal={updateWaterGoal} onEditGoal={() => setStep('goal')} onHistory={() => setView('history')} onWeekly={() => setView('weekly')} onCalendar={() => setView('calendar')} />;
}

function Shell({ children, eyebrow = 'NOURALLY / DAILY NUTRITION' }) {
  return <main className="shell"><div className="brand"><span className="brand-mark">↗</span><span>nourally</span></div><div className="eyebrow">{eyebrow}</div>{children}<footer>Your ally from school to sport <span>·</span> Your data stays on this device</footer></main>;
}

function AccountScreen({ onContinue }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  return <Shell>
    <section className="intro split-intro"><div><p className="kicker">YOUR DAILY EDGE</p><h1>Eat with purpose.<br /><em>Move with confidence.</em></h1></div><p className="intro-copy">A clear, simple way to keep your fuel on track through school, practice, and game day.</p></section>
    <section className="card account-card"><div className="section-label">01 / CREATE YOUR ACCOUNT</div><h2>Let’s get you set up.</h2><p className="muted">Start with an account, then we’ll help you choose a daily calorie goal.</p><form onSubmit={(event) => { event.preventDefault(); onContinue(); }}><label>Email address<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label><label>Password<input type="password" minLength="6" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" /></label><button className="primary" type="submit">Create account <span>→</span></button></form><p className="fine-print">This prototype does not send or store account information online.</p></section>
  </Shell>;
}

function GoalScreen({ goal, setGoal, onContinue }) {
  const options = [2000, 2200, 2400, 2800];
  return <Shell eyebrow="NOURALLY / YOUR STARTING POINT">
    <section className="intro"><p className="kicker">YOUR DAILY TARGET</p><h1>How much fuel<br /><em>do you need today?</em></h1><p className="intro-copy wide">Choose a starting goal. You can adjust it anytime as your training changes.</p></section>
    <section className="card goal-card"><div className="section-label">02 / DAILY CALORIE GOAL</div><div className="goal-input-wrap"><input aria-label="Daily calorie goal" type="number" min="1000" max="6000" step="50" value={goal} onChange={(event) => setGoal(Number(event.target.value))} /><span>CALORIES / DAY</span></div><div className="quick-options">{options.map((option) => <button type="button" className={goal === option ? 'selected' : ''} key={option} onClick={() => setGoal(option)}>{option.toLocaleString()}</button>)}</div><button className="primary" onClick={onContinue}>Save goal & continue <span>→</span></button><p className="fine-print">Your goal is a starting estimate, not medical advice. Talk with a qualified professional for personalized nutrition guidance.</p></section>
  </Shell>;
}

function Dashboard({ goal, entries, setEntries, water, waterGoal, setHydration, onSetWaterGoal, onEditGoal, onHistory, onWeekly, onCalendar }) {
  const [showForm, setShowForm] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const total = entries.reduce((sum, entry) => sum + entry.calories, 0);
  const remaining = Math.max(goal - total, 0);
  const progress = Math.min((total / goal) * 100, 100);
  const date = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());
  const status = useMemo(() => total === 0 ? 'Ready when you are.' : remaining === 0 ? 'Goal reached. Nice work.' : `${remaining.toLocaleString()} calories left today.`, [total, remaining]);

  function resetForm() {
    setName('');
    setCalories('');
    setEditingId(null);
    setShowForm(false);
  }

  function submitEntry(event) {
    event.preventDefault();
    if (!name.trim() || !calories) return;
    if (editingId) {
      setEntries((current) => current.map((entry) => entry.id === editingId ? { ...entry, name: name.trim(), calories: Number(calories) } : entry));
    } else {
      setEntries((current) => [...current, {
        id: Date.now(),
        name: name.trim(),
        calories: Number(calories),
        time: new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date()),
      }]);
    }
    resetForm();
  }

  function editEntry(entry) {
    setName(entry.name);
    setCalories(String(entry.calories));
    setEditingId(entry.id);
    setShowForm(true);
  }

  function deleteEntry(id) {
    setEntries((current) => current.filter((entry) => entry.id !== id));
    if (editingId === id) resetForm();
  }

  function addScannedProduct(product) {
    setEntries((current) => [...current, {
      id: Date.now(),
      name: product.name,
      calories: product.calories,
      barcode: product.barcode,
      servingGrams: product.servingGrams,
      source: 'barcode',
      time: new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date()),
    }]);
    setShowScanner(false);
  }

  return <Shell eyebrow="NOURALLY / TODAY">
    <section className="dashboard-head"><div><p className="kicker">{date.toUpperCase()}</p><h1>Keep your <em>momentum.</em></h1></div><div className="head-actions"><button className="text-button" onClick={onCalendar}>Calendar ↗</button><button className="text-button" onClick={onWeekly}>Weekly ↗</button><button className="text-button" onClick={onHistory}>History ↗</button><button className="text-button" onClick={onEditGoal}>Edit goal ↗</button></div></section>
    <section className="dashboard-grid"><div className="card tracker-card"><div className="section-label">CALORIE TRACKER</div><div className="tracker-content"><div className="progress-ring" style={{ '--progress': `${progress * 3.6}deg` }}><div><strong>{total.toLocaleString()}</strong><span>of {goal.toLocaleString()}</span></div></div><div><p className="kicker">TODAY’S PROGRESS</p><h2>{status}</h2><p className="muted">Log meals and snacks as you go. Small entries add up.</p></div></div><div className="progress-bar"><span style={{ width: `${progress}%` }} /></div></div><div className="card summary-card"><div className="section-label">AT A GLANCE</div><div className="summary-row"><span>Daily goal</span><strong>{goal.toLocaleString()} <small>kcal</small></strong></div><div className="summary-row"><span>Logged</span><strong>{total.toLocaleString()} <small>kcal</small></strong></div><div className="summary-row"><span>Remaining</span><strong>{remaining.toLocaleString()} <small>kcal</small></strong></div></div></section>
    <HydrationTracker water={water} waterGoal={waterGoal} setHydration={setHydration} onSetWaterGoal={onSetWaterGoal} />
    <section className="entries-section"><div className="section-heading"><div><p className="kicker">TODAY’S LOG</p><h2>What have you eaten?</h2></div><div className="entry-buttons"><button className="scan-button small" onClick={() => { resetForm(); setShowScanner(!showScanner); }}>{showScanner ? 'Close scanner' : '▣ Scan barcode'}</button><button className="primary small" onClick={() => { setShowScanner(false); if (showForm) resetForm(); else setShowForm(true); }}>{showForm ? 'Cancel' : '+ Add calories'}</button></div></div>{showScanner && <BarcodeScanner onAdd={addScannedProduct} onClose={() => setShowScanner(false)} />}{showForm && <form className="add-form card" onSubmit={submitEntry}><input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Meal or snack name" /><input required min="1" type="number" value={calories} onChange={(event) => setCalories(event.target.value)} placeholder="Calories" /><button className="primary small" type="submit">{editingId ? 'Save' : 'Add'}</button></form>}{entries.length === 0 ? <div className="empty-state"><span>＋</span><h3>No calories logged yet.</h3><p>Your first meal or snack will appear here.</p></div> : <div className="entries">{entries.map((entry) => <div className="entry" key={entry.id}><div className="entry-icon">{entry.source === 'barcode' ? '▣' : '✦'}</div><div className="entry-copy"><strong>{entry.name}</strong><span>{entry.time}{entry.source === 'barcode' ? ` · ${entry.servingGrams}g serving` : ''}</span></div><b>{entry.calories.toLocaleString()} <small>kcal</small></b><div className="entry-actions"><button onClick={() => editEntry(entry)} aria-label={`Edit ${entry.name}`}>Edit</button><button className="danger" onClick={() => deleteEntry(entry.id)} aria-label={`Delete ${entry.name}`}>Delete</button></div></div>)}</div>}</section>
  </Shell>;
}

function ScheduleCalendar({ events, setEvents, schoolSchedule, setSchoolSchedule, todayKey, onBack }) {
  const today = new Date(`${todayKey}T12:00:00`);
  const schoolYearStart = today.getMonth() >= 6 ? today.getFullYear() : today.getFullYear() - 1;
  const [selectedKey, setSelectedKey] = useState(todayKey);
  const [monthCursor, setMonthCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [showForm, setShowForm] = useState(false);
  const [showSchoolForm, setShowSchoolForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [type, setType] = useState('practice');
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('16:00');
  const [endTime, setEndTime] = useState('17:30');
  const [intensity, setIntensity] = useState('medium');
  const [formError, setFormError] = useState('');
  const [schoolName, setSchoolName] = useState(schoolSchedule?.name || 'School');
  const [schoolStartDate, setSchoolStartDate] = useState(schoolSchedule?.startDate || `${schoolYearStart}-08-15`);
  const [schoolEndDate, setSchoolEndDate] = useState(schoolSchedule?.endDate || `${schoolYearStart + 1}-06-15`);
  const [schoolStartTime, setSchoolStartTime] = useState(schoolSchedule?.startTime || '08:00');
  const [schoolEndTime, setSchoolEndTime] = useState(schoolSchedule?.endTime || '15:00');
  const [schoolWeekdays, setSchoolWeekdays] = useState(schoolSchedule?.weekdays || [1, 2, 3, 4, 5]);
  const [lunchStartTime, setLunchStartTime] = useState(schoolSchedule?.lunchStartTime || '11:30');
  const [lunchEndTime, setLunchEndTime] = useState(schoolSchedule?.lunchEndTime || '12:00');
  const [morningSnackTime, setMorningSnackTime] = useState(schoolSchedule?.morningSnackTime || '');
  const [afternoonSnackTime, setAfternoonSnackTime] = useState(schoolSchedule?.afternoonSnackTime || '');
  const [commuteMinutes, setCommuteMinutes] = useState(String(schoolSchedule?.commuteMinutes ?? 20));
  const [foodAccess, setFoodAccess] = useState(schoolSchedule?.foodAccess || { cafeteria: true, refrigerator: false, microwave: false, eatInClass: false });
  const [schoolError, setSchoolError] = useState('');
  const monthStart = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1);
  const gridStart = addDays(monthStart, -monthStart.getDay());
  const calendarDays = Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
  const selectedDate = new Date(`${selectedKey}T12:00:00`);
  const selectedEvents = getEventsForDay(selectedDate);
  const selectedSchoolCanceled = schoolSchedule?.enabled && isConfiguredSchoolDay(selectedDate) && schoolSchedule.excludedDates?.includes(selectedKey);

  function isConfiguredSchoolDay(date) {
    if (!schoolSchedule || getDateKey(date) < schoolSchedule.startDate || getDateKey(date) > schoolSchedule.endDate) return false;
    return schoolSchedule.weekdays.includes(date.getDay());
  }

  function getSchoolEvent(date) {
    const key = getDateKey(date);
    if (!schoolSchedule?.enabled || !isConfiguredSchoolDay(date) || schoolSchedule.excludedDates?.includes(key)) return null;
    return {
      id: `school-${key}`,
      date: key,
      type: 'school',
      title: schoolSchedule.name,
      startTime: schoolSchedule.startTime,
      endTime: schoolSchedule.endTime,
      intensity: 'school day',
      recurring: true,
    };
  }

  function getEventsForDay(date) {
    const key = getDateKey(date);
    const dayEvents = events.filter((event) => event.date === key);
    const schoolEvent = getSchoolEvent(date);
    return (schoolEvent ? [...dayEvents, schoolEvent] : dayEvents).sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  function formatTime(value) {
    const [hours, minutes] = value.split(':').map(Number);
    return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(2000, 0, 1, hours, minutes));
  }

  function formatDuration(start, end) {
    const [startHour, startMinute] = start.split(':').map(Number);
    const [endHour, endMinute] = end.split(':').map(Number);
    const minutes = endHour * 60 + endMinute - startHour * 60 - startMinute;
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    if (!hours) return `${remainder} min`;
    return remainder ? `${hours} hr ${remainder} min` : `${hours} hr`;
  }

  function resetForm() {
    setEditingId(null);
    setType('practice');
    setTitle('');
    setStartTime('16:00');
    setEndTime('17:30');
    setIntensity('medium');
    setFormError('');
    setShowForm(false);
  }

  function selectDay(date) {
    setSelectedKey(getDateKey(date));
    if (date.getMonth() !== monthCursor.getMonth() || date.getFullYear() !== monthCursor.getFullYear()) {
      setMonthCursor(new Date(date.getFullYear(), date.getMonth(), 1));
    }
    resetForm();
  }

  function goToToday() {
    setSelectedKey(todayKey);
    setMonthCursor(new Date(today.getFullYear(), today.getMonth(), 1));
    resetForm();
  }

  function saveEvent(event) {
    event.preventDefault();
    if (endTime <= startTime) {
      setFormError('End time must be later than start time.');
      return;
    }
    const scheduledEvent = {
      id: editingId || Date.now(),
      date: selectedKey,
      type,
      title: title.trim() || type[0].toUpperCase() + type.slice(1),
      startTime,
      endTime,
      intensity,
    };
    setEvents((current) => editingId
      ? current.map((item) => item.id === editingId ? scheduledEvent : item)
      : [...current, scheduledEvent]);
    resetForm();
  }

  function editEvent(event) {
    setEditingId(event.id);
    setType(event.type);
    setTitle(event.title);
    setStartTime(event.startTime);
    setEndTime(event.endTime);
    setIntensity(event.intensity);
    setFormError('');
    setShowForm(true);
  }

  function deleteEvent(id) {
    setEvents((current) => current.filter((event) => event.id !== id));
    if (editingId === id) resetForm();
  }

  function saveSchoolSchedule(event) {
    event.preventDefault();
    if (schoolEndDate < schoolStartDate) {
      setSchoolError('The school year must end after it starts.');
      return;
    }
    if (schoolEndTime <= schoolStartTime) {
      setSchoolError('The school day must end after it starts.');
      return;
    }
    if (!schoolWeekdays.length) {
      setSchoolError('Choose at least one school day.');
      return;
    }
    if (lunchEndTime <= lunchStartTime || lunchStartTime < schoolStartTime || lunchEndTime > schoolEndTime) {
      setSchoolError('Lunch must fit inside the school day and end after it starts.');
      return;
    }
    if ([morningSnackTime, afternoonSnackTime].some((time) => time && (time < schoolStartTime || time > schoolEndTime))) {
      setSchoolError('Optional snack times must fall inside the school day.');
      return;
    }
    const parsedCommuteMinutes = Number(commuteMinutes);
    if (!Number.isFinite(parsedCommuteMinutes) || parsedCommuteMinutes < 0 || parsedCommuteMinutes > 180) {
      setSchoolError('Commute time must be between 0 and 180 minutes.');
      return;
    }
    setSchoolSchedule({
      enabled: true,
      name: schoolName.trim() || 'School',
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
    });
    setSchoolError('');
    setShowSchoolForm(false);
  }

  function openSchoolForm() {
    if (schoolSchedule) {
      setSchoolName(schoolSchedule.name);
      setSchoolStartDate(schoolSchedule.startDate);
      setSchoolEndDate(schoolSchedule.endDate);
      setSchoolStartTime(schoolSchedule.startTime);
      setSchoolEndTime(schoolSchedule.endTime);
      setSchoolWeekdays(schoolSchedule.weekdays);
      setLunchStartTime(schoolSchedule.lunchStartTime || '11:30');
      setLunchEndTime(schoolSchedule.lunchEndTime || '12:00');
      setMorningSnackTime(schoolSchedule.morningSnackTime || '');
      setAfternoonSnackTime(schoolSchedule.afternoonSnackTime || '');
      setCommuteMinutes(String(schoolSchedule.commuteMinutes ?? 20));
      setFoodAccess(schoolSchedule.foodAccess || { cafeteria: true, refrigerator: false, microwave: false, eatInClass: false });
    }
    setSchoolError('');
    setShowSchoolForm(true);
    resetForm();
  }

  function toggleSchoolDay(day) {
    setSchoolWeekdays((days) => days.includes(day) ? days.filter((item) => item !== day) : [...days, day]);
  }

  function toggleFoodAccess(option) {
    setFoodAccess((access) => ({ ...access, [option]: !access[option] }));
  }

  function toggleSchoolSchedule() {
    if (!schoolSchedule) {
      openSchoolForm();
      return;
    }
    setSchoolSchedule((current) => ({ ...current, enabled: !current.enabled }));
  }

  function cancelSchoolDay(dateKey) {
    setSchoolSchedule((current) => ({ ...current, excludedDates: [...new Set([...(current.excludedDates || []), dateKey])] }));
  }

  function restoreSchoolDay(dateKey) {
    setSchoolSchedule((current) => ({ ...current, excludedDates: (current.excludedDates || []).filter((date) => date !== dateKey) }));
  }

  return <Shell eyebrow="NOURALLY / CALENDAR">
    <section className="calendar-head"><div><p className="kicker">SCHOOL + TRAINING SCHEDULE</p><h1>Plan your<br /><em>whole day.</em></h1></div><div className="calendar-head-actions"><button className="school-button" onClick={openSchoolForm}>▤ School</button><button className="text-button" onClick={onBack}>← Back to today</button></div></section>
    {(schoolSchedule || showSchoolForm) && <section className="card school-schedule-card">
      <div className="school-schedule-summary"><div><div className="section-label">SCHOOL CALENDAR</div><h2>{schoolSchedule?.name || 'Import your school schedule'}</h2>{schoolSchedule && <><p>{new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${schoolSchedule.startDate}T12:00:00`))} – {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${schoolSchedule.endDate}T12:00:00`))} · {formatTime(schoolSchedule.startTime)}–{formatTime(schoolSchedule.endTime)}</p>{schoolSchedule.lunchStartTime && <p className="school-food-summary">Lunch {formatTime(schoolSchedule.lunchStartTime)}–{formatTime(schoolSchedule.lunchEndTime)} · {schoolSchedule.commuteMinutes ?? 20} min commute</p>}</>}</div><div className="school-summary-actions">{schoolSchedule && <button className={`school-toggle ${schoolSchedule.enabled ? 'on' : ''}`} onClick={toggleSchoolSchedule} aria-pressed={schoolSchedule.enabled}><span />{schoolSchedule.enabled ? 'Shown' : 'Hidden'}</button>}<button className="text-button" onClick={() => showSchoolForm ? setShowSchoolForm(false) : openSchoolForm()}>{showSchoolForm ? 'Close' : schoolSchedule ? 'Edit' : 'Set up'}</button></div></div>
      {showSchoolForm && <form className="school-form" onSubmit={saveSchoolSchedule}>
        <label>School name<input value={schoolName} onChange={(event) => setSchoolName(event.target.value)} placeholder="School" /></label>
        <div className="school-date-fields"><label>School year starts<input required type="date" value={schoolStartDate} onChange={(event) => setSchoolStartDate(event.target.value)} /></label><label>School year ends<input required type="date" value={schoolEndDate} onChange={(event) => setSchoolEndDate(event.target.value)} /></label></div>
        <div className="school-date-fields"><label>School starts<input required type="time" value={schoolStartTime} onChange={(event) => setSchoolStartTime(event.target.value)} /></label><label>School ends<input required type="time" value={schoolEndTime} onChange={(event) => setSchoolEndTime(event.target.value)} /></label></div>
        <fieldset><legend>School days</legend><div className="school-weekdays">{[['S', 0], ['M', 1], ['T', 2], ['W', 3], ['T', 4], ['F', 5], ['S', 6]].map(([label, day]) => <button type="button" className={schoolWeekdays.includes(day) ? 'selected' : ''} onClick={() => toggleSchoolDay(day)} key={day}>{label}</button>)}</div></fieldset>
        <div className="school-food-section">
          <div><div className="section-label">FOOD WINDOWS & ACCESS</div><p>Tell Nourally what is realistically available during your school day.</p></div>
          <div className="school-date-fields"><label>Lunch starts<input required type="time" value={lunchStartTime} onChange={(event) => setLunchStartTime(event.target.value)} /></label><label>Lunch ends<input required type="time" value={lunchEndTime} onChange={(event) => setLunchEndTime(event.target.value)} /></label></div>
          <div className="school-date-fields"><label>Morning snack <span>Optional</span><input type="time" value={morningSnackTime} onChange={(event) => setMorningSnackTime(event.target.value)} /></label><label>Afternoon snack <span>Optional</span><input type="time" value={afternoonSnackTime} onChange={(event) => setAfternoonSnackTime(event.target.value)} /></label></div>
          <label>Commute from school<input type="number" min="0" max="180" step="5" value={commuteMinutes} onChange={(event) => setCommuteMinutes(event.target.value)} /><small>Minutes from school to home, practice, or your usual next stop.</small></label>
          <fieldset><legend>Food access at school</legend><div className="food-access-options">{[['cafeteria', 'Cafeteria'], ['refrigerator', 'Refrigerator'], ['microwave', 'Microwave'], ['eatInClass', 'Can eat in class']].map(([option, label]) => <button type="button" className={foodAccess[option] ? 'selected' : ''} aria-pressed={Boolean(foodAccess[option])} onClick={() => toggleFoodAccess(option)} key={option}><span>{foodAccess[option] ? '✓' : '+'}</span>{label}</button>)}</div></fieldset>
        </div>
        {schoolError && <p className="schedule-error">{schoolError}</p>}
        <button className="primary" type="submit">Import school year <span>→</span></button>
      </form>}
    </section>}
    <section className="calendar-layout">
      <div className="card month-calendar">
        <div className="calendar-toolbar">
          <div className="calendar-month-controls"><button onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1))} aria-label="Previous month">‹</button><button onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1))} aria-label="Next month">›</button></div>
          <h2>{new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(monthCursor)}</h2>
          <button className="today-button" onClick={goToToday}>Today</button>
        </div>
        <div className="weekday-row">{['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((day) => <span key={day}>{day}</span>)}</div>
        <div className="calendar-grid">{calendarDays.map((date) => {
          const key = getDateKey(date);
          const dayEvents = getEventsForDay(date);
          const outsideMonth = date.getMonth() !== monthCursor.getMonth();
          return <button type="button" className={`calendar-day${outsideMonth ? ' outside' : ''}${key === todayKey ? ' today' : ''}${key === selectedKey ? ' selected' : ''}`} key={key} onClick={() => selectDay(date)} aria-label={new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(date)}>
            <span className="day-number">{date.getDate()}</span>
            <span className="day-events">{dayEvents.slice(0, 3).map((event) => <span className={`calendar-event-chip ${event.type}`} key={event.id}><i />{event.title}</span>)}{dayEvents.length > 3 && <span className="more-events">+{dayEvents.length - 3} more</span>}</span>
          </button>;
        })}</div>
      </div>
      <aside className="card day-agenda">
        <div className="agenda-head"><div><span>{new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(selectedDate)}</span><strong>{new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric' }).format(selectedDate)}</strong></div><button className="primary small" onClick={() => { setShowSchoolForm(false); showForm ? resetForm() : setShowForm(true); }}>{showForm ? 'Cancel' : '+ Add'}</button></div>
        {showForm && <form className="schedule-form" onSubmit={saveEvent}>
          <label>Activity type<select value={type} onChange={(event) => setType(event.target.value)}><option value="workout">Workout</option><option value="practice">Practice</option><option value="game">Game</option></select></label>
          <label>Activity name<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={type[0].toUpperCase() + type.slice(1)} /></label>
          <div className="time-fields"><label>Starts<input required type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} /></label><label>Ends<input required type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} /></label></div>
          <fieldset><legend>Activity level</legend><div className="intensity-options">{['low', 'medium', 'high'].map((level) => <button type="button" className={intensity === level ? 'selected' : ''} onClick={() => setIntensity(level)} key={level}>{level}</button>)}</div></fieldset>
          {formError && <p className="schedule-error">{formError}</p>}
          <button className="primary" type="submit">{editingId ? 'Save changes' : 'Add to calendar'} <span>→</span></button>
        </form>}
        {!showForm && <>{selectedSchoolCanceled && <div className="school-canceled"><span>School canceled for this day.</span><button onClick={() => restoreSchoolDay(selectedKey)}>Restore</button></div>}{selectedEvents.length ? <div className="agenda-events">{selectedEvents.map((event) => <article className={`agenda-event ${event.type}`} key={event.id}><div className="event-time"><strong>{formatTime(event.startTime)}</strong><span>{formatTime(event.endTime)}</span></div><div className="event-details"><span>{event.type}{event.recurring ? ' · recurring school day' : ` · ${event.intensity} activity`}</span><h3>{event.title}</h3><p>{formatDuration(event.startTime, event.endTime)}</p></div><div className="event-actions">{event.recurring ? <><button onClick={openSchoolForm}>Edit schedule</button><button className="danger" onClick={() => cancelSchoolDay(selectedKey)} aria-label={`Cancel school on ${selectedKey}`}>Cancel this day</button></> : <><button onClick={() => editEvent(event)} aria-label={`Edit ${event.title}`}>Edit</button><button className="danger" onClick={() => deleteEvent(event.id)} aria-label={`Delete ${event.title}`}>Delete</button></>}</div></article>)}</div> : !selectedSchoolCanceled && <div className="agenda-empty"><span>＋</span><h3>Nothing scheduled.</h3><p>Add a workout, practice, or game—or import your school year.</p></div>}</>}
      </aside>
    </section>
  </Shell>;
}

function BarcodeScanner({ onAdd, onClose }) {
  const [barcode, setBarcode] = useState('');
  const [product, setProduct] = useState(null);
  const [servingGrams, setServingGrams] = useState(100);
  const [loading, setLoading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState('');
  const [error, setError] = useState('');
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectorRef = useRef(null);
  const scanTimerRef = useRef(null);
  const cameraRunningRef = useRef(false);
  const decodingRef = useRef(false);

  function stopCamera() {
    cameraRunningRef.current = false;
    window.clearTimeout(scanTimerRef.current);
    scanTimerRef.current = null;
    const stream = streamRef.current || videoRef.current?.srcObject;
    if (stream?.getTracks) stream.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
  }

  useEffect(() => () => {
    cameraRunningRef.current = false;
    window.clearTimeout(scanTimerRef.current);
    const stream = streamRef.current || videoRef.current?.srcObject;
    if (stream?.getTracks) stream.getTracks().forEach((track) => track.stop());
  }, []);

  function getDetector() {
    if (!detectorRef.current) {
      detectorRef.current = new WasmBarcodeDetector({
        formats: ['ean_8', 'ean_13', 'upc_a', 'upc_e', 'code_128'],
      });
    }
    return detectorRef.current;
  }

  async function scanCameraFrame() {
    if (!cameraRunningRef.current || decodingRef.current || !videoRef.current?.videoWidth) return;
    decodingRef.current = true;
    try {
      const results = await getDetector().detect(videoRef.current);
      const detectedBarcode = results.find((result) => /^\d{8,14}$/.test(result.rawValue))?.rawValue;
      if (detectedBarcode) {
        stopCamera();
        await lookupBarcode(detectedBarcode);
        return;
      }
    } catch {
      // A frame without a readable barcode is expected while the camera is moving.
    } finally {
      decodingRef.current = false;
    }
    if (cameraRunningRef.current) {
      scanTimerRef.current = window.setTimeout(scanCameraFrame, 220);
    }
  }

  async function lookupBarcode(value) {
    const cleanBarcode = String(value).replace(/\D/g, '');
    if (cleanBarcode.length < 8 || cleanBarcode.length > 14) {
      setError('Enter a valid 8–14 digit product barcode.');
      return;
    }

    setBarcode(cleanBarcode);
    setProduct(null);
    setError('');
    setLoading(true);
    try {
      const fields = 'code,product_name,brands,serving_size,serving_quantity,nutriments,image_front_small_url';
      const response = await fetch(`https://world.openfoodfacts.org/api/v3/product/${encodeURIComponent(cleanBarcode)}?fields=${fields}`);
      if (!response.ok) throw new Error('Product not found.');
      const data = await response.json();
      const item = data.product;
      const caloriesPer100g = Number(item?.nutriments?.['energy-kcal_100g']);
      if (!item || !Number.isFinite(caloriesPer100g)) throw new Error('This product does not have usable calorie information.');
      const suggestedServing = Number(item.serving_quantity);
      setServingGrams(Number.isFinite(suggestedServing) && suggestedServing > 0 ? suggestedServing : 100);
      setProduct({
        barcode: cleanBarcode,
        name: item.product_name || 'Scanned product',
        brand: item.brands || '',
        image: item.image_front_small_url || '',
        servingSize: item.serving_size || '',
        caloriesPer100g,
      });
    } catch (lookupError) {
      setError(lookupError.message || 'We could not look up that barcode.');
    } finally {
      setLoading(false);
    }
  }

  async function startCamera() {
    setError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera access is unavailable here. Enter the barcode manually instead.');
      return;
    }

    try {
      setCapturedImage('');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      cameraRunningRef.current = true;
      setCameraActive(true);
      scanTimerRef.current = window.setTimeout(scanCameraFrame, 100);
    } catch {
      stopCamera();
      setError('Camera access was not available. Allow camera permission or enter the barcode manually.');
    }
  }

  async function capturePhoto() {
    const video = videoRef.current;
    if (!cameraActive || !video?.videoWidth || !video?.videoHeight) {
      setError('Start the camera and wait for the preview before taking a photo.');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    setCapturedImage(canvas.toDataURL('image/jpeg', 0.92));
    stopCamera();
    setProduct(null);
    setError('');
    setLoading(true);
    try {
      const results = await getDetector().detect(canvas);
      const detectedBarcode = results.find((result) => /^\d{8,14}$/.test(result.rawValue))?.rawValue;
      if (!detectedBarcode) throw new Error('No retail barcode found.');
      await lookupBarcode(detectedBarcode);
    } catch {
      setError('No product barcode was found in the captured frame. Keep the full barcode sharp, level, and inside the guide.');
    } finally {
      setLoading(false);
    }
  }

  const calculatedCalories = product ? Math.max(Math.round(product.caloriesPer100g * Number(servingGrams || 0) / 100), 0) : 0;

  return <section className="card scanner-card"><div className="scanner-head"><div><div className="section-label">BARCODE MEAL ENTRY</div><h3>Scan a packaged food</h3></div><button className="scanner-close" onClick={() => { stopCamera(); onClose(); }} aria-label="Close barcode scanner">×</button></div><div className="scanner-grid"><div><div className={`camera-frame${cameraActive || capturedImage ? ' active' : ''}`}><video ref={videoRef} muted playsInline />{capturedImage && <img className="captured-frame" src={capturedImage} alt="Captured barcode frame" />}<div className="scan-guide"><span /><p>{cameraActive ? 'Keep the bars level and fill the frame' : capturedImage ? 'Photo captured' : 'Camera preview'}</p></div></div><div className="scanner-camera-actions"><button className="camera-button" onClick={cameraActive ? stopCamera : startCamera}>{cameraActive ? 'Stop camera' : 'Use camera'}</button><button className="capture-button" onClick={capturePhoto} disabled={!cameraActive || loading}>{loading ? 'Scanning…' : 'Take photo'}</button></div><p className="scanner-note">Start the camera, center the entire barcode inside the guide, then take a photo. You can also enter the printed number.</p></div><div className="scanner-lookup"><form onSubmit={(event) => { event.preventDefault(); lookupBarcode(barcode); }}><label>Barcode number<input inputMode="numeric" pattern="[0-9]*" value={barcode} onChange={(event) => setBarcode(event.target.value.replace(/\D/g, ''))} placeholder="Enter 8–14 digits" /></label><button className="primary small" type="submit" disabled={loading}>{loading ? 'Scanning…' : 'Look up product'}</button></form>{error && <div className="scanner-error">{error}</div>}{product && <div className="product-result">{product.image ? <img src={product.image} alt="" /> : <div className="product-placeholder">▣</div>}<div className="product-details"><span>{product.brand || 'Packaged food'}</span><h3>{product.name}</h3><p>{product.caloriesPer100g.toLocaleString()} kcal per 100g{product.servingSize ? ` · Label serving: ${product.servingSize}` : ''}</p><label>Serving amount<div className="serving-input"><input type="number" min="1" max="2000" value={servingGrams} onChange={(event) => setServingGrams(event.target.value)} /><span>grams</span></div></label><div className="product-calories"><span>Calories to add</span><strong>{calculatedCalories.toLocaleString()} kcal</strong></div><button className="primary" disabled={!calculatedCalories} onClick={() => onAdd({ name: product.brand ? `${product.name} — ${product.brand}` : product.name, calories: calculatedCalories, barcode: product.barcode, servingGrams: Number(servingGrams) })}>Add to today <span>→</span></button></div></div>}</div></div><p className="data-disclaimer">Product and nutrition data are provided by the Open Food Facts community and may be incomplete. Check the package label before logging.</p></section>;
}

function HydrationTracker({ water, waterGoal, setHydration, onSetWaterGoal }) {
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState(String(waterGoal));
  const progress = Math.min((water / waterGoal) * 100, 100);
  const remaining = Math.max(waterGoal - water, 0);

  function addWater(amount) {
    setHydration((hydration) => ({ ...hydration, water: Math.max((hydration.water || 0) + amount, 0) }));
  }

  function saveWaterGoal(event) {
    event.preventDefault();
    const nextGoal = Number(goalInput);
    if (nextGoal < 16 || nextGoal > 200) return;
    onSetWaterGoal(nextGoal);
    setEditingGoal(false);
  }

  return <section className="card hydration-card"><div className="hydration-copy"><div className="section-label">HYDRATION</div><div className="water-title"><div className="water-icon">◒</div><div><h2>{water.toLocaleString()} <small>of {waterGoal.toLocaleString()} oz</small></h2><p>{remaining === 0 ? 'Hydration goal reached.' : `${remaining.toLocaleString()} oz left today.`}</p></div></div><div className="water-progress"><span style={{ width: `${progress}%` }} /></div></div><div className="hydration-actions"><div className="water-quick-add">{[8, 12, 16, 24].map((amount) => <button key={amount} onClick={() => addWater(amount)}>+{amount} oz</button>)}</div><div className="water-secondary"><button onClick={() => addWater(-8)} disabled={water === 0}>−8 oz</button><button onClick={() => { setGoalInput(String(waterGoal)); setEditingGoal(!editingGoal); }}>{editingGoal ? 'Cancel' : 'Edit goal'}</button></div>{editingGoal && <form className="water-goal-form" onSubmit={saveWaterGoal}><input aria-label="Daily water goal in ounces" type="number" min="16" max="200" step="4" value={goalInput} onChange={(event) => setGoalInput(event.target.value)} /><button className="primary small" type="submit">Save goal</button></form>}</div></section>;
}

function WeeklyProgress({ dailyLogs, todayKey, fallbackGoal, fallbackWaterGoal, onBack }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const today = new Date(`${todayKey}T12:00:00`);
  const weekStart = addDays(today, -6 + weekOffset * 7);
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekStart, index);
    const key = getDateKey(date);
    const log = dailyLogs[key] || { goal: fallbackGoal, entries: [], water: 0, waterGoal: fallbackWaterGoal };
    const total = log.entries.reduce((sum, entry) => sum + entry.calories, 0);
    return { date, key, total, goal: log.goal || fallbackGoal, hasEntries: log.entries.length > 0, water: log.water || 0, waterGoal: log.waterGoal || fallbackWaterGoal };
  });
  const weeklyTotal = days.reduce((sum, day) => sum + day.total, 0);
  const weeklyWater = days.reduce((sum, day) => sum + day.water, 0);
  const average = Math.round(weeklyTotal / 7);
  const waterAverage = Math.round(weeklyWater / 7);
  const goalsReached = days.filter((day) => day.total >= day.goal).length;
  const waterGoalsReached = days.filter((day) => day.water >= day.waterGoal).length;
  const loggedDays = days.filter((day) => day.hasEntries).length;
  const range = `${new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(days[0].date)} – ${new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(days[6].date)}`;

  let streak = 0;
  let streakDate = new Date(today);
  if (!(dailyLogs[todayKey]?.entries?.length > 0)) streakDate = addDays(streakDate, -1);
  while (dailyLogs[getDateKey(streakDate)]?.entries?.length > 0) {
    streak += 1;
    streakDate = addDays(streakDate, -1);
  }

  return <Shell eyebrow="NOURALLY / WEEKLY PROGRESS">
    <section className="dashboard-head weekly-head"><div><p className="kicker">YOUR SEVEN-DAY VIEW</p><h1>Progress you<br /><em>can build on.</em></h1></div><button className="text-button" onClick={onBack}>← Back to today</button></section>
    <section className="week-toolbar"><button className="week-arrow" onClick={() => setWeekOffset((offset) => offset - 1)} aria-label="Previous seven days">←</button><div><strong>{weekOffset === 0 ? 'Last 7 days' : range}</strong><span>{range}</span></div><button className="week-arrow" disabled={weekOffset === 0} onClick={() => setWeekOffset((offset) => Math.min(offset + 1, 0))} aria-label="Next seven days">→</button></section>
    <section className="weekly-stats"><article className="card weekly-stat"><span>Calorie average</span><strong>{average.toLocaleString()}</strong><small>kcal</small></article><article className="card weekly-stat"><span>Calorie goals</span><strong>{goalsReached}<i>/7</i></strong><small>days</small></article><article className="card weekly-stat"><span>Water average</span><strong>{waterAverage}</strong><small>oz/day</small></article><article className="card weekly-stat"><span>Hydration goals</span><strong>{waterGoalsReached}<i>/7</i></strong><small>days</small></article><article className="card weekly-stat"><span>Logging streak</span><strong>{streak}</strong><small>{streak === 1 ? 'day' : 'days'}</small></article><article className="card weekly-stat"><span>Days logged</span><strong>{loggedDays}</strong><small>last 7 days</small></article></section>
    <section className="card weekly-chart-card"><div className="chart-heading"><div><div className="section-label">CALORIES BY DAY</div><h2>{weeklyTotal.toLocaleString()} <small>kcal over 7 days</small></h2></div><div className="chart-key"><span><i className="key-fill" /> Logged</span><span><i className="key-line" /> Goal</span></div></div><div className="weekly-chart">{days.map((day) => {
      const percentage = Math.min((day.total / day.goal) * 100, 100);
      return <div className={`chart-day${day.key === todayKey ? ' today' : ''}`} key={day.key}><div className="bar-value">{day.total ? day.total.toLocaleString() : '—'}</div><div className="bar-track"><span className={day.total >= day.goal ? 'met' : ''} style={{ height: `${percentage}%` }} /><i /></div><strong>{new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(day.date)}</strong><small>{day.date.getDate()}</small></div>;
    })}</div>{weeklyTotal === 0 && <p className="chart-empty">Log calories during the week to see your progress take shape here.</p>}</section>
    <section className="card weekly-water-card"><div className="chart-heading"><div><div className="section-label">HYDRATION BY DAY</div><h2>{weeklyWater.toLocaleString()} <small>oz over 7 days</small></h2></div></div><div className="water-week">{days.map((day) => {
      const waterProgress = Math.min((day.water / day.waterGoal) * 100, 100);
      return <div className={`water-day${day.key === todayKey ? ' today' : ''}`} key={day.key}><div className="water-day-label"><strong>{new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(day.date)}</strong><span>{day.water} / {day.waterGoal} oz</span></div><div><span className={day.water >= day.waterGoal ? 'met' : ''} style={{ width: `${waterProgress}%` }} /></div></div>;
    })}</div></section>
  </Shell>;
}

function History({ dailyLogs, todayKey, fallbackWaterGoal, onBack }) {
  const dates = Object.keys(dailyLogs).filter((date) => date !== todayKey).sort().reverse();
  return <Shell eyebrow="NOURALLY / HISTORY">
    <section className="dashboard-head history-head"><div><p className="kicker">YOUR DAILY RECORD</p><h1>Look back.<br /><em>Keep moving.</em></h1></div><button className="text-button" onClick={onBack}>← Back to today</button></section>
    {dates.length === 0 ? <section className="card history-empty"><div className="section-label">PREVIOUS DAYS</div><h2>Your history starts tomorrow.</h2><p className="muted">Today’s entries will stay saved on this device and appear here on the next calendar day.</p></section> : <section className="history-list">{dates.map((date) => {
      const log = dailyLogs[date];
      const total = log.entries.reduce((sum, entry) => sum + entry.calories, 0);
      const water = log.water || 0;
      const waterGoal = log.waterGoal || fallbackWaterGoal;
      const formattedDate = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date(`${date}T12:00:00`));
      return <article className="card history-day" key={date}><div className="history-day-head"><div><p className="kicker">{formattedDate.toUpperCase()}</p><h2>{total.toLocaleString()} <small>of {(log.goal || 2400).toLocaleString()} kcal</small></h2></div><span className={total >= (log.goal || 2400) ? 'goal-badge reached' : 'goal-badge'}>{total >= (log.goal || 2400) ? 'Goal reached' : `${Math.max((log.goal || 2400) - total, 0).toLocaleString()} remaining`}</span></div><div className="history-water"><div><span>Water</span><strong>{water.toLocaleString()} of {waterGoal.toLocaleString()} oz</strong></div><div><span className={water >= waterGoal ? 'met' : ''} style={{ width: `${Math.min((water / waterGoal) * 100, 100)}%` }} /></div></div><div className="history-entries">{log.entries.length ? log.entries.map((entry) => <div key={entry.id}><span>{entry.name}</span><strong>{entry.calories.toLocaleString()} kcal</strong></div>) : <p className="muted">No calories were logged.</p>}</div></article>;
    })}</section>}
  </Shell>;
}

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>);
