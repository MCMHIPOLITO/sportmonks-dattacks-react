import React, { useEffect, useState } from "react";

const API_URL = "https://api.sportmonks.com/v3/football/livescores/inplay?api_token=0m3wQMYU2HJdR6FmEFIkeCPtQhCS42wogMnxfcTeFc9iktmiSiFlDj2gavhm&include=periods;scores;trends;participants;statistics&filters=fixtureStatisticTypes:34,44;trendTypes:34,44&timezone=Europe/London&populate=400";

export default function App() {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(API_URL);
        const json = await res.json();
        setData(json.data || []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Live Dangerous Attacks</h1>
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
          {data.map((fixture) => (
            <tr key={fixture.id}>
              <td className="border px-2 py-1">{fixture.name || "Match"}</td>
              <td className="border px-2 py-1">{fixture.time?.minute || "-"}</td>
              <td className="border px-2 py-1">-</td>
              <td className="border px-2 py-1">-</td>
              <td className="border px-2 py-1">-</td>
              <td className="border px-2 py-1">-</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
