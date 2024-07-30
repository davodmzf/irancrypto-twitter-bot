import { OpenAI } from "openai";
import { getENV } from "./env.js";
const openai = new OpenAI({
  organization: getENV("OPENAI_ORGANIZATION"),
  apiKey: getENV("OPENAI_API_KEY"),
  timeout: 20 * 1000, // Timeout is in ms
});
const MODEL=getENV("OPENAI_MODEL","gpt-3.5-turbo");

/**
 * Ask a question from Chat-GPT
 * @param {string[]} $messages
 * @returns {string[]}
 */
export async function ask($messages) {
  let result;
  // Newer Moodels usechat/completions
  if (MODEL.includes("gpt")) {
    result = await openai.chat.completions.create({
      messages: $messages,
      model: MODEL,
      max_tokens: MODEL.includes("gpt-4") ? 5000 : 3000, //The maximum number of tokens to generate in the completion.
      temperature: 0.5, //What sampling temperature to use, between 0 and 2. Higher values like 0.8 will make the output more random
    });
  } else {
    //Older models like text-davinci-003 and etc - not recommended at all because of finishing the length of text
    result = await openai.completions.create({
      model: MODEL,
      prompt: $messages.map((m) => m.content).join("\n"),
    });
  }
  if (!result.choices && result.choices.length === 0) {
    throw new Error("No response received");
  }

  return result.choices;
}

/**
 * Write tweet templates
 * @param {string} $subject
 * @returns {string}
 */
export async function writeTweet($subject) {
  const messages = [
    {
      role: "system",
      content: `You are a helpful content assistant in writing and drafting creative content.
      You are designed to generate a tweet template with eloquent text and unique incremental numbers between %1% and %n% for placeholders, where %n% represents the total number of variables used in the specific user prompt.
      Ensure that each generated tweet is concise (less than 200 characters) but may extend up to 220 characters if necessary to convey the information effectively.
      Each tweet should be unique, engaging, and use varied wording to capture attention.
      For prompts that require listing items, ensure that each item is clearly separated, preferably on a new line (\r\n) for clarity.`,
    },
    { role: "user", content: $subject },
  ];
  try {
    const result = await ask(messages);
    if (result.length > 0) {
      let $content=result[0].message.content;
      // Remove double quotes from the beginning and end of the string if they exist
      if ($content && $content.startsWith('"') && $content.endsWith('"')) {
        $content = $content.slice(1, -1);
      }
      return $content;
    }
    return null;
  } catch (err) {
    console.error(err);
    return null;
  }
}

/**
 * Generate dynamic captions for Instagram
 * @param {string} $subject
 * @returns {string}
 */
export async function writeCaption($subject) {
  const messages = [
    {
      role: "system",
      content: `Act as a Content Marketing Specialist.
        Create a rich caption with related hashtags (maximum 3) for instagram based on the subjects that are going to be provided by user.`,
    },
    { role: "user", content: $subject },
  ];
  try {
    const result = await ask(messages);
    if (result.length > 0) {
      let $content=result[0].message.content;
      // Remove double quotes from the beginning and end of the string if they exist
      if ($content && $content.startsWith('"') && $content.endsWith('"')) {
        $content = $content.slice(1, -1);
      }
      return $content;
    }
    return null;
  } catch (err) {
    console.error(err);
    return null;
  }
}