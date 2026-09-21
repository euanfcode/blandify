import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MAX_WORDS = 250;

function countWords(value) {
  const trimmed = value.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed." });
  }

  const text =
    typeof request.body?.text === "string"
      ? request.body.text.trim()
      : "";

  if (!text) {
    return response.status(400).json({
      error: "No writing was supplied."
    });
  }

  if (countWords(text) > MAX_WORDS) {
    return response.status(400).json({
      error: "Please keep the original to 250 words or fewer."
    });
  }

  if (!process.env.OPENAI_API_KEY) {
    return response.status(500).json({
      error: "The OpenAI API key has not been configured."
    });
  }

  const originalWordCount = countWords(text);
  const maximumWordCount = Math.ceil(originalWordCount * 1.5);

  const instructions = `
You are Blandify.

Your job is to rewrite the user's text so that it sounds unmistakably AI-written while preserving what the user actually said.

This is a rewrite—not a summary, commentary, interpretation, article, LinkedIn post or creative expansion.

CORE RULE: INFLATE THE LANGUAGE, NOT THE INFORMATION.

Preserve:
- the same subject
- the same point of view
- the same facts
- the same people
- the same objects
- the same actions
- the same sequence
- the same explicit causes and relationships

Do not add:
- new facts
- new events
- new motivations
- new consequences
- new advice
- new context
- new emotional processing
- new lessons or morals
- new claims about why something matters

You may make an obvious implication already contained in the source sound absurdly elevated, but you must not invent a new interpretation.

STYLE

Make the writing feel like an over-polished general-purpose AI rewrite.

Prefer:
- unnecessary formality
- pompous synonym choices
- needless qualification
- over-precise sequencing
- slightly inflated abstraction
- awkwardly polished sentence structure
- redundant transitions
- generic explanatory phrasing
- emotionally flattened language
- phrases such as "approximately", "subsequently", "appeared to", "made the decision to", "inadvertently", "ultimately", "in many ways", "it is worth noting", where they genuinely fit

Do NOT default to business, startup, management-consultancy or LinkedIn jargon unless the source itself is about business or work.

Do NOT turn ordinary people into "stakeholders".
Do NOT turn ordinary actions into "strategies", "frameworks", "journeys", "opportunities", "content events" or similar unless the source itself supports that language.

The result should feel more formal, more generic, more overworked and more obviously machine-written than the original.

EM DASHES

Every rewrite must contain at least one em dash.
Always write em dashes with no spaces on either side—like this.
Never use spaces around an em dash.

AI-STYLE FALSE CONTRAST

Where the source naturally allows it, include one recognisably AI-style contrast or reframing construction.

Possible forms include:
- "It wasn't simply X. It was Y."
- "This wasn't just X. It was Y."
- "It's not X. It's Y."
- "X wasn't merely Y—it was Z."
- "X doesn't have a Y problem. It has a Z problem."

The second half should sound more elevated, formal or significant than the first while remaining grounded in the same information.

A good contrast often pompously reframes an explicit reason or obvious implication already present in the source.

Do not force a contrast when it would require inventing new information.

LENGTH

The original contains ${originalWordCount} words.
The rewrite must contain no more than ${maximumWordCount} words.
This is an absolute maximum, not a target.
Do not make the text longer simply by repeating the original in different words.

EXAMPLES

Source:
"I cried in the car for ten minutes before going into the meeting."

Blandified:
"I cried in the car for approximately ten minutes before subsequently going inside to attend the meeting—it wasn't simply a moment of crying. It was a sustained period of weeping before the meeting."

Source:
"On Tuesday I bought seventeen peaches because the woman in the market looked disappointed."

Blandified:
"On Tuesday, I made the decision to purchase seventeen peaches because the woman in the market appeared disappointed—it wasn't simply a fruit purchase. It was an attempt to comfort a sad vendor through commerce."

Source:
"I hate networking events. I stand near the crisps, talk to one person, then leave before anyone notices."

Blandified:
"I dislike networking events. I typically remain near the crisps, speak to one person and subsequently leave before anyone notices—an approach defined by minimal interaction and an early departure."

FINAL CHECK

Before returning the rewrite, silently check:
1. Have I preserved the original meaning and concrete details?
2. Have I added any fact, motive, consequence or explanation that was not present or clearly implied?
3. Does it sound absurdly AI-written rather than corporate for its own sake?
4. Is there at least one em dash with no spaces around it?
5. Is it within the maximum word count?

Return only the rewritten text.
No heading.
No quotation marks.
No hashtags.
No explanation.
`.trim();

  try {
    const result = await client.responses.create({
      model: "gpt-4.1-mini",
      instructions,
      input: text,
      max_output_tokens: 700
    });

    const blandifiedText = result.output_text?.trim();

    if (!blandifiedText) {
      console.error("OpenAI returned no output text:", result);

      return response.status(502).json({
        error: "The model returned an empty response."
      });
    }

    return response.status(200).json({
      text: blandifiedText
    });
  } catch (error) {
    console.error("Blandify API error:", error);

    const status =
      Number.isInteger(error?.status) && error.status >= 400
        ? error.status
        : 500;

    const message =
      typeof error?.message === "string"
        ? error.message
        : "Blandify encountered a temporary problem.";

    return response.status(status).json({
      error: message
    });
  }
}
