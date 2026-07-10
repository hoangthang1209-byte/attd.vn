"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { SiteNavPlacement } from "@prisma/client";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";
import SiteNavSortableList from "@/components/admin/site-navigation/SiteNavSortableList";
import {
  SITE_NAV_CTA_SLOT_LABELS,
  SITE_NAV_PLACEMENT_LABELS,
} from "@/features/site-navigation/site-navigation-cms-defaults";
import type {
  SiteNavCtaConfig,
  SiteNavLinkConfig,
  SiteNavigationCmsConfig,
  SiteNavigationCmsPanel,
  SiteNavigationSettingsConfig,
  SiteSocialLinkConfig,
} from "@/features/site-navigation/site-navigation.types";

type Props = {
  initialCms: SiteNavigationCmsConfig | null;
  tableReady: boolean;
};

type TabId = SiteNavigationCmsPanel;

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "settings", label: "Cấu hình chung" },
  { id: "utility_bar", label: "Thanh tiện ích" },
  { id: "header_menu", label: "Menu header" },
  { id: "category_nav", label: "Danh mục ngang" },
  { id: "mobile_menu", label: "Menu mobile" },
  { id: "footer", label: "Footer" },
  { id: "social", label: "Mạng xã hội" },
  { id: "ctas", label: "CTA" },
];

function filterPlacement(items: SiteNavLinkConfig[], placement: SiteNavPlacement) {
  return items.filter((item) => item.placement === placement);
}

