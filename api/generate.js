module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { description, platform } = req.body || {};
  if (!description) return res.status(400).json({ error: 'Description is required' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'AI not configured' });

  const platformLabels = {
    'yt-thumb':      'YouTube thumbnail (16:9)',
    'fb-post':       'Facebook post image',
    'ig-square':     'Instagram square post',
    'ig-portrait':   'Instagram portrait post (4:5)',
    'ig-landscape':  'Instagram landscape post',
    'tiktok':        'TikTok video cover (9:16)',
  };
  const platformLabel = platformLabels[platform] || 'social media thumbnail';

  const prompt = `You are a thumbnail copywriter. Create punchy, click-worthy text for a ${platformLabel}.

Topic: ${description}

Return ONLY a JSON object with exactly these fields:
{
  "title": "MAIN HEADLINE (3-6 words, ALL CAPS, very bold and clickable)",
  "subtitle": "Supporting line that adds context or curiosity (6-12 words, title case)",
  "extra": "Short CTA or label (2-5 words, e.g. 'Watch Now', '#1 Tip', 'Episode 1')"
}

Rules:
- Title must be SHORT and PUNCHY — it's the biggest text, so make every word count
- Subtitle creates curiosity or adds value without repeating the title
- Extra is optional context or call to action
- Write for humans scrolling fast — make them STOP and click
- No quotes inside the values, no markdown, return raw JSON only`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.9, maxOutputTokens: 250 }
        })
      }
    );

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return res.status(500).json({ error: 'No response from AI' });

    const jsonMatch = text.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) return res.status(500).json({ error: 'Could not parse AI response' });

    const result = JSON.parse(jsonMatch[0]);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message || 'AI generation failed' });
  }
};
