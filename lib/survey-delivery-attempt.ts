export const SURVEY_DELIVERY_PROVIDER = "brevo";

export function brevoFailureIsUncertain(status: number, code: string) {
  return code === "duplicate_parameter" || status >= 500 || [408, 425, 429].includes(status);
}

export function surveyDeliveryAttemptIdempotencyKey(attemptId: string) {
  return attemptId;
}

export function surveyDeliveryAttemptNeedsReview(
  attempt: { status: "QUEUED" | "UNCERTAIN" | "SENT" | "FAILED"; retryUntil: Date | null } | null | undefined,
  now = new Date(),
) {
  return Boolean(
    attempt &&
    (attempt.status === "QUEUED" || attempt.status === "UNCERTAIN") &&
    attempt.retryUntil &&
    attempt.retryUntil <= now,
  );
}
