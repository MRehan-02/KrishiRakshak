// @ts-nocheck
// Supabase Edge Function: assistant-chat
// Multi-lingual Agri Assistant powered by Gemini API

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
    const { message, language = "en", context = {} } = await req.json();

    if (!message) {
      return new Response(JSON.stringify({ error: true, message: "Missing user message" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    const model = Deno.env.get("GEMINI_MODEL") || "gemini-1.5-flash";

    if (!apiKey) {
      // Demo response if API key is not configured
      const demoResponses = {
        mr: `तुमच्या प्रश्नासाठी धन्यवाद. पिकांची नियमित पाहणी करा व पानांवर डाग किंवा कीड दिसल्यास जैविक उपायांचा प्रथम वापर करा. गंभीर समस्या असल्यास कृपया जवळच्या कृषी विस्तार अधिकाऱ्यांशी (KVK) संपर्क साधा.`,
        hi: `आपके प्रश्न के लिए धन्यवाद। फसलों का नियमित निरीक्षण करें और कीट या रोग दिखने पर पहले जैविक उपचार अपनाएं। गंभीर मामलों में हमेशा नजदीकी कृषि विस्तार अधिकारी (KVK) से पुष्टि करें।`,
        en: `Thank you for your question. Monitor your crops regularly and adopt IPM & organic practices first. Always confirm with an extension officer for serious cases.`,
      };
      return new Response(
        JSON.stringify({ reply: demoResponses[language] || demoResponses.en, isDemo: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemInstruction = `You are KrishiRakshak AI, an empathetic and knowledgeable agricultural extension assistant in Maharashtra, India.
Farmer context: Crop: ${context.crop || "General"}, Latest Scan: ${context.latestScan || "None"}, Weather: ${JSON.stringify(context.weather || {})}.
Guidelines:
1. Provide short, practical, step-by-step advice.
2. Prioritize organic and IPM (Integrated Pest Management) techniques before chemicals.
3. Write completely in the requested language (${language}).
4. Always conclude with: "Always confirm with an extension officer for serious cases." (translated into ${language}).`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: `${systemInstruction}\n\nFarmer question: ${message}` }],
            },
          ],
        }),
      }
    );

    const data = await response.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || "Unable to generate advice right now.";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    const errorMsg = err?.message || String(err) || "Chat service error";
    return new Response(
      JSON.stringify({ error: true, message: errorMsg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
