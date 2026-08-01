"use client";

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

/** Section header used inside a tab panel to keep the hierarchy obvious. */
export function WorkspaceSection({
  title,
  description,
  actions,
  tone,
  children,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  tone?: "default" | "ai";
  children: React.ReactNode;
}) {
  return (
    <section className={`blog-workspace-section ${tone === "ai" ? "blog-workspace-section--ai" : ""}`}>
      <header className="blog-workspace-section__header">
        <div>
          <h3 className="blog-workspace-section__title">{title}</h3>
          {description && <p className="admin-field-hint">{description}</p>}
        </div>
        {actions && <div className="blog-workspace-section__actions">{actions}</div>}
      </header>
      <div className="blog-workspace-section__body">{children}</div>
    </section>
  );
}
