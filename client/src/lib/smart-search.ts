interface Product {
  id: string;
  name: string;
  itemCode: string;
  description?: string;
  price: string;
  currency: string;
  stockQuantity?: number;
  category?: string;
  brand?: string;
  image?: string;
}

interface SearchResult {
  product: Product;
  similarity: number;
  matchType: 'exact' | 'similar' | 'alternative';
  reason?: string;
}

interface SmartSearchResult {
  results: SearchResult[];
  suggestions: SearchResult[];
  noResultsMessage?: string;
}

// Oil viscosity patterns
const oilViscosityPatterns = [
  '0w20', '0w30', '0w40',
  '5w20', '5w30', '5w40', '5w50',
  '10w30', '10w40', '10w50', '10w60',
  '15w40', '15w50',
  '20w50'
];

// Brand alternatives mapping
const brandAlternatives: { [key: string]: string[] } = {
  'total': ['afriquia', 'shell', 'mobil', 'castrol'],
  'shell': ['total', 'afriquia', 'mobil', 'castrol'],
  'mobil': ['total', 'shell', 'afriquia', 'castrol'],
  'castrol': ['total', 'shell', 'afriquia', 'mobil'],
  'afriquia': ['total', 'shell', 'mobil', 'castrol'],
  'motul': ['total', 'shell', 'mobil', 'castrol'],
  'elf': ['total', 'shell', 'mobil', 'castrol']
};

// Product name alternatives
const productAlternatives: { [key: string]: string[] } = {
  'quartez': ['qualix', 'quartz', 'helix', 'magnatec'],
  'qualix': ['quartez', 'quartz', 'helix', 'magnatec'],
  'quartz': ['quartez', 'qualix', 'helix', 'magnatec'],
  'helix': ['quartez', 'qualix', 'quartz', 'magnatec'],
  'magnatec': ['quartez', 'qualix', 'quartz', 'helix']
};

function extractViscosity(text: string): string | null {
  const normalized = text.toLowerCase().replace(/\s+/g, '');
  for (const viscosity of oilViscosityPatterns) {
    if (normalized.includes(viscosity)) {
      return viscosity;
    }
  }
  return null;
}

function extractBrand(text: string): string | null {
  const normalized = text.toLowerCase();
  const brands = Object.keys(brandAlternatives);
  for (const brand of brands) {
    if (normalized.includes(brand)) {
      return brand;
    }
  }
  return null;
}

function extractProductName(text: string): string | null {
  const normalized = text.toLowerCase();
  const products = Object.keys(productAlternatives);
  for (const product of products) {
    if (normalized.includes(product)) {
      return product;
    }
  }
  return null;
}

// AI-powered semantic similarity calculation
function calculateAISimilarity(query: string, product: Product): number {
  const queryLower = query.toLowerCase().trim();
  if (!queryLower) return 0;
  
  const productName = product.name.toLowerCase();
  const productCode = product.itemCode.toLowerCase();
  const productBrand = (product.brand || '').toLowerCase();
  const productDescription = (product.description || '').toLowerCase();
  const productCategory = (product.category || '').toLowerCase();
  
  let similarity = 0;
  const allText = `${productName} ${productCode} ${productBrand} ${productDescription} ${productCategory}`;
  
  // AI Intent Recognition
  const intent = recognizeIntent(queryLower);
  similarity += calculateIntentScore(intent, product) * 0.4;
  
  // Semantic Field Matching with AI weights
  const fieldScores = {
    name: calculateSemanticMatch(queryLower, productName) * 0.9,
    code: calculateSemanticMatch(queryLower, productCode) * 0.85,
    brand: calculateSemanticMatch(queryLower, productBrand) * 0.7,
    description: calculateSemanticMatch(queryLower, productDescription) * 0.75,
    category: calculateSemanticMatch(queryLower, productCategory) * 0.6
  };
  
  similarity += Math.max(...Object.values(fieldScores)) * 0.6;
  
  return Math.min(similarity, 1);
}

// AI Intent Recognition
function recognizeIntent(query: string): { type: string; confidence: number; entities: string[] } {
  const intents = {
    viscosity: { patterns: ['0w', '5w', '10w', '15w', '20w', 'sae'], weight: 0.9 },
    brand: { patterns: ['total', 'shell', 'mobil', 'castrol', 'motul', 'elf', 'afriquia'], weight: 0.8 },
    product_type: { patterns: ['oil', 'lubricant', 'grease', 'fluid', 'filter'], weight: 0.7 },
    capacity: { patterns: ['1l', '5l', '20l', '208l', 'liter', 'litre'], weight: 0.6 },
    application: { patterns: ['engine', 'motor', 'transmission', 'hydraulic', 'gear'], weight: 0.7 }
  };
  
  let bestIntent = { type: 'general', confidence: 0, entities: [] };
  
  for (const [intentType, config] of Object.entries(intents)) {
    const matches = config.patterns.filter(pattern => query.includes(pattern));
    if (matches.length > 0) {
      const confidence = (matches.length / config.patterns.length) * config.weight;
      if (confidence > bestIntent.confidence) {
        bestIntent = { type: intentType, confidence, entities: matches };
      }
    }
  }
  
  return bestIntent;
}

