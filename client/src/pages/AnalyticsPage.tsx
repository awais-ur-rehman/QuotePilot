import { useQuery } from "@tanstack/react-query";
import Header from "../components/layout/Header";
import { analyticsApi } from "../services/api";
import { formatCurrency } from "../utils/formatters";
import type { AnalyticsData, VendorStat } from "../types";

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color = "text-slate-800" }: {
  label: string; value: string | number; sub?: string; color?: string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-[6px] px-5 py-4"
         style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      <div className={`text-2xl font-bold font-mono leading-none ${color}`}>{value}</div>
      <div className="text-xs text-slate-500 mt-1">{label}</div>
      {sub && <div className="text-[11px] text-slate-400 font-mono mt-0.5">{sub}</div>}
    </div>
  );
}

// ─── Horizontal Bar Row ───────────────────────────────────────────────────────

function BarRow({ label, value, max, displayValue, color = "bg-teal-600" }: {
  label: string; value: number; max: number; displayValue: string; color?: string;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-700 w-32 truncate shrink-0" title={label}>{label}</span>
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono text-slate-600 w-12 text-right shrink-0">{displayValue}</span>
    </div>
  );
}

// ─── Vendor Leaderboard ───────────────────────────────────────────────────────

function VendorLeaderboard({ stats }: { stats: VendorStat[] }) {
  if (stats.length === 0) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-[6px] overflow-hidden"
         style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
      <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Vendor Leaderboard</h3>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            {["#", "Vendor", "Quotes", "Success", "Avg Price", "Best Price", "Avg Steps"].map((h, i) => (
              <th key={h} className={`text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-5 py-2.5 ${i > 1 ? "text-right" : ""}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {stats.map((v, i) => (
            <tr key={v.vendorId} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
              <td className="px-5 py-3 text-xs text-slate-400 font-mono">{i + 1}</td>
              <td className="px-5 py-3">
                <span className="text-sm font-medium text-slate-800">{v.vendorName}</span>
              </td>
              <td className="px-5 py-3 text-right text-xs font-mono text-slate-600">{v.total}</td>
              <td className="px-5 py-3 text-right">
                <span className={`text-xs font-mono font-semibold ${
                  v.successRate >= 80 ? "text-green-700" :
                  v.successRate >= 50 ? "text-amber-700" : "text-red-600"
                }`}>
                  {v.successRate}%
                </span>
              </td>
              <td className="px-5 py-3 text-right text-xs font-mono text-slate-600">
                {v.avgUnitPrice != null ? formatCurrency(v.avgUnitPrice) : "—"}
              </td>
              <td className="px-5 py-3 text-right">
                <span className="text-xs font-mono font-semibold text-teal-700">
                  {v.minUnitPrice != null ? formatCurrency(v.minUnitPrice) : "—"}
                </span>
              </td>
              <td className="px-5 py-3 text-right text-xs font-mono text-slate-500">
                {v.avgSteps ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["analytics"],
    queryFn: async () => {
      const res = await analyticsApi.get();
      return res.data as AnalyticsData;
    },
    refetchInterval: 30000,
  });

  const maxQuotes = data
    ? Math.max(...data.vendorStats.map((v) => v.total), 1)
    : 1;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Analytics" subtitle="Performance insights" />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-6 space-y-6">

          {isLoading && (
            <div className="grid grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-20 bg-slate-100 rounded-[6px] animate-pulse" />
              ))}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-[6px] p-4">
              <p className="text-sm text-red-700">Failed to load analytics</p>
            </div>
          )}

          {data && (
            <>
              {/* Summary stats */}
              <div className="grid grid-cols-4 gap-3">
                <StatCard
                  label="Total RFQs"
                  value={data.summary.totalRFQs}
                  color="text-slate-800"
                />
                <StatCard
                  label="Quotes collected"
                  value={data.summary.completedQuotes}
                  sub={`of ${data.summary.totalQuotes} total`}
                  color="text-teal-700"
                />
                <StatCard
                  label="Success rate"
                  value={`${data.summary.successRate}%`}
                  sub="quotes completed"
                  color={data.summary.successRate >= 70 ? "text-green-700" : "text-amber-700"}
                />
                <StatCard
                  label="Hours saved"
                  value={`~${data.summary.hoursSaved}h`}
                  sub="est. vs. manual"
                  color="text-blue-700"
                />
              </div>

              {/* Empty state */}
              {data.summary.totalQuotes === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="text-3xl text-slate-200 mb-3">▲</div>
                  <p className="text-sm font-semibold text-slate-700 mb-1">No data yet</p>
                  <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                    Complete your first RFQ to start seeing analytics about vendor performance and pricing.
                  </p>
                </div>
              )}

              {data.summary.totalQuotes > 0 && (
                <div className="grid grid-cols-2 gap-6">
                  {/* Quote success by vendor */}
                  <div className="bg-white border border-slate-200 rounded-[6px] overflow-hidden"
                       style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                    <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
                      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Quotes by Vendor
                      </h3>
                    </div>
                    <div className="px-5 py-4">
                      {data.vendorStats.length === 0 ? (
                        <p className="text-xs text-slate-400">No vendor data</p>
                      ) : (
                        data.vendorStats.map((v) => (
                          <BarRow
                            key={v.vendorId}
                            label={v.vendorName}
                            value={v.completed}
                            max={maxQuotes}
                            displayValue={`${v.successRate}%`}
                            color={
                              v.successRate >= 80 ? "bg-green-500" :
                              v.successRate >= 50 ? "bg-amber-500" : "bg-red-400"
                            }
                          />
                        ))
                      )}
                    </div>
                  </div>

                  {/* Price summary by vendor */}
                  <div className="bg-white border border-slate-200 rounded-[6px] overflow-hidden"
                       style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                    <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
                      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Best Prices by Vendor
                      </h3>
                    </div>
                    <div className="px-5 py-4">
                      {data.vendorStats.filter((v) => v.minUnitPrice != null).length === 0 ? (
                        <p className="text-xs text-slate-400">No pricing data yet</p>
                      ) : (
                        (() => {
                          const priced = data.vendorStats.filter((v) => v.minUnitPrice != null);
                          const maxPrice = Math.max(...priced.map((v) => v.minUnitPrice!));
                          return priced.map((v) => (
                            <BarRow
                              key={v.vendorId}
                              label={v.vendorName}
                              value={maxPrice - v.minUnitPrice!}
                              max={maxPrice}
                              displayValue={formatCurrency(v.minUnitPrice!)}
                              color="bg-teal-500"
                            />
                          ));
                        })()
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Leaderboard */}
              {data.vendorStats.length > 0 && (
                <VendorLeaderboard stats={data.vendorStats} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
