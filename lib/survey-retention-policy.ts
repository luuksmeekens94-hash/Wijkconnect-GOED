export function isSurveyContactRetentionExpired(
  contactRetentionUntil: Date | null,
  emailEncrypted: string | null,
  now = new Date(),
) {
  return Boolean(emailEncrypted && contactRetentionUntil && contactRetentionUntil <= now);
}