// Calculate intent-based scoring
function calculateIntentScore(intent: { type: string; confidence: number; entities: string[] }, product: Product): number {
  const productText = `${product.name} ${product.itemCode} ${product.brand || ''} ${product.description || ''}`.toLowerCase();
  
  switch (intent.type) {
    case 'viscosity':
      return intent.entities.some(entity => productText.includes(entity)) ? intent.confidence : 0;
    case 'brand':
      return intent.entities.some(entity => (product.brand || '').toLowerCase().includes(entity)) ? intent.confidence : 0;
    case 'product_type':
      return intent.entities.some(entity => productText.includes(entity)) ? intent.confidence : 0;
    case 'capacity':
      return intent.entities.some(entity => productText.includes(entity)) ? intent.confidence : 0;
    case 'application':
      return intent.entities.some(entity => productText.includes(entity)) ? intent.confidence : 0;
    default:
      return 0;
  }
}

// Advanced semantic matching with AI
function calculateSemanticMatch(query: string, text: string): number {
  if (!text) return 0;
  
  // Exact match gets highest score
  if (text.includes(query)) return 1;
  
  // AI-powered fuzzy matching with context awareness
  const queryWords = query.split(/\s+/).filter(w => w.length > 1);
  const textWords = text.split(/\s+/).filter(w => w.length > 1);
  
  let totalScore = 0;
  let matchedWords = 0;
  
  for (const qWord of queryWords) {
    let bestWordScore = 0;
    
    for (const tWord of textWords) {
      // Exact word match
      if (tWord === qWord) {
        bestWordScore = 1;
        break;
      }
      // Substring match
      else if (tWord.includes(qWord) || qWord.includes(tWord)) {
        bestWordScore = Math.max(bestWordScore, 0.8);
      }
      // AI-enhanced fuzzy matching
      else {
        const fuzzyScore = calculateAIFuzzyScore(qWord, tWord);
        bestWordScore = Math.max(bestWordScore, fuzzyScore);
      }
    }
    
    if (bestWordScore > 0.3) {
      totalScore += bestWordScore;
      matchedWords++;
    }
  }
  
  return matchedWords > 0 ? totalScore / queryWords.length : 0;
}

// AI-enhanced fuzzy scoring
function calculateAIFuzzyScore(word1: string, word2: string): number {
  if (word1.length < 3 || word2.length < 3) return 0;
  
  // Levenshtein distance with AI weighting
  const distance = levenshteinDistance(word1, word2);
  const maxLen = Math.max(word1.length, word2.length);
  const similarity = 1 - (distance / maxLen);
  
  // AI context boost for similar-sounding words
  const phoneticSimilarity = calculatePhoneticSimilarity(word1, word2);
  
  return Math.max(similarity * 0.7, phoneticSimilarity * 0.3);
}

// Levenshtein distance calculation
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }
  
  return matrix[str2.length][str1.length];
}

// Phonetic similarity for AI matching
function calculatePhoneticSimilarity(word1: string, word2: string): number {
  const phoneticMap: { [key: string]: string } = {
    'ph': 'f', 'gh': 'f', 'ck': 'k', 'qu': 'kw',
    'x': 'ks', 'z': 's', 'c': 'k', 'y': 'i'
  };
  
  const normalize = (word: string) => {
    let normalized = word.toLowerCase();
    for (const [pattern, replacement] of Object.entries(phoneticMap)) {
      normalized = normalized.replace(new RegExp(pattern, 'g'), replacement);
    }
    return normalized;
  };
  
  const norm1 = normalize(word1);
  const norm2 = normalize(word2);
  
  if (norm1 === norm2) return 0.8;
  if (norm1.includes(norm2) || norm2.includes(norm1)) return 0.6;
  
  return 0;
}

// AI-powered intelligent alternatives finder
function findAIAlternatives(query: string, products: Product[], t?: any): SearchResult[] {
  const intent = recognizeIntent(query.toLowerCase());
  const alternatives: SearchResult[] = [];
  
  for (const product of products) {
    const aiScore = calculateAIAlternativeScore(query, product, intent);
    
    if (aiScore > 0.4) {
      alternatives.push({
        product,
        similarity: aiScore,
        matchType: 'alternative',
        reason: generateAIReason(query, product, intent, t)
      });
    }
  }
  
  return alternatives
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 5);
}

