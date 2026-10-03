// @ts-nocheck
// Supabase Edge Function: weather-risk
// Calls OpenWeather 5-day forecast and calculates crop disease/pest risk

declare const Deno: any;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { lat, lng } = await req.json();

    if (lat == null || lng == null) {
      return new Response(JSON.stringify({ error: true, message: "Missing lat/lng" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const openWeatherKey = Deno.env.get("OPENWEATHER_KEY");
    if (!openWeatherKey) {
      // Fallback demo weather risk
      const sampleDays = [
        { date: "Day 1", avgHumidity: 74, totalRain: 0.5, maxTemp: 31, risk: "medium", type: "fungal", actionKey: "risk_action_fungal_medium" },
        { date: "Day 2", avgHumidity: 84, totalRain: 4.2, maxTemp: 28, risk: "high", type: "fungal", actionKey: "risk_action_fungal_high" },
        { date: "Day 3", avgHumidity: 68, totalRain: 0.0, maxTemp: 32, risk: "medium", type: "fungal", actionKey: "risk_action_fungal_medium" },
        { date: "Day 4", avgHumidity: 52, totalRain: 0.0, maxTemp: 34, risk: "low", type: "favorable", actionKey: "risk_action_low" },
        { date: "Day 5", avgHumidity: 38, totalRain: 0.0, maxTemp: 37, risk: "medium", type: "pest", actionKey: "risk_action_pest_medium" },
      ];
      return new Response(JSON.stringify({ days: sampleDays, isDemo: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&units=metric&appid=${openWeatherKey}`
    );
    const data = await res.json();

    if (!data?.list) {
      throw new Error(data?.message || "Failed to fetch OpenWeather forecast");
    }

    // Group 3-hour forecasts by day
    const dayBuckets: Record<string, { temps: number[]; humidities: number[]; rain: number }> = {};
    for (const item of data.list) {
      const day = item.dt_txt.split(" ")[0];
      if (!dayBuckets[day]) {
        dayBuckets[day] = { temps: [], humidities: [], rain: 0 };
      }
      dayBuckets[day].temps.push(item.main.temp_max || item.main.temp);
      dayBuckets[day].humidities.push(item.main.humidity);
      if (item.rain && item.rain["3h"]) {
        dayBuckets[day].rain += item.rain["3h"];
      }
    }

    const days = Object.entries(dayBuckets).slice(0, 5).map(([date, values]) => {
      const avgHumidity = Math.round(values.humidities.reduce((a, b) => a + b, 0) / values.humidities.length);
      const maxTemp = Math.round(Math.max(...values.temps));
      const totalRain = Math.round(values.rain * 10) / 10;

      let risk = "low";
      let type = "favorable";
      let actionKey = "risk_action_low";

      if (avgHumidity > 80 || totalRain > 2) {
        risk = "high";
        type = "fungal";
        actionKey = "risk_action_fungal_high";
      } else if (avgHumidity >= 65 && avgHumidity <= 80) {
        risk = "medium";
        type = "fungal";
        actionKey = "risk_action_fungal_medium";
      } else if (maxTemp > 35 && avgHumidity < 40) {
        risk = "medium";
        type = "pest";
        actionKey = "risk_action_pest_medium";
      }

      return { date, avgHumidity, maxTemp, totalRain, risk, type, actionKey };
    });

    return new Response(JSON.stringify({ days }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    const errorMsg = err?.message || String(err) || "Weather risk error";
    return new Response(
      JSON.stringify({ error: true, message: errorMsg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
