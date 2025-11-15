import { analyzeChunk } from "./gpt.js";

export const flagWeights = {
  "Vague Terms": 15,
  "Hidden/Excessive Obligations": 10,
  "Restricted or Missing Rights": 10,
  "Financial Issues": 15,
  "Misused Clauses": 5,
  "Dispute Gaps": 5
};

function splitIntoChunks(text, maxWords = 500) {
  const sentences = text.match(/[^\.!\?]+[\.!\?]+/g) || [];
  const chunks = [];
  let currentChunk = "";

  for (const sentence of sentences) {
    const wordCount = sentence.trim().split(/\s+/).length;
    const currentCount = currentChunk.split(/\s+/).length;

    if (currentCount + wordCount > maxWords) {
      if (currentChunk) chunks.push(currentChunk.trim());
      currentChunk = sentence.trim();
    } else {
      currentChunk += (currentChunk ? " " : "") + sentence.trim();
    }
  }

  if (currentChunk) chunks.push(currentChunk.trim());
  return chunks;
}

export async function analyzeContract(contractText) {
  const chunks = splitIntoChunks(contractText);

  const chunkAnalyses = await Promise.all(
    chunks.map(async (chunk) => {
      const analysis = await analyzeChunk(chunk);
      return analysis.flagged ? analysis : null;
    })
  );

  const validAnalyses = chunkAnalyses.filter(Boolean);

  // Extract company name from first chunk that has it
  let companyName = null;
  for (const analysis of validAnalyses) {
    if (analysis.flagged?.companyName) {
      companyName = analysis.flagged.companyName;
      break;
    }
  }

  const mergedFlags = mergeAnalyses(validAnalyses);
  const susScore = computeSusScore(mergedFlags);
  return { flagged: mergedFlags, susScore, companyName };
}

function mergeAnalyses(analyses) {
  const mergedFlags = {};

  for (const analysis of analyses) {
    for (const [category, issues] of Object.entries(analysis.flagged || {})) {
      // Skip companyName field, it's not a category
      if (category === "companyName") continue;

      if (!mergedFlags[category]) mergedFlags[category] = [];
      mergedFlags[category].push(...issues);
    }
  }

  return mergedFlags;
}

function computeSusScore(flags) {
  if (!flags) return 0;

  let rawScore = 0;
  let maxPossibleScore = 0;

  for (const [category, issues] of Object.entries(flags)) {
    const weight = flagWeights[category] || 0;
    for (const issue of issues) {
      rawScore += issue.severity * weight;
    }
    maxPossibleScore += 5 * weight * (issues.length || 1);
  }

  return maxPossibleScore ? (rawScore / maxPossibleScore) * 100 : 0;
}

