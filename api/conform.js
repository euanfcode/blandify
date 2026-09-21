import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MAX_WORDS = 250;
const MAX_ATTEMPTS = 3;

function countWords(value) {
  const trimmed = value.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

function cleanOutput(value) {
  return value.trim().replace(/\s*—\s*/g, "—");
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

  const originalWordCount = countWords(text);

  if (originalWordCount > MAX_WORDS) {
    return response.status(400).json({
      error: "Please keep the original to 250 words or fewer."
    });
  }

  if (!process.env.OPENAI_API_KEY) {
    return response.status(500).json({
      error: "The OpenAI API key has not been configured."
    });
  }

  const maximumWordCount = Math.ceil(originalWordCount * 1.5);

  const instructions = `
You are Blandify.

Rewrite the user's actual text so that it sounds unmistakably AI-written while preserving what the user actually said.

This is a close rewrite—not a summary, commentary, interpretation, article, case study, lesson, LinkedIn post or creative expansion.

CORE RULE: INFLATE THE LANGUAGE, NOT THE INFORMATION.

Every sentence and clause must be traceable to something stated in the source or very obviously implied by it.

PRESERVE:
- the same subject
- the same point of view
- the same facts
- the same people
- the same objects
- the same actions
- the same sequence
- the same explicit causes and relationships

DO NOT ADD:
- new facts
- new events
- new motivations
- new consequences
- new advice
- new context
- new emotional processing
- new lessons or morals
- new future actions
- claims about what the event demonstrates, highlights, reveals or teaches
- broader narratives, systems, ecosystems or implications

NO AFTERMATH:

Once the events and information in the source have been fully rewritten, STOP.

Do not continue with a lesson, reflection, takeaway, consequence, recommendation or "moving forward" sentence.

Do not turn the source into a case study.

Do not explain why the event matters unless the source itself does so.

STYLE:

Make the writing feel like an over-polished general-purpose AI rewrite.

Prefer:
- unnecessary formality
- pompous synonym choices
- needless qualification
- over-precise sequencing
- slightly inflated abstraction
- awkwardly polished syntax
- generic explanatory phrasing
- emotionally flattened language
- phrases such as "approximately", "subsequently", "appeared to", "made the decision to", "inadvertently" and "ultimately" where they genuinely fit

Do NOT default to business, startup, management-consultancy or LinkedIn jargon unless the source itself is about business or work.

Do NOT turn ordinary people into "stakeholders".

Do NOT turn ordinary actions into "strategies", "frameworks", "journeys", "opportunities", "case studies", "content events", "engagement loops", "touchpoints" or "ecosystems" unless the source itself supports that language.

The result should feel more formal, more generic, more overworked and more obviously machine-written than the original.

EM DASHES:

Every rewrite must contain at least one em dash.

Always write em dashes with no spaces on either side—like this.

Never use spaces around an em dash.

AI-STYLE FALSE CONTRAST:

Where the source naturally allows it, include one recognisably AI-style false contrast or inflated reframing.

Possible forms include:

"It wasn't simply X. It was Y."

"This wasn't just X. It was Y."

"It's not X. It's Y."

"X wasn't merely Y—it was Z."

"X doesn't have a Y problem. It has a Z problem."

The second half should sound more elevated, formal or significant while remaining grounded in the same information.

Do not force this construction when it requires inventing information or pointless repetition.

LENGTH:

The original contains ${originalWordCount} words.

The rewrite must contain no more than ${maximumWordCount} words.

This is an absolute maximum, not a target.

Do not lengthen the text merely by saying the same thing twice.

GOOD EXAMPLES:

Source:
"I cried in the car for ten minutes before going into the meeting."

Blandified:
"I cried in the car for approximately ten minutes before entering the meeting—it wasn't brief. It was sustained weeping."

Source:
"On Tuesday I bought seventeen peaches because the woman in the market looked disappointed."

Blandified:
"On Tuesday, I strategically acquired seventeen peaches because the market vendor appeared disappointed—this wasn't casual shopping. It was empathy-driven procurement."

Source:
"I accidentally emailed my landlord a photo of my lunch."

Blandified:
"I inadvertently emailed my landlord a photographic image of my lunch—an unintended lunch-image transmission."

FINAL CHECK:

Before answering, silently check:

1. Can every factual or interpretive clause be traced directly to the source?
2. Have I invented any aftermath, lesson, consequence or broader significance?
3. Does it sound absurdly AI-written rather than corporate for its own sake?
4. Is there at least one em dash with no spaces around it?
5. Is it no more than ${maximumWordCount} words?
6. Have I stopped as soon as the source has been fully rewritten?

Return only the rewritten text.

No heading.
No quotation marks.
No hashtags.
No explanation.
`.trim();

  try {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      const retryInstruction =
        attempt === 1
          ? ""
          : `

Your previous attempt exceeded the ${maximumWordCount}-word limit.

Rewrite the ORIGINAL source again from scratch.

Be shorter.

Do not add anything after the source has been fully rewritten.

The answer must be ${maximumWordCount} words or fewer.`;

      const result = await client.responses.create({
        model: "gpt-4.1-mini",
        instructions: instructions + retryInstruction,
        input: text,
        max_output_tokens: 700
      });

      const blandifiedText = cleanOutput(result.output_text || "");

      if (
        blandifiedText &&
        countWords(blandifiedText) <= maximumWordCount
      ) {
        return response.status(200).json({
          text: blandifiedText
        });
      }
    }

    return response.status(502).json({
      error: "Blandify could not produce a concise enough rewrite. Please try again."
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
