import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter'; // To parse frontmatter

// Define a type for the registry entry for clarity
interface TestRegistryEntry {
  testCategory: string;
  testPattern: string;
  typescriptStatus: string;
  pythonStatus: string;
  otherLanguagesStatus: string;
}

interface TestRegistryData {
  frontmatter: Record<string, any>;
  registry: TestRegistryEntry[];
  patternsMarkdown: string;
  implementationGuideMarkdown: string;
}

// Helper function to parse the markdown table (simplified)
function parseMarkdownTable(markdownContent: string): TestRegistryEntry[] {
  const lines = markdownContent.split('\n');
  const entries: TestRegistryEntry[] = [];
  let inTable = false;
  let headerSkipped = false;

  for (const line of lines) {
    if (line.startsWith('|--')) { // Table header separator
      if (!inTable) inTable = true;
      headerSkipped = true;
      continue;
    }
    if (!inTable || !line.startsWith('|')) continue;
    if (!headerSkipped && inTable) { // Skip the actual header row text for this simple parser
        // A more robust parser would map columns by header name
        continue;
    }

    const cells = line.split('|').map(cell => cell.trim()).slice(1, -1); // Remove first and last empty cells from split

    if (cells.length >= 5) { // Ensure we have enough cells
      entries.push({
        testCategory: cells[0] || '',
        testPattern: cells[1] || '',
        typescriptStatus: cells[2] || '',
        pythonStatus: cells[3] || '',
        otherLanguagesStatus: cells[4] || '',
      });
    }
  }
  return entries;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TestRegistryData | { error: string }>
) {
  if (req.method === 'GET') {
    try {
      const registryFilePath = path.resolve(process.cwd(), '../../../core/orchestrator/docs/technical/AHIS_TEST_REGISTRY.md');
      const fileContents = fs.readFileSync(registryFilePath, 'utf8');
      
      const { data: frontmatter, content: markdownContent } = matter(fileContents);
      
      // Find the main requirements table
      // This is a simplified approach; a more robust solution might use a dedicated markdown parser
      const tableSection = markdownContent.match(/## Core Test Requirements Matrix([\s\S]*?)(\n##|\n#|$)/m);
      let registryEntries: TestRegistryEntry[] = [];

      if (tableSection && tableSection[1]) {
        registryEntries = parseMarkdownTable(tableSection[1]);
      }

      const patternsFilePath = path.resolve(process.cwd(), '../../../core/orchestrator/docs/technical/AHIS_TESTING_PATTERNS.md');
      const patternsMarkdown = fs.readFileSync(patternsFilePath, 'utf8');

      const implementationGuideFilePath = path.resolve(process.cwd(), '../../../core/orchestrator/docs/technical/AHIS_TEST_IMPLEMENTATION_GUIDE.md');
      const implementationGuideMarkdown = fs.readFileSync(implementationGuideFilePath, 'utf8');

      res.status(200).json({ 
        frontmatter, 
        registry: registryEntries, 
        patternsMarkdown,
        implementationGuideMarkdown 
      });
    } catch (error: any) {
      console.error('Error reading test registry:', error);
      res.status(500).json({ error: 'Failed to load test registry: ' + error.message });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
