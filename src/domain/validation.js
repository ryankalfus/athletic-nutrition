import { plural } from "../format.js";

// How a form's error follows its values (UX-BUG-02). An error is "" or null
// (none), a string (about the whole form) or { message, field, quiet? }.
// `problem` is what the form's validator says about the current values: the
// first invalid field as { message, field }, or null. A `quiet` error is shown
// without moving focus (focus moves only when a submit finds the error).

/** @param {any} error */
export function normalizeError(error) {
  if (!error) return null;
  if (typeof error === "string") return { message: error, field: "" };
  return error.message ? error : null;
}

/**
 * After any change to the values: an error about the whole form clears; a
 * field's error clears on the first change that makes that field valid, and
 * otherwise stays (with the validator's current wording).
 * @param {any} current
 * @param {{message: string, field: string} | null} problem
 */
export function errorAfterChange(current, problem) {
  const now = normalizeError(current);
  if (!now?.field) return null;
  if (!problem || problem.field !== now.field) return null;
  return problem.message === now.message
    ? current
    : { ...problem, quiet: true };
}

/**
 * After a field loses focus, once the form has shown an error: show the
 * validator's current first problem, or clear a field error that is fixed.
 * An error about the whole form (a failed save) stays until a value changes.
 * @param {any} current
 * @param {{message: string, field: string} | null} problem
 */
export function errorAfterBlur(current, problem) {
  const now = normalizeError(current);
  if (!problem) return now?.field ? null : current;
  if (now?.field === problem.field && now.message === problem.message)
    return current;
  return { ...problem, quiet: true };
}

/**
 * The amount on the log portion sheet and Edit food (UX-BUG-06): above 0 and
 * at most 2000 g or ml, or 100 portions, pieces or packages.
 * @param {any} amount
 * @param {string} unit
 */
export function portionAmountProblem(amount, unit = "g") {
  const value = Number(amount);
  if (amount === "" || amount == null || !Number.isFinite(value) || value <= 0)
    return { message: "Enter an amount above 0.", field: "amount" };
  const max = ["g", "ml"].includes(unit) ? 2000 : 100;
  if (value > max)
    return {
      message: `Enter an amount up to ${max.toLocaleString("en-US")} ${plural(max, unit)}.`,
      field: "amount",
    };
  return null;
}

/**
 * The log portion sheet and Edit food, in field order (UX-BUG-06): name,
 * amount, the optional calorie number, then when it was eaten.
 * @param {{name: string, amount: any, unit: string, override: any,
 *   whenMissing?: boolean}} values
 */
export function portionFormProblem({
  name,
  amount,
  unit,
  override,
  whenMissing,
}) {
  if (!String(name || "").trim())
    return { message: "Enter the food name.", field: "name" };
  const amountProblem = portionAmountProblem(amount, unit);
  if (amountProblem) return amountProblem;
  const calories = Number(override);
  if (
    override !== "" &&
    override != null &&
    (!Number.isFinite(calories) || calories < 0 || calories > 20000)
  )
    return {
      message: "Calories must be blank or between 0 and 20,000.",
      field: "override",
    };
  if (whenMissing)
    return { message: "Choose about when you ate it.", field: "when" };
  return null;
}
