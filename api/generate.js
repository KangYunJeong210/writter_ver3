export default async function handler(req, res) {
  // CORS 필요 없음(같은 도메인에서만 쓸 거라)
  // res.setHeader("Access-Control-Allow-Origin", "*");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { prompt } = req.body || {};
    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "prompt is required" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const hasKey = !!apiKey;

    // ✅ 키가 들어갔는지부터 로그로 확정
    console.log("HAS_GEMINI_KEY:", hasKey);

    if (!apiKey) {
      return res.status(500).json({ error: "Missing GEMINI_API_KEY" });
    }

    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 2048
        }
      }),
    });

    const data = await r.json().catch(() => ({}));

    // ✅ Gemini가 뭐라고 거절했는지 그대로 내려보내기
    if (!r.ok) {
      console.log("GEMINI_ERROR_STATUS:", r.status);
      console.log("GEMINI_ERROR_BODY:", JSON.stringify(data));

      const message =
        data?.error?.message ||
        data?.message ||
        JSON.stringify(data);

      return res.status(500).json({
        error: "Gemini request failed",
        status: r.status,
        message,
        raw: data
      });
    }

    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ??
      "생성 결과가 없습니다.";

    return res.status(200).json({ text });
  } catch (e) {
    console.error("SERVER_ERROR:", e);
    return res.status(500).json({
      error: "generation failed",
      message: e?.message || String(e),
    });
  }
}
