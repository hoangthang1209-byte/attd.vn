"use client";

import { usePersistentDisclosure } from "@/components/admin/blog-editor/usePersistentDisclosure";

export type WorkspaceTab<T extends string> = {
  id: T;
  label: string;
  hint?: string;
  badge?: string | number;
  tone?: "default" | "warning" | "danger" | "success";
};

type BlogWorkspaceTabsProps<T extends string> = {
  tabs: Array<WorkspaceTab<T>>;
  active: T;
  onChange: (id: T) => void;
  ariaLabel: string;
};

export default function BlogWorkspaceTabs<T extends string>({
  tabs,
  active,
  onChange,
  ariaLabel,
}: BlogWorkspaceTabsProps<T>) {
  return (
    <div className="blog-workspace-tabs" role="tablist" aria-label={ariaLabel}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          id={`blog-tab-${tab.id}`}
          aria-selected={active === tab.id}
          aria-controls={`blog-panel-${tab.id}`}
          className={`blog-workspace-tab ${active === tab.id ? "is-active" : ""}`}
          onClick={() => onChange(tab.id)}
        >
          <span className="blog-workspace-tab__label">{tab.label}</span>
          {tab.badge !== undefined && tab.badge !== "" && (
            <span className={`blog-workspace-tab__badge blog-workspace-tab__badge--${tab.tone ?? "default"}`}>
              {tab.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export function WorkspaceTabPanel({
  id,
  active,
  children,
}: {
  id: string;
  active: boolean;
  children: React.ReactNode;
}) {
  if (!active) return null;
  return (
    <section
      role="tabpanel"
      id={`blog-panel-${id}`}
      aria-labelledby={`blog-tab-${id}`}
      className="blog-workspace-panel"
    >
      {children}
    </section>
  );
}

/**
 * Section header used inside a tab panel to keep the hierarchy obvious.
 * Pass `storageKey` to make the section collapsible and remember its state.
 */
export function WorkspaceSection({
  title,
  description,
  actions,
  tone,
  storageKey,
  defaultOpen = true,
  summary,
  children,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  tone?: "default" | "ai";
  storageKey?: string;
  defaultOpen?: boolean;
  /** Short count shown next to the title while collapsed, e.g. "5". */
  summary?: string;
  children: React.ReactNode;
}) {
  const collapsible = Boolean(storageKey);
  const [open, toggle] = usePersistentDisclosure(storageKey ?? null, collapsible ? defaultOpen : true);
  const bodyId = `blog-section-${(storageKey ?? title).replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <section
      className={[
        "blog-workspace-section",
        tone === "ai" ? "blog-workspace-section--ai" : "",
        collapsible ? "blog-workspace-section--collapsible" : "",
        collapsible && !open ? "is-collapsed" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <header className="blog-workspace-section__header">
        <div className="blog-workspace-section__heading">
          {collapsible ? (
            <button
              type="button"
              className="blog-workspace-section__toggle"
              aria-expanded={open}
              aria-controls={bodyId}
              onClick={() => toggle()}
            >
              <span className="blog-workspace-section__caret" aria-hidden="true">
                {open ? "▾" : "▸"}
              </span>
              <span className="blog-workspace-section__title">{title}</span>
              {summary && <span className="blog-workspace-section__summary">{summary}</span>}
            </button>
          ) : (
            <h3 className="blog-workspace-section__title">{title}</h3>
          )}
          {description && (!collapsible || open) && (
            <p className="admin-field-hint">{description}</p>
          )}
        </div>
        {actions && (!collapsible || open) && (
          <div className="blog-workspace-section__actions">{actions}</div>
        )}
      </header>
      {(!collapsible || open) && (
        <div id={bodyId} className="blog-workspace-section__body">
          {children}
        </div>
      )}
    </section>
  );
}
