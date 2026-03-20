import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { rfqApi, vendorApi } from "../services/api";
import Header from "../components/layout/Header";
import type { Vendor } from "../types";

interface CustomField { key: string; value: string }

export default function NewRFQPage() {
  const navigate = useNavigate();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendors, setSelectedVendors] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);

  // Form state
  const [form, setForm] = useState({
    title: "",
    description: "",
    productType: "",
    quantity: "",
    dimensions: "",
    material: "",
    color: "",
    companyName: "",
    contactName: "",
    email: "",
    phone: "",
  });

  useEffect(() => {
    vendorApi.list().then((r) => setVendors((r.data as Vendor[]) ?? []));
  }, []);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const toggleVendor = (id: string) =>
    setSelectedVendors((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const addCustomField = () =>
    setCustomFields((f) => [...f, { key: "", value: "" }]);

  const updateCustomField = (i: number, field: "key" | "value", val: string) =>
    setCustomFields((f) => f.map((cf, idx) => (idx === i ? { ...cf, [field]: val } : cf)));

  const removeCustomField = (i: number) =>
    setCustomFields((f) => f.filter((_, idx) => idx !== i));

  const handleSubmit = async (launchImmediately: boolean) => {
    if (!form.title || !form.productType || !form.quantity || !form.companyName || !form.email) {
      setError("Please fill in all required fields.");
      return;
    }
    if (selectedVendors.size === 0) {
      setError("Select at least one vendor.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const customFieldsObj = Object.fromEntries(
      customFields
        .filter((cf) => cf.key.trim())
        .map((cf) => [cf.key.trim(), cf.value.trim()])
    );

    try {
      const res = await rfqApi.create({
        title: form.title,
        description: form.description,
        specs: {
          productType: form.productType,
          quantity: Number(form.quantity),
          dimensions: form.dimensions || undefined,
          material: form.material || undefined,
          color: form.color || undefined,
          customFields: customFieldsObj,
        },
        contactInfo: {
          companyName: form.companyName,
          contactName: form.contactName,
          email: form.email,
          phone: form.phone || undefined,
        },
        vendorIds: [...selectedVendors],
      } as Parameters<typeof rfqApi.create>[0]);

      const rfq = res.data as { _id: string };

      if (launchImmediately && rfq._id) {
        await rfqApi.run(rfq._id);
        navigate(`/rfq/${rfq._id}`);
      } else {
        navigate(`/rfq/${rfq._id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create RFQ");
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="New RFQ" subtitle="Configure and dispatch vendor agents" />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-6 grid grid-cols-2 gap-6">
          {/* LEFT: Product Specs */}
          <div className="space-y-5">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
              Product Specifications
            </h2>

            <div>
              <label className="label">RFQ Title *</label>
              <input className="input" placeholder="e.g. 500 Custom Printed Boxes" value={form.title} onChange={set("title")} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Product Type *</label>
                <input className="input" placeholder="corrugated boxes" value={form.productType} onChange={set("productType")} />
              </div>
              <div>
                <label className="label">Quantity *</label>
                <input className="input" type="number" placeholder="500" value={form.quantity} onChange={set("quantity")} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Dimensions</label>
                <input className="input" placeholder="12x12x6 inches" value={form.dimensions} onChange={set("dimensions")} />
              </div>
              <div>
                <label className="label">Material</label>
                <input className="input" placeholder="corrugated cardboard" value={form.material} onChange={set("material")} />
              </div>
            </div>

            <div>
              <label className="label">Color / Print Specs</label>
              <input className="input" placeholder="2-color CMYK, matte finish" value={form.color} onChange={set("color")} />
            </div>

            <div>
              <label className="label">Description</label>
              <textarea
                className="input resize-none h-20"
                placeholder="Any additional details for the agents..."
                value={form.description}
                onChange={set("description")}
              />
            </div>

            {/* Custom fields */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label mb-0">Custom Fields</label>
                <button onClick={addCustomField} className="text-xs text-teal-400 hover:text-teal-300 font-mono">
                  + Add field
                </button>
              </div>
              <div className="space-y-2">
                {customFields.map((cf, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      className="input text-xs"
                      placeholder="Field name"
                      value={cf.key}
                      onChange={(e) => updateCustomField(i, "key", e.target.value)}
                    />
                    <input
                      className="input text-xs"
                      placeholder="Value"
                      value={cf.value}
                      onChange={(e) => updateCustomField(i, "value", e.target.value)}
                    />
                    <button
                      onClick={() => removeCustomField(i)}
                      className="text-slate-500 hover:text-red-400 px-2 text-sm"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT: Contact + Vendors */}
          <div className="space-y-5">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
              Contact Information
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Company Name *</label>
                <input className="input" placeholder="Acme Corp" value={form.companyName} onChange={set("companyName")} />
              </div>
              <div>
                <label className="label">Contact Name</label>
                <input className="input" placeholder="Jane Smith" value={form.contactName} onChange={set("contactName")} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Email *</label>
                <input className="input" type="email" placeholder="jane@acme.com" value={form.email} onChange={set("email")} />
              </div>
              <div>
                <label className="label">Phone</label>
                <input className="input" placeholder="+1 555 000 0000" value={form.phone} onChange={set("phone")} />
              </div>
            </div>

            {/* Vendor Selection */}
            <div>
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
                Select Vendors ({selectedVendors.size} selected)
              </h2>

              {vendors.length === 0 && (
                <p className="text-sm text-slate-500 font-mono">
                  No vendors available.{" "}
                  <a href="/vendors" className="text-teal-400 hover:underline">Add vendors →</a>
                </p>
              )}

              <div className="space-y-2">
                {vendors.map((v) => {
                  const selected = selectedVendors.has(v._id);
                  return (
                    <button
                      key={v._id}
                      type="button"
                      onClick={() => toggleVendor(v._id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md border text-left transition-all ${
                        selected
                          ? "bg-teal-400/10 border-teal-400/30 text-teal-400"
                          : "bg-slate-800/50 border-slate-700 text-slate-300 hover:border-slate-600"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${selected ? "bg-teal-400" : "bg-slate-600"}`} />
                        <div>
                          <div className="text-sm font-medium">{v.name}</div>
                          <div className="text-xs text-slate-500 font-mono">{v.category}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs font-mono text-slate-500">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                          v.browserProfile === "stealth"
                            ? "bg-amber-400/10 text-amber-400"
                            : "bg-slate-700 text-slate-400"
                        }`}>
                          {v.browserProfile}
                        </span>
                        <span>{v.reliability}%</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {error && (
              <div className="card p-3 border-red-900/50 bg-red-900/10">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3 pt-2">
              <button
                disabled={submitting}
                onClick={() => handleSubmit(true)}
                className="btn-primary flex-1"
              >
                {submitting ? "Launching…" : "Launch Agents →"}
              </button>
              <button
                disabled={submitting}
                onClick={() => handleSubmit(false)}
                className="btn-secondary px-4"
              >
                Save Draft
              </button>
            </div>

            <p className="text-xs text-slate-600 font-mono">
              Est. cost: ~${((selectedVendors.size * 12) * 0.013).toFixed(2)} for {selectedVendors.size} vendor{selectedVendors.size !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
