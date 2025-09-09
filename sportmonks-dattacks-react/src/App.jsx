import React, { useEffect, useRef, useState } from "react";

const API_URL =
  "https://api.sportmonks.com/v3/football/livescores/inplay?api_token=0m3wQMYU2HJdR6FmEFIkeCPtQhCS42wogMnxfcTeFc9iktmiSiFlDj2gavhm&include=periods;scores;trends;participants;statistics&filters=fixtureStatisticTypes:34,44;trendTypes:34,44&timezone=Europe/London&populate=400";

// Format seconds -> "MM:SS"
function formatMMSS(seconds) {
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

// Safely convert to number
const safeNum = (v, d = 0) =>
  typeof v === "number" && !isNaN(v) ? v : parseInt(v) || d;

// Extract trends array in a safe format
function extractTrends(fixture) {
  let trends = fixture?.trends?.data || fixture?.trends || [];
  return trends.map((t) => ({
    type_id: t?.type_id ?? t?.type?.id,
    value: safeNum(t?.value, 0),
    period_number: t?.period?.number ?? t?.period_number,
  }));
}

// Get total corners (Trend=34)
function getCorners(fixture) {
  const trends = extractTrends(fixture);
  return trends
    .filter((t) => t.type_id === 34)
    .reduce((a, t) => a + safeNum(t.value), 0);
}

// Get Dangerous Attacks (Trend=44) by half
function getDangerousAttacks(fixture) {
  const trends = extractTrends(fixture);
  const first = trends
    .filter((t) => t.type_id === 44 && t.period_number === 1)
    .reduce((a, t) => a + safeNum(t.value), 0);
  const second = trends
    .filter((t) => t.type_id === 44 && t.period_number === 2)
    .reduce((a, t) => a + safeNum(t.value), 0);
  return { first, second };
}

// Get teams
function getTeams(fixture) {
  const parts = fixture?.participants?.data || fixture?.participants || [];
  const home = parts.find((p) => (p.meta?.location || p.location) === "home");
  const away = parts.find((p) => (p.meta?.location || p.location) === "away");
  return `${home?.name || "Home"} vs ${away?.name || "Away"}`;
}

// Get minute
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

  // Poll API every 3s
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
        setData(Array.isArray(json?.data) ? json.data : []);
        setElapsed(0); // reset timer
        setLastFetchOk(true); // success
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

  // 1-second ticking timer
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
      {/* Header with status indicator */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Live Dangerous Attacks</h1>

        <div className="flex items-center space-x-2">
          <div
            className={`w-3 h-3 rounded-full ${
              lastFetchOk ? "bg-green-500 animate-pulse" : "bg-red-500"
            }`}
            title={lastFetchOk ? "Last refresh OK" : "Last refresh failed"}
          ></div>
          <span className="text-sm text-gray-800">
            API last updated: <strong>{formatMMSS(elapsed)}</strong>
            {lastFetchOk && (
              <span className="ml-2 text-green-600 font-medium">+00:03</span>
            )}
          </span>
        </div>
      </div>

      {/* Table */}
      <table className="min-w-full border">
        <thead>
          <tr>
            <th className="sticky-th px-2 py-1">Match</th>
            <th className="sticky-th px-2 py-1">Time</th>
            <th className="sticky-th px-2 py-1">Corners</th>
            <th className="sticky-th px-2 py-1">D.Attack 1HT</th>
            <th className="sticky-th px-2 py-1">D.Attack 2HT</th>
            <th className="sticky-th px-2 py-1">Delta</th>
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
                <td className="border px-2 py-1 text-center">
                  {minute !== "-" ? `${minute}'` : "-"}
                </td>
                <td className="border px-2 py-1 text-center">{corners}</td>
                <td className="border px-2 py-1 text-center">{first}</td>
                <td className="border px-2 py-1 text-center">{second}</td>
                <td
                  className={`border px-2 py-1 text-center font-semibold ${
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