// Calculate AI alternative score
function calculateAIAlternativeScore(query: string, product: Product, intent: any): number {
  let score = 0;
  
  // Intent-based scoring
  const intentScore = calculateIntentScore(intent, product);
  score += intentScore * 0.4;
  
  // Semantic similarity
  const semanticScore = calculateSemanticMatch(query, `${product.name} ${product.description || ''}`);
  score += semanticScore * 0.3;
  
  // Compatibility scoring
  const compatibilityScore = calculateCompatibilityScore(query, product);
  score += compatibilityScore * 0.3;
  
  return Math.min(score, 0.8);
}

// Calculate compatibility score
function calculateCompatibilityScore(query: string, product: Product): number {
  const queryViscosity = extractViscosity(query);
  const productViscosity = extractViscosity(product.name + ' ' + product.itemCode);
  
  if (queryViscosity && productViscosity) {
    return calculateViscosityCompatibility(queryViscosity, productViscosity);
  }
  
  const queryBrand = extractBrand(query);
  const productBrand = (product.brand || '').toLowerCase();
  
  if (queryBrand && productBrand) {
    return calculateBrandCompatibility(queryBrand, productBrand);
  }
  
  return 0;
}

// Calculate viscosity compatibility
function calculateViscosityCompatibility(v1: string, v2: string): number {
  if (v1 === v2) return 0.9;
  
  const parse = (v: string) => {
    const match = v.match(/(\d+)w(\d+)/);
    return match ? [parseInt(match[1]), parseInt(match[2])] : null;
  };
  
  const p1 = parse(v1);
  const p2 = parse(v2);
  
  if (p1 && p2) {
    const winterDiff = Math.abs(p1[0] - p2[0]);
    const hotDiff = Math.abs(p1[1] - p2[1]);
    
    if (winterDiff <= 5 && hotDiff <= 10) return 0.7;
    if (winterDiff <= 10 && hotDiff <= 20) return 0.5;
  }
  
  return 0;
}

// Calculate brand compatibility
function calculateBrandCompatibility(b1: string, b2: string): number {
  if (brandAlternatives[b1]?.includes(b2)) return 0.6;
  
  const premium = ['total', 'shell', 'mobil', 'castrol', 'motul'];
  const isPremium1 = premium.includes(b1);
  const isPremium2 = premium.includes(b2);
  
  return (isPremium1 && isPremium2) ? 0.4 : 0.2;
}

// Generate AI reason
function generateAIReason(query: string, product: Product, intent: any, t?: any): string {
  if (t) return `${t.alternativeProduct} ${product.name}`;
  
  const queryViscosity = extractViscosity(query);
  const productViscosity = extractViscosity(product.name);
  
  if (queryViscosity && productViscosity) {
    return `Compatible ${productViscosity.toUpperCase()} alternative`;
  }
  
  if (intent.type === 'brand') {
    return `Alternative from ${product.brand || 'another brand'}`;
  }
  
  return `AI-suggested alternative: ${product.name}`;
}

export function smartSearch(query: string, products: Product[], t?: any): SmartSearchResult {
  if (!query.trim()) {
    return {
      results: products.map(p => ({ product: p, similarity: 1, matchType: 'exact' as const })),
      suggestions: []
    };
  }
  
  // Find direct matches
  const directResults: SearchResult[] = products
    .map(product => ({
      product,
      similarity: calculateAISimilarity(query, product),
      matchType: 'exact' as const
    }))
    .filter(result => result.similarity > 0.2)
    .sort((a, b) => b.similarity - a.similarity);
  
  // If we have good direct matches, return them
  if (directResults.length > 0 && directResults[0].similarity > 0.5) {
    return {
      results: directResults,
      suggestions: []
    };
  }
  
  // Find AI-powered alternatives if no good direct matches
  const alternatives = findAIAlternatives(query, products, t);
  
  // Combine results
  const allResults = [...directResults, ...alternatives]
    .sort((a, b) => b.similarity - a.similarity);
  
  if (allResults.length === 0) {
    return {
      results: [],
      suggestions: [],
      noResultsMessage: t ? `${t.noProductsFound} "${query}". ${t.tryDifferentSearchTermsOrAdjustFilters}` : `No products found for "${query}". Try searching with different keywords or check the filters.`
    };
  }
  
  // Separate exact matches from suggestions
  const exactMatches = allResults.filter(r => r.matchType === 'exact' && r.similarity > 0.4);
  const suggestions = allResults.filter(r => r.matchType === 'alternative' || r.similarity <= 0.4);
  
  return {
    results: exactMatches.length > 0 ? exactMatches : allResults.slice(0, 6),
    suggestions: suggestions.slice(0, 3),
    noResultsMessage: exactMatches.length === 0 && suggestions.length > 0 
      ? (t ? `${t.noExactMatchesFound} "${query}". ${t.hereAreSomeAlternatives}` : `No exact matches found for "${query}". Here are some alternatives:`) 
      : undefined
  };
}