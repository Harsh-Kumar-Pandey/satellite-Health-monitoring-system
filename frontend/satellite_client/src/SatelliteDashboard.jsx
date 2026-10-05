import { useState, useEffect, useCallback, useRef } from "react";
import {
  LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from "recharts";

const API = "http://localhost:5000/api";

const FAULT_COLORS = {
  healthy: "#22c55e",
  thermal_fault: "#f97316",
  power_fault: "#ef4444",
  signal_fault: "#3b82f6",
  default: "#64748b",
};
const PIE_COLORS = ["#ef4444","#f97316","#3b82f6","#d946ef","#8b5cf6","#10b981"];
const fc = (t) => FAULT_COLORS[t] || FAULT_COLORS.default;

const S = {
  root: {
    width:"100vw", minHeight:"100vh", background:"#f1f5f9",
    fontFamily:"Arial,sans-serif", color:"#0f172a",
    padding:"15px", boxSizing:"border-box", display:"flex", flexDirection:"column", gap:"10px",
    marginLeft:"calc(-50vw + 50%)",
  },
  topbar: {
    display:"flex", alignItems:"center", gap:"12px",
    background:"#fff", border:"1px solid #e2e8f0", borderRadius:"12px",
    padding:"10px 16px", boxShadow:"0 2px 8px rgba(0,0,0,0.04)",
  },
  logo:  { fontFamily:"monospace", fontSize:"15px", color:"#2563eb", fontWeight:700 },
  title: { fontSize:"17px", fontWeight:800, flex:1 },
  liveBadge: {
    display:"flex", alignItems:"center", gap:"6px",
    fontFamily:"monospace", fontSize:"15px", fontWeight:"bold",
    color:"#2563eb", background:"#eff6ff", padding:"5px 12px",
    borderRadius:"8px", border:"1px solid #bfdbfe",
  },
  badge: (color) => ({
    fontSize:"14px", fontWeight:700, padding:"5px 12px",
    borderRadius:"20px",
    background: color==="green"?"#dcfce7":"#fee2e2",
    color: color==="green"?"#166534":"#991b1b",
    border: `1px solid ${color==="green"?"#bbf7d0":"#fecaca"}`,
  }),
  statGrid: {
    display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:"10px",
  },
  statCard: {
    background:"#fff", border:"1px solid #e2e8f0", borderRadius:"12px",
    padding:"5px 14px", position:"relative", overflow:"hidden",
    boxShadow:"0 2px 6px rgba(0,0,0,0.03)",
  },
  statBar: {
    position:"absolute", top:0, left:0, right:0, height:"3px",
    background:"linear-gradient(90deg,#2563eb,#7c3aed)",
  },
  statLabel: { fontSize:"15px", fontWeight:700, textTransform:"uppercase", color:"#64748b", marginBottom:"4px" },
  statSub:   { fontSize:"12px", color:"#94a3b8", marginTop:"3px" },
  chartsRow: {
    display:"grid", gridTemplateColumns:"1.5fr 1.1fr", gap:"10px",
  },
  bottomRow: {
    display:"grid", gridTemplateColumns:"300px 1fr 270px", gap:"10px",
  },
  panel: {
    background:"#fff", border:"1px solid #e2e8f0", borderRadius:"12px",
    padding:"14px", display:"flex", flexDirection:"column",
    boxShadow:"0 2px 6px rgba(0,0,0,0.03)", minHeight:"240px",
  },
  panelTitle: {
    fontSize:"15px", fontWeight:800, textTransform:"uppercase",
    letterSpacing:"0.5px", color:"#0f172a", marginBottom:"10px",
    display:"flex", alignItems:"center", gap:"7px", flexShrink:0,
  },
  dot: { width:"6px", height:"6px", borderRadius:"50%", background:"#2563eb", flexShrink:0 },
  tblHead: {
    display:"grid", gridTemplateColumns:"1.8fr 1fr 1fr 1fr 0.8fr 1.4fr",
    gap:"6px", paddingBottom:"7px", borderBottom:"2px solid #e2e8f0",
    marginBottom:"4px", flexShrink:0,
  },
  tblRow: {
    display:"grid", gridTemplateColumns:"1.8fr 1fr 1fr 1fr 0.8fr 1.4fr",
    gap:"6px", padding:"7px 0", borderBottom:"1px solid #f1f5f9",
    fontSize:"15px", fontFamily:"monospace", alignItems:"center",
  },
  pill: (ok) => ({
    fontSize:"14px", fontWeight:800, padding:"3px 7px", borderRadius:"10px",
    display:"inline-block", textTransform:"uppercase", textAlign:"center",
    background: ok?"#dcfce7":"#fee2e2", color: ok?"#166534":"#991b1b",
    border:`1px solid ${ok?"#bbf7d0":"#fecaca"}`,
  }),
  faultRow: {
    display:"flex", justifyContent:"space-between", alignItems:"center",
    padding:"12px 0", borderBottom:"3px solid #f1f5f9",
  },
  inpLabel: { fontSize:"15px", fontWeight:700, color:"#64748b", textTransform:"uppercase", marginBottom:"3px" },
  inp: {
    width:"100%", padding:"6px 9px", fontFamily:"monospace", fontSize:"12px",
    background:"#f8fafc", color:"#0f172a", border:"1px solid #cbd5e1",
    borderRadius:"6px", outline:"none", boxSizing:"border-box",
  },
  btn: {
    width:"100%", padding:"9px", marginTop:"8px",
    fontSize:"14px", fontWeight:800, background:"#2563eb", color:"#fff",
    border:"none", borderRadius:"8px", cursor:"pointer",
  },
  predBox: (fault) => ({
    marginTop:"10px", padding:"10px 12px", background:"#f8fafc",
    borderRadius:"8px", border:`1px solid ${fault?"#fecaca":"#bbf7d0"}`,
  }),
  scroll: { flex:1, overflowY:"auto", minHeight:0 },
  toast: {
    position:"fixed", top:"14px", right:"18px", zIndex:9999,
    display:"flex", flexDirection:"column", gap:"6px", pointerEvents:"none",
  },
  toastItem: (fault) => ({
    display:"flex", alignItems:"center", gap:"10px",
    background: fault ? "#fff7ed" : "#f0fdf4",
    border: `1px solid ${fault ? "#fed7aa" : "#bbf7d0"}`,
    borderLeft: `3px solid ${fault ? "#e46810" : "#23e46a"}`,
    borderRadius:"8px", padding:"7px 13px",
    boxShadow:"0 4px 12px rgba(0,0,0,0.07)",
    fontFamily:"monospace", fontSize:"20px",
    animation:"slideIn 0.3s ease",
    minWidth:"240px", maxWidth:"400px",
  }),
  pulseDot: (color) => ({
    width:"10px", height:"10px", borderRadius:"50%", flexShrink:0,
    background: color==="red"?"#dd3030":color==="amber"?"#f59e0b":"#22c55e",
    boxShadow:`0 0 0 4px ${color==="red"?"rgba(239,68,68,0.2)":color==="amber"?"rgba(245,158,11,0.2)":"rgba(34,197,94,0.2)"}`,
  }),
};

function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:"#fff", border:"1px solid #cbd5e1", borderRadius:"8px", padding:"8px 12px", fontSize:"11px", fontFamily:"monospace" }}>
      <p style={{ color:"#64748b", marginBottom:"4px", fontWeight:"bold" }}>{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color:p.color, marginTop:"2px" }}>
          {p.dataKey}: {typeof p.value==="number" ? p.value.toFixed(2) : p.value}
        </p>
      ))}
    </div>
  );
}

