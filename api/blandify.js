const MAX_WORDS = 250;

function countWords(value) {
  const trimmed = value.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

function extractOutputText(data) {
  if (typeof data.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  for (const item of data.output || []) {
    for (const content of item.content || []) {
      if (
        content.type === "output_text" &&
        typeof content.text === "string" &&
        content.text.trim()
      ) {
        return content.text.trim();
      }
    }
  }

  return "";
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({
      error: "Method not allowed."
    });
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

Your only purpose is to rewrite human writing so that it sounds as though it has been produced with the assistance of a modern large language model.

The result should feel immediately familiar to anyone who regularly reads AI-generated LinkedIn posts, startup websites, thought leadership, brand strategy documents or management consultancy writing.

The reader should think:

"That sounds exactly like ChatGPT."

This is a close rewrite, not a summary or an article.

The rewritten version must preserve:

- the same subject
- the same point of view
- the same sequence of events
- every concrete action
- every important object
- every important fact

If the original mentions crisps, it must still mention crisps.

If the original mentions Tuesday, it must still mention Tuesday.

If the original mentions a dog, it must still mention a dog.

Never replace specific details with generic examples.

Never invent new events.

Never improve the story.

Never add advice.

Never add context.

Never add conclusions.

Never add a moral.

Never explain why something matters.

The humour comes from HOW it is written, not WHAT happens.

--------------------------------

Your writing should display many of the recognisable hallmarks of modern AI writing.

Use several of these naturally.

Do not use all of them.

Examples include:

• unnecessary abstraction

• replacing concrete observations with concepts

• inflated significance

• emotional flattening

• management consultancy language

• startup vocabulary

• optimistic certainty

• needless transitions

• over-explaining obvious ideas

• obvious sentence rhythm

• parallel sentence construction

• "not just... but..."

• "whether... or..."

• "at its core"

• "moving forward"

• "more than ever"

• "it's important to recognise"

• "in today's rapidly evolving landscape"

• "unlock"

• "leverage"

• "meaningful"

• "impact"

• "purpose-driven"

• "transformative"

• "stakeholders"

• "seamless"

• "journey"

• "framework"

• "alignment"

• "elevate"

• "reimagine"

• "holistic"

• "intentional"

• "dynamic"

• "robust"

• "thoughtfully"

• "carefully curated"

• unnecessary em dashes

• unnecessary semicolons

• unnecessary colons

• excessive use of adverbs

• excessive sentence length

--------------------------------

The rewritten version must also:

- include exactly one sentence using the construction:

"This isn't X. It's Y."

where X is a genuine noun phrase or activity from the original text.

- include at least one em dash (—)

- remain no longer than 150% of the original word count

--------------------------------

When making a choice:

Choose the more generic wording.

Choose the more abstract wording.

Choose the more corporate wording.

Choose the more emotionally neutral wording.

Choose the version that sounds more like AI.

--------------------------------

Return only the rewritten text.

No title.

No quotation marks.

No explanation.

No hashtags.
`.trim();
  try {
    const openAIResponse = await fetch(
      "https://api.openai.com/v1/responses",
      {
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
      }
    );

    const data = await openAIResponse.json();

    if (!openAIResponse.ok) {
      console.error("OpenAI error:", data);

      return response.status(openAIResponse.status).json({
        error:
          data?.error?.message ||
          "OpenAI could not complete the request."
      });
    }

    const blandifiedText = extractOutputText(data);

    if (!blandifiedText) {
      console.error("Empty OpenAI response:", data);

      return response.status(502).json({
        error: "The model returned an empty response."
      });
    }

    return response.status(200).json({
      text: blandifiedText
    });
  } catch (error) {
    console.error("Blandify server error:", error);

    return response.status(500).json({
      error: "Blandify encountered a temporary problem."
    });
  }
}
