import React, { useEffect, useRef, useState } from "react";

const API_URL =
  "https://api.sportmonks.com/v3/football/livescores/inplay?api_token=0m3wQMYU2HJdR6FmEFIkeCPtQhCS42wogMnxfcTeFc9iktmiSiFlDj2gavhm&include=periods;scores;trends;participants;statistics&filters=fixtureStatisticTypes:34,42,43,44,45,52,58,83,98,99;trendTypes:34,42,43,44,45,52,58,83,98,99&timezone=Europe/London&populate=400";

function formatMMSS(seconds) {
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

const safeNum = (v, d = 0) =>
  typeof v === "number" && !isNaN(v) ? v : parseInt(v) || d;

function extractTrends(fixture) {
  let trends = fixture?.trends?.data || fixture?.trends || [];
  return trends.map((t) => ({
    type_id: t?.type_id ?? t?.type?.id,
    value: safeNum(t?.value, 0),
    period_number: t?.period?.number ?? t?.period_number,
  }));
}

function getCorners(fixture) {
  return extractTrends(fixture)
    .filter((t) => t.type_id === 34)
    .reduce((a, t) => a + safeNum(t.value), 0);
}

function getDangerousAttacks(fixture) {
  const trends = extractTrends(fixture);
  let first = trends
    .filter((t) => t.type_id === 44 && t.period_number === 1)
    .reduce((a, t) => a + safeNum(t.value), 0);
  let second = trends
    .filter((t) => t.type_id === 44 && t.period_number === 2)
    .reduce((a, t) => a + safeNum(t.value), 0);

  // fallback: se não tem por período, usa total
  if (first === 0 && second === 0) {
    second = trends
      .filter((t) => t.type_id === 44)
      .reduce((a, t) => a + safeNum(t.value), 0);
  }

  return { first, second };
}

function getTeams(fixture) {
  let parts =
    fixture?.participants?.data ||
    (Array.isArray(fixture?.participants)
      ? fixture.participants
      : Object.values(fixture?.participants || {}));

  if (parts.length >= 2) {
    const home =
      parts.find((p) => (p.meta?.location || p.location) === "home") ||
      parts[0];
    const away =
      parts.find((p) => (p.meta?.location || p.location) === "away") ||
      parts[1];
    return `${home?.name || "Home"} vs ${away?.name || "Away"}`;
  }
  return "Unknown vs Unknown";
}

function getMinute(fixture) {
  const periods = fixture?.periods?.data || [];
  const live = periods.find((p) => p?.is_current === true);
  return live?.minute ?? fixture?.time?.minute ?? "-";
}

export default function App() {
  const [data, setData] = useState([]);
  const [elapsed, setElapsed] = useState(0);
  const [lastFetchOk, setLastFetchOk] = useState(false);
  const intervalRef = useRef(null);
  const tickRef = useRef(null);

  useEffect(() => {
    let abort = new AbortController();

    const fetchData = async () => {
      try {
        const res = await fetch(API_URL, {
          signal: abort.signal,
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();

        // ✅ Corrigido: aceita tanto array quanto objeto único
        if (Array.isArray(json?.data)) {
          setData(json.data);
        } else if (json?.data) {
          setData([json.data]);
        } else {
          setData([]);
        }

        setElapsed(0);
        setLastFetchOk(true);
      } catch (err) {
        console.error("Fetch error:", err);
        setLastFetchOk(false);
      }
    };

    fetchData();
    intervalRef.current = setInterval(fetchData, 3000);

    return () => {
      abort.abort();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    tickRef.current = setInterval(() => {
      setElapsed((s) => s + 1);
    }, 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Live Dangerous Attacks</h1>

        <div className="flex items-center space-x-4">
          <span className="font-bold text-gray-700">V00</span>
          <div className="flex items-center space-x-2">
            <div
              className={`w-3 h-3 rounded-full ${
                lastFetchOk ? "bg-green-500 animate-pulse" : "bg-red-500"
              }`}
              title={lastFetchOk ? "Last refresh OK" : "Last refresh failed"}
            ></div>
            <span className="text-sm text-gray-800">
              API last updated: <strong>{formatMMSS(elapsed)}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Table */}
      <table className="min-w-full border">
        <thead>
          <tr>
            <th className="sticky-th px-2 py-1 text-left">Match</th>
            <th className="sticky-th px-2 py-1 text-center">Time</th>
            <th className="sticky-th px-1 py-1 text-center w-20">Corners</th>
            <th className="sticky-th px-1 py-1 text-center w-28">
              D.Attack 1HT
            </th>
            <th className="sticky-th px-1 py-1 text-center w-28">
              D.Attack 2HT
            </th>
            <th className="sticky-th px-1 py-1 text-center w-20">Delta</th>
          </tr>
        </thead>
        <tbody>
          {data.map((fixture) => {
            const match = getTeams(fixture);
            const minute = getMinute(fixture);
            const corners = getCorners(fixture);
            const { first, second } = getDangerousAttacks(fixture);
            const delta = second - first;

            return (
              <tr key={fixture.id}>
                <td className="border px-2 py-1">{match}</td>
                <td className="border px-1 py-1 text-center">
                  {minute !== "-" ? `${minute}'` : "-"}
                </td>
                <td className="border px-1 py-1 text-center">{corners}</td>
                <td className="border px-1 py-1 text-center">{first}</td>
                <td className="border px-1 py-1 text-center">{second}</td>
                <td
                  className={`border px-1 py-1 text-center font-semibold ${
                    delta > 0
                      ? "text-green-600"
                      : delta < 0
                      ? "text-red-600"
                      : "text-gray-800"
                  }`}
                >
                  {delta}
                </td>
              </tr>
            );
          })}
          {data.length === 0 && (
            <tr>
              <td colSpan={6} className="px-2 py-4 text-center text-gray-500">
                No live fixtures found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
