"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type {
  MlAsset,
  MlWorkflow,
  MlWorkflowStep,
} from "@/components/admin/manufacturing-library/ManufacturingLibraryAdminTypes";

type FormState = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  active: boolean;
  sortOrder: number;
  metadata: string;
  steps: MlWorkflowStep[];
};

const blankStep: MlWorkflowStep = {
  assetId: null,
  title: "",
  description: "",
  stepKey: "",
  sortOrder: 0,
  estimatedDuration: "",
};

const blank: FormState = {
  name: "",
  slug: "",
  description: "",
  active: true,
  sortOrder: 0,
  metadata: "",
  steps: [],
};

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function jsonText(value: unknown) {
  if (value === null || value === undefined) return "";
  return JSON.stringify(value, null, 2);
}

export default function ManufacturingWorkflowManager({
  workflows,
  assets,
}: {
  workflows: MlWorkflow[];
  assets: MlAsset[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(blank);
  const [message, setMessage] = useState<string | null>(null);

  function edit(workflow: MlWorkflow) {
    setForm({
      id: workflow.id,
      name: workflow.name,
      slug: workflow.slug,
      description: workflow.description ?? "",
      active: workflow.active,
      sortOrder: workflow.sortOrder,
      metadata: jsonText(workflow.metadata),
      steps: (workflow.steps ?? []).map((step) => ({ ...step })),
    });
  }

  function updateStep(index: number, patch: Partial<MlWorkflowStep>) {
    setForm((current) => ({
      ...current,
      steps: current.steps.map((step, i) => (i === index ? { ...step, ...patch } : step)),
    }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const res = await fetch(
      form.id
        ? `/api/admin/manufacturing-library/workflows/${form.id}`
        : "/api/admin/manufacturing-library/workflows",
      {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      },
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(data.message ?? "Lưu thất bại");
      return;
    }
    setForm(blank);
    setMessage("Đã lưu quy trình");
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("Xóa hoặc tắt quy trình này?")) return;
    await fetch(`/api/admin/manufacturing-library/workflows/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="admin-panel">
      {message ? <p className="admin-message admin-message--success">{message}</p> : null}
      <form className="admin-form admin-form--wide" onSubmit={submit}>
        <div className="admin-form-grid">
          <input
            className="admin-input"
            placeholder="Tên quy trình"
            value={form.name}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                name: event.target.value,
                slug: current.slug || slugify(event.target.value),
              }))
            }
            required
          />
          <input
            className="admin-input"
            placeholder="slug"
            value={form.slug}
            onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
            required
          />
          <input
            className="admin-input"
            type="number"
            value={form.sortOrder}
            onChange={(event) =>
              setForm((current) => ({ ...current, sortOrder: Number(event.target.value) }))
            }
          />
          <label className="admin-checkbox-row">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))}
            />
            Active
          </label>
          <textarea
            className="admin-input admin-form-grid-span-2"
            rows={2}
            placeholder="Mô tả"
            value={form.description}
            onChange={(event) =>
              setForm((current) => ({ ...current, description: event.target.value }))
            }
          />
          <textarea
            className="admin-input admin-form-grid-span-2"
            rows={3}
            placeholder='Metadata JSON: {"kind":"printing"}'
            value={form.metadata}
            onChange={(event) => setForm((current) => ({ ...current, metadata: event.target.value }))}
          />
        </div>

        <div className="admin-panel-header">
          <h3>Các bước</h3>
          <button
            type="button"
            onClick={() =>
              setForm((current) => ({
                ...current,
                steps: [
                  ...current.steps,
                  { ...blankStep, sortOrder: (current.steps.length + 1) * 10 },
                ],
              }))
            }
          >
            Thêm bước
          </button>
        </div>
        {form.steps.map((step, index) => (
          <div key={index} className="admin-form-grid">
            <input
              className="admin-input"
              placeholder="Tên bước"
              value={step.title}
              onChange={(event) => updateStep(index, { title: event.target.value })}
            />
            <input
              className="admin-input"
              placeholder="stepKey"
              value={step.stepKey ?? ""}
              onChange={(event) => updateStep(index, { stepKey: event.target.value })}
            />
            <input
              className="admin-input"
              placeholder="Thời lượng"
              value={step.estimatedDuration ?? ""}
              onChange={(event) => updateStep(index, { estimatedDuration: event.target.value })}
            />
            <input
              className="admin-input"
              type="number"
              value={step.sortOrder}
              onChange={(event) => updateStep(index, { sortOrder: Number(event.target.value) })}
            />
            <select
              className="admin-input"
              value={step.assetId ?? ""}
              onChange={(event) => updateStep(index, { assetId: event.target.value || null })}
            >
              <option value="">Không gắn asset</option>
              {assets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.title}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() =>
                setForm((current) => ({
                  ...current,
                  steps: current.steps.filter((_, i) => i !== index),
                }))
              }
            >
              Xóa
            </button>
            <textarea
              className="admin-input admin-form-grid-span-2"
              rows={2}
              placeholder="Mô tả bước"
              value={step.description ?? ""}
              onChange={(event) => updateStep(index, { description: event.target.value })}
            />
          </div>
        ))}

        <div className="admin-form-actions">
          <button type="submit" className="btn-primary">
            {form.id ? "Cập nhật" : "Tạo quy trình"}
          </button>
          {form.id ? <button type="button" onClick={() => setForm(blank)}>Hủy</button> : null}
        </div>
      </form>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Tên</th>
              <th>Slug</th>
              <th>Active</th>
              <th>Bước</th>
              <th>Asset</th>
              <th>Sort</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {workflows.map((workflow) => (
              <tr key={workflow.id}>
                <td>{workflow.name}</td>
                <td><code>{workflow.slug}</code></td>
                <td>{workflow.active ? "Có" : "Không"}</td>
                <td>{workflow.steps?.length ?? 0}</td>
                <td>{workflow._count?.assets ?? 0}</td>
                <td>{workflow.sortOrder}</td>
                <td>
                  <div className="admin-table-actions">
                    <button type="button" onClick={() => edit(workflow)}>Sửa</button>
                    <button type="button" onClick={() => remove(workflow.id)}>Xóa/Tắt</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
