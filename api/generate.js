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

  const prompt = `You are a world-class viral content strategist and thumbnail copywriter — the kind that gets 10M+ views. Your job is to write thumbnail text that makes people STOP scrolling and CLICK immediately.

Platform: ${platformLabel}
Topic: ${description}

Use these proven viral formulas:
- SHOCK: "Nobody Told Me This" / "I Was WRONG"
- NUMBER: "5 Things Killing Your Growth"
- BEFORE/AFTER: "From Broke to $10K"
- QUESTION: "Why Is Nobody Talking About This?"
- URGENCY: "Do This NOW Before It's Too Late"
- CONTRAST: "Experts Are LYING To You"

Write thumbnail text with:
- title: 3-6 word ALL CAPS hook (emotionally charged, urgent, or shocking)
- subtitle: 8-14 words that tease the result without giving it away (curiosity gap)
- extra: 2-4 word power label like "MUST WATCH", "Life Changing", "#1 Secret"

Use power words: NEVER, STOP, WARNING, FINALLY, SECRET, EXPOSED, TRUTH, INSTANTLY. Make it feel irresistible.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 1.0,
            maxOutputTokens: 300,
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'object',
              properties: {
                title:    { type: 'string' },
                subtitle: { type: 'string' },
                extra:    { type: 'string' }
              },
              required: ['title', 'subtitle', 'extra']
            }
          }
        })
      }
    );

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message || 'Gemini API error' });

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return res.status(500).json({ error: 'No response from AI' });

    const result = JSON.parse(text);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message || 'AI generation failed' });
  }
};
