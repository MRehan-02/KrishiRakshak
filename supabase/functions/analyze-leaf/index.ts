// @ts-nocheck
// Supabase Edge Function: analyze-leaf
// Analyzes crop leaf photos with Gemini API

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
    const { imageBase64, mimeType = "image/jpeg", language = "en" } = await req.json();

    if (!imageBase64) {
      return new Response(JSON.stringify({ error: true, message: "Missing imageBase64" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    const model = Deno.env.get("GEMINI_MODEL") || "gemini-1.5-flash";

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: true, message: "GEMINI_API_KEY not configured in Supabase secrets" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const prompt = `You are a plant pathologist assistant for Indian farmers. Return ONLY JSON with keys: is_plant_leaf (boolean), crop (string), disease_or_pest (string), confidence (0-100 integer), severity ('low'|'medium'|'high'), visible_symptoms (string array), ipm_organic_actions (string array), chemical_option_with_safe_use_note (string), prevention_tips (string array), when_to_contact_extension_officer (string). Write all text values in ${language}; keep keys in English. If the image is not a plant leaf set is_plant_leaf=false and confidence=0. Do not invent a disease when unsure.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: imageBase64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
          },
        }),
      }
    );

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      return new Response(JSON.stringify({ error: true, message: "No response from Gemini" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Strip code fences if present
    const cleanedText = rawText.replace(/```(?:json)?/gi, "").trim();
    const result = JSON.parse(cleanedText);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    const errorMsg = err?.message || String(err) || "Failed to analyze leaf";
    return new Response(
      JSON.stringify({ error: true, message: errorMsg }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
