"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

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

  const totalPnL = trades.reduce((sum, t) => sum + t.pnl, 0);

  return (
    <div className="p-10 text-white">
      <h1>Dashboard</h1>

      <p>Total PNL: {totalPnL}</p>

      {trades.length === 0 ? (
        <p>No trades yet</p>
      ) : (
        trades.map((t) => (
          <div key={t.id}>
            <p>{t.symbol} - {t.pnl}</p>
          </div>
        ))
      )}
    </div>
  );
}