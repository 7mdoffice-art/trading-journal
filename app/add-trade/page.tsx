"use client";

import { supabase } from "../../lib/supabaseClient";
import { useState } from "react";

export default function AddTrade() {
  const [form, setForm] = useState({
    symbol: "",
    direction: "buy",
    entry: "",
    exit: "",
    size: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const entry = Number(form.entry);
    const exit = Number(form.exit);
    const size = Number(form.size);

    if (!form.symbol.trim()) {
      alert("Symbol required");
      return;
    }

    if ([entry, exit, size].some((v) => !isFinite(v))) {
      alert("Enter valid numbers");
      return;
    }

    if (size <= 0) {
      alert("Size must be > 0");
      return;
    }

    const pnl =
      form.direction === "buy"
        ? (exit - entry) * size
        : (entry - exit) * size;

    try {
      const { data, error } = await supabase
        .from("trades")
        .insert([
          {
            symbol: form.symbol,
            direction: form.direction,
            entry_price: entry,
            exit_price: exit,
            position_size: size,
            pnl,
            result: pnl > 0 ? "win" : "loss",
          },
        ])
        .select();

      if (error) throw error;

      console.log("SUCCESS:", data);
      alert("✅ Trade saved");

      setForm({
        symbol: "",
        direction: "buy",
        entry: "",
        exit: "",
        size: "",
      });

    } catch (err: any) {
      console.error("❌ ERROR:", err);
      alert(err?.message || "Failed to save trade");
    }
  };

  return (
    <div className="p-10 max-w-md mx-auto">
      <h1 className="text-2xl mb-4">Add Trade</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">

        <input
          required
          value={form.symbol}
          placeholder="BTCUSDT"
          className="border p-2"
          onChange={(e) =>
            setForm({ ...form, symbol: e.target.value.toUpperCase() })
          }
        />

        <select
          value={form.direction}
          className="border p-2"
          onChange={(e) =>
            setForm({ ...form, direction: e.target.value })
          }
        >
          <option value="buy">Buy</option>
          <option value="sell">Sell</option>
        </select>

        <input
          required
          type="number"
          step="any"
          value={form.entry}
          placeholder="60000"
          className="border p-2"
          onChange={(e) =>
            setForm({ ...form, entry: e.target.value })
          }
        />

        <input
          required
          type="number"
          step="any"
          value={form.exit}
          placeholder="62000"
          className="border p-2"
          onChange={(e) =>
            setForm({ ...form, exit: e.target.value })
          }
        />

        <input
          required
          type="number"
          step="any"
          value={form.size}
          placeholder="0.1"
          className="border p-2"
          onChange={(e) =>
            setForm({ ...form, size: e.target.value })
          }
        />

        <button className="bg-black text-white p-2">
          Add Trade
        </button>
      </form>
    </div>
  );
}