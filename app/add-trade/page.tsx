"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type Trade = {
  id: string;
  symbol: string;
  direction: string;
  entry_price: number;
  exit_price: number;
  position_size: number;
  pnl: number;
  result: string;
};

export default function Home() {
  const [trades, setTrades] = useState<Trade[]>([]);

  useEffect(() => {
    const loadTrades = async () => {
      const { data, error } = await supabase.from("trades").select("*");

      if (error) {
        console.error(error);
        return;
      }

      setTrades(data || []);
    };

    loadTrades();
  }, []);

  // 🔥 STATS
  const totalPnL = trades.reduce((sum, t) => sum + t.pnl, 0);

  const wins = trades.filter((t) => t.result === "win");
  const losses = trades.filter((t) => t.result === "loss");

  const winRate =
    trades.length > 0 ? (wins.length / trades.length) * 100 : 0;

  const avgWin =
    wins.length > 0
      ? wins.reduce((sum, t) => sum + t.pnl, 0) / wins.length
      : 0;

  const avgLoss =
    losses.length > 0
      ? losses.reduce((sum, t) => sum + t.pnl, 0) / losses.length
      : 0;

  return (
    <div className="p-10 max-w-3xl mx-auto text-white">

      <h1 className="text-3xl mb-6">📊 Dashboard</h1>

      {/* ✅ STATS */}
      <div className="grid grid-cols-2 gap-4 mb-8">

        <div className="bg-zinc-900 p-4 rounded">
          <p>Total PNL</p>
          <p className={totalPnL >= 0 ? "text-green-400" : "text-red-400"}>
            {totalPnL.toFixed(2)}
          </p>
        </div>

        <div className="bg-zinc-900 p-4 rounded">
          <p>Win Rate</p>
          <p>{winRate.toFixed(1)}%</p>
        </div>

        <div className="bg-zinc-900 p-4 rounded">
          <p>Avg Win</p>
          <p className="text-green-400">{avgWin.toFixed(2)}</p>
        </div>

        <div className="bg-zinc-900 p-4 rounded">
          <p>Avg Loss</p>
          <p className="text-red-400">{avgLoss.toFixed(2)}</p>
        </div>

      </div>

      {/* ✅ TRADES LIST */}
      {trades.length === 0 ? (
        <p>No trades yet</p>
      ) : (
        <div className="flex flex-col gap-4">
          {trades.map((trade) => (
            <div
              key={trade.id}
              className="border p-4 rounded bg-zinc-900"
            >
              <p><b>Symbol:</b> {trade.symbol}</p>
              <p><b>Type:</b> {trade.direction}</p>
              <p><b>Entry:</b> {trade.entry_price}</p>
              <p><b>Exit:</b> {trade.exit_price}</p>
              <p><b>Size:</b> {trade.position_size}</p>

              <p>
                <b>PNL:</b>{" "}
                <span
                  className={
                    trade.pnl >= 0 ? "text-green-400" : "text-red-400"
                  }
                >
                  {trade.pnl}
                </span>
              </p>

              <p><b>Result:</b> {trade.result}</p>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}