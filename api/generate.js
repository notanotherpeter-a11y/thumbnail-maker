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

Study these high-performing thumbnail formulas and use them:
- SHOCK/SURPRISE: "I Was WRONG About This" / "Nobody Told Me This"
- NUMBER + PROMISE: "5 Things Killing Your Growth" / "3 Mistakes Costing You Money"
- BEFORE/AFTER: "From Broke to $10K" / "Lost 20kg Doing THIS"
- QUESTION HOOK: "Why Is Nobody Talking About This?" / "Is This REALLY Worth It?"
- CHALLENGE/DARE: "I Tried This For 30 Days" / "We Tested 100 Strategies"
- URGENCY/SECRET: "Do This NOW Before It's Too Late" / "The Secret They Don't Want You to Know"
- CONTRAST: "Experts Are LYING To You" / "Stop Doing This (Do This Instead)"

Return ONLY a JSON object:
{
  "title": "BOLD 3-6 WORD HOOK — ALL CAPS, emotionally charged, creates urgency or curiosity",
  "subtitle": "One punchy line (8-14 words) — reveals the promise, tease the result, or twist the expectation. Make them NEED to know more.",
  "extra": "2-4 word power label or CTA (e.g. 'MUST WATCH', 'Life Changing', '#1 Secret', 'You Won't Believe')"
}

Critical rules:
- Title = the HOOK. Make it feel urgent, shocking, or irresistible. Use power words: NEVER, STOP, WARNING, FINALLY, SECRET, EXPOSED, TRUTH, INSTANTLY
- Subtitle = the PAYOFF TEASE. Hint at the result without giving it away. Build curiosity gap.
- Extra = the AMPLIFIER. A short punchy stamp that adds credibility or urgency.
- Think like a tabloid headline meets a TED talk — provocative but real
- No generic titles like "Tips for Success" — that gets zero clicks
- No quotes inside values, no markdown, return raw JSON only`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 1.0, maxOutputTokens: 300, topP: 0.95 }
        })
      }
    );

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return res.status(500).json({ error: 'No response from AI' });

    // Strip markdown code fences if present (gemini-2.5 wraps in ```json ... ```)
    const stripped = text.replace(/```(?:json)?\n?/g, '').trim();
    const jsonMatch = stripped.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(500).json({ error: 'Could not parse AI response' });

    const result = JSON.parse(jsonMatch[0]);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message || 'AI generation failed' });
  }
};
