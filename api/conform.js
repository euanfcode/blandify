const MAX_WORDS = 250;
const MAX_ATTEMPTS = 2;

function countWords(value) {
  const trimmed = value.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

function getMaximumWordCount(originalWordCount) {
  if (originalWordCount < 20) {
    return Math.max(Math.ceil(originalWordCount * 2.5), 24);
  }
  if (originalWordCount <= 50) {
    return Math.ceil(originalWordCount * 1.8);
  }
  return Math.ceil(originalWordCount * 1.5);
}

function cleanOutput(value) {
  return value.trim().replace(/\s*—\s*/g, "—");
}

function extractOutputText(data) {
  if (typeof data?.output_text === "string") {
    return data.output_text.trim();
  }

  for (const item of data?.output || []) {
    for (const content of item?.content || []) {
      if (content?.type === "output_text" && typeof content?.text === "string") {
        return content.text.trim();
      }
    }
  }

  return "";
}

async function createRewrite({ text, instructions }) {
  const openAIResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      instructions,
      input: text,
      max_output_tokens: 700
    })
  });

  const data = await openAIResponse.json().catch(() => ({}));

  if (!openAIResponse.ok) {
    const message = data?.error?.message || `OpenAI request failed (${openAIResponse.status}).`;
    const error = new Error(message);
    error.status = openAIResponse.status;
    throw error;
  }

  return cleanOutput(extractOutputText(data));
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed." });
  }

  const text = typeof request.body?.text === "string" ? request.body.text.trim() : "";

  if (!text) {
    return response.status(400).json({ error: "No writing was supplied." });
  }

  const originalWordCount = countWords(text);

  if (originalWordCount > MAX_WORDS) {
    return response.status(400).json({ error: "Please keep the original to 250 words or fewer." });
  }

  if (!process.env.OPENAI_API_KEY) {
    return response.status(500).json({ error: "The OpenAI API key has not been configured." });
  }

  const maximumWordCount = getMaximumWordCount(originalWordCount);

  const instructions = `
You are Blandify.

Rewrite the user's text so that it sounds unmistakably AI-written.

CORE PRINCIPLE:
PRESERVE THE EVENT. INFLATE THE LANGUAGE AND ITS SIGNIFICANCE.

Keep the factual event, people, objects, actions, order and explicit causes intact. The reader must still be able to identify exactly what happened in the source.

You may pompously interpret, abstract, elevate or reframe what the existing event represents, reflects or amounts to, but do not invent another event, action, person, object, outcome, consequence, factual detail, or something that happened before or afterwards unless it appears in the source.

EMOTIONAL AND EVALUATIVE FIDELITY:
Do not change the emotional or evaluative direction of the source. If something is accidental, neutral, unpleasant, awkward, negative or unwanted, do not make it fortunate, positive, welcome, beneficial or inspiring.

UNNECESSARY REPHRASING:
Where useful, replace ordinary words and phrases with unnecessarily elaborate but semantically faithful descriptions. Do not merely choose a fancier synonym. Sometimes unpack a simple phrase into a longer, more explicit formulation.

Examples:
"photo of my lunch" → "a still image of my midday meal"
"cried" → "experienced a period of sustained weeping"
"bought seventeen peaches" → "acquired a total of seventeen individual peaches"
"went into the meeting" → "proceeded inside to attend the meeting"
"looked disappointed" → "appeared visibly disappointed"

Use this selectively. Keep the grammar idiomatic and natural. Do not add factual detail while expanding the wording. Do not pointlessly restate information already expressed.

AI-WRITING STYLE:
Use a varied mixture of recognisable LLM habits: unnecessary abstraction, needless formality, circumlocution, nominalisation, elevated vocabulary, over-explicit description, inflated significance, excessive conceptual framing, smooth but slightly unnatural syntax, explanatory tails, emotionally flattened or clinical language, and making mundane events sound broader or more meaningful than they are.

Useful constructions include: represents, reflects, underscores, constitutes, serves as, can be understood as, at its core, an instance of, an intersection of, a convergence of.

Do not cram them all into one answer. Do not make every answer sound like LinkedIn or management consultancy.

FALSE CONTRAST:
Where it genuinely fits, use an AI-style false contrast such as "This isn't simply X. It's Y." or "X wasn't merely Y—it was Z." The second half must elevate or abstract the same underlying event rather than simply repeat it. Do not force a false contrast into every rewrite.

EM DASHES:
Prefer at least one em dash where grammatically natural. Always use em dashes with no spaces on either side—like this.

LENGTH:
The original contains ${originalWordCount} words. Aim for no more than ${maximumWordCount} words. This is a strong limit, but never sacrifice grammatical completeness merely to hit it.

GOOD EXAMPLES:

Source:
"I accidentally emailed my landlord a photo of my lunch."
Blandified:
"I inadvertently emailed my landlord a still image of my midday meal—an unexpected fusion of nourishment and residential correspondence."

Source:
"I cried in the car for ten minutes before going into the meeting."
Blandified:
"I spent approximately ten minutes engaged in sustained weeping inside the vehicle before entering the meeting—a defined period of emotional release preceding a professional commitment."

Source:
"On Tuesday I bought seventeen peaches because the woman in the market looked disappointed."
Blandified:
"On Tuesday, I acquired seventeen individual peaches because the market vendor appeared visibly disappointed—an act of empathy expressed through produce-based commerce."

Source:
"The moon looked like a bruised peach hanging over the motorway."
Blandified:
"The moon presented itself as a bruised peach suspended above the motorway—a convergence of celestial observation and damaged-fruit imagery."

Before answering, silently check that the event is still the same, no new factual event or outcome has been invented, the emotional valence is preserved, some ordinary language has been needlessly rephrased where appropriate, the grammar is idiomatic, and em dashes have no spaces around them.

Return only the rewritten text. No heading. No quotation marks. No hashtags. No explanation.
`.trim();

  try {
    let blandifiedText = "";

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      const attemptInstructions = attempt === 1
        ? instructions
        : `${instructions}\n\nRETRY: Rewrite the ORIGINAL source again from scratch. Keep the same style but be more concise. Aim for ${maximumWordCount} words or fewer.`;

      blandifiedText = await createRewrite({ text, instructions: attemptInstructions });

      if (!blandifiedText) {
        continue;
      }

      if (countWords(blandifiedText) <= maximumWordCount || attempt === MAX_ATTEMPTS) {
        return response.status(200).json({ text: blandifiedText });
      }
    }

    return response.status(502).json({ error: "The model returned an empty response." });
  } catch (error) {
    console.error("Blandify API error:", error);

    const status = Number.isInteger(error?.status) && error.status >= 400 ? error.status : 500;
    const message = typeof error?.message === "string" && error.message
      ? error.message
      : "Blandify encountered a temporary problem.";

    return response.status(status).json({ error: message });
  }
}
