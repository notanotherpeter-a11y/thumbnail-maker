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
    'ig-portrait':   'Instagram Reels cover (9:16 portrait)',
    'ig-landscape':  'Instagram landscape post',
    'tiktok':        'TikTok video cover (9:16)',
  };
  const platformLabel = platformLabels[platform] || 'social media thumbnail';

  const prompt = `You are a thumbnail copywriter. Write punchy, click-worthy text for a ${platformLabel}.

Topic: ${description}

STRICT RULES:
- The title MUST be directly relevant to the topic — do NOT make up unrelated stories or scenarios
- Title: 3-5 words MAX, ALL CAPS, punchy and clickable. Keep it SHORT so it fits on screen.
- Subtitle: 8-12 words, creates curiosity, stays on topic. Must be a complete readable sentence.
- Extra: 2-3 words only — a short label like "SO CUTE", "MUST WATCH", "TOO FUNNY", "OMG"

Good title examples for "dog playing in grass":
- "WAFFLE FOUND SOMETHING!"
- "HE LOVES THIS!"
- "BEST DAY EVER"

Bad examples (too long, off-topic, nonsensical):
- "WROTE MYSELF A FAINT" ← wrong, unrelated
- "NEVER LET YOUR DOG DO THIS INCREDIBLE RECOVERY" ← too long`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 200,
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

    // Enforce title max 5 words — trim if AI goes over
    if (result.title) {
      const words = result.title.trim().split(/\s+/);
      if (words.length > 5) result.title = words.slice(0, 5).join(' ');
      result.title = result.title.toUpperCase();
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message || 'AI generation failed' });
  }
};
