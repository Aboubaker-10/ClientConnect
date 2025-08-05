// Ollama Local AI Search - 100% Free

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
  score: number;
  matchType: 'exact' | 'semantic' | 'oem_equivalent' | 'alternative';
  reason: string;
}

class OllamaAISearch {
  private ollamaUrl = 'http://localhost:11434/api/generate';
  private model = 'llama3.2:1b'; // Lightweight model

  constructor() {}

  // Test Ollama availability
  async testApiKey(): Promise<boolean> {
    try {
      const response = await fetch('http://localhost:11434/api/tags');
      const data = await response.json();
      const hasModel = data.models?.some((m: any) => m.name.includes('llama'));
      
      console.log('🧪 Ollama Test:', response.ok ? '✅ Connected' : '❌ Not running');
      if (response.ok && !hasModel) {
        console.log('💡 Install model: ollama pull llama3.2:1b');
      }
      
      return response.ok && hasModel;
    } catch (error) {
      console.log('🧪 Ollama Test: ❌ Not installed/running');
      console.log('💡 Install: curl -fsSL https://ollama.ai/install.sh | sh');
      return false;
    }
  }

  // Get AI analysis from Ollama
  private async getOllamaAnalysis(query: string, productTexts: string[]): Promise<number[]> {
    try {
      console.log('🤖 Ollama analyzing query:', query);
      
      const prompt = `Rate similarity 0-100 for search "${query}" vs these products:
${productTexts.slice(0, 8).map((text, i) => `${i + 1}. ${text.substring(0, 80)}`).join('\n')}

Return only numbers separated by commas (example: 85,23,67,12,0,45,78,90):`;

      const response = await fetch(this.ollamaUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt: prompt,
          stream: false,
          options: {
            temperature: 0.1,
            num_predict: 50
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama error: ${response.status}`);
      }

      const result = await response.json();
      const content = result.response || '';
      
      // Parse scores from response
      const scores = content.match(/\d+/g)?.map((s: string) => Math.min(parseInt(s), 100) / 100) || [];
      console.log('✅ Ollama analysis completed, scores:', scores.slice(0, 5));
      
      return scores;
    } catch (error) {
      console.log('⚠️ Ollama failed, using local AI');
      return [];
    }
  }

  // Enhanced search with Ollama AI
  async search(query: string, products: Product[], translations: any): Promise<{
    results: SearchResult[];
    suggestions: SearchResult[];
    noResultsMessage?: string;
  }> {
    if (!query.trim()) {
      return { results: products.map(p => ({ product: p, score: 1, matchType: 'exact' as const, reason: '' })), suggestions: [] };
    }

    console.log('🤖 Starting Ollama AI search for:', query);
    
    const searchResults: SearchResult[] = [];
    const isOEM = this.isOEMCode(query);

    try {
      // Prepare product texts for AI analysis
      const productTexts = products.map(p => 
        `${p.name} ${p.itemCode} ${p.description || ''} ${p.category || ''} ${p.brand || ''}`
      );

      // Get Ollama AI analysis
      const aiScores = await this.getOllamaAnalysis(query, productTexts);

      // Process each product
      for (let i = 0; i < products.length; i++) {
        const product = products[i];
        const scores: { score: number; type: string; reason: string }[] = [];

        // 1. Exact matches (highest priority)
        if (this.exactMatch(query, product)) {
          scores.push({ score: 1.0, type: 'exact', reason: 'Exact match found' });
        }

        // 2. Ollama AI semantic similarity
        if (aiScores[i] && aiScores[i] > 0.3) {
          scores.push({ 
            score: aiScores[i], 
            type: 'semantic', 
            reason: `${Math.round(aiScores[i] * 100)}% Ollama AI match` 
          });
        }

        // 3. OEM code matching
        if (isOEM) {
          const oemScore = this.calculateOEMScore(query, product);
          if (oemScore > 0.2) {
            scores.push({ 
              score: oemScore, 
              type: 'oem_equivalent', 
              reason: `Potential OEM equivalent for ${query}` 
            });
          }
        }

        // 4. Local fallback scoring
        if (scores.length === 0) {
          const localScore = this.calculateLocalScore(query, product);
          if (localScore > 0.2) {
            scores.push({ 
              score: localScore, 
              type: 'alternative', 
              reason: 'Local similarity match' 
            });
          }
        }

        // Add best match for this product
        if (scores.length > 0) {
          const bestScore = scores.reduce((best, current) => 
            current.score > best.score ? current : best
          );
          
          searchResults.push({
            product,
            score: bestScore.score,
            matchType: bestScore.type as any,
            reason: bestScore.reason
          });
        }
      }

      // Sort by score
      searchResults.sort((a, b) => b.score - a.score);

      const mainResults = searchResults.filter(r => r.score > 0.4 || r.matchType === 'exact');
      const suggestions = searchResults.filter(r => r.score <= 0.4 && r.score > 0.15);

      console.log('✅ Ollama AI Search completed:', {
        totalResults: mainResults.length,
        suggestions: suggestions.length
      });

      return {
        results: mainResults.slice(0, 50),
        suggestions: suggestions.slice(0, 5),
        noResultsMessage: mainResults.length === 0 ? 
          (isOEM ? 
            `No direct match found for OEM code "${query}". Check suggestions below for possible alternatives.` :
            `No products found matching "${query}". Try different keywords or check suggestions.`
          ) : undefined
      };

    } catch (error) {
      console.error('❌ Ollama AI Search error:', error);
      console.log('🔄 Falling back to local search');
      return this.fallbackSearch(query, products, translations);
    }
  }

  // Helper methods
  private isOEMCode(query: string): boolean {
    const oemPatterns = [
      /^[A-Z]{2,4}\s?\d{4,8}$/i,
      /^\d{6,10}$/,
      /^[A-Z]\d{5,8}$/i,
      /^[A-Z]{1,3}-?\d{3,6}$/i,
    ];
    return oemPatterns.some(pattern => pattern.test(query.trim()));
  }

  private exactMatch(query: string, product: Product): boolean {
    const queryLower = query.toLowerCase();
    return product.name.toLowerCase().includes(queryLower) ||
           product.itemCode.toLowerCase().includes(queryLower) ||
           product.description?.toLowerCase().includes(queryLower) ||
           product.category?.toLowerCase().includes(queryLower) ||
           product.brand?.toLowerCase().includes(queryLower);
  }

  private calculateOEMScore(query: string, product: Product): number {
    const productText = `${product.name} ${product.description || ''}`.toLowerCase();
    const queryNum = query.replace(/\D/g, '');
    
    if (queryNum.length >= 4) {
      const productNums = productText.match(/\d{4,}/g) || [];
      for (const num of productNums) {
        if (num.includes(queryNum.slice(0, 4)) || queryNum.includes(num.slice(0, 4))) {
          return 0.8;
        }
      }
    }

    const oemKeywords = ['oem', 'original', 'equivalent', 'compatible', 'replacement'];
    const hasOEMKeyword = oemKeywords.some(keyword => productText.includes(keyword));
    
    return hasOEMKeyword ? 0.4 : 0;
  }

  private calculateLocalScore(query: string, product: Product): number {
    const queryWords = query.toLowerCase().split(/\s+/);
    const productText = `${product.name} ${product.itemCode} ${product.description || ''}`.toLowerCase();
    
    let matchCount = 0;
    for (const word of queryWords) {
      if (word.length > 2 && productText.includes(word)) {
        matchCount++;
      }
    }
    
    return queryWords.length > 0 ? matchCount / queryWords.length : 0;
  }

  private fallbackSearch(query: string, products: Product[], translations: any) {
    const queryLower = query.toLowerCase();
    const results = products.filter(product => {
      return product.name.toLowerCase().includes(queryLower) ||
             product.itemCode.toLowerCase().includes(queryLower) ||
             product.description?.toLowerCase().includes(queryLower) ||
             product.category?.toLowerCase().includes(queryLower) ||
             product.brand?.toLowerCase().includes(queryLower);
    }).map(product => ({
      product,
      score: 1,
      matchType: 'exact' as const,
      reason: 'Basic text match'
    }));

    return {
      results,
      suggestions: [],
      noResultsMessage: results.length === 0 ? `No products found for "${query}"` : undefined
    };
  }
}

// Export singleton instance
let aiSearchInstance: OllamaAISearch | null = null;

export const initializeAISearch = async (apiKey: string = '') => {
  aiSearchInstance = new OllamaAISearch();
  
  // Test Ollama availability
  const isValid = await aiSearchInstance.testApiKey();
  console.log('🧪 Ollama AI Search Test:', isValid ? '✅ Ready' : '❌ Setup needed');
  
  if (!isValid) {
    console.log('📋 Setup Instructions:');
    console.log('1. Install: curl -fsSL https://ollama.ai/install.sh | sh');
    console.log('2. Start: ollama serve');
    console.log('3. Install model: ollama pull llama3.2:1b');
  }
};

export const aiSearch = async (query: string, products: Product[], translations: any) => {
  if (!aiSearchInstance) {
    aiSearchInstance = new OllamaAISearch();
  }
  
  return aiSearchInstance.search(query, products, translations);
};

export default OllamaAISearch;