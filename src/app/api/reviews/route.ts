import { NextResponse } from "next/server";
import { reviews } from "@/lib/data";
import { listPublicReviewsFromDb } from "@/lib/review-db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const databaseReviews = await listPublicReviewsFromDb();
    return NextResponse.json({ data: [...databaseReviews, ...reviews] });
  } catch {
    return NextResponse.json({ data: reviews });
  }
}
