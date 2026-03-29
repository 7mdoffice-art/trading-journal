"use client";
export const dynamic = 'force-dynamic';

import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, BarChart, Bar,
} from "recharts";

type Trade = {
  id: string;
  symbol: string;
  direction: string;
  entry_price: number;
  exit_price: number;
  position_size: number;
  stop_loss?: number;
  pnl: number;
  result: string;
  created_at?: string;
};

const AED_RATE = 3.6725;

function fmtAED(v: number) {
  return "AED\u00a0" + Math.round(Math.abs(v) * AED_RATE).toLocaleString("en-AE");
}
function fmt$(v: number, sign = false) {
  const abs = Math.abs(v).toLocaleString("en-US", {
    style: "currency", currency: "USD",
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  });
  if (sign) return (v >= 0 ? "+" : "-") + abs;
  return (v < 0 ? "-" : "") + abs;
}
function fmtPct(v: number, sign = false) {
  return (sign && v > 0 ? "+" : "") + v.toFixed(2) + "%";
}
function riskDollar(t: Trade, balance: number): number {
  if (!t.stop_loss) return 0;
  const dir = t.direction === "buy" ? 1 : -1;
  return Math.abs(dir * (t.entry_price - t.stop_loss) * t.position_size);
}
function rMultiple(t: Trade): number {
  if (!t.stop_loss) return 0;
  const dir = t.direction === "buy" ? 1 : -1;
  const stopDist = Math.abs(t.entry_price - t.stop_loss);
  if (stopDist < 1e-9) return 0;
  return (dir * (t.exit_price - t.entry_price)) / stopDist;
}

function ChartTooltip({ active, payload, prefix = "$", suffix = "" }: any) {
  if (!active || !payload?.length) return null;
  const val = payload[0].value as number;
  return (
    <div style={{
      background: "#111318", border: "1px solid #1e2330",
      padding: "6px 10px", borderRadius: 3,
      fontFamily: "var(--font-mono)", fontSize: 11, color: "#e2e8f0"
    }}>
      {prefix}{typeof val === "number" ? Math.round(val).toLocaleString() : val}{suffix}
    </div>
  );
}

function MetricCell({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent: string }) {
  return (
    <div style={{
      background: "#111318", border: "1px solid #1e2330",
      borderRadius: 4, padding: "14px 14px 16px",
      borderBottom: `2px solid ${accent}`,
    }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "#4a5568", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 600, color: accent, marginBottom: 3 }}>
        {value}
      </div>
      {sub && <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "#4a5568" }}>{sub}</div>}
    </div>
  );
}

