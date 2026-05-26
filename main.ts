import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config();

// ── Configuration ──

const API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL_NAME = process.env.MODEL_NAME;

if (!API_KEY) {
  console.error("Error: OPENROUTER_API_KEY is not set in your .env file.");
  process.exit(1);
}
if (!MODEL_NAME) {
  console.error("Error: MODEL_NAME is not set in your .env file.");
  process.exit(1);
}

const PROMPTS_DIR = path.join(__dirname, "prompts");
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// ── Types ──

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  error?: {
    message: string;
  };
}

// ── Helpers ──

function loadPrompt(filename: string): string {
  const filepath = path.join(PROMPTS_DIR, filename);
  if (!fs.existsSync(filepath)) {
    throw new Error(`Prompt file not found: ${filepath}`);
  }
  return fs.readFileSync(filepath, "utf-8").trim();
}

function fillTemplate(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  return result;
}

async function callLLM(userMessage: string): Promise<string> {
  const messages: Message[] = [{ role: "user", content: userMessage }];

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL_NAME,
      messages,
      max_tokens: 1024,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error [${response.status}]: ${errorText}`);
  }

  const data = (await response.json()) as OpenRouterResponse;

  if (data.error) {
    throw new Error(`OpenRouter returned an error: ${data.error.message}`);
  }

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("No content in API response.");
  }

  return content.trim();
}

function printStep(stepNumber: number, title: string, output: string): void {
  const divider = "─".repeat(60);
  console.log(`\n${divider}`);
  console.log(`  STEP ${stepNumber}: ${title}`);
  console.log(divider);
  console.log(output);
}

// ── Prompt-chain steps ──

async function step1InterpretIntent(customerQuery: string): Promise<string> {
  const template = loadPrompt("prompt1_interpret_intent.txt");
  const prompt = fillTemplate(template, { CUSTOMER_QUERY: customerQuery });
  const result = await callLLM(prompt);
  printStep(1, "Interpret Customer Intent", result);
  return result;
}

async function step2MapCategories(interpretedIntent: string): Promise<string> {
  const template = loadPrompt("prompt2_map_categories.txt");
  const prompt = fillTemplate(template, {
    INTERPRETED_INTENT: interpretedIntent,
  });
  const result = await callLLM(prompt);
  printStep(2, "Map Query to Possible Categories", result);
  return result;
}

async function step3ChooseCategory(
  possibleCategories: string,
): Promise<string> {
  const template = loadPrompt("prompt3_choose_category.txt");
  const prompt = fillTemplate(template, {
    POSSIBLE_CATEGORIES: possibleCategories,
  });
  const result = await callLLM(prompt);
  printStep(3, "Choose the Most Appropriate Category", result);
  return result;
}

async function step4ExtractDetails(
  customerQuery: string,
  chosenCategoryBlock: string,
): Promise<{
  raw: string;
  category: string;
  detailsProvided: string;
  detailsNeeded: string;
  urgency: string;
}> {
  // Parse category name from the block produced by step 3
  const categoryMatch = chosenCategoryBlock.match(/CHOSEN CATEGORY:\s*(.+)/i);
  const chosenCategory = categoryMatch
    ? categoryMatch[1].trim()
    : chosenCategoryBlock.trim();

  const template = loadPrompt("prompt4_extract_details.txt");
  const prompt = fillTemplate(template, {
    CUSTOMER_QUERY: customerQuery,
    CHOSEN_CATEGORY: chosenCategory,
  });
  const result = await callLLM(prompt);
  printStep(4, "Extract Additional Details", result);

  // Parse the structured output for use in step 5
  const detailsProvidedMatch = result.match(
    /DETAILS ALREADY PROVIDED:\s*([\s\S]*?)(?=ADDITIONAL DETAILS NEEDED:|$)/i,
  );
  const detailsNeededMatch = result.match(
    /ADDITIONAL DETAILS NEEDED:\s*([\s\S]*?)(?=URGENCY LEVEL:|$)/i,
  );
  const urgencyLevelMatch = result.match(/URGENCY LEVEL:\s*(.+)/i);

  return {
    raw: result,
    category: chosenCategory,
    detailsProvided: detailsProvidedMatch
      ? detailsProvidedMatch[1].trim()
      : "Not specified",
    detailsNeeded: detailsNeededMatch
      ? detailsNeededMatch[1].trim()
      : "Not specified",
    urgency: urgencyLevelMatch ? urgencyLevelMatch[1].trim() : "Medium",
  };
}

async function step5GenerateResponse(
  customerQuery: string,
  chosenCategory: string,
  detailsProvided: string,
  detailsNeeded: string,
  urgencyLevel: string,
): Promise<string> {
  const template = loadPrompt("prompt5_generate_response.txt");
  const prompt = fillTemplate(template, {
    CUSTOMER_QUERY: customerQuery,
    CHOSEN_CATEGORY: chosenCategory,
    DETAILS_PROVIDED: detailsProvided,
    DETAILS_NEEDED: detailsNeeded,
    URGENCY_LEVEL: urgencyLevel,
  });
  const result = await callLLM(prompt);
  printStep(5, "Generate Customer Response", result);
  return result;
}

// ── Main entry point ──

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error(
      'Usage: ts-node main.ts "<customer query>"\n' +
        'Example: ts-node main.ts "I cannot log into my account"',
    );
    process.exit(1);
  }

  const customerQuery = args.join(" ");

  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║       BANK CUSTOMER SUPPORT — PROMPT CHAIN ENGINE        ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log(`\nCustomer Query: "${customerQuery}"`);
  console.log(`Model: ${MODEL_NAME}`);

  // Run the 5-step chain
  const interpretedIntent = await step1InterpretIntent(customerQuery);
  const possibleCategories = await step2MapCategories(interpretedIntent);
  const chosenCategoryBlock = await step3ChooseCategory(possibleCategories);
  const { category, detailsProvided, detailsNeeded, urgency } =
    await step4ExtractDetails(customerQuery, chosenCategoryBlock);
  const finalResponse = await step5GenerateResponse(
    customerQuery,
    category,
    detailsProvided,
    detailsNeeded,
    urgency,
  );

  // Print final summary
  const divider = "═".repeat(60);
  console.log(`\n${divider}`);
  console.log("FINAL RESPONSE TO CUSTOMER");
  console.log(divider);
  console.log(finalResponse);
  console.log(`${divider}\n`);
}

main().catch((err) => {
  console.error("\n❌ Fatal error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
