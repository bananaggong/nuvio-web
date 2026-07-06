import { sql, type SQL } from "drizzle-orm";
import {
  reviewModerationChecks,
  reviews as reviewsTable,
} from "@/db/schema";

export function currentReviewModerationContentPredicate(): SQL {
  return sql`${reviewModerationChecks.metadata}->>'contentHash' = public.review_moderation_content_hash(
    ${reviewsTable.title},
    ${reviewsTable.excerpt},
    ${reviewsTable.body},
    ${reviewsTable.images}
  )`;
}
