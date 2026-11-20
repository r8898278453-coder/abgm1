import { isGlobalEmergencyStopActive } from './executionStop';
import { googleBusinessBinding } from './googleBusinessAccess';
import type { DbIntegration, DbReview } from './db';

export interface AutonomousReviewOutcome {
  replyStatus: 'LOCAL_ONLY' | 'GOOGLE_PUBLISHED' | 'GOOGLE_VERIFIED';
  publication: 'LOCAL_ONLY' | 'API_ACCEPTED' | 'VERIFIED' | 'UNKNOWN' | 'REJECTED';
  verified: boolean;
}
const localOnly = ():AutonomousReviewOutcome => ({
  replyStatus: 'LOCAL_ONLY',
  publication: 'LOCAL_ONLY',
  verified: false,
});

export function reviewNeedsHumanReview(review: Pick<DbReview, 'rating' | 'is_operational_issue' | 'sentiment'>) {
  return !Number.isInteger(review.rating) || review.rating! < 4 || review.rating! > 5 ||
    Boolean(review.is_operational_issue) || review.sentiment === 'negative';
}

type ReviewIntegration = Pick<DbIntegration, 'company_id' | 'provider' | 'status' | 'credentials'>;

/** Read the exact review before writing, and verify publication with an exact resource read-back. */
export async function dispatchAutonomousReviewReply(
  company: string,
  review: DbReview | null,
  reply: unknown,
  integration: ReviewIntegration | null,
  transport: typeof fetch = fetch,
  canWrite: () => Promise<boolean> = async () => true,
): Promise<AutonomousReviewOutcome> {
  if (!review || review.company_id !== company) throw new Error('Review workspace mismatch');
  if (typeof reply !== 'string' || !reply.trim() || reply.length > 4096) throw new Error('Invalid review reply');
  if (!integration || integration.company_id !== company || integration.provider !== 'google_gmb_oauth' ||
      !['connected', 'verified'].includes(integration.status) || reviewNeedsHumanReview(review)) return localOnly();

  const binding = googleBusinessBinding(integration.credentials || {});
  const reviewId = review.external_review_id;
  if (!binding || (review.source !== 'google_verified' && review.provenance_status !== 'GOOGLE_VERIFIED') ||
      typeof reviewId !== 'string' || !/^[A-Za-z0-9_-]{1,255}$/.test(reviewId)) return localOnly();
  if (isGlobalEmergencyStopActive()) throw new Error('Global execution stop is active');

  const name = `accounts/${binding.account}/locations/${binding.location}/reviews/${reviewId}`;
  const url = 'https://mybusiness.googleapis.com/v4/' + name;
  const headers = { Authorization: 'Bearer ' + binding.token, 'Content-Type': 'application/json' };
  async function observe() {
    try {
      const response = await transport(url, { headers, redirect: 'error', signal: AbortSignal.timeout(6000) });
      if (!response.ok) return null;
      const result = await response.json();
      return result?.name === name ? result : null;
    } catch {
      return null;
    }
  }

  const prior = await observe();
  if (!prior) return { ...localOnly(), publication: 'REJECTED' };
  const verified: AutonomousReviewOutcome = { replyStatus: 'GOOGLE_VERIFIED', publication: 'VERIFIED', verified: true };
  if (prior.reviewReply?.comment === reply) return verified;
  if (!await canWrite() || !googleBusinessBinding(integration.credentials || {}) || isGlobalEmergencyStopActive()) {
    return localOnly();
  }

  let accepted: Response;
  try {
    accepted = await transport(url + '/reply', {
      headers, redirect: 'error', signal: AbortSignal.timeout(6000),
      method: 'PUT', body: JSON.stringify({ comment: reply }),
    });
  } catch {
    return { ...localOnly(), publication: 'UNKNOWN' };
  }
  if (!accepted.ok) {
    return { ...localOnly(), publication: accepted.status === 408 || accepted.status >= 500 ? 'UNKNOWN' : 'REJECTED' };
  }
  return (await observe())?.reviewReply?.comment === reply
    ? verified : { replyStatus: 'GOOGLE_PUBLISHED', publication: 'API_ACCEPTED', verified: false };
}
