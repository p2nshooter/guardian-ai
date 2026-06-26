/* ==============================================================================
 * Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Author & Architect: Yusron Efendi <hallo@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
// AXTO Platform — Frontend entry point
// The main application runs as a Next.js dashboard (see /dashboard).
// This React app is reserved for future standalone tooling.

import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";

const Home = () => {
  useEffect(() => {
    // Redirect to the main AXTO dashboard
    window.location.href = process.env.REACT_APP_DASHBOARD_URL || "/";
  }, []);

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #0a1628 0%, #0f2a4a 100%)",
      fontFamily: "Sora, Inter, sans-serif",
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: 64, height: 64, borderRadius: 18,
          background: "linear-gradient(135deg, #0284c7, #0d9488)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 32, margin: "0 auto 20px", boxShadow: "0 8px 32px rgba(2,132,199,0.4)",
        }}>🛡</div>
        <div style={{ fontSize: 28, fontWeight: 900, color: "#fff", letterSpacing: "-0.5px", marginBottom: 8 }}>
          AXTO
        </div>
        <div style={{ fontSize: 14, color: "#64748b" }}>Loading platform…</div>
      </div>
    </div>
  );
};

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />}>
            <Route index element={<Home />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