function Checkbox({ checked, onChange, indeterminate = false }: { checked: boolean; onChange: () => void; indeterminate?: boolean }) {
  return (
    <div
      onClick={onChange}
      style={{
        width: 14, height: 14, borderRadius: 2, cursor: "pointer", flexShrink: 0,
        border: checked || indeterminate ? "1.5px solid #ff4d6a" : "1.5px solid #252c3a",
        background: checked ? "#ff4d6a" : indeterminate ? "rgba(255,77,106,0.2)" : "transparent",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.15s",
      }}
    >
      {checked && (
        <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
          <path d="M1 3L3 5L7 1" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {!checked && indeterminate && (
        <div style={{ width: 6, height: 1.5, background: "#ff4d6a", borderRadius: 1 }} />
      )}
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [startBalance, setStartBalance] = useState<number>(10000);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [balanceInput, setBalanceInput] = useState("");

  // Load start balance from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("startBalance");
    if (saved) setStartBalance(Number(saved));
  }, []);

  const saveStartBalance = () => {
    const val = Number(balanceInput);
    if (!val || val <= 0) return;
    setStartBalance(val);
    localStorage.setItem("startBalance", String(val));
    setShowBalanceModal(false);
    setBalanceInput("");
  };

  const START_BALANCE = startBalance;

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.push("/login");
      }
    };
    checkUser();
  }, []);

  const loadTrades = async () => {
    const { data } = await supabase
      .from("trades")
      .select("*")
      .order("created_at", { ascending: true });
    setTrades(data || []);
    setSelectedIds(new Set());
  };

  useEffect(() => { loadTrades(); }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const deleteTrade = async (id: string) => {
    if (!confirm("Delete this trade?")) return;
    await supabase.from("trades").delete().eq("id", id);
    loadTrades();
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const allSelected = trades.length > 0 && selectedIds.size === trades.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < trades.length;

  const toggleSelectAll = () => {
    if (allSelected || someSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(trades.map(t => t.id)));
  };

  const deleteSelected = async () => {
    if (!selectedIds.size) return;
    if (!confirm(`Permanently delete ${selectedIds.size} selected trade${selectedIds.size > 1 ? "s" : ""}?`)) return;
    setBulkDeleting(true);
    await supabase.from("trades").delete().in("id", Array.from(selectedIds));
    setBulkDeleting(false);
    loadTrades();
  };

  const metrics = useMemo(() => {
    if (!trades.length) return null;

    let bal = START_BALANCE;
    const balances: number[] = [bal];
    trades.forEach(t => { bal += t.pnl; balances.push(bal); });

    const pnls = trades.map(t => t.pnl);
    const wins = trades.filter(t => t.result === "win");
    const losses = trades.filter(t => t.result === "loss");
    const winRate = trades.length ? wins.length / trades.length : 0;

    const grossWin = wins.reduce((s, t) => s + t.pnl, 0);
    const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
    const profitFactor = grossLoss > 0 ? grossWin / grossLoss : null;

    const avgWin = wins.length ? grossWin / wins.length : 0;
    const avgLoss = losses.length ? grossLoss / losses.length : 0;
    const expectancy = (winRate * avgWin) - ((1 - winRate) * avgLoss);

    let maxW = 0, maxL = 0, cw = 0, cl = 0;
    pnls.forEach(p => {
      if (p > 0) { cw++; cl = 0; maxW = Math.max(maxW, cw); }
      else { cl++; cw = 0; maxL = Math.max(maxL, cl); }
    });

    let peak = START_BALANCE, maxDDval = 0, maxDDpct = 0;
    balances.forEach(b => {
      if (b > peak) peak = b;
      const dd = peak - b;
      if (dd > maxDDval) { maxDDval = dd; maxDDpct = peak > 0 ? dd / peak : 0; }
    });

    const rMults = trades.map((t, i) => ({
      r: rMultiple(t),
      "risk$": riskDollar(t, balances[i]),
      riskPct: balances[i] > 0 ? riskDollar(t, balances[i]) / balances[i] * 100 : 0,
    }));
    const avgRMult = rMults.some(r => r.r !== 0)
      ? rMults.reduce((s, r) => s + r.r, 0) / rMults.filter(r => r.r !== 0).length : 0;
    const avgRiskPct = rMults.some(r => r.riskPct > 0)
      ? rMults.filter(r => r.riskPct > 0).reduce((s, r) => s + r.riskPct, 0) / rMults.filter(r => r.riskPct > 0).length : 0;

    const largestWin = wins.length ? Math.max(...wins.map(t => t.pnl)) : 0;
    const largestLoss = losses.length ? Math.min(...losses.map(t => t.pnl)) : 0;
    const lwTrade = wins.find(t => t.pnl === largestWin);
    const llTrade = losses.find(t => t.pnl === largestLoss);

    const assetMap: Record<string, number> = {};
    trades.forEach(t => { assetMap[t.symbol] = (assetMap[t.symbol] || 0) + t.pnl; });

    const equityData = balances.map((b, i) => ({ trade: i === 0 ? "Start" : `T${i}`, balance: b }));

    let pk = START_BALANCE;
    const ddData = balances.map((b, i) => {
      if (b > pk) pk = b;
      return { trade: i === 0 ? "Start" : `T${i}`, drawdown: -(pk - b) };
    });

    const rChartData = trades.map((t, i) => ({ label: t.symbol, r: rMults[i].r }));
    const curBalance = balances[balances.length - 1];
    const netPnl = curBalance - START_BALANCE;

    return {
      balances, curBalance, netPnl,
      wins, losses, winRate,
      grossWin, grossLoss, profitFactor, expectancy, avgWin, avgLoss,
      maxW, maxL, maxDDval, maxDDpct,
      rMults, avgRMult, avgRiskPct,
      largestWin, largestLoss, lwTrade, llTrade,
      assetMap, equityData, ddData, rChartData,
    };
  }, [trades]);

  const cur = metrics?.curBalance ?? START_BALANCE;
  const netPnl = metrics?.netPnl ?? 0;

  const GRID = { stroke: "#1e2330" };
  const TICK = { fill: "#4a5568", fontFamily: "IBM Plex Mono", fontSize: 9 };
  const PIE_COLORS = ["#00d97e", "#ff4d6a"];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap');
        :root {
          --font-mono: 'IBM Plex Mono', monospace;
          --font-sans: 'IBM Plex Sans', sans-serif;
          --bg: #0a0b0d; --surface: #111318; --border: #1e2330;
          --green: #00d97e; --red: #ff4d6a; --blue: #3d8bff; --yellow: #f5c542;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: var(--bg); color: #e2e8f0; font-family: var(--font-sans); }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #252c3a; border-radius: 2px; }
        .trade-row:hover { background: #181c23 !important; }
        .del-btn:hover { color: #ff4d6a !important; border-color: rgba(255,77,106,0.3) !important; background: rgba(255,77,106,0.08) !important; }
      `}</style>

      {/* Top Bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 24px", borderBottom: "1px solid #1e2330",
        background: "#111318", position: "sticky", top: 0, zIndex: 50,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 600, letterSpacing: "0.06em" }}>
            PRO<span style={{ color: "#00d97e" }}>TRADE</span>
          </span>
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.1em",
            background: "rgba(0,217,126,0.1)", color: "#00d97e",
            border: "1px solid rgba(0,217,126,0.25)", padding: "2px 8px", borderRadius: 2,
          }}>ANALYTICS</span>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button onClick={handleLogout} style={{
            fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600,
            letterSpacing: "0.06em", padding: "7px 14px", borderRadius: 3,
            background: "transparent", color: "#ff4d6a",
            border: "1px solid rgba(255,77,106,0.3)", cursor: "pointer",
          }}>LOGOUT</button>
          <Link href="/add-trade" style={{
            fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600,
            background: "#00d97e", color: "#000", padding: "7px 16px",
            borderRadius: 3, textDecoration: "none", letterSpacing: "0.06em",
          }}>+ ADD TRADE</Link>
        </div>
      </div>

      <div style={{ padding: "20px 24px", maxWidth: 1400, margin: "0 auto" }}>

        {/* Balance Strip */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(8, 1fr)",
          gap: 1, background: "#1e2330", border: "1px solid #1e2330",
          borderRadius: 4, overflow: "hidden", marginBottom: 16,
        }}>
          <div style={{ background: "#111318", padding: "14px 14px", cursor: "pointer" }} onClick={() => { setBalanceInput(String(START_BALANCE)); setShowBalanceModal(true); }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "#4a5568", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}>
              Start Balance
              <span style={{ fontSize: 8, color: "#3d8bff", border: "1px solid rgba(61,139,255,0.3)", padding: "1px 4px", borderRadius: 2 }}>EDIT</span>
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 600, color: "#e2e8f0" }}>{fmt$(START_BALANCE)}</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#718096", marginTop: 6 }}>{START_BALANCE.toLocaleString()} USDT</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#a0aec0", fontWeight: 500, marginTop: 3 }}>{fmtAED(START_BALANCE)}</div>
          </div>
          <div style={{ background: "#111318", padding: "14px 14px" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "#4a5568", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>Current Balance</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 600, color: cur >= START_BALANCE ? "#00d97e" : "#ff4d6a" }}>{fmt$(cur)}</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#718096", marginTop: 6 }}>{Math.round(cur).toLocaleString()} USDT</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: cur >= START_BALANCE ? "#00d97e" : "#ff4d6a", fontWeight: 500, marginTop: 3 }}>{fmtAED(cur)}</div>
          </div>
          <div style={{ background: "#111318", padding: "14px 14px" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "#4a5568", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>Net P&L</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 600, color: netPnl >= 0 ? "#00d97e" : "#ff4d6a" }}>{fmt$(netPnl, true)}</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#718096", marginTop: 6 }}>{fmtPct((netPnl / START_BALANCE) * 100, true)}</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: netPnl >= 0 ? "#00d97e" : "#ff4d6a", fontWeight: 500, marginTop: 3 }}>{fmtAED(netPnl)}</div>
          </div>
          {([
            { label: "Total Trades", value: String(trades.length), sub: `W/L: ${metrics?.wins.length ?? 0} / ${metrics?.losses.length ?? 0}`, color: "#3d8bff" },
            { label: "Win Rate", value: metrics ? fmtPct(metrics.winRate * 100) : "—", sub: "of all trades", color: (metrics?.winRate ?? 0) >= 0.5 ? "#00d97e" : "#ff4d6a" },
            { label: "Profit Factor", value: metrics?.profitFactor != null ? metrics.profitFactor.toFixed(2) : "—", sub: "gross W / gross L", color: (metrics?.profitFactor ?? 0) >= 1 ? "#00d97e" : "#ff4d6a" },
            { label: "Expectancy", value: metrics ? fmt$(metrics.expectancy, true) : "—", sub: "per trade avg", color: (metrics?.expectancy ?? 0) >= 0 ? "#00d97e" : "#ff4d6a" },
            { label: "Avg R Multiple", value: metrics?.avgRMult ? metrics.avgRMult.toFixed(2) + "R" : "—", sub: "needs stop_loss", color: (metrics?.avgRMult ?? 0) >= 0 ? "#00d97e" : "#ff4d6a" },
          ] as { label: string; value: string; sub?: string; color?: string }[]).map(c => (
            <div key={c.label} style={{ background: "#111318", padding: "12px 14px" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "#4a5568", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 5 }}>{c.label}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 600, color: c.color || "#e2e8f0" }}>{c.value}</div>
              {c.sub && <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#718096", marginTop: 4 }}>{c.sub}</div>}
            </div>
          ))}
        </div>

        {/* Advanced Metrics */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8, marginBottom: 16 }}>
          <MetricCell label="Largest Win" value={metrics?.largestWin ? fmt$(metrics.largestWin) : "—"} sub={metrics?.lwTrade?.symbol} accent="#00d97e" />
          <MetricCell label="Largest Loss" value={metrics?.largestLoss ? fmt$(metrics.largestLoss) : "—"} sub={metrics?.llTrade?.symbol} accent="#ff4d6a" />
          <MetricCell label="Max Consec. Wins" value={String(metrics?.maxW ?? "—")} sub="consecutive" accent="#00d97e" />
          <MetricCell label="Max Consec. Losses" value={String(metrics?.maxL ?? "—")} sub="consecutive" accent="#ff4d6a" />
          <MetricCell label="Max Drawdown" value={metrics ? `-${fmtPct(metrics.maxDDpct * 100)}` : "—"} sub={metrics ? fmt$(-metrics.maxDDval) : undefined} accent="#3d8bff" />
          <MetricCell label="Avg Risk / Trade" value={metrics?.avgRiskPct ? fmtPct(metrics.avgRiskPct) : "—"} sub="needs stop_loss" accent="#f5c542" />
        </div>

        {/* Charts Row 1 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div style={{ background: "#111318", border: "1px solid #1e2330", borderRadius: 4 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: "1px solid #1e2330" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#718096", letterSpacing: "0.1em", textTransform: "uppercase" }}>Equity Curve</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, background: "rgba(0,217,126,0.1)", color: "#00d97e", border: "1px solid rgba(0,217,126,0.2)", padding: "2px 6px", borderRadius: 2 }}>
                {metrics ? fmtPct((metrics.netPnl / START_BALANCE) * 100, true) : "0%"}
              </span>
            </div>
            <div style={{ padding: "12px 4px 4px" }}>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={metrics?.equityData ?? []}>
                  <CartesianGrid {...GRID} />
                  <XAxis dataKey="trade" tick={TICK} axisLine={false} tickLine={false} />
                  <YAxis tick={TICK} axisLine={false} tickLine={false} tickFormatter={(v: number) => "$" + Math.round(v / 1000) + "k"} />
                  <Tooltip content={<ChartTooltip prefix="$" />} />
                  <Line dataKey="balance" stroke="#00d97e" strokeWidth={2} dot={{ r: 3, fill: "#00d97e" }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div style={{ background: "#111318", border: "1px solid #1e2330", borderRadius: 4 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: "1px solid #1e2330" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#718096", letterSpacing: "0.1em", textTransform: "uppercase" }}>Drawdown</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, background: "rgba(255,77,106,0.1)", color: "#ff4d6a", border: "1px solid rgba(255,77,106,0.2)", padding: "2px 6px", borderRadius: 2 }}>
                Max: {metrics ? fmtPct(-metrics.maxDDpct * 100) : "0%"}
              </span>
            </div>
            <div style={{ padding: "12px 4px 4px" }}>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={metrics?.ddData ?? []}>
                  <CartesianGrid {...GRID} />
                  <XAxis dataKey="trade" tick={TICK} axisLine={false} tickLine={false} />
                  <YAxis tick={TICK} axisLine={false} tickLine={false} tickFormatter={(v: number) => "$" + Math.round(v / 1000) + "k"} />
                  <Tooltip content={<ChartTooltip prefix="$" />} />
                  <Line dataKey="drawdown" stroke="#ff4d6a" strokeWidth={2} dot={{ r: 3, fill: "#ff4d6a" }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Charts Row 2 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
          <div style={{ background: "#111318", border: "1px solid #1e2330", borderRadius: 4 }}>
            <div style={{ padding: "10px 16px", borderBottom: "1px solid #1e2330" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#718096", letterSpacing: "0.1em", textTransform: "uppercase" }}>Win / Loss</span>
            </div>
            <div style={{ padding: 16, display: "flex", alignItems: "center", gap: 16 }}>
              <PieChart width={110} height={110}>
                <Pie data={[{ name: "Wins", value: metrics?.wins.length || 0 }, { name: "Losses", value: metrics?.losses.length || 0 }]}
                  dataKey="value" innerRadius={32} outerRadius={50} paddingAngle={2}>
                  {PIE_COLORS.map((c, i) => <Cell key={i} fill={c} />)}
                </Pie>
              </PieChart>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { label: "WINS", val: String(metrics?.wins.length ?? 0), color: "#00d97e" },
                  { label: "LOSSES", val: String(metrics?.losses.length ?? 0), color: "#ff4d6a" },
                  { label: "WIN RATE", val: metrics ? fmtPct(metrics.winRate * 100) : "—", color: "#e2e8f0" },
                ].map(r => (
                  <div key={r.label}>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "#4a5568", letterSpacing: "0.08em" }}>{r.label}</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 600, color: r.color }}>{r.val}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div style={{ background: "#111318", border: "1px solid #1e2330", borderRadius: 4 }}>
            <div style={{ padding: "10px 16px", borderBottom: "1px solid #1e2330" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#718096", letterSpacing: "0.1em", textTransform: "uppercase" }}>P&L by Asset</span>
            </div>
            <div style={{ padding: 16 }}>
              {metrics ? Object.entries(metrics.assetMap).sort((a, b) => b[1] - a[1]).map(([sym, val]) => {
                const maxAbs = Math.max(...Object.values(metrics.assetMap).map(Math.abs), 1);
                const pct = Math.abs(val) / maxAbs * 100;
                return (
                  <div key={sym} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600, color: "#718096" }}>{sym}</span>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: val >= 0 ? "#00d97e" : "#ff4d6a" }}>{fmt$(val, true)}</span>
                    </div>
                    <div style={{ background: "#1e2330", height: 4, borderRadius: 2 }}>
                      <div style={{ width: `${pct}%`, height: "100%", borderRadius: 2, background: val >= 0 ? "#00d97e" : "#ff4d6a" }} />
                    </div>
                  </div>
                );
              }) : null}
            </div>
          </div>
          <div style={{ background: "#111318", border: "1px solid #1e2330", borderRadius: 4 }}>
            <div style={{ padding: "10px 16px", borderBottom: "1px solid #1e2330" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#718096", letterSpacing: "0.1em", textTransform: "uppercase" }}>R-Multiple Dist.</span>
            </div>
            <div style={{ padding: "12px 4px 4px" }}>
              <ResponsiveContainer width="100%" height={130}>
                <BarChart data={metrics?.rChartData ?? []}>
                  <CartesianGrid {...GRID} />
                  <XAxis dataKey="label" tick={TICK} axisLine={false} tickLine={false} />
                  <YAxis tick={TICK} axisLine={false} tickLine={false} tickFormatter={(v: number) => v + "R"} />
                  <Tooltip content={<ChartTooltip prefix="" suffix="R" />} />
                  <Bar dataKey="r" radius={[2, 2, 0, 0]} fill="#00d97e" label={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Trade Log */}
        <div style={{ background: "#111318", border: "1px solid #1e2330", borderRadius: 4 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: "1px solid #1e2330" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#718096", letterSpacing: "0.1em", textTransform: "uppercase" }}>Trade Log</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, background: "rgba(61,139,255,0.1)", color: "#3d8bff", border: "1px solid rgba(61,139,255,0.2)", padding: "2px 6px", borderRadius: 2 }}>
                {trades.length} trades
              </span>
              {selectedIds.size > 0 && (
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, background: "rgba(255,77,106,0.1)", color: "#ff4d6a", border: "1px solid rgba(255,77,106,0.25)", padding: "2px 6px", borderRadius: 2 }}>
                  {selectedIds.size} selected
                </span>
              )}
            </div>
            {selectedIds.size > 0 && (
              <button onClick={deleteSelected} disabled={bulkDeleting} style={{
                fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600,
                letterSpacing: "0.06em", padding: "6px 14px", borderRadius: 3,
                background: bulkDeleting ? "rgba(255,77,106,0.15)" : "#ff4d6a",
                color: bulkDeleting ? "#ff4d6a" : "#000",
                border: bulkDeleting ? "1px solid rgba(255,77,106,0.3)" : "none",
                cursor: bulkDeleting ? "not-allowed" : "pointer", transition: "all 0.15s",
              }}>
                {bulkDeleting ? "DELETING..." : `DELETE ${selectedIds.size} TRADE${selectedIds.size > 1 ? "S" : ""}`}
              </button>
            )}
          </div>
          <div style={{
            display: "grid", gridTemplateColumns: "32px 70px 55px 100px 100px 65px 100px 80px 75px 75px 65px",
            padding: "8px 16px", borderBottom: "1px solid #1e2330", background: "#181c23", alignItems: "center",
          }}>
            <div><Checkbox checked={allSelected} indeterminate={someSelected} onChange={toggleSelectAll} /></div>
            {["SYMBOL", "SIDE", "ENTRY", "EXIT", "SIZE", "P&L", "RISK $", "RISK %", "R MULT", ""].map(h => (
              <div key={h} style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "#4a5568", letterSpacing: "0.1em", textTransform: "uppercase" }}>{h}</div>
            ))}
          </div>
          {[...trades].reverse().map((t, i) => {
            const idx = trades.length - 1 - i;
            const bal = metrics?.balances[idx] ?? START_BALANCE;
            const rd = riskDollar(t, bal);
            const rpct = bal > 0 && rd > 0 ? rd / bal * 100 : null;
            const rm = rMultiple(t);
            const hasStop = !!t.stop_loss;
            const isSelected = selectedIds.has(t.id);
            return (
              <div key={t.id} className="trade-row" style={{
                display: "grid", gridTemplateColumns: "32px 70px 55px 100px 100px 65px 100px 80px 75px 75px 65px",
                padding: "10px 16px", borderBottom: "1px solid #1e2330", alignItems: "center", cursor: "default",
                background: isSelected ? "rgba(255,77,106,0.05)" : undefined,
                borderLeft: isSelected ? "2px solid rgba(255,77,106,0.5)" : "2px solid transparent",
                transition: "background 0.1s",
              }}>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <Checkbox checked={isSelected} onChange={() => toggleSelect(t.id)} />
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600 }}>{t.symbol}</div>
                <div>
                  <span style={{
                    fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 600,
                    padding: "2px 6px", borderRadius: 2, letterSpacing: "0.06em",
                    background: t.direction === "buy" ? "rgba(0,217,126,0.12)" : "rgba(255,77,106,0.12)",
                    color: t.direction === "buy" ? "#00d97e" : "#ff4d6a",
                  }}>{t.direction.toUpperCase()}</span>
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#718096" }}>${t.entry_price.toLocaleString()}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#718096" }}>${t.exit_price.toLocaleString()}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#718096" }}>{t.position_size}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, color: t.pnl >= 0 ? "#00d97e" : "#ff4d6a" }}>{fmt$(t.pnl, true)}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#718096" }}>
                  {hasStop ? "$" + Math.round(rd).toLocaleString() : <span style={{ color: "#4a5568" }}>—</span>}
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: rpct != null ? (rpct > 3 ? "#ff4d6a" : rpct > 1.5 ? "#f5c542" : "#00d97e") : "#4a5568" }}>
                  {rpct != null ? rpct.toFixed(1) + "%" : "—"}
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: hasStop ? (rm >= 0 ? "#00d97e" : "#ff4d6a") : "#4a5568" }}>
                  {hasStop ? rm.toFixed(2) + "R" : "—"}
                </div>
                <div>
                  <button className="del-btn" onClick={() => deleteTrade(t.id)} style={{
                    fontFamily: "var(--font-mono)", fontSize: 9, color: "#4a5568",
                    background: "none", border: "1px solid #1e2330", borderRadius: 2,
                    padding: "2px 6px", cursor: "pointer", transition: "all 0.15s",
                  }}>DEL</button>
                </div>
              </div>
            );
          })}
          {trades.length === 0 && (
            <div style={{ padding: "40px 16px", textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 11, color: "#4a5568" }}>
              No trades yet — add your first trade to get started
            </div>
          )}
        </div>

      </div>

      {/* ── Change Start Balance Modal ── */}
      {showBalanceModal && (
        <div onClick={() => setShowBalanceModal(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#111318', border: '1px solid #1e2330',
            borderRadius: 4, padding: 24, width: 340,
          }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: '#718096', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #1e2330' }}>
              Set Starting Balance
            </div>
            <label style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#4a5568', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>Amount (USD)</label>
            <input
              type='number'
              placeholder='e.g. 10000'
              value={balanceInput}
              onChange={e => setBalanceInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveStartBalance()}
              autoFocus
              style={{
                width: '100%', padding: '10px 12px', marginBottom: 14,
                background: '#0a0b0d', border: '1px solid #1e2330',
                borderRadius: 3, color: '#e2e8f0',
                fontFamily: 'var(--font-mono)', fontSize: 13, outline: 'none',
              }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowBalanceModal(false)} style={{
                flex: 1, fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600,
                padding: '9px 0', borderRadius: 3, border: '1px solid #1e2330',
                background: 'transparent', color: '#4a5568', cursor: 'pointer',
              }}>CANCEL</button>
              <button onClick={saveStartBalance} style={{
                flex: 1, fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600,
                padding: '9px 0', borderRadius: 3, border: 'none',
                background: '#00d97e', color: '#000', cursor: 'pointer',
              }}>SAVE</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