export default function SiteNavigationAdminManager({ initialCms, tableReady }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>("settings");
  const [cms, setCms] = useState<SiteNavigationCmsConfig | null>(initialCms);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [loading, setLoading] = useState(false);

  const footerItems = useMemo(() => {
    if (!cms) return [];
    return [
      ...filterPlacement(cms.items, "FOOTER_PRODUCTS"),
      ...filterPlacement(cms.items, "FOOTER_SERVICES"),
      ...filterPlacement(cms.items, "FOOTER_COMPANY"),
    ];
  }, [cms]);

  if (!tableReady || !cms) {
    return (
      <div className="admin-card" style={{ marginTop: 24 }}>
        <p className="admin-field-hint">
          Bảng Site Navigation chưa sẵn sàng. Chạy migration{" "}
          <code>prisma migrate deploy</code> trước khi sử dụng module này.
        </p>
      </div>
    );
  }

  function updateSettings(patch: Partial<SiteNavigationSettingsConfig>) {
    setCms((prev) => (prev ? { ...prev, settings: { ...prev.settings, ...patch } } : prev));
  }

  function updatePlacementItems(placement: SiteNavPlacement, items: SiteNavLinkConfig[]) {
    setCms((prev) => {
      if (!prev) return prev;
      const others = prev.items.filter((item) => item.placement !== placement);
      return { ...prev, items: [...others, ...items] };
    });
  }

  function updateFooterItems(items: SiteNavLinkConfig[]) {
    setCms((prev) => {
      if (!prev) return prev;
      const others = prev.items.filter(
        (item) =>
          item.placement !== "FOOTER_PRODUCTS" &&
          item.placement !== "FOOTER_SERVICES" &&
          item.placement !== "FOOTER_COMPANY",
      );
      return { ...prev, items: [...others, ...items] };
    });
  }

  function updateCtas(ctas: SiteNavCtaConfig[]) {
    setCms((prev) => (prev ? { ...prev, ctas } : prev));
  }

  function updateSocialLinks(socialLinks: SiteSocialLinkConfig[]) {
    setCms((prev) => (prev ? { ...prev, socialLinks } : prev));
  }

  async function savePanel(panel: TabId) {
    if (!cms) return;
    setLoading(true);
    setMessage(null);

    let body: Record<string, unknown> = { panel };

    if (panel === "settings") body = { panel, settings: cms.settings };
    if (panel === "utility_bar") {
      body = { panel, items: filterPlacement(cms.items, "UTILITY_BAR") };
    }
    if (panel === "header_menu") {
      body = { panel, items: filterPlacement(cms.items, "HEADER_MENU") };
    }
    if (panel === "category_nav") {
      body = { panel, items: filterPlacement(cms.items, "CATEGORY_NAV") };
    }
    if (panel === "mobile_menu") {
      body = { panel, items: filterPlacement(cms.items, "MOBILE_MENU") };
    }
    if (panel === "footer") body = { panel, items: footerItems, settings: cms.settings };
    if (panel === "social") body = { panel, socialLinks: cms.socialLinks };
    if (panel === "ctas") body = { panel, ctas: cms.ctas };

    const res = await fetch("/api/admin/site-navigation", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMessage({ type: "error", text: data.message ?? "Lưu thất bại." });
      return;
    }

    const data = await res.json();
    setCms((prev) => {
      if (!prev) return prev;
      if (panel === "settings" && data.settings) return { ...prev, settings: data.settings };
      if (panel === "footer" && data.items) {
        const others = prev.items.filter(
          (item) =>
            item.placement !== "FOOTER_PRODUCTS" &&
            item.placement !== "FOOTER_SERVICES" &&
            item.placement !== "FOOTER_COMPANY",
        );
        return {
          ...prev,
          items: [...others, ...data.items],
          ...(data.settings ? { settings: data.settings } : {}),
        };
      }
      if (data.items && panel !== "footer") {
        const placementByPanel: Partial<Record<TabId, SiteNavPlacement>> = {
          utility_bar: "UTILITY_BAR",
          header_menu: "HEADER_MENU",
          category_nav: "CATEGORY_NAV",
          mobile_menu: "MOBILE_MENU",
        };
        const placement = placementByPanel[panel];
        if (!placement) return prev;
        const others = prev.items.filter((item) => item.placement !== placement);
        return { ...prev, items: [...others, ...data.items] };
      }
      if (panel === "social" && data.socialLinks) return { ...prev, socialLinks: data.socialLinks };
      if (panel === "ctas" && data.ctas) return { ...prev, ctas: data.ctas };
      return prev;
    });

    setMessage({ type: "success", text: "Đã lưu thay đổi." });
    router.refresh();
  }

  return (
    <div className="site-nav-admin" style={{ marginTop: 24 }}>
      <div className="site-nav-admin__tabs" role="tablist" aria-label="Khu vực điều hướng">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`site-nav-admin__tab${activeTab === tab.id ? " site-nav-admin__tab--active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {message ? (
        <p className={`admin-message admin-message--${message.type}`} style={{ marginTop: 16 }}>
          {message.text}
        </p>
      ) : null}

      {activeTab === "settings" ? (
        <fieldset className="admin-catalog-fieldset" style={{ marginTop: 20 }}>
          <legend>Cấu hình chung</legend>
          <p className="admin-field-hint">
            Mega menu danh mục vẫn lấy từ CMS Danh mục. Chỉ nhãn trigger và placeholder tìm kiếm được cấu hình tại đây.
          </p>
          <div className="admin-form-group">
            <label>Tagline thanh tiện ích</label>
            <input
              className="admin-input"
              value={cms.settings.utilityTagline}
              onChange={(e) => updateSettings({ utilityTagline: e.target.value })}
            />
          </div>
          <div className="admin-form-group">
            <label>Nhãn mega menu</label>
            <input
              className="admin-input"
              value={cms.settings.megaMenuTriggerLabel}
              onChange={(e) => updateSettings({ megaMenuTriggerLabel: e.target.value })}
            />
          </div>
          <div className="admin-form-group">
            <label>Placeholder tìm kiếm</label>
            <input
              className="admin-input"
              value={cms.settings.searchPlaceholder}
              onChange={(e) => updateSettings({ searchPlaceholder: e.target.value })}
            />
          </div>
          <label className="admin-checkbox">
            <input
              type="checkbox"
              checked={cms.settings.useCategoryTreeMegaMenu}
              onChange={(e) => updateSettings({ useCategoryTreeMegaMenu: e.target.checked })}
            />
            Dùng cây danh mục CMS cho mega menu
          </label>
          <div style={{ marginTop: 16 }}>
            <AdminLoadingButton type="button" pending={loading} onClick={() => savePanel("settings")}>
              Lưu cấu hình chung
            </AdminLoadingButton>
          </div>
        </fieldset>
      ) : null}

      {activeTab === "utility_bar" ? (
        <SectionShell
          title={SITE_NAV_PLACEMENT_LABELS.UTILITY_BAR}
          hint="Liên kết nhỏ trên thanh tiện ích desktop."
          loading={loading}
          onSave={() => savePanel("utility_bar")}
        >
          <SiteNavSortableList
            items={filterPlacement(cms.items, "UTILITY_BAR")}
            onChange={(items) => updatePlacementItems("UTILITY_BAR", items)}
          />
        </SectionShell>
      ) : null}

      {activeTab === "header_menu" ? (
        <SectionShell
          title={SITE_NAV_PLACEMENT_LABELS.HEADER_MENU}
          hint="Menu chính desktop. Hỗ trợ menu lồng nhau qua mục cha."
          loading={loading}
          onSave={() => savePanel("header_menu")}
        >
          <SiteNavSortableList
            items={filterPlacement(cms.items, "HEADER_MENU")}
            onChange={(items) => updatePlacementItems("HEADER_MENU", items)}
            allowNested
          />
        </SectionShell>
      ) : null}

      {activeTab === "category_nav" ? (
        <SectionShell
          title={SITE_NAV_PLACEMENT_LABELS.CATEGORY_NAV}
          hint="Hàng danh mục ngang dưới header. Không ảnh hưởng cây mega menu CMS."
          loading={loading}
          onSave={() => savePanel("category_nav")}
        >
          <SiteNavSortableList
            items={filterPlacement(cms.items, "CATEGORY_NAV")}
            onChange={(items) => updatePlacementItems("CATEGORY_NAV", items)}
          />
        </SectionShell>
      ) : null}

      {activeTab === "mobile_menu" ? (
        <SectionShell
          title={SITE_NAV_PLACEMENT_LABELS.MOBILE_MENU}
          hint="Menu điều hướng trong panel mobile."
          loading={loading}
          onSave={() => savePanel("mobile_menu")}
        >
          <SiteNavSortableList
            items={filterPlacement(cms.items, "MOBILE_MENU")}
            onChange={(items) => updatePlacementItems("MOBILE_MENU", items)}
            allowNested
          />
        </SectionShell>
      ) : null}

      {activeTab === "footer" ? (
        <>
          <SectionShell
            title="Footer"
            hint="Ba cột điều hướng footer. Kéo thả để sắp xếp trong từng nhóm."
            loading={loading}
            onSave={() => savePanel("footer")}
          >
            {(["FOOTER_PRODUCTS", "FOOTER_SERVICES", "FOOTER_COMPANY"] as const).map((placement) => (
              <div key={placement} style={{ marginBottom: 24 }}>
                <h3 className="admin-subtitle">{SITE_NAV_PLACEMENT_LABELS[placement]}</h3>
                <SiteNavSortableList
                  items={filterPlacement(cms.items, placement)}
                  onChange={(items) => {
                    const others = footerItems.filter((item) => item.placement !== placement);
                    updateFooterItems([...others, ...items]);
                  }}
                />
              </div>
            ))}
          </SectionShell>

          <fieldset className="admin-catalog-fieldset" style={{ marginTop: 20 }}>
            <legend>Thanh cuối footer</legend>
            <p className="admin-field-hint">
              Mã số thuế lấy từ Cài đặt công ty. Tại đây chỉ bật/tắt hiển thị MST trên thanh cuối.
            </p>
            <div className="admin-form-group">
              <label htmlFor="footer-copyright">Nội dung bản quyền</label>
              <input
                id="footer-copyright"
                className="admin-input"
                value={cms.settings.copyrightText}
                onChange={(e) => updateSettings({ copyrightText: e.target.value })}
                placeholder="ATTD.vn"
                maxLength={120}
              />
              <p className="admin-field-hint">
                Nhập tên thương hiệu hoặc dòng bản quyền. Khi bật năm hiện tại, hệ thống tự thêm © và năm.
              </p>
            </div>
            <label className="admin-checkbox">
              <input
                type="checkbox"
                checked={cms.settings.showCurrentYear}
                onChange={(e) => updateSettings({ showCurrentYear: e.target.checked })}
              />
              Tự động dùng năm hiện tại
            </label>
            <label className="admin-checkbox" style={{ display: "block", marginTop: 8 }}>
              <input
                type="checkbox"
                checked={cms.settings.showTaxCode}
                onChange={(e) => updateSettings({ showTaxCode: e.target.checked })}
              />
              Hiển thị mã số thuế
            </label>
            <div className="admin-form-group" style={{ marginTop: 16 }}>
              <label htmlFor="footer-origin">Dòng xuất xứ / thương hiệu</label>
              <input
                id="footer-origin"
                className="admin-input"
                value={cms.settings.originText}
                onChange={(e) => updateSettings({ originText: e.target.value })}
                placeholder="Designed & Manufactured in Vietnam"
                maxLength={160}
              />
            </div>
            <label className="admin-checkbox">
              <input
                type="checkbox"
                checked={cms.settings.showLegalLink}
                onChange={(e) => updateSettings({ showLegalLink: e.target.checked })}
              />
              Bật liên kết pháp lý
            </label>
            {cms.settings.showLegalLink ? (
              <div className="admin-form-row" style={{ marginTop: 12 }}>
                <div className="admin-form-group">
                  <label htmlFor="footer-legal-label">Nhãn liên kết pháp lý</label>
                  <input
                    id="footer-legal-label"
                    className="admin-input"
                    value={cms.settings.legalLinkLabel}
                    onChange={(e) => updateSettings({ legalLinkLabel: e.target.value })}
                    placeholder="Chính sách đại lý"
                    maxLength={120}
                  />
                </div>
                <div className="admin-form-group">
                  <label htmlFor="footer-legal-href">Đường dẫn liên kết pháp lý</label>
                  <input
                    id="footer-legal-href"
                    className="admin-input"
                    value={cms.settings.legalLinkHref}
                    onChange={(e) => updateSettings({ legalLinkHref: e.target.value })}
                    placeholder="/chinh-sach-dai-ly"
                  />
                </div>
              </div>
            ) : null}
            <div style={{ marginTop: 16 }}>
              <AdminLoadingButton type="button" pending={loading} onClick={() => savePanel("footer")}>
                Lưu footer
              </AdminLoadingButton>
            </div>
          </fieldset>
        </>
      ) : null}

      {activeTab === "social" ? (
        <SectionShell
          title="Mạng xã hội"
          hint="Nếu tất cả đều tắt, footer sẽ fallback sang Branding Settings."
          loading={loading}
          onSave={() => savePanel("social")}
        >
          {cms.socialLinks.map((link, index) => (
            <div key={link.id} className="admin-card" style={{ marginBottom: 12, padding: 12 }}>
              <p className="admin-subtitle">{link.platform}</p>
              <div className="admin-form-group">
                <label>Nhãn</label>
                <input
                  className="admin-input"
                  value={link.label}
                  onChange={(e) => {
                    const next = [...cms.socialLinks];
                    next[index] = { ...link, label: e.target.value };
                    updateSocialLinks(next);
                  }}
                />
              </div>
              <div className="admin-form-group">
                <label>URL</label>
                <input
                  className="admin-input"
                  value={link.href}
                  onChange={(e) => {
                    const next = [...cms.socialLinks];
                    next[index] = { ...link, href: e.target.value };
                    updateSocialLinks(next);
                  }}
                />
              </div>
              <label className="admin-checkbox">
                <input
                  type="checkbox"
                  checked={link.isActive}
                  onChange={(e) => {
                    const next = [...cms.socialLinks];
                    next[index] = { ...link, isActive: e.target.checked };
                    updateSocialLinks(next);
                  }}
                />
                Hiển thị
              </label>
            </div>
          ))}
        </SectionShell>
      ) : null}

      {activeTab === "ctas" ? (
        <SectionShell
          title="CTA công khai"
          hint="Nút kêu gọi hành động trên header, menu mobile, footer và thanh hành động mobile."
          loading={loading}
          onSave={() => savePanel("ctas")}
        >
          {cms.ctas.map((cta, index) => (
            <div key={cta.id} className="admin-card" style={{ marginBottom: 12, padding: 12 }}>
              <p className="admin-subtitle">{SITE_NAV_CTA_SLOT_LABELS[cta.slot]}</p>
              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label>Nhãn</label>
                  <input
                    className="admin-input"
                    value={cta.label}
                    onChange={(e) => {
                      const next = [...cms.ctas];
                      next[index] = { ...cta, label: e.target.value };
                      updateCtas(next);
                    }}
                  />
                </div>
                <div className="admin-form-group">
                  <label>URL</label>
                  <input
                    className="admin-input"
                    value={cta.href}
                    onChange={(e) => {
                      const next = [...cms.ctas];
                      next[index] = { ...cta, href: e.target.value };
                      updateCtas(next);
                    }}
                  />
                </div>
              </div>
              <div className="site-nav-admin-item__toggles">
                <label className="admin-checkbox">
                  <input
                    type="checkbox"
                    checked={cta.isActive}
                    onChange={(e) => {
                      const next = [...cms.ctas];
                      next[index] = { ...cta, isActive: e.target.checked };
                      updateCtas(next);
                    }}
                  />
                  Hiển thị
                </label>
                <label className="admin-checkbox">
                  <input
                    type="checkbox"
                    checked={cta.showDesktop}
                    onChange={(e) => {
                      const next = [...cms.ctas];
                      next[index] = { ...cta, showDesktop: e.target.checked };
                      updateCtas(next);
                    }}
                  />
                  Desktop
                </label>
                <label className="admin-checkbox">
                  <input
                    type="checkbox"
                    checked={cta.showMobile}
                    onChange={(e) => {
                      const next = [...cms.ctas];
                      next[index] = { ...cta, showMobile: e.target.checked };
                      updateCtas(next);
                    }}
                  />
                  Mobile
                </label>
              </div>
            </div>
          ))}
        </SectionShell>
      ) : null}
    </div>
  );
}

function SectionShell({
  title,
  hint,
  loading,
  onSave,
  children,
}: {
  title: string;
  hint: string;
  loading: boolean;
  onSave: () => void;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="admin-catalog-fieldset" style={{ marginTop: 20 }}>
      <legend>{title}</legend>
      <p className="admin-field-hint">{hint}</p>
      {children}
      <div style={{ marginTop: 16 }}>
        <AdminLoadingButton type="button" pending={loading} onClick={onSave}>
          Lưu {title.toLowerCase()}
        </AdminLoadingButton>
      </div>
    </fieldset>
  );
}
