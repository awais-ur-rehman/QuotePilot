import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { rfqApi, vendorApi } from "../services/api";
import Header from "../components/layout/Header";
import VendorPicker from "../components/vendors/VendorPicker";
import { useProfile } from "../hooks/useProfile";
import { useTemplates } from "../hooks/useTemplates";
import type { Vendor } from "../types";

function ProfileBadge({ profile }: { profile: { companyName: string; contactName: string; email: string } | null }) {
  if (!profile) {
    return (
      <div className="flex items-center gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-[6px]">
        <span className="text-xs text-amber-700 flex-1">No profile set — quotes won't include your contact info.</span>
        <Link to="/settings" className="text-xs font-semibold text-teal-600 hover:text-teal-700 shrink-0">
          Set up →
        </Link>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-[6px]">
      <div className="w-6 h-6 rounded-full bg-teal-600 flex items-center justify-center shrink-0">
        <span className="text-white text-[10px] font-bold leading-none">
          {(profile.contactName || profile.email)[0].toUpperCase()}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-xs text-slate-700 font-medium">{profile.contactName || profile.email}</span>
        <span className="text-xs text-slate-400 mx-1">·</span>
        <span className="text-xs text-slate-500">{profile.companyName}</span>
      </div>
      <Link to="/settings" className="text-xs text-slate-400 hover:text-teal-600 shrink-0 transition-colors">
        Edit
      </Link>
    </div>
  );
}

interface CustomField { key: string; value: string }

export default function NewRFQPage() {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const { templates } = useTemplates();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendors, setSelectedVendors] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);

  const [form, setForm] = useState({
    title: "",
    description: "",
    productType: "",
    quantity: "",
    dimensions: "",
    material: "",
    color: "",
    destinationZip: "",
    estimatedWeight: "",
    packageType: "" as "" | "box" | "pallet" | "envelope",
  });

  useEffect(() => {
    vendorApi.list().then((r) => setVendors((r.data as Vendor[]) ?? []));
  }, []);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const addCustomField = () => setCustomFields((f) => [...f, { key: "", value: "" }]);
  const updateCustomField = (i: number, field: "key" | "value", val: string) =>
    setCustomFields((f) => f.map((cf, idx) => (idx === i ? { ...cf, [field]: val } : cf)));
  const removeCustomField = (i: number) =>
    setCustomFields((f) => f.filter((_, idx) => idx !== i));

  const handleSubmit = async (launchImmediately: boolean) => {
    if (!form.title || !form.productType || !form.quantity) {
      setError("Please fill in all required fields.");
      return;
    }
    if (!profile?.email && !profile?.companyName) {
      setError("Please set up your profile before creating an RFQ.");
      return;
    }
    if (selectedVendors.size === 0) {
      setError("Select at least one vendor.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const customFieldsObj = Object.fromEntries(
      customFields.filter((cf) => cf.key.trim()).map((cf) => [cf.key.trim(), cf.value.trim()])
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
          companyName: profile?.companyName ?? "",
          contactName: profile?.contactName ?? "",
          email: profile?.email ?? "",
          phone: profile?.phone || undefined,
        },
        vendorIds: [...selectedVendors],
        ...(form.destinationZip ? {
          shippingDetails: {
            destinationZip: form.destinationZip,
            estimatedWeight: form.estimatedWeight || undefined,
            packageType: form.packageType || undefined,
          },
        } : {}),
      } as Parameters<typeof rfqApi.create>[0]);

      const rfq = res.data as { _id: string };
      if (launchImmediately && rfq._id) {
        await rfqApi.run(rfq._id);
        toast.success("Agents launched!");
      } else {
        toast.success("RFQ saved as draft");
      }
      navigate(`/rfq/${rfq._id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create RFQ";
      setError(msg);
      toast.error(msg);
      setSubmitting(false);
    }
  };

  const loadTemplate = (templateId: string) => {
    const t = templates.find((t) => t.id === templateId);
    if (!t) return;
    setForm((f) => ({
      ...f,
      productType: t.specs.productType,
      quantity: String(t.specs.quantity),
      dimensions: t.specs.dimensions ?? "",
      material: t.specs.material ?? "",
      color: t.specs.color ?? "",
      description: t.description ?? "",
    }));
    if (t.specs.customFields) {
      setCustomFields(Object.entries(t.specs.customFields).map(([key, value]) => ({ key, value })));
    }
    toast.success(`Template "${t.name}" loaded`);
  };

  const estCost = ((selectedVendors.size * 12) * 0.013).toFixed(2);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title="New Request"
        subtitle="Configure and launch vendor agents"
        actions={
          <Link to="/rfqs" className="text-xs text-slate-400 hover:text-slate-600 font-medium transition-colors">
            ← Requests
          </Link>
        }
      />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-6">
          <div className="grid grid-cols-2 gap-6">

            {/* LEFT: Product Specs */}
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Product Specifications
                </h2>
                {templates.length > 0 && (
                  <select
                    className="text-xs border border-slate-200 rounded-[6px] px-2 py-1 text-slate-600 bg-white hover:border-slate-300 transition-colors"
                    defaultValue=""
                    onChange={(e) => { if (e.target.value) loadTemplate(e.target.value); e.target.value = ""; }}
                  >
                    <option value="" disabled>Load template…</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="label">RFQ title *</label>
                <input className="input" placeholder="e.g. 500 Custom Printed Boxes" value={form.title} onChange={set("title")} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Product type *</label>
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
                  <input className="input" placeholder="12×12×6 in" value={form.dimensions} onChange={set("dimensions")} />
                </div>
                <div>
                  <label className="label">Material</label>
                  <input className="input" placeholder="corrugated cardboard" value={form.material} onChange={set("material")} />
                </div>
              </div>

              <div>
                <label className="label">Color / print specs</label>
                <input className="input" placeholder="2-color CMYK, matte finish" value={form.color} onChange={set("color")} />
              </div>

              <div>
                <label className="label">Additional notes</label>
                <textarea
                  className="input resize-none h-20"
                  placeholder="Any extra details the agents should know..."
                  value={form.description}
                  onChange={set("description")}
                />
              </div>

              {/* Custom fields */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label mb-0">Custom fields</label>
                  <button onClick={addCustomField} className="text-xs text-teal-600 hover:text-teal-700 font-medium">
                    + Add field
                  </button>
                </div>
                <div className="space-y-2">
                  {customFields.map((cf, i) => (
                    <div key={i} className="flex gap-2">
                      <input className="input text-xs" placeholder="Field name" value={cf.key}
                        onChange={(e) => updateCustomField(i, "key", e.target.value)} />
                      <input className="input text-xs" placeholder="Value" value={cf.value}
                        onChange={(e) => updateCustomField(i, "value", e.target.value)} />
                      <button onClick={() => removeCustomField(i)}
                        className="text-slate-400 hover:text-red-600 px-2 text-lg leading-none transition-colors">×</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT: Sending as + Vendors + Actions */}
            <div className="space-y-5">
              {/* Compact profile badge */}
              <div>
                <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
                  <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Sending As
                  </h2>
                </div>
                <ProfileBadge profile={profile} />
              </div>

              {/* Vendor selection */}
              <div>
                <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
                  <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Vendors
                    {selectedVendors.size > 0 && (
                      <span className="ml-2 text-teal-600">{selectedVendors.size} selected</span>
                    )}
                  </h2>
                </div>

                <VendorPicker
                  vendors={vendors}
                  selected={selectedVendors}
                  onChange={setSelectedVendors}
                />

                {selectedVendors.size === 1 && (
                  <p className="text-xs text-amber-600 mt-2">
                    ⚠ Quoting from one vendor doesn't allow comparison. Select more for competitive pricing.
                  </p>
                )}
              </div>

              {/* Shipping details */}
              <div>
                <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
                  <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Shipping Details
                  </h2>
                  <span className="text-[10px] text-slate-400 font-medium">Optional — enables shipping estimates</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="label">Destination ZIP</label>
                    <input className="input" placeholder="10001" value={form.destinationZip}
                      onChange={(e) => setForm((f) => ({ ...f, destinationZip: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Est. Weight (lbs)</label>
                    <input className="input" type="number" placeholder="25" value={form.estimatedWeight}
                      onChange={(e) => setForm((f) => ({ ...f, estimatedWeight: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Package Type</label>
                    <select className="input"
                      value={form.packageType}
                      onChange={(e) => setForm((f) => ({ ...f, packageType: e.target.value as typeof f.packageType }))}>
                      <option value="">Any</option>
                      <option value="box">Box</option>
                      <option value="pallet">Pallet</option>
                      <option value="envelope">Envelope</option>
                    </select>
                  </div>
                </div>
                {form.destinationZip && (
                  <p className="text-[10px] text-teal-600 mt-1.5">
                    Shipping agents will auto-run after quotes complete.
                  </p>
                )}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-[6px] p-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  disabled={submitting || vendors.length === 0}
                  onClick={() => handleSubmit(true)}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {submitting ? "Launching…" : "Launch Agents →"}
                </button>
                <button
                  disabled={submitting || vendors.length === 0}
                  onClick={() => handleSubmit(false)}
                  className="btn-secondary px-4 disabled:opacity-50"
                >
                  Save Draft
                </button>
              </div>

              <p className="text-xs text-slate-400 font-mono">
                Est. ~${estCost} API cost for {selectedVendors.size} vendor{selectedVendors.size !== 1 ? "s" : ""} (~12 steps each)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
