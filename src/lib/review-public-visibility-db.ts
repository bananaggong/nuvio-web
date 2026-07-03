import { eq, sql, type SQL } from "drizzle-orm";
import { reviews as reviewsTable } from "@/db/schema";

export function buildPublicReviewVisibilityConditions(): SQL[] {
  return [eq(reviewsTable.status, "published"), publicReviewSafetyPredicate()];
}

export function publicReviewSafetyPredicate(): SQL {
  return sql`public.review_is_publicly_visible(${reviewsTable.id})`;
}
