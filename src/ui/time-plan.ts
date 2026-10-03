import {
  MAX_TIME_DAYS,
  timeToDrop,
  type TimePoint,
  type TimeToDropInput,
  type TimeToDropResult,
} from "../math/time.js";

export interface TimePlanRequest {
  input: TimeToDropInput;
  days: number;
}

export interface TimePlan {
  possible: boolean;
  expectedDays: number | null;
  daysFor: TimeToDropResult["daysFor"];
  probabilityWithinBudget: number;
  points: TimePoint[];
}

export function validateTimeBudget(days: number): void {
  if (!Number.isInteger(days) || days < 0 || days > MAX_TIME_DAYS) {
    throw new RangeError(
      `Your day budget must be a whole number from 0 to ${MAX_TIME_DAYS.toLocaleString("en-US")}.`,
    );
  }
}

export function calculateTimePlan({ input, days }: TimePlanRequest): TimePlan {
  validateTimeBudget(days);
  const result = timeToDrop(input);
  return {
    possible: result.possible,
    expectedDays: result.expectedDays,
    daysFor: result.daysFor,
    probabilityWithinBudget: result.probabilityWithinDays(days),
    points: result.distribution(160),
  };
}
