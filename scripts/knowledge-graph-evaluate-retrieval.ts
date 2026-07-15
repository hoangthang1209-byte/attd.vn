/**
 * Print Retrieval evaluation dataset + flag status (no writes).
 */
import {
  KNOWLEDGE_GRAPH_EVALUATION_CASES,
  evaluateGraphExpansionPreview,
} from "../src/features/knowledge-graph/knowledge-graph-evaluation";
import { isKnowledgeGraphExpansionEnabled } from "../src/features/ai-retrieval/sources/knowledge-graph-source";

async function main() {
  console.log(
    JSON.stringify(
      {
        productionExpansionFlag: isKnowledgeGraphExpansionEnabled(),
        cases: KNOWLEDGE_GRAPH_EVALUATION_CASES.map((c) => ({
          id: c.id,
          query: c.query,
          expectedPaths: c.expectedPaths.length,
        })),
        sampleComparisonContract: evaluateGraphExpansionPreview({
          caseId: "demo",
          query: "demo",
          baselineFactCount: 3,
          previewMatchedOn: ["graph:PRODUCT→SUITABLE_FOR→USE_CASE"],
          previewScopeEntityCount: 4,
          baselineContextChars: 100,
          previewContextChars: 140,
          expectedPaths: [
            {
              fromEntityType: "PRODUCT",
              relationshipType: "SUITABLE_FOR",
              toEntityType: "USE_CASE",
            },
          ],
          irrelevantPathHints: ["CUSTOMER"],
        }),
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
