import { NextResponse } from "next/server";
import { socialProviders } from "@/lib/auth-providers";

export function GET() {
  return NextResponse.json({
    data: socialProviders.map(({ key, label, provider, helper }) => ({
      key,
      label,
      provider,
      helper,
    })),
  });
}
