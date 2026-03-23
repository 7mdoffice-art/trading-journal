"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function AddTrade() {
  const [symbol, setSymbol] = useState("");
  const [direction, setDirection] = useState("");
  const [entry, setEntry] = useState("");
  const [exit, setExit] = useState("");
  const [size, setSize] = useState("");

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    const pnl = Number(exit) - Number(entry);

    const { error } = await supabase.from("trades").insert([
      {
        symbol,
        direction,
        entry_price: Number(entry),
        exit_price: Number(exit),
        position_size: Number(size),
        pnl,
        result: pnl >= 0 ? "win" : "loss",
      },
    ]);

    if (error) {
      alert("Error adding trade");
      console.log(error);
      return;
    }

    alert("Trade added!");
  };

  return (
    <div className="p-10 text-white">
      <h1>Add Trade</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-sm">

        <input placeholder="Symbol" onChange={(e) => setSymbol(e.target.value)} />
        <input placeholder="Direction (buy/sell)" onChange={(e) => setDirection(e.target.value)} />
        <input placeholder="Entry Price" onChange={(e) => setEntry(e.target.value)} />
        <input placeholder="Exit Price" onChange={(e) => setExit(e.target.value)} />
        <input placeholder="Position Size" onChange={(e) => setSize(e.target.value)} />

        <button type="submit">Add Trade</button>

      </form>
    </div>
  );
}