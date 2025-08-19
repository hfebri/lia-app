import { eq, desc, asc, count, and, sql } from "drizzle-orm";
import { db } from "../../../db/db";
import { templates, users, conversations } from "../../../db/schema";
import type {
  Template,
  NewTemplate,
  TemplateWithUsage,
  PaginationParams,
} from "../../../db/types";

// Get template by ID
export async function getTemplateById(id: string): Promise<Template | null> {
  const result = await db
    .select()
    .from(templates)
    .where(eq(templates.id, id))
    .limit(1);
  return result[0] || null;
}

// Get template with usage statistics
export async function getTemplateWithUsage(
  id: string
): Promise<TemplateWithUsage | null> {
  const template = await db.query.templates.findFirst({
    where: eq(templates.id, id),
    with: {
      creator: {
        columns: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!template) return null;

  // Get usage count from conversations
  const usageResult = await db
    .select({ count: count() })
    .from(conversations)
    .where(eq(conversations.templateId, id));

  return {
    ...template,
    usageCount: usageResult[0].count,
  };
}

// Create new template
export async function createTemplate(
  templateData: NewTemplate
): Promise<Template> {
  const result = await db
    .insert(templates)
    .values({
      ...templateData,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();
  return result[0];
}

// Update template
export async function updateTemplate(
  id: string,
  templateData: Partial<NewTemplate>
): Promise<Template | null> {
  const result = await db
    .update(templates)
    .set({
      ...templateData,
      updatedAt: new Date(),
    })
    .where(eq(templates.id, id))
    .returning();
  return result[0] || null;
}

// Delete template (soft delete by setting isActive to false)
export async function deleteTemplate(id: string): Promise<boolean> {
  const result = await db
    .update(templates)
    .set({
      isActive: false,
      updatedAt: new Date(),
    })
    .where(eq(templates.id, id))
    .returning();
  return result.length > 0;
}

// Get all active public templates
export async function getPublicTemplates(params: PaginationParams = {}) {
  const {
    page = 1,
    limit = 20,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = params;
  const offset = (page - 1) * limit;

  const orderBy =
    sortOrder === "asc"
      ? asc(templates[sortBy as keyof typeof templates])
      : desc(templates[sortBy as keyof typeof templates]);

  const [templateList, totalCount] = await Promise.all([
    db
      .select()
      .from(templates)
      .where(and(eq(templates.isPublic, true), eq(templates.isActive, true)))
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset),
    db
      .select({ count: count() })
      .from(templates)
      .where(and(eq(templates.isPublic, true), eq(templates.isActive, true))),
  ]);

  return {
    templates: templateList,
    total: totalCount[0].count,
    page,
    limit,
    totalPages: Math.ceil(totalCount[0].count / limit),
  };
}

// Get templates by category
export async function getTemplatesByCategory(
  category: string,
  params: PaginationParams = {}
) {
  const { page = 1, limit = 20, sortOrder = "desc" } = params;
  const offset = (page - 1) * limit;

  const orderBy =
    sortOrder === "asc" ? asc(templates.createdAt) : desc(templates.createdAt);

  const [templateList, totalCount] = await Promise.all([
    db
      .select()
      .from(templates)
      .where(
        and(
          eq(templates.category, category),
          eq(templates.isPublic, true),
          eq(templates.isActive, true)
        )
      )
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset),
    db
      .select({ count: count() })
      .from(templates)
      .where(
        and(
          eq(templates.category, category),
          eq(templates.isPublic, true),
          eq(templates.isActive, true)
        )
      ),
  ]);

  return {
    templates: templateList,
    total: totalCount[0].count,
    page,
    limit,
    totalPages: Math.ceil(totalCount[0].count / limit),
  };
}

// Get templates created by user
export async function getTemplatesByUser(
  userId: string,
  params: PaginationParams = {}
) {
  const { page = 1, limit = 20, sortOrder = "desc" } = params;
  const offset = (page - 1) * limit;

  const orderBy =
    sortOrder === "asc" ? asc(templates.createdAt) : desc(templates.createdAt);

  const [templateList, totalCount] = await Promise.all([
    db
      .select()
      .from(templates)
      .where(and(eq(templates.createdBy, userId), eq(templates.isActive, true)))
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset),
    db
      .select({ count: count() })
      .from(templates)
      .where(
        and(eq(templates.createdBy, userId), eq(templates.isActive, true))
      ),
  ]);

  return {
    templates: templateList,
    total: totalCount[0].count,
    page,
    limit,
    totalPages: Math.ceil(totalCount[0].count / limit),
  };
}

// Search templates by name or description
export async function searchTemplates(
  searchTerm: string,
  params: PaginationParams = {}
) {
  const { page = 1, limit = 20 } = params;
  const offset = (page - 1) * limit;

  const [templateList, totalCount] = await Promise.all([
    db
      .select()
      .from(templates)
      .where(
        and(
          sql`(${templates.name} ILIKE ${"%" + searchTerm + "%"} OR ${
            templates.description
          } ILIKE ${"%" + searchTerm + "%"})`,
          eq(templates.isPublic, true),
          eq(templates.isActive, true)
        )
      )
      .orderBy(desc(templates.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: count() })
      .from(templates)
      .where(
        and(
          sql`(${templates.name} ILIKE ${"%" + searchTerm + "%"} OR ${
            templates.description
          } ILIKE ${"%" + searchTerm + "%"})`,
          eq(templates.isPublic, true),
          eq(templates.isActive, true)
        )
      ),
  ]);

  return {
    templates: templateList,
    total: totalCount[0].count,
    page,
    limit,
    totalPages: Math.ceil(totalCount[0].count / limit),
  };
}

// Get popular templates (most used)
export async function getPopularTemplates(
  limit: number = 10
): Promise<TemplateWithUsage[]> {
  const templatesWithUsage = await db
    .select({
      id: templates.id,
      name: templates.name,
      description: templates.description,
      category: templates.category,
      prompt: templates.prompt,
      variables: templates.variables,
      isPublic: templates.isPublic,
      isActive: templates.isActive,
      usageCount: templates.usageCount,
      createdBy: templates.createdBy,
      createdAt: templates.createdAt,
      updatedAt: templates.updatedAt,
      conversationCount: count(conversations.id),
    })
    .from(templates)
    .leftJoin(conversations, eq(templates.id, conversations.templateId))
    .where(and(eq(templates.isPublic, true), eq(templates.isActive, true)))
    .groupBy(
      templates.id,
      templates.name,
      templates.description,
      templates.category,
      templates.prompt,
      templates.variables,
      templates.isPublic,
      templates.isActive,
      templates.usageCount,
      templates.createdBy,
      templates.createdAt,
      templates.updatedAt
    )
    .orderBy(desc(count(conversations.id)))
    .limit(limit);

  return templatesWithUsage.map((template) => ({
    ...template,
    usageCount: template.conversationCount,
  }));
}

// Get template categories with counts
export async function getTemplateCategories(): Promise<
  { category: string; count: number }[]
> {
  const result = await db
    .select({
      category: templates.category,
      count: count(),
    })
    .from(templates)
    .where(and(eq(templates.isPublic, true), eq(templates.isActive, true)))
    .groupBy(templates.category)
    .orderBy(desc(count()));

  return result;
}

// Get all templates (admin only)
export async function getAllTemplates(params: PaginationParams = {}) {
  const {
    page = 1,
    limit = 20,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = params;
  const offset = (page - 1) * limit;

  const orderBy =
    sortOrder === "asc"
      ? asc(templates[sortBy as keyof typeof templates])
      : desc(templates[sortBy as keyof typeof templates]);

  const [templateList, totalCount] = await Promise.all([
    db.query.templates.findMany({
      limit,
      offset,
      orderBy: [orderBy],
      with: {
        creator: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),
    db.select({ count: count() }).from(templates),
  ]);

  return {
    templates: templateList,
    total: totalCount[0].count,
    page,
    limit,
    totalPages: Math.ceil(totalCount[0].count / limit),
  };
}

// Update template visibility
export async function updateTemplateVisibility(
  id: string,
  isPublic: boolean
): Promise<Template | null> {
  return updateTemplate(id, { isPublic });
}

// Increment template usage count
export async function incrementTemplateUsage(id: string): Promise<void> {
  await db
    .update(templates)
    .set({
      usageCount: sql`${templates.usageCount} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(templates.id, id));
}
