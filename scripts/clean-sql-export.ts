import { readFileSync, writeFileSync } from "fs";

// Clean the conversations SQL to remove template_id column
const conversationsSql = readFileSync(
  "/Users/leverate/Downloads/conversations_rows.sql",
  "utf-8"
);

// Step 1: Remove template_id from column list
let cleaned = conversationsSql.replace(
  /"template_id",\s*/g,
  ""
);

// Step 2: Remove the corresponding null value (appears after title)
// Pattern: ', null,' where null is the template_id value
cleaned = cleaned.replace(
  /,\s*null,\s*'openai/g,
  ", 'openai"
).replace(
  /,\s*null,\s*'anthropic/g,
  ", 'anthropic"
).replace(
  /,\s*null,\s*'gemini/g,
  ", 'gemini"
).replace(
  /,\s*null,\s*'deepseek/g,
  ", 'deepseek"
);

writeFileSync(
  "/Users/leverate/Downloads/conversations_rows_clean.sql",
  cleaned
);

console.log("✅ Cleaned conversations_rows.sql");
console.log("   - Removed template_id column from column list");
console.log("   - Removed corresponding null values");
console.log(
  "   - Saved to: /Users/leverate/Downloads/conversations_rows_clean.sql"
);
