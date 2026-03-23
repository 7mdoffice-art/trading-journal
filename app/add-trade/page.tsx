"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

export default function AddTrade() {
  const router = useRouter();

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

    // 🔥 THIS is the key fix
    router.push("/");
  };

  return (
    <div className="p-10 text-white">
      <h1>Add Trade</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-sm">

        <input className="p-2 bg-zinc-800 rounded" placeholder="Symbol" onChange={(e) => setSymbol(e.target.value)} />
        <input className="p-2 bg-zinc-800 rounded" placeholder="Direction (buy/sell)" onChange={(e) => setDirection(e.target.value)} />
        <input className="p-2 bg-zinc-800 rounded" placeholder="Entry Price" onChange={(e) => setEntry(e.target.value)} />
        <input className="p-2 bg-zinc-800 rounded" placeholder="Exit Price" onChange={(e) => setExit(e.target.value)} />
        <input className="p-2 bg-zinc-800 rounded" placeholder="Position Size" onChange={(e) => setSize(e.target.value)} />

        <button className="bg-white text-black p-2 rounded">
          Add Trade
        </button>

      </form>
    </div>
  );
}