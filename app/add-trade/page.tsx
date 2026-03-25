"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";

export default function AddTrade() {
  const router = useRouter();

  const [symbol, setSymbol] = useState("");
  const [direction, setDirection] = useState<"buy" | "sell">("buy");
  const [entry, setEntry] = useState("");
  const [exit, setExit] = useState("");
  const [size, setSize] = useState("");
  const [stopLoss, setStopLoss] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const e = Number(entry), x = Number(exit), s = Number(size), sl = Number(stopLoss);

  const previewPnL = useMemo(() => {
    if (!e || !x || !s) return null;
    return direction === "buy" ? (x - e) * s : (e - x) * s;
  }, [entry, exit, size, direction]);

  const riskDollar = useMemo(() => {
    if (!e || !sl || !s) return null;
    const dir = direction === "buy" ? 1 : -1;
    return Math.abs(dir * (e - sl) * s);
  }, [entry, stopLoss, size, direction]);

  const rMultiple = useMemo(() => {
    if (previewPnL == null || !riskDollar || riskDollar === 0) return null;
    return previewPnL / riskDollar;
  }, [previewPnL, riskDollar]);

  const isValid = symbol && e > 0 && x > 0 && s > 0;

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setErrorMsg("");
    if (!isValid) { setErrorMsg("Fill all required fields"); return; }

    const pnl = previewPnL ?? 0;
    setLoading(true);

    const payload: Record<string, unknown> = {
      symbol: symbol.trim().toUpperCase(),
      direction,
      entry_price: e,
      exit_price: x,
      position_size: s,
      pnl,
      result: pnl >= 0 ? "win" : "loss",
    };
    if (sl > 0) payload.stop_loss = sl;

    const { error } = await supabase.from("trades").insert([payload]);
    setLoading(false);

    if (error) { setErrorMsg("Failed to add trade"); return; }

    setSymbol(""); setEntry(""); setExit(""); setSize(""); setStopLoss("");
    router.push("/");
  };

  const inp: React.CSSProperties = {
    padding: "10px 12px",
    background: "#111318",
    border: "1px solid #1e2330",
    borderRadius: 3,
    color: "#e2e8f0",
    fontFamily: "IBM Plex Mono, monospace",
    fontSize: 12,
    outline: "none",
    width: "100%",
    transition: "border-color 0.15s",
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap');
        body { background: #0a0b0d; color: #e2e8f0; font-family: 'IBM Plex Sans', sans-serif; margin: 0; }
        input:focus { border-color: #00d97e !important; }
        input::placeholder { color: #4a5568; }
      `}</style>

      {/* Top Bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 24px", borderBottom: "1px solid #1e2330",
        background: "#111318",
      }}>
        <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 14, fontWeight: 600, letterSpacing: "0.06em" }}>
          PRO<span style={{ color: "#00d97e" }}>TRADE</span>
        </span>
        <Link href="/" style={{
          fontFamily: "IBM Plex Mono, monospace", fontSize: 11, color: "#718096",
          border: "1px solid #1e2330", padding: "6px 12px", borderRadius: 3,
          textDecoration: "none", letterSpacing: "0.06em",
        }}>← DASHBOARD</Link>
      </div>

      <div style={{ maxWidth: 480, margin: "40px auto", padding: "0 24px" }}>
        <div style={{
          background: "#111318", border: "1px solid #1e2330",
          borderRadius: 4, padding: 24,
        }}>
          <div style={{
            fontFamily: "IBM Plex Mono, monospace", fontSize: 12, fontWeight: 600,
            letterSpacing: "0.08em", color: "#718096", textTransform: "uppercase",
            marginBottom: 20, paddingBottom: 14, borderBottom: "1px solid #1e2330",
          }}>New Trade Entry</div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {errorMsg && (
              <div style={{ background: "rgba(255,77,106,0.1)", border: "1px solid rgba(255,77,106,0.25)", color: "#ff4d6a", padding: "8px 12px", borderRadius: 3, fontFamily: "IBM Plex Mono, monospace", fontSize: 11 }}>
                {errorMsg}
              </div>
            )}

            {/* Symbol */}
            <div>
              <label style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 9, color: "#4a5568", letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: 5 }}>Symbol *</label>
              <input style={inp} placeholder="BTC" value={symbol} onChange={ev => setSymbol(ev.target.value)} />
            </div>

            {/* Direction */}
            <div>
              <label style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 9, color: "#4a5568", letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: 5 }}>Side *</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {(["buy", "sell"] as const).map(d => (
                  <button key={d} type="button" onClick={() => setDirection(d)} style={{
                    fontFamily: "IBM Plex Mono, monospace", fontSize: 11, fontWeight: 600,
                    padding: "9px 0", borderRadius: 3, border: "1px solid",
                    letterSpacing: "0.08em", cursor: "pointer", transition: "all 0.15s",
                    background: direction === d ? (d === "buy" ? "#00d97e" : "#ff4d6a") : "transparent",
                    color: direction === d ? "#000" : (d === "buy" ? "#00d97e" : "#ff4d6a"),
                    borderColor: d === "buy" ? "rgba(0,217,126,0.4)" : "rgba(255,77,106,0.4)",
                  }}>{d.toUpperCase()}</button>
                ))}
              </div>
            </div>

            {/* Entry / Exit */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 9, color: "#4a5568", letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: 5 }}>Entry Price *</label>
                <input style={inp} type="number" step="any" min="0" placeholder="60000" value={entry} onChange={ev => setEntry(ev.target.value)} />
              </div>
              <div>
                <label style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 9, color: "#4a5568", letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: 5 }}>Exit Price *</label>
                <input style={inp} type="number" step="any" min="0" placeholder="90000" value={exit} onChange={ev => setExit(ev.target.value)} />
              </div>
            </div>

            {/* Size / Stop Loss */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 9, color: "#4a5568", letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: 5 }}>Position Size *</label>
                <input style={inp} type="number" step="any" min="0" placeholder="0.5" value={size} onChange={ev => setSize(ev.target.value)} />
              </div>
              <div>
                <label style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 9, color: "#4a5568", letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: 5 }}>Stop Loss <span style={{ color: "#252c3a" }}>(optional)</span></label>
                <input style={inp} type="number" step="any" min="0" placeholder="55000" value={stopLoss} onChange={ev => setStopLoss(ev.target.value)} />
              </div>
            </div>

            {/* Preview */}
            <div style={{ background: "#0a0b0d", border: "1px solid #1e2330", borderRadius: 3, padding: "12px 14px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <div>
                <div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 9, color: "#4a5568", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>Est. P&L</div>
                <div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 16, fontWeight: 600, color: previewPnL == null ? "#4a5568" : previewPnL >= 0 ? "#00d97e" : "#ff4d6a" }}>
                  {previewPnL == null ? "—" : (previewPnL >= 0 ? "+" : "") + "$" + Math.abs(previewPnL).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </div>
              </div>
              <div>
                <div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 9, color: "#4a5568", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>Risk $</div>
                <div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 16, fontWeight: 600, color: riskDollar != null ? "#f5c542" : "#4a5568" }}>
                  {riskDollar != null ? "$" + Math.round(riskDollar).toLocaleString() : "—"}
                </div>
              </div>
              <div>
                <div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 9, color: "#4a5568", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>R Multiple</div>
                <div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 16, fontWeight: 600, color: rMultiple != null ? (rMultiple >= 0 ? "#00d97e" : "#ff4d6a") : "#4a5568" }}>
                  {rMultiple != null ? rMultiple.toFixed(2) + "R" : "—"}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !isValid}
              style={{
                fontFamily: "IBM Plex Mono, monospace", fontSize: 12, fontWeight: 600,
                letterSpacing: "0.08em", padding: "11px 0",
                background: isValid ? "#00d97e" : "#1e2330",
                color: isValid ? "#000" : "#4a5568",
                border: "none", borderRadius: 3, cursor: isValid ? "pointer" : "not-allowed",
                transition: "all 0.15s",
              }}
            >
              {loading ? "ADDING..." : "ADD TRADE"}
            </button>

          </form>
        </div>
      </div>
    </>
  );
}
