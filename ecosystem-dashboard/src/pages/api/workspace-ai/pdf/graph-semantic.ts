/**
 * Semantic Knowledge Graph API
 * Extracts concepts, topics, insights, chapters and their relationships from document content
 * Uses LLM to analyze text and build meaningful knowledge graph
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const LLM_API_URL = process.env.LLM_API_URL || 'http://localhost:8000/v1';

interface SemanticNode {
  id: string;
  name: string;
  type: 'document' | 'chapter' | 'concept' | 'topic' | 'insight' | 'example' | 'definition' | 'technique';
  description?: string;
  val: number;
  color: string;
  metadata?: Record<string, any>;
}

interface SemanticLink {
  source: string;
  target: string;
  type: string;
  label: string;
  weight: number;
}

const NODE_COLORS: Record<string, string> = {
  document: '#3b82f6',   // Blue
  chapter: '#8b5cf6',    // Purple
  concept: '#10b981',    // Green
  topic: '#ec4899',      // Pink
  insight: '#f59e0b',    // Amber
  example: '#06b6d4',    // Cyan
  definition: '#6366f1', // Indigo
  technique: '#14b8a6',  // Teal
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      workspace_id = 'my_workspace',
      document_name,
      use_cache = 'true'
    } = req.query;

    const collection_name = `workspace_${workspace_id}`;
    const cacheKey = `semantic_graph_${collection_name}_${document_name || 'all'}`;
    
    // Check cache first
    const cacheFile = path.join(os.tmpdir(), `${cacheKey}.json`);
    if (use_cache === 'true' && fs.existsSync(cacheFile)) {
      const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
      const cacheAge = Date.now() - cached.timestamp;
      // Cache valid for 1 hour
      if (cacheAge < 3600000) {
        return res.status(200).json(cached.data);
      }
    }

    // Extract semantic graph from document content
    const result = await buildSemanticGraph(
      collection_name,
      document_name as string | undefined
    );

    // Cache result
    fs.writeFileSync(cacheFile, JSON.stringify({
      timestamp: Date.now(),
      data: result
    }));

    return res.status(200).json(result);

  } catch (error: any) {
    console.error('[Semantic Graph API] Error:', error);
    return res.status(500).json({ 
      error: 'Failed to build semantic graph',
      message: error.message 
    });
  }
}

async function buildSemanticGraph(
  collection_name: string,
  document_name?: string
): Promise<any> {
  // First, get document chunks from Milvus
  const chunks = await getDocumentChunks(collection_name, document_name);
  
  if (chunks.length === 0) {
    return { nodes: [], links: [], stats: { total_nodes: 0, total_links: 0 } };
  }

  // Extract topics/themes from content (not page-based chapters)
  const topics = extractTopicsFromContent(chunks);
  
  // Extract concepts using keyword extraction
  const concepts = extractConcepts(chunks);
  
  // Build the graph
  const nodes: SemanticNode[] = [];
  const links: SemanticLink[] = [];
  const nodeIds = new Set<string>();

  // Add document node
  const docName = chunks[0]?.filename || 'Document';
  const docId = 'doc_main';
  nodes.push({
    id: docId,
    name: docName.replace('.pdf', '').replace(/-/g, ' '),
    type: 'document',
    val: 60,
    color: NODE_COLORS.document,
    metadata: { chunk_count: chunks.length }
  });
  nodeIds.add(docId);

  // Add topic nodes (these are the major themes in the document)
  topics.forEach((topic, idx) => {
    const topicId = `topic_${topic.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    nodes.push({
      id: topicId,
      name: topic.title,
      type: 'topic',
      description: topic.description,
      val: 30 + Math.min(topic.relevance / 10, 20),
      color: NODE_COLORS.topic,
      metadata: { relevance: topic.relevance, keywords: topic.keywords }
    });
    nodeIds.add(topicId);
    
    // Link topic to document
    links.push({
      source: docId,
      target: topicId,
      type: 'covers',
      label: 'explores',
      weight: 3
    });

    // Link related topics (adjacent in relevance order often relate)
    if (idx > 0) {
      const prevTopicId = `topic_${topics[idx - 1].title.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      links.push({
        source: prevTopicId,
        target: topicId,
        type: 'related',
        label: 'connects to',
        weight: 1
      });
    }
  });

  // Add concept nodes and link to relevant topics
  concepts.forEach((concept) => {
    const conceptId = `concept_${concept.name.toLowerCase().replace(/\s+/g, '_')}`;
    
    if (!nodeIds.has(conceptId)) {
      nodes.push({
        id: conceptId,
        name: concept.name,
        type: concept.type as any,
        description: concept.description,
        val: 12 + Math.min(concept.frequency * 1.5, 18),
        color: NODE_COLORS[concept.type] || NODE_COLORS.concept,
        metadata: { frequency: concept.frequency }
      });
      nodeIds.add(conceptId);
    }

    // Link concept to relevant topics based on keyword matching
    topics.forEach((topic) => {
      const topicId = `topic_${topic.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      const conceptLower = concept.name.toLowerCase();
      
      // Check if concept relates to this topic's keywords
      const isRelated = topic.keywords.some((kw: string) => 
        conceptLower.includes(kw.toLowerCase()) || kw.toLowerCase().includes(conceptLower)
      );
      
      if (isRelated && nodeIds.has(topicId)) {
        links.push({
          source: topicId,
          target: conceptId,
          type: 'includes',
          label: 'involves',
          weight: 2
        });
      }
    });
  });

  // Add concept-to-concept relationships
  const conceptRelations = findConceptRelations(concepts);
  conceptRelations.forEach((rel) => {
    const sourceId = `concept_${rel.source.toLowerCase().replace(/\s+/g, '_')}`;
    const targetId = `concept_${rel.target.toLowerCase().replace(/\s+/g, '_')}`;
    
    if (nodeIds.has(sourceId) && nodeIds.has(targetId)) {
      links.push({
        source: sourceId,
        target: targetId,
        type: rel.type,
        label: rel.label,
        weight: rel.weight
      });
    }
  });

  return {
    nodes,
    links,
    stats: {
      total_nodes: nodes.length,
      total_links: links.length,
      documents: 1,
      topics: topics.length,
      concepts: concepts.length,
      node_types: nodes.reduce((acc, n) => {
        acc[n.type] = (acc[n.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    }
  };
}

async function getDocumentChunks(collection_name: string, document_name?: string): Promise<any[]> {
  const scriptContent = `
import json
import sys
from pymilvus import MilvusClient

args = json.loads(sys.argv[1])
collection_name = args['collection_name']
doc_filter = args.get('document_name')

client = MilvusClient(uri='http://nemo-rag-milvus:19530')

# Ensure collection is loaded before querying
try:
    client.load_collection(collection_name)
except Exception as e:
    pass  # Collection may already be loaded

results = client.query(
    collection_name=collection_name,
    filter='',
    output_fields=['pk', 'text', 'content_metadata', 'source'],
    limit=2000
)

chunks = []
for r in results:
    source = r.get('source', {})
    cm = r.get('content_metadata', {})
    text = r.get('text', '')
    
    source_name = source.get('source_name', '')
    filename = cm.get('filename', source_name.split('/')[-1] if source_name else 'unknown')
    page_num = cm.get('page_number', 0)
    
    if doc_filter and doc_filter.lower() not in filename.lower():
        continue
    
    chunks.append({
        'text': text,
        'page_number': page_num,
        'filename': filename
    })

chunks.sort(key=lambda x: x['page_number'])
print(json.dumps(chunks))
`;

  const tmpDir = os.tmpdir();
  const scriptPath = path.join(tmpDir, 'get_chunks.py');
  fs.writeFileSync(scriptPath, scriptContent);

  const args = JSON.stringify({ collection_name, document_name: document_name || null });

  try {
    execSync(`docker cp ${scriptPath} rag-ingestor-server:/tmp/get_chunks.py`, { encoding: 'utf-8' });
    const stdout = execSync(
      `docker exec rag-ingestor-server python3 /tmp/get_chunks.py '${args.replace(/'/g, "'\\''")}'`,
      { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 }
    );
    return JSON.parse(stdout);
  } catch (error: any) {
    console.error('[Semantic Graph] Failed to get chunks:', error.message);
    return [];
  } finally {
    try { fs.unlinkSync(scriptPath); } catch {}
  }
}

function extractTopicsFromContent(chunks: any[]): any[] {
  const topics: any[] = [];
  
  if (chunks.length === 0) return topics;
  
  // Combine all text for topic extraction
  const allText = chunks.map(c => c.text).join(' ').toLowerCase();
  
  // Topic patterns with keywords that indicate a theme
  const topicPatterns: Record<string, { keywords: string[]; description: string }> = {
    'Machine Learning Fundamentals': {
      keywords: ['machine learning', 'supervised', 'unsupervised', 'classification', 'regression', 'training data'],
      description: 'Core ML concepts, algorithms, and training approaches'
    },
    'Deep Learning & Neural Networks': {
      keywords: ['neural network', 'deep learning', 'layer', 'activation', 'backpropagation', 'gradient'],
      description: 'Neural architectures, training dynamics, and optimization'
    },
    'Transformers & Attention': {
      keywords: ['transformer', 'attention', 'self-attention', 'encoder', 'decoder', 'positional'],
      description: 'Transformer architecture and attention mechanisms'
    },
    'Large Language Models': {
      keywords: ['llm', 'language model', 'gpt', 'bert', 'tokenization', 'token', 'context window'],
      description: 'LLM architectures, capabilities, and limitations'
    },
    'Prompt Engineering': {
      keywords: ['prompt', 'few-shot', 'zero-shot', 'chain of thought', 'instruction', 'system prompt'],
      description: 'Techniques for effective prompting and instruction design'
    },
    'RAG & Retrieval': {
      keywords: ['rag', 'retrieval', 'vector', 'embedding', 'semantic search', 'knowledge base'],
      description: 'Retrieval augmented generation and information retrieval'
    },
    'Fine-tuning & Adaptation': {
      keywords: ['fine-tun', 'lora', 'qlora', 'rlhf', 'instruction tuning', 'adapter'],
      description: 'Model customization and domain adaptation techniques'
    },
    'Evaluation & Testing': {
      keywords: ['evaluation', 'benchmark', 'metric', 'accuracy', 'f1', 'bleu', 'rouge', 'human eval'],
      description: 'Methods for measuring and validating model performance'
    },
    'Inference & Optimization': {
      keywords: ['inference', 'latency', 'throughput', 'quantization', 'distillation', 'pruning', 'optimization'],
      description: 'Techniques for efficient model serving and optimization'
    },
    'Safety & Alignment': {
      keywords: ['safety', 'alignment', 'harmful', 'bias', 'fairness', 'guardrail', 'moderation'],
      description: 'AI safety, bias mitigation, and responsible AI practices'
    },
    'Deployment & Production': {
      keywords: ['deploy', 'production', 'serving', 'monitoring', 'scaling', 'api', 'endpoint'],
      description: 'Operationalizing AI systems in production environments'
    },
    'Data & Preprocessing': {
      keywords: ['data', 'dataset', 'preprocess', 'cleaning', 'annotation', 'labeling', 'synthetic'],
      description: 'Data preparation, curation, and quality management'
    },
  };
  
  // Score each topic by keyword frequency
  const topicScores: { name: string; score: number; description: string; keywords: string[] }[] = [];
  
  for (const [topicName, config] of Object.entries(topicPatterns)) {
    let score = 0;
    const matchedKeywords: string[] = [];
    
    for (const keyword of config.keywords) {
      const regex = new RegExp(keyword, 'gi');
      const matches = allText.match(regex);
      if (matches) {
        score += matches.length;
        matchedKeywords.push(keyword);
      }
    }
    
    if (score > 5) {  // Minimum threshold
      topicScores.push({
        name: topicName,
        score,
        description: config.description,
        keywords: matchedKeywords
      });
    }
  }
  
  // Sort by score and return top topics
  topicScores.sort((a, b) => b.score - a.score);
  
  return topicScores.slice(0, 10).map((t, idx) => ({
    title: t.name,
    description: t.description,
    relevance: t.score,
    keywords: t.keywords,
    order: idx
  }));
}

function summarizeChapter(chunks: any[], pageStart: number, pageEnd: number): string {
  const chapterChunks = chunks.filter(c => c.page_number >= pageStart && c.page_number <= pageEnd);
  const allText = chapterChunks.map(c => c.text).join(' ').slice(0, 500);
  return allText.replace(/\s+/g, ' ').trim() + '...';
}

function extractTopicFromText(text: string): string | null {
  // Extract first meaningful phrase
  const sentences = text.split(/[.!?]/);
  if (sentences.length > 0) {
    const first = sentences[0].trim();
    if (first.length > 10 && first.length < 60) {
      return first;
    }
  }
  return null;
}

function extractConcepts(chunks: any[]): any[] {
  const conceptPatterns: Record<string, RegExp[]> = {
    concept: [
      /\b(machine learning|deep learning|neural network|transformer|attention|embedding|vector|model|training|inference|optimization|gradient|backpropagation|loss function|activation|layer|weight|bias|epoch|batch|learning rate)\b/gi,
      /\b(LLM|GPT|BERT|RAG|fine-tuning|prompt engineering|tokenization|context window|hallucination|grounding)\b/gi,
      /\b(AI|artificial intelligence|natural language processing|NLP|computer vision|reinforcement learning)\b/gi,
    ],
    technique: [
      /\b(retrieval augmented generation|chain of thought|few-shot|zero-shot|in-context learning|instruction tuning|RLHF|DPO|LoRA|QLoRA|quantization|distillation|pruning)\b/gi,
    ],
    topic: [
      /\b(evaluation|deployment|monitoring|scaling|data pipeline|feature engineering|model serving|A\/B testing|experiment tracking)\b/gi,
    ],
    insight: [
      /\b(best practice|key insight|important|critical|essential|fundamental|principle|strategy|approach|methodology)\b/gi,
    ],
  };

  const conceptCounts: Record<string, { name: string; type: string; frequency: number; chapters: Set<number>; description: string }> = {};
  const chapterBoundaries = getChapterBoundaries(chunks);

  chunks.forEach((chunk, idx) => {
    const chapterIdx = findChapterIndex(chunk.page_number, chapterBoundaries);
    const text = chunk.text.toLowerCase();

    for (const [type, patterns] of Object.entries(conceptPatterns)) {
      for (const pattern of patterns) {
        const matches = chunk.text.match(pattern) || [];
        matches.forEach((match: string) => {
          const normalized = match.toLowerCase().trim();
          const key = normalized.replace(/\s+/g, '_');
          
          if (!conceptCounts[key]) {
            conceptCounts[key] = {
              name: capitalizeWords(normalized),
              type,
              frequency: 0,
              chapters: new Set(),
              description: extractContextForConcept(chunks, normalized)
            };
          }
          conceptCounts[key].frequency++;
          conceptCounts[key].chapters.add(chapterIdx);
        });
      }
    }
  });

  // Convert to array and sort by frequency
  return Object.values(conceptCounts)
    .map(c => ({ ...c, chapters: Array.from(c.chapters) }))
    .filter(c => c.frequency >= 2)
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 40);
}

function getChapterBoundaries(chunks: any[]): number[] {
  const pages = chunks.map(c => c.page_number);
  const maxPage = Math.max(...pages);
  const sectionSize = Math.ceil(maxPage / 10);
  return Array.from({ length: 10 }, (_, i) => i * sectionSize);
}

function findChapterIndex(pageNumber: number, boundaries: number[]): number {
  for (let i = boundaries.length - 1; i >= 0; i--) {
    if (pageNumber >= boundaries[i]) return i;
  }
  return 0;
}

function extractContextForConcept(chunks: any[], concept: string): string {
  for (const chunk of chunks) {
    const idx = chunk.text.toLowerCase().indexOf(concept);
    if (idx !== -1) {
      const start = Math.max(0, idx - 50);
      const end = Math.min(chunk.text.length, idx + concept.length + 100);
      return '...' + chunk.text.slice(start, end).replace(/\s+/g, ' ').trim() + '...';
    }
  }
  return '';
}

function capitalizeWords(str: string): string {
  return str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function findConceptRelations(concepts: any[]): any[] {
  const relations: any[] = [];
  const relationMap: Record<string, { targets: string[]; label: string; type: string }> = {
    'machine learning': { targets: ['deep learning', 'neural network', 'training'], label: 'foundation for', type: 'enables' },
    'deep learning': { targets: ['neural network', 'transformer', 'embedding'], label: 'uses', type: 'uses' },
    'transformer': { targets: ['attention', 'llm', 'gpt', 'bert'], label: 'architecture for', type: 'enables' },
    'attention': { targets: ['transformer', 'context window'], label: 'mechanism in', type: 'part_of' },
    'llm': { targets: ['fine-tuning', 'prompt engineering', 'rag', 'inference'], label: 'requires', type: 'requires' },
    'rag': { targets: ['embedding', 'vector', 'retrieval augmented generation'], label: 'uses', type: 'uses' },
    'embedding': { targets: ['vector', 'neural network'], label: 'produces', type: 'produces' },
    'fine-tuning': { targets: ['lora', 'qlora', 'rlhf', 'training'], label: 'technique', type: 'technique' },
    'training': { targets: ['gradient', 'backpropagation', 'loss function', 'optimization'], label: 'involves', type: 'involves' },
    'prompt engineering': { targets: ['few-shot', 'zero-shot', 'chain of thought'], label: 'includes', type: 'includes' },
    'evaluation': { targets: ['a/b testing', 'monitoring'], label: 'involves', type: 'involves' },
    'deployment': { targets: ['model serving', 'scaling', 'monitoring'], label: 'requires', type: 'requires' },
  };

  const conceptNames = new Set(concepts.map(c => c.name.toLowerCase()));

  for (const [source, { targets, label, type }] of Object.entries(relationMap)) {
    if (conceptNames.has(source)) {
      for (const target of targets) {
        if (conceptNames.has(target)) {
          relations.push({
            source: capitalizeWords(source),
            target: capitalizeWords(target),
            type,
            label,
            weight: 2
          });
        }
      }
    }
  }

  // Find concepts that appear in same chapters
  for (let i = 0; i < concepts.length; i++) {
    for (let j = i + 1; j < concepts.length; j++) {
      const shared = concepts[i].chapters.filter((c: number) => concepts[j].chapters.includes(c));
      if (shared.length >= 2 && relations.length < 60) {
        const existing = relations.find(r => 
          (r.source === concepts[i].name && r.target === concepts[j].name) ||
          (r.source === concepts[j].name && r.target === concepts[i].name)
        );
        if (!existing) {
          relations.push({
            source: concepts[i].name,
            target: concepts[j].name,
            type: 'related',
            label: 'discussed together',
            weight: 1
          });
        }
      }
    }
  }

  return relations;
}
