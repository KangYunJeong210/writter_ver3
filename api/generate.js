export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {

    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({
        error: "prompt is required"
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "GEMINI_API_KEY not set"
      });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ]
        })
      }
    );

    const data = await response.json();

    // Gemini API 실패 시
    if (!response.ok) {
      return res.status(500).json({
        error: "Gemini request failed",
        detail: data
      });
    }

    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "생성된 결과가 없습니다.";

    return res.status(200).json({
      text
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      error: "generation failed",
      message: error.message
    });

  }
}

export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {

    const { prompt } = req.body;

    const apiKey = process.env.GEMINI_API_KEY;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 2048
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({
        error: data
      });
    }

    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "생성 실패";

    res.status(200).json({ text });

  } catch (error) {

    res.status(500).json({
      error: error.message
    });

  }
}
