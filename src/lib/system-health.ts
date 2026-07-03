import { and, count, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { adminAuditLogs, notificationEvents, userNotifications } from "@/db/schema";
import { getEmailDeliveryReadiness } from "@/lib/email-provider";

export type SystemHealthStatus = "fail" | "ok" | "warn";

export type SystemHealthCheck = {
  detail: string;
  id: string;
  label: string;
  status: SystemHealthStatus;
};

export type SystemHealthMetric = {
  label: string;
  value: number | string;
};

export type SystemHealthSnapshot = {
  checks: SystemHealthCheck[];
  generatedAt: string;
  metrics: SystemHealthMetric[];
  status: SystemHealthStatus;
};

export async function getSystemHealthSnapshot(): Promise<SystemHealthSnapshot> {
  const emailReadiness = getEmailDeliveryReadiness();
  const checks: SystemHealthCheck[] = [
    envCheck("database-url", "Database URL", hasEnv("DATABASE_URL", "DIRECT_DATABASE_URL")),
    envCheck(
      "supabase-public",
      "Supabase public config",
      hasEnv("NEXT_PUBLIC_SUPABASE_URL") &&
        hasEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    ),
    envCheck("supabase-service-role", "Supabase service role", hasEnv("SUPABASE_SERVICE_ROLE_KEY")),
    envCheck("cron-secret", "Cron secret", hasEnv("CRON_SECRET"), {
      missingStatus: process.env.NODE_ENV === "production" ? "fail" : "warn",
    }),
    envCheck(
      "social-token-key",
      "Social token encryption key",
      hasEnv("SOCIAL_TOKEN_ENCRYPTION_KEY"),
      {
        missingStatus: process.env.NODE_ENV === "production" ? "fail" : "warn",
      },
    ),
    {
      detail: emailReadiness.detail,
      id: "email-delivery",
      label: "Email delivery",
      status:
        emailReadiness.configured && emailReadiness.productionSafe
          ? "ok"
          : process.env.NODE_ENV === "production"
            ? "fail"
            : "warn",
    },
  ];

  const metrics: SystemHealthMetric[] = [];

  try {
    const [pendingNotifications] = await getDb()
      .select({ value: count() })
      .from(notificationEvents)
      .where(eq(notificationEvents.status, "pending"));
    const [pendingEmailNotifications] = await getDb()
      .select({ value: count() })
      .from(notificationEvents)
      .where(
        and(
          eq(notificationEvents.status, "pending"),
          eq(notificationEvents.channel, "email"),
        ),
      );
    const [processingNotifications] = await getDb()
      .select({ value: count() })
      .from(notificationEvents)
      .where(eq(notificationEvents.status, "processing"));
    const [failedNotifications] = await getDb()
      .select({ value: count() })
      .from(notificationEvents)
      .where(eq(notificationEvents.status, "failed"));
    const [userNotificationCount] = await getDb()
      .select({ value: count() })
      .from(userNotifications);
    const [auditLogCount] = await getDb().select({ value: count() }).from(adminAuditLogs);

    checks.push({
      detail: "Database query completed successfully.",
      id: "database-query",
      label: "Database query",
      status: "ok",
    });
    metrics.push(
      {
        label: "Pending notification events",
        value: pendingNotifications?.value ?? 0,
      },
      {
        label: "Pending email notification events",
        value: pendingEmailNotifications?.value ?? 0,
      },
      {
        label: "Processing notification events",
        value: processingNotifications?.value ?? 0,
      },
      {
        label: "Failed notification events",
        value: failedNotifications?.value ?? 0,
      },
      {
        label: "User notifications",
        value: userNotificationCount?.value ?? 0,
      },
      {
        label: "Audit logs",
        value: auditLogCount?.value ?? 0,
      },
    );
  } catch (error) {
    checks.push({
      detail:
        error instanceof Error
          ? error.message
          : "Database query failed unexpectedly.",
      id: "database-query",
      label: "Database query",
      status: "fail",
    });
  }

  return {
    checks,
    generatedAt: new Date().toISOString(),
    metrics,
    status: summarizeStatus(checks),
  };
}

function envCheck(
  id: string,
  label: string,
  configured: boolean,
  options: { missingStatus?: SystemHealthStatus } = {},
): SystemHealthCheck {
  const missingStatus = options.missingStatus ?? "fail";

  return {
    detail: configured ? "Configured." : "Missing environment variable.",
    id,
    label,
    status: configured ? "ok" : missingStatus,
  };
}

function hasEnv(...keys: string[]): boolean {
  return keys.some((key) => Boolean(process.env[key]?.trim()));
}

function summarizeStatus(checks: SystemHealthCheck[]): SystemHealthStatus {
  if (checks.some((check) => check.status === "fail")) return "fail";
  if (checks.some((check) => check.status === "warn")) return "warn";
  return "ok";
}
