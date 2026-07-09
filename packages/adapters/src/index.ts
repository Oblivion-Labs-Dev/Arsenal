export type AnalyticsEvent = {
  name: string;
  properties?: Record<string, string | number | boolean>;
};

type AnalyticsAdapter = {
  track: (event: AnalyticsEvent) => void;
  page: (path: string) => void;
};

const consoleAdapter: AnalyticsAdapter = {
  track: (event) => {
    if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
      console.debug("[analytics]", event.name, event.properties);
    }
  },
  page: (path) => {
    if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
      console.debug("[analytics] page", path);
    }
  },
};

let adapter: AnalyticsAdapter = consoleAdapter;

export function setAnalyticsAdapter(next: AnalyticsAdapter) {
  adapter = next;
}

export function trackEvent(name: string, properties?: AnalyticsEvent["properties"]) {
  adapter.track({ name, properties });
}

export function trackPage(path: string) {
  adapter.page(path);
}

export const ANALYTICS_EVENTS = {
  CTA_CLICK: "cta_click",
  THEME_CHANGE: "theme_change",
  TEMPLATE_SELECT: "template_select",
  MODULE_ADD: "module_add",
  SITE_GENERATE: "site_generate",
} as const;
