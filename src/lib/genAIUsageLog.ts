import Debug from "debug";
import type { CompletionUsage } from "openai/resources/completions.mjs";

import prisma from "@/prismadb";

const debug = Debug("bot:genAIUsageLog");

export async function logUsage(
  usageType: string,
  modelName: string,
  usage: CompletionUsage | undefined,
  user_id: number,
): Promise<void> {
  if (!usage) return;

  debug("%d %s tokens used for %s", usage.total_tokens, modelName, usageType);

  await prisma.genAITokenUsage.create({
    data: {
      user_id: user_id,
      request_type: usageType,
      model_name: modelName,
      prompt_tokens: usage.prompt_tokens,
      completion_tokens: usage.completion_tokens,
      total_tokens: usage.total_tokens,
    },
  });
}
