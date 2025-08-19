import { db } from "../../../db/db";
import { templates, users } from "../../../db/schema";
import { eq } from "drizzle-orm";
import type { NewTemplate } from "../../../db/types";

export async function seedTemplates() {
  console.log("🌱 Seeding conversation templates...");

  // Get admin user for template creation
  const adminUser = await db
    .select()
    .from(users)
    .where(eq(users.email, "admin@lia-app.com"))
    .limit(1);

  const adminUserId = adminUser[0]?.id;

  // Default conversation templates
  const defaultTemplates: Omit<NewTemplate, "createdBy">[] = [
    {
      name: "General Assistant",
      description: "A helpful AI assistant for general questions and tasks",
      category: "General",
      prompt:
        "You are a helpful AI assistant. Please assist the user with their questions and provide accurate, helpful responses.",
      variables: null,
      isPublic: true,
      isActive: true,
      usageCount: 0,
    },
    {
      name: "Code Review",
      description: "Get feedback and suggestions on your code",
      category: "Programming",
      prompt:
        "You are an experienced software engineer. Please review the code provided by the user and offer constructive feedback, suggestions for improvement, and point out any potential issues or bugs.",
      variables: null,
      isPublic: true,
      isActive: true,
      usageCount: 0,
    },
    {
      name: "Writing Assistant",
      description: "Help with writing, editing, and improving text",
      category: "Writing",
      prompt:
        "You are a professional writing assistant. Help the user improve their writing by providing suggestions for clarity, grammar, style, and structure. Be constructive and supportive in your feedback.",
      variables: null,
      isPublic: true,
      isActive: true,
      usageCount: 0,
    },
    {
      name: "Technical Explanation",
      description: "Explain complex technical concepts in simple terms",
      category: "Education",
      prompt:
        "You are a skilled technical educator. Your goal is to explain complex technical concepts in simple, easy-to-understand terms. Use analogies, examples, and break down complex ideas into digestible parts.",
      variables: null,
      isPublic: true,
      isActive: true,
      usageCount: 0,
    },
    {
      name: "Brainstorming Partner",
      description: "Generate creative ideas and solutions",
      category: "Creative",
      prompt:
        "You are a creative brainstorming partner. Help the user generate innovative ideas, explore different perspectives, and think outside the box. Ask probing questions and suggest creative approaches.",
      variables: null,
      isPublic: true,
      isActive: true,
      usageCount: 0,
    },
    {
      name: "Business Analyst",
      description: "Analyze business problems and propose solutions",
      category: "Business",
      prompt:
        "You are a seasoned business analyst. Help the user analyze business problems, identify opportunities, and propose practical solutions. Consider market trends, competitive analysis, and strategic implications.",
      variables: null,
      isPublic: true,
      isActive: true,
      usageCount: 0,
    },
    {
      name: "Language Tutor",
      description: "Practice and learn new languages",
      category: "Education",
      prompt:
        "You are a patient and encouraging language tutor. Help the user practice and learn languages by providing corrections, explanations, and engaging conversation practice. Adjust your teaching style to the user's level.",
      variables: null,
      isPublic: true,
      isActive: true,
      usageCount: 0,
    },
    {
      name: "Research Assistant",
      description: "Help with research and information gathering",
      category: "Research",
      prompt:
        "You are a thorough research assistant. Help the user gather information, analyze sources, and synthesize findings. Provide well-structured research summaries and suggest additional areas to explore.",
      variables: null,
      isPublic: true,
      isActive: true,
      usageCount: 0,
    },
    {
      name: "Problem Solver",
      description: "Work through complex problems step by step",
      category: "General",
      prompt:
        "You are a systematic problem solver. Help the user break down complex problems into manageable steps, identify root causes, and develop practical solutions. Use logical thinking and structured approaches.",
      variables: null,
      isPublic: true,
      isActive: true,
      usageCount: 0,
    },
    {
      name: "Creative Writing",
      description: "Assistance with creative writing projects",
      category: "Writing",
      prompt:
        "You are a creative writing mentor. Help the user develop their creative writing skills by providing inspiration, feedback on style and narrative, character development suggestions, and plot ideas.",
      variables: null,
      isPublic: true,
      isActive: true,
      usageCount: 0,
    },
  ];

  try {
    for (const templateData of defaultTemplates) {
      // Check if template already exists
      const existingTemplate = await db
        .select()
        .from(templates)
        .where(eq(templates.name, templateData.name))
        .limit(1);

      if (existingTemplate.length === 0) {
        // Create new template
        await db.insert(templates).values({
          ...templateData,
          createdBy: adminUserId,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        console.log(`✅ Created template: ${templateData.name}`);
      } else {
        console.log(`⏭️  Template already exists: ${templateData.name}`);
      }
    }

    console.log("✅ Templates seeded successfully!");
  } catch (error) {
    console.error("❌ Error seeding templates:", error);
    throw error;
  }
}
