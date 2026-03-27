"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const router = useRouter();

  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");

  const handleLogin = () => {
    if (user === "7MD" && pass === "553366") {
      localStorage.setItem("auth", "true");
      router.push("/");
    } else {
      alert("Wrong credentials");
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
        <h2 style={{ marginBottom: 20 }}>Login</h2>

        <input
          placeholder="Username"
          value={user}
          onChange={(e) => setUser(e.target.value)}
          style={{ width: "100%", marginBottom: 10, padding: 8 }}
        />

        <input
          type="password"
          placeholder="Password"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          style={{ width: "100%", marginBottom: 10, padding: 8 }}
        />

        <button onClick={handleLogin} style={{
          width: "100%",
          padding: 10,
          background: "#00d97e",
          color: "black",
          border: "none",
          cursor: "pointer"
        }}>
          Login
        </button>
      </div>
    </div>
  );
}