// Generates a cover image for a property from its title/description/category.
//
// By default this returns a deterministic placeholder photo (picsum.photos,
// seeded so the same property always gets the same image) — no API key
// needed, so the app works out of the box. Set USE_OPENAI_IMAGES=true and
// OPENAI_API_KEY=... in your .env to route through DALL-E instead; if that
// call fails for any reason (bad key, network, quota), it silently falls
// back to the placeholder so property creation is never blocked on it.
//
// If neither the mock nor DALL-E are available, callers should fall back to
// the client-side procedural Three.js scene (see public/js/three-card.js)
// which renders a stylised 3D house instead of a flat photo.

const crypto = require('crypto');

function seedFor(title, category) {
  const hash = crypto.createHash('md5').update(`${category}-${title}`).digest('hex').slice(0, 10);
  return `sabali-${hash}`;
}

async function generateImage({ title, description, category }) {
  const prompt = buildPrompt({ title, description, category });

  if (process.env.USE_OPENAI_IMAGES === 'true' && process.env.OPENAI_API_KEY) {
    try {
      return await generateWithOpenAI(prompt);
    } catch (err) {
      console.warn('[imageGeneration] OpenAI image generation failed, falling back to placeholder:', err.message);
    }
  }

  return generateMock({ title, category });
}

function buildPrompt({ title, description, category }) {
  const styleByCategory = {
    villa: 'a luxurious modern villa with a pool and tropical garden',
    beach_apartment: 'a bright beachfront apartment building steps from the ocean',
    holiday_home: 'a cozy countryside holiday home with a wraparound deck',
    guesthouse: 'a small self-contained garden guesthouse',
    condo: 'a modern high-rise condominium with skyline views',
    townhouse: 'a gated family townhouse with a lawn',
  };
  const base = styleByCategory[category] || 'a beautiful home';
  return `${title}: ${base}, inspired by "${description}". Photorealistic, natural light, 4K, real-estate photography.`;
}

// Deterministic placeholder — always "succeeds", used as the default and as
// the fallback if a real generation API is configured but fails.
async function generateMock({ title, category }) {
  const seed = seedFor(title, category);
  return `https://picsum.photos/seed/${seed}/900/600`;
}

// --- Real DALL-E integration (disabled unless USE_OPENAI_IMAGES=true) -----
async function generateWithOpenAI(prompt) {
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: '1024x1024',
    }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${text}`);
  }
  const data = await response.json();
  const url = data && data.data && data.data[0] && data.data[0].url;
  if (!url) throw new Error('OpenAI API returned no image URL.');
  return url;
}

module.exports = { generateImage, buildPrompt };
