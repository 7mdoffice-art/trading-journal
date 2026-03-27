"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

export default function Login() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ CORRECT PLACE
  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.auth.getUser();

      if (data.user) {
        router.push("/");
      }
    };

    check();
  }, []);

  const handleLogin = async () => {
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      alert(error.message);
    } else {
      const { data } = await supabase.auth.getSession();

      if (data.session) {
        router.push("/");
      } else {
        alert("Login failed, try again");
      }
    }
  };

  return (
    <div style={{
      height: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#0a0b0d",
      color: "white"
    }}>
      <div style={{
        background: "#111318",
        padding: 30,
        border: "1px solid #1e2330",
        borderRadius: 6,
        width: 300
      }}>
        <h2>Login</h2>

        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: "100%", marginBottom: 10, padding: 8 }}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: "100%", marginBottom: 10, padding: 8 }}
        />

        <button
          onClick={handleLogin}
          disabled={loading || !email || !password}
          style={{
            width: "100%",
            padding: 10,
            background: "#00d97e",
            color: "black",
            border: "none"
          }}
        >
          {loading ? "Loading..." : "Login"}
        </button>
      </div>
    </div>
  );
}