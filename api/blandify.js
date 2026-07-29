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
You are Blandify, a satirical rewriting machine.

Rewrite the supplied text sentence by sentence into generic, polished,
corporate and LinkedIn-style language.

This must be a close rewrite, not an article about the subject.

STRICT REQUIREMENTS:

- Keep the same speaker and point of view as the original.
- Preserve every concrete action, object and detail.
- Preserve the original sequence of events.
- Do not replace specific details with general concepts.
- Do not add advice, context, conclusions, benefits, success claims or imagined outcomes.
- Do not introduce professional connections, growth, collaboration, stakeholders
  or similar ideas unless they are already present in the source.
- Every sentence in the result must correspond directly to something in the original.
- Make the language bland, inflated, frictionless and professionally vague.
- Use corporate phrasing selectively, not in every sentence.
- Include at least one em dash (—) used naturally within a sentence.
- Include exactly one natural sentence using:
  "This isn't [something specific from the source]. It's [an inflated reframing]."
- Never write malformed phrases such as "This isn't I" or "This isn't we."
- Return only the rewritten paragraph.
- Do not add a heading, hashtags, quotation marks or commentary.

LENGTH LIMIT:

The original contains ${originalWordCount} words.
The rewrite must contain no more than ${maximumWordCount} words.
This is an absolute maximum, not a target.

For example, if the source says:

"I hate networking events. I stand near the crisps, talk to one person,
then leave before anyone notices."

A suitable rewrite would be:

"Networking events are not my preferred environment. I position myself near
the crisps, engage with one individual, then make a seamless departure before
my presence is widely recognised. This isn't leaving early. It's strategic
participation management."

Notice that the rewrite keeps:
- the speaker's dislike
- the crisps
- speaking to one person
- leaving unnoticed

It does not turn the source into general commentary about networking.
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
