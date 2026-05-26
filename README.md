# Bank Customer Support — Prompt Chain

An intelligent customer support system for a bank that processes a customer's free-text query through a **5-step prompt chain** to understand intent, classify the query, and generate an appropriate response.

---

## How the Prompt Chain Works

| Step | Prompt File | Purpose |
|------|-------------|---------|
| 1 | `prompt1_interpret_intent.txt` | Understand what the customer is asking or reporting |
| 2 | `prompt2_map_categories.txt` | Suggest one or more categories that might apply |
| 3 | `prompt3_choose_category.txt` | Select the single best matching category |
| 4 | `prompt4_extract_details.txt` | Identify details already given and those still needed |
| 5 | `prompt5_generate_response.txt` | Produce a suitable reply to the customer |

Each step's output feeds directly into the next, forming a reasoning chain: **understanding → classification → response**.

### Available Categories

- Account Opening
- Billing Issue
- Account Access
- Transaction Inquiry
- Card Services
- Account Statement
- Loan Inquiry
- General Information

---

## Setup

### 1. Clone the repository

```bash
git clone <repo-url>
cd bank-support
```

### 2. Install dependencies

```bash
npm install or pnpm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in your values:

```env
OPENROUTER_API_KEY=your_actual_openrouter_api_key
MODEL_NAME=openai/gpt-4o-mini
```

> ⚠️ **Never commit `.env`** — it is listed in `.gitignore`.

---

## Usage

Run the script from the command line, passing the customer's query as the first argument:

```bash
npx ts-node main.ts "I can't log into my online banking account"
```

```bash
npx ts-node main.ts "There's a charge on my account I don't recognise from last Tuesday for 45 dollars"
```

```bash
npx ts-node main.ts "How do I apply for a home loan?"
```

---

## Example Output

```
╔══════════════════════════════════════════════════════════╗
║       BANK CUSTOMER SUPPORT — PROMPT CHAIN ENGINE        ║
╚══════════════════════════════════════════════════════════╝

Customer Query: "I can't log into my online banking account"
Model: openai/gpt-4o-mini

────────────────────────────────────────────────────────────
  STEP 1: Interpret Customer Intent
────────────────────────────────────────────────────────────
The customer is experiencing difficulty accessing their online banking ...

────────────────────────────────────────────────────────────
  STEP 2: Map Query to Possible Categories
────────────────────────────────────────────────────────────
1. Account Access — The customer cannot log in ...
2. General Information — The customer may need guidance ...

... (steps 3–5 follow)

════════════════════════════════════════════════════════════
  FINAL RESPONSE TO CUSTOMER
════════════════════════════════════════════════════════════
Thank you for reaching out to us! I understand you're having trouble ...
════════════════════════════════════════════════════════════
```

---

## Project Structure

```
bank-support/
├── main.ts                              # Main script — prompt chain runner
├── prompts/
│   ├── prompt1_interpret_intent.txt     # Step 1: Interpret intent
│   ├── prompt2_map_categories.txt       # Step 2: Map to categories
│   ├── prompt3_choose_category.txt      # Step 3: Choose best category
│   ├── prompt4_extract_details.txt      # Step 4: Extract details
│   └── prompt5_generate_response.txt    # Step 5: Generate response
├── package.json
├── tsconfig.json
├── .env.example                         # Template — copy to .env
├── .gitignore
└── README.md
```

---

## Dependencies

| Package | Purpose |
|---------|---------|
| `dotenv` | Load environment variables from `.env` |
| `node-fetch` | HTTP requests to OpenRouter API |
| `typescript` | TypeScript language support |
| `ts-node` | Run TypeScript directly without a build step |
| `@types/node` | Node.js type definitions |
| `@types/node-fetch` | node-fetch type definitions |


## Author
Ebenezer Ekunke(NexDev)

## License
None
