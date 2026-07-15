"use client";

import { useEffect, useState } from "react";
import type { MessageTemplate } from "@/lib/host-operations";

export function useHostMessageTemplates() {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [templateError, setTemplateError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadTemplates() {
      setIsLoadingTemplates(true);
      setTemplateError("");

      try {
        const response = await fetch("/api/host/message-templates", {
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => ({}))) as {
          data?: MessageTemplate[];
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error ?? "메세지 템플릿을 불러오지 못했습니다.");
        }

        if (isMounted) {
          setTemplates(
            Array.isArray(payload.data) ? payload.data.map(normalizeTemplate) : [],
          );
        }
      } catch (error) {
        if (isMounted) {
          setTemplateError(
            error instanceof Error
              ? error.message
              : "메세지 템플릿을 불러오지 못했습니다.",
          );
          setTemplates([]);
        }
      } finally {
        if (isMounted) setIsLoadingTemplates(false);
      }
    }

    void loadTemplates();

    return () => {
      isMounted = false;
    };
  }, []);

  return {
    isLoadingTemplates,
    templateError,
    templates,
  };
}

function normalizeTemplate(value: MessageTemplate): MessageTemplate {
  return {
    body: typeof value.body === "string" ? value.body : "",
    id: typeof value.id === "string" ? value.id : "",
    name: typeof value.name === "string" ? value.name : "메세지 템플릿",
    trigger: typeof value.trigger === "string" ? value.trigger : "",
  };
}
