export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { prompt } = req.body || {};
    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "prompt is required" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Missing GEMINI_API_KEY" });
    }

    // ✅ v1 엔드포인트 사용 (핵심)
    // 모델이 계정/프로젝트에 따라 다를 수 있어서 2개 후보를 순서대로 시도
    const modelCandidates = [
      "gemini-2.0-flash-lite",
      "gemini-2.0-flash",
      "gemini-1.5-flash"
    ];

    let lastErr = null;

    for (const model of modelCandidates) {
      const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;

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

      if (r.ok) {
        const text =
          data?.candidates?.[0]?.content?.parts?.[0]?.text ??
          "생성 결과가 없습니다.";
        return res.status(200).json({ text, model });
      }

      lastErr = { model, status: r.status, data };
    }

    // 여기까지 왔으면 후보 모델 전부 실패
    return res.status(500).json({
      error: "Gemini request failed for all candidate models",
      lastErr,
    });

  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "generation failed", message: e?.message || String(e) });
  }
}
