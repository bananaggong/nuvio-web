import { eq, sql, type SQL } from "drizzle-orm";
import { reviews as reviewsTable } from "@/db/schema";

export function buildPublicReviewVisibilityConditions(): SQL[] {
  return [eq(reviewsTable.status, "published"), publicReviewSafetyPredicate()];
}

export function publicReviewSafetyPredicate(): SQL {
  return sql`
    not exists (
      select 1
      from public.review_moderation_checks moderation
      where moderation.review_id = ${reviewsTable.id}
        and moderation.risk_level = 'high'
    )
    and not exists (
      select 1
      from public.review_reports report
      where report.review_id = ${reviewsTable.id}
        and report.status in ('open', 'reviewing')
        and report.reason in ('privacy', 'inappropriate', 'spam')
    )
  `;
}