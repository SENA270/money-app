
"use client";

import { useState, useEffect } from "react";

type ReceiptData = {
  date: string;
  amount: number;
  storeName: string;
  category: string;
};

type Props = {
  onScanComplete: (data: ReceiptData) => void;
  onClose: () => void;
};

export default function ReceiptScanner({ onScanComplete, onClose }: Props) {
  const [scanning, setScanning] = useState(false);

  // Mock Simulation of Scanning
  const handleMockScan = () => {
    setScanning(true);
    setTimeout(() => {
      const mockData: ReceiptData = {
        date: new Date().toISOString().slice(0, 10),
        amount: 1580,
        storeName: "セブンイレブン",
        category: "食費",
      };
      onScanComplete(mockData);
      setScanning(false);
    }, 2000);
  };

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "#000", zIndex: 2000, color: "#fff",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center"
    }}>
      {/* Close Button */}
      <button
        onClick={onClose}
        style={{ position: "absolute", top: 40, right: 20, background: "rgba(255,255,255,0.3)", border: "none", color: "#fff", borderRadius: "50%", width: 40, height: 40, fontSize: 24 }}
      >
        ×
      </button>

      {scanning ? (
        <div style={{ textAlign: "center" }}>
          <div className="spinner" style={{ border: "4px solid #fff", borderTop: "4px solid transparent", borderRadius: "50%", width: 40, height: 40, animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
          <p>レシート解析中...</p>
        </div>
      ) : (
        <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
          {/* Camera Viewfinder Mock */}
          <div style={{ flex: 1, position: "relative", background: "#222" }}>
            <div style={{
              position: "absolute", top: "20%", left: "10%", right: "10%", bottom: "30%",
              border: "2px dashed #fff", borderRadius: 12,
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <span style={{ background: "rgba(0,0,0,0.5)", padding: "4px 8px", borderRadius: 4, fontSize: 12 }}>レシートを枠に合わせてください</span>
            </div>
          </div>

          {/* Controls */}
          <div style={{ height: 120, background: "#000", display: "flex", alignItems: "center", justifyContent: "center", gap: 32 }}>
            <button
              onClick={handleMockScan}
              style={{
                width: 72, height: 72, borderRadius: "50%",
                background: "#fff", border: "4px solid #ccc",
                boxShadow: "0 0 0 2px #fff"
              }}
            />
          </div>

          {/* Demo Note */}
          <div style={{ position: "absolute", bottom: 130, width: "100%", textAlign: "center", fontSize: 12, color: "#888" }}>
            (デモ: ボタンを押すと解析成功します)
          </div>
        </div>
      )}

      <style jsx>{`
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            `}</style>
    </div>
  );
}