export default function SatelliteDashboard() {
  const [summary,    setSummary]    = useState(null);
  const [liveLog,    setLiveLog]    = useState([]);
  const [faults,     setFaults]     = useState([]);
  const [timeseries, setTimeseries] = useState([]);
  const [faultDist,  setFaultDist]  = useState([]);
  const [connected,  setConnected]  = useState(true);
  const [error,      setError]      = useState(null);
  const [form,       setForm]       = useState({ temperature:"52", voltage:"12.4", current:"7.1", battery_level:"80", signal_strength:"-70" });
  const [prediction, setPrediction] = useState(null);
  const [predicting, setPredicting] = useState(false);
  const [toasts,     setToasts]     = useState([]);
  const summaryRef = useRef(null);
  const toastId    = useRef(0);

  const addToast = useCallback((data) => {
    const id = toastId.current++;
    const isFault = data.is_fault === 1;
    setToasts(prev => [...prev, { id, data, isFault }].slice(-4));
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  const fetchInit = useCallback(async () => {
    try {
      const [sRes, dRes] = await Promise.all([
        fetch(`${API}/summary`),
        fetch(`${API}/charts/fault_distribution`),
      ]);
      const s = await sRes.json();
      const d = await dRes.json();
      setSummary(s);
      summaryRef.current = s;
      setFaultDist((d.labels||[]).map((lbl,i) => ({ name:lbl, value:d.values[i] })));
      setConnected(true); setError(null);
    } catch {
      setConnected(false);
      setError("Cannot connect to server. Make sure Flask is running on port 5000.");
    }
  }, []);

  useEffect(() => {
    fetchInit();
    const id = setInterval(async () => {
      try {
        const res = await fetch(`${API}/stream`);
        const nd  = await res.json();
        setConnected(true);

        setSummary(prev => {
          if (!prev) return prev;
          const tot = prev.total_readings + 1;
          const isFault = nd.is_fault === 1;
          const nf  = prev.total_faults  + (isFault ? 1 : 0);
          const nh  = prev.healthy_count + (isFault ? 0 : 1);
          const nT  = ((prev.avg_temperature * prev.total_readings) + nd.temperature) / tot;
          const nV  = ((prev.avg_voltage     * prev.total_readings) + nd.voltage)     / tot;
          const nC  = ((prev.avg_current     * prev.total_readings) + nd.current)     / tot;
          const updated = {
            ...prev,
            total_readings: tot, total_faults: nf, healthy_count: nh,
            health_percent: ((nh/tot)*100).toFixed(1),
            avg_temperature: +nT.toFixed(2),
            avg_voltage:     +nV.toFixed(2),
            avg_current:     +nC.toFixed(2),
          };
          summaryRef.current = updated;
          return updated;
        });

        if (nd.is_fault === 1) {
          setFaultDist(prev => {
            const u = [...prev];
            const i = u.findIndex(d => d.name === nd.prediction);
            if (i >= 0) u[i] = { ...u[i], value: u[i].value + 1 };
            else u.push({ name: nd.prediction, value: 1 });
            return u;
          });
          setFaults(prev => [nd, ...prev].slice(0, 50));
        }

        setTimeseries(prev => [...prev, {
          time: String(nd.timestamp).slice(11,19),
          temperature: +(nd.temperature||0).toFixed(2),
          voltage:     +(nd.voltage||0).toFixed(2),
          current:     +(nd.current||0).toFixed(2),
          fault: nd.is_fault === 1,
        }].slice(-30));

        setLiveLog(prev => [nd, ...prev].slice(0, 60));
        addToast(nd);
      } catch { setConnected(false); }
    }, 2000);
    return () => clearInterval(id);
  }, [fetchInit]);

  const runPrediction = async () => {
    setPredicting(true); setPrediction(null);
    try {
      const res = await fetch(`${API}/predict_single`, {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify(Object.fromEntries(Object.entries(form).map(([k,v])=>[k,parseFloat(v)]))),
      });
      setPrediction(await res.json());
    } catch { setPrediction({ error:"Prediction failed. Check connection." }); }
    finally { setPredicting(false); }
  };

  if (error && !summary) return (
    <div style={{ ...S.root, alignItems:"center", justifyContent:"center" }}>
      <div style={{ ...S.panel, textAlign:"center", maxWidth:"380px", padding:"30px" }}>
        <div style={{ fontSize:"36px", color:"#ef4444", marginBottom:"12px" }}>⚠</div>
        <h2 style={{ marginBottom:"8px" }}>Connection Failed</h2>
        <p style={{ color:"#64748b", marginBottom:"20px", fontSize:"13px" }}>{error}</p>
        <button style={S.btn} onClick={fetchInit}>RETRY CONNECTION</button>
      </div>
    </div>
  );

  const chartH = 220;

  return (
    <div style={S.root}>
      <style>{`
        @keyframes slideIn {
          from { opacity:0; transform:translateX(18px); }
          to   { opacity:1; transform:translateX(0); }
        }
      `}</style>

      {/* ── Toast Notifications ── */}
      <div style={S.toast}>
        {toasts.map(({ id, data, isFault }) => (
          <div key={id} style={S.toastItem(isFault)}>
            <span style={{ fontSize:"13px" }}>{isFault ? "⚠" : "✓"}</span>
            <div>
              <div style={{ fontWeight:700, color: isFault?"#c2410c":"#15803d", fontSize:"15px" }}>
                {data.prediction?.toUpperCase()}
              </div>
              <div style={{ color:"#000000", fontSize:"14px", marginTop:"5px" }}>
                {String(data.timestamp).slice(11,19)} | {data.temperature?.toFixed(1)}° | {data.voltage?.toFixed(2)}V | {(data.confidence*100).toFixed(0)}% conf
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Topbar ── */}
      <div style={S.topbar}>
        <div style={{ ...S.pulseDot(connected?"green":"red") }} />
        <div>
          <div style={S.logo}>SAT-OPS // TELEMETRY</div>
          <div style={S.title}>Satellite Health Monitor</div>
        </div>

        {/* ── Badges centred ── */}
        <div style={{ flex:1, display:"flex", justifyContent:"center", alignItems:"center", gap:"10px" }}>
          {summary && <>
            <span style={S.badge("green")}>{summary.health_percent}% HEALTHY</span>
            <span style={S.badge("red")}>{summary.total_faults} FAULTS</span>
          </>}
        </div>

        <div style={S.liveBadge}>
          {connected ? "● LIVE STREAM ACTIVE" : "⚠ RECONNECTING..."}
        </div>
      </div>

      {/* ── Stat Cards ── */}
      {summary && (
        <div style={S.statGrid}>
          {[
            { label:"Fleet Data Packets", val: summary.total_readings.toLocaleString(), color:"#2563eb" },
            { label:"Healthy States",     val: summary.healthy_count.toLocaleString(),  color:"#22c55e" },
            { label:"Fault Events",       val: summary.total_faults.toLocaleString(),   color:"#ef4444" },
            { label:"Avg Temperature",    val: `${summary.avg_temperature}°`, sub:"LIMIT: 80°C",  color: summary.avg_temperature>70?"#ef4444":"#f59e0b" },
            { label:"Avg Voltage",        val: `${summary.avg_voltage}V`,     sub:"NOMINAL: 12-15V", color: summary.avg_voltage>14?"#ef4444":"#2563eb" },
            { label:"Avg Current",        val: `${summary.avg_current}A`,     sub:"LIMIT: 10A",   color: summary.avg_current>9?"#ef4444":"#7c3aed" },
          ].map(c => (
            <div key={c.label} style={S.statCard}>
              <div style={S.statBar} />
              <div style={S.statLabel}>{c.label}</div>
              <div style={{ fontSize:"22px", fontWeight:800, lineHeight:1.1, color:c.color }}>{c.val}</div>
              {c.sub && <div style={S.statSub}>{c.sub}</div>}
            </div>
          ))}
        </div>
      )}

      {/* ── Charts Row ── */}
      <div style={S.chartsRow}>
        <div style={S.panel}>
          <div style={S.panelTitle}><span style={S.dot}/> Live Telemetry Stream — Temp · Volt · Curr</div>
          <div style={{ flex:1, minHeight:0, height:chartH }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeseries}>
                <XAxis dataKey="time" tick={{ fontSize:9, fill:"#94a3b8" }} interval="preserveStartEnd" axisLine={{ stroke:"#e2e8f0" }} tickLine={false} />
                <YAxis tick={{ fontSize:9, fill:"#94a3b8" }} width={28} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTip />} />
                <Legend iconSize={8} wrapperStyle={{ fontSize:9, fontWeight:"bold", color:"#475569" }} />
                {timeseries.filter(r=>r.fault).map((r,i)=>(
                  <ReferenceLine key={i} x={r.time} stroke="#fca5a5" strokeWidth={1.5} strokeOpacity={0.6} />
                ))}
                <Line type="monotone" dataKey="temperature" stroke="#f97316" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="voltage"     stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="current"     stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={S.panel}>
          <div style={S.panelTitle}><span style={S.dot}/> Historical Fault Breakdown</div>
          <div style={{ flex:1, minHeight:0, height:chartH }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={faultDist} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={38} outerRadius={72} paddingAngle={4}>
                  {faultDist.map((_,i) => <Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip content={<ChartTip />} />
                <Legend iconSize={8} wrapperStyle={{ fontSize:9, fontFamily:"monospace", color:"#64748b" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Bottom Row ── */}
      <div style={S.bottomRow}>

        {/* Live Alerts */}
        <div style={S.panel}>
          <div style={S.panelTitle}><span style={S.dot}/> Live Alerts ({faults.length})</div>
          <div style={S.scroll}>
            {faults.length === 0
              ? <p style={{ fontFamily:"monospace", fontSize:11, color:"#040404", textAlign:"center", marginTop:"20px" }}>Standing by. No recent faults.</p>
              : faults.map((f,i) => (
                <div key={i} style={S.faultRow}>
                  <span style={{ fontFamily:"monospace", fontSize:"14px", color:"#94a3b8" }}>{String(f.timestamp).slice(11,19)}</span>
                  <span style={{ fontSize:"12px", fontWeight:"bold", padding:"3px 8px", borderRadius:"10px", background: fc(f.prediction)+"22", color: fc(f.prediction), border:`1px solid ${fc(f.prediction)}44` }}>
                    {f.prediction}
                  </span>
                  <span style={{ fontFamily:"monospace", fontSize:"15px", fontWeight:900 }}>{(f.confidence*100).toFixed(0)}%</span>
                </div>
              ))}
          </div>
        </div>

        {/* Telemetry Table */}
        <div style={S.panel}>
          <div style={S.panelTitle}><span style={S.dot}/> Incoming Telemetry Feed</div>
          <div style={S.tblHead}>
            {["Time","Temp","Volt","Curr","Bat%","Status"].map(h=>(
              <span key={h} style={{ fontSize:"9px", fontWeight:800, textTransform:"uppercase", color:"#94a3b8" }}>{h}</span>
            ))}
          </div>
          <div style={S.scroll}>
            {liveLog.length === 0
              ? <div style={{ padding:"20px", textAlign:"center", color:"#94a3b8", fontSize:"12px" }}>Awaiting data stream...</div>
              : liveLog.map((r,i) => (
                <div key={i} style={{ ...S.tblRow, background: i===0?"#eff6ff":"transparent" }}>
                  <span style={{ color:"#94a3b8" }}>{String(r.timestamp).slice(11,19)}</span>
                  <span style={{ color: r.temperature>80?"#ef4444":"inherit", fontWeight:"bold" }}>{r.temperature?.toFixed(1)}°</span>
                  <span style={{ color: r.voltage>15?"#ef4444":"inherit" }}>{r.voltage?.toFixed(2)}V</span>
                  <span style={{ color: r.current>10?"#ef4444":"inherit" }}>{r.current?.toFixed(2)}A</span>
                  <span>{r.battery_level?.toFixed(0)}%</span>
                  <span style={S.pill(r.prediction==="healthy")}>{r.prediction}</span>
                </div>
              ))}
          </div>
        </div>

        {/* Diagnostic Simulator */}
        <div style={S.panel}>
          <div style={S.panelTitle}><span style={S.dot}/> Diagnostic Simulator</div>
          <div style={S.scroll}>
            {[["temperature","Temperature (°C)"],["voltage","Voltage (V)"],["current","Current (A)"],["battery_level","Battery (%)"],["signal_strength","Signal (dBm)"]].map(([k,lbl])=>(
              <div key={k} style={{ marginBottom:"8px" }}>
                <div style={S.inpLabel}>{lbl}</div>
                <input type="number" style={S.inp} value={form[k]}
                  onChange={e => setForm(f=>({...f,[k]:e.target.value}))} />
              </div>
            ))}
            <button style={{ ...S.btn, opacity: predicting?0.7:1, cursor: predicting?"wait":"pointer" }}
              onClick={runPrediction} disabled={predicting}>
              {predicting ? "ANALYSING…" : "RUN DIAGNOSTIC"}
            </button>
            {prediction && !prediction.error && (
              <div style={S.predBox(prediction.is_fault)}>
                <div style={{ fontSize:"13px", fontWeight:800, color: prediction.is_fault?"#ef4444":"#22c55e" }}>
                  {prediction.is_fault ? "⚠ " : "✓ "}{prediction.prediction?.toUpperCase()}
                </div>
                <div style={{ fontSize:"10px", fontWeight:700, color:"#64748b", marginTop:"4px" }}>
                  CONFIDENCE: {(prediction.confidence*100).toFixed(1)}%
                </div>
              </div>
            )}
            {prediction?.error && (
              <div style={{ marginTop:"10px", padding:"10px", background:"#fee2e2", borderRadius:"8px", fontSize:"11px", color:"#991b1b" }}>
                {prediction.error}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}