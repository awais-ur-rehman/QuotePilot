import { useState } from "react";
import type { RFQTemplate } from "../types";

const STORAGE_KEY = "qp_templates";

function loadFromStorage(): RFQTemplate[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function useTemplates() {
  const [templates, setTemplates] = useState<RFQTemplate[]>(loadFromStorage);

  const persist = (list: RFQTemplate[]) => {
    setTemplates(list);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  };

  const saveTemplate = (
    name: string,
    data: Pick<RFQTemplate, "specs" | "description">
  ): RFQTemplate => {
    const template: RFQTemplate = {
      id: Date.now().toString(),
      name: name.trim(),
      createdAt: new Date().toISOString(),
      ...data,
    };
    persist([...templates, template]);
    return template;
  };

  const removeTemplate = (id: string) => persist(templates.filter((t) => t.id !== id));

  return { templates, saveTemplate, removeTemplate };
}
