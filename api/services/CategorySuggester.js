const SUFFIXES = [
    ['ization', ''],
    ['ation', ''],
    ['ments', ''],
    ['ment', ''],
    ['ings', ''],
    ['ing', ''],
    ['ies', 'y'],
    ['ity', ''],
    ['ly', ''],
    ['ed', ''],
    ['es', ''],
    ['s', ''],
    ['e', ''],
];
const MIN_STEM_LENGTH = 3;

const STOP_WORDS = [
    'a',
    'about',
    'all',
    'also',
    'am',
    'an',
    'and',
    'any',
    'are',
    'as',
    'at',
    'be',
    'been',
    'best',
    'better',
    'between',
    'but',
    'by',
    'can',
    'code',
    'could',
    'develop',
    'developer',
    'development',
    'did',
    'do',
    'does',
    'each',
    'etc',
    'example',
    'explain',
    'for',
    'from',
    'get',
    'good',
    'guide',
    'had',
    'has',
    'have',
    'help',
    'how',
    'if',
    'in',
    'into',
    'is',
    'it',
    'its',
    'just',
    'large',
    'like',
    'make',
    'me',
    'more',
    'most',
    'my',
    'need',
    'no',
    'not',
    'of',
    'on',
    'one',
    'only',
    'or',
    'other',
    'our',
    'practice',
    'question',
    'should',
    'so',
    'some',
    'someone',
    'step',
    'than',
    'that',
    'the',
    'their',
    'them',
    'then',
    'there',
    'they',
    'this',
    'to',
    'too',
    'try',
    'understand',
    'use',
    'using',
    'very',
    'want',
    'was',
    'we',
    'were',
    'what',
    'when',
    'which',
    'will',
    'with',
    'would',
    'you',
    'your',
].map(stem);

const STOP_WORD_SET = new Set(STOP_WORDS);
const TITLE_WEIGHT = 2;
const WEIGHTS = {
    postText: 0.5,
    deletedCategoryText: 0.3,
    coOccurrence: 0.2,
};
const DEFAULT_LIMIT = 3;

function stripSuffix(token) {
    for (const [suffix, replacement] of SUFFIXES) {
        if (token.endsWith(suffix) && token.length - suffix.length >= MIN_STEM_LENGTH) {
            return token.slice(0, -suffix.length) + replacement;
        }
    }
    return token;
}

function stem(token) {
    let current = token;
    let next = stripSuffix(current);
    while (next !== current) {
        current = next;
        next = stripSuffix(current);
    }
    return current;
}

function tokenize(text) {
    const words = (text ?? '').toLowerCase().match(/[\p{L}\p{N}+#]+/gu) ?? [];
    return words.map(stem).filter((token) => token.length > 1 && !STOP_WORD_SET.has(token));
}

function weightedTokens(title, ...texts) {
    const titleTokens = tokenize(title);
    const repeatedTitle = Array.from({ length: TITLE_WEIGHT }, () => titleTokens).flat();
    return [...repeatedTitle, ...texts.flatMap(tokenize)];
}

function vectorNorm(vector) {
    let sum = 0;
    for (const weight of vector.values()) {
        sum += weight * weight;
    }
    return Math.sqrt(sum);
}

function cosineSimilarity(first, second) {
    let dotProduct = 0;
    for (const [term, weight] of first) {
        dotProduct += weight * (second.get(term) ?? 0);
    }
    return dotProduct === 0 ? 0 : dotProduct / (vectorNorm(first) * vectorNorm(second));
}

class CategorySuggester {
    constructor(categories, { limit = DEFAULT_LIMIT } = {}) {
        this.categories = categories;
        this.limit = limit;

        const documents = categories.map((category) =>
            weightedTokens(category.title, category.description, ...category.posts_text)
        );
        this.idf = CategorySuggester.computeIdf(documents);
        this.vectors = new Map(
            categories.map((category, index) => [category.id, this.toVector(documents[index])])
        );
    }

    static computeIdf(documents) {
        const documentFrequency = new Map();
        for (const tokens of documents) {
            for (const term of new Set(tokens)) {
                documentFrequency.set(term, (documentFrequency.get(term) ?? 0) + 1);
            }
        }

        const total = documents.length;
        return new Map(
            [...documentFrequency].map(([term, frequency]) => [
                term,
                Math.log((1 + total) / (1 + frequency)) + 1,
            ])
        );
    }

    static countCoOccurrence(deletedCategoryId, posts) {
        const counts = new Map();
        for (const post of posts) {
            for (const category of post.categories) {
                if (category.id !== deletedCategoryId) {
                    counts.set(category.id, (counts.get(category.id) ?? 0) + 1);
                }
            }
        }

        const max = Math.max(1, ...counts.values());
        return new Map([...counts].map(([id, count]) => [id, count / max]));
    }

    toVector(tokens) {
        const vector = new Map();
        for (const token of tokens) {
            const idf = this.idf.get(token);
            if (idf !== undefined) {
                vector.set(token, (vector.get(token) ?? 0) + idf);
            }
        }
        return vector;
    }

    suggestForDeletedCategory(deletedCategoryId, posts) {
        const coOccurrence = CategorySuggester.countCoOccurrence(deletedCategoryId, posts);
        return new Map(
            posts.map((post) => [post.id, this.suggest(post, deletedCategoryId, coOccurrence)])
        );
    }

    suggest(post, deletedCategoryId, coOccurrence) {
        const excludedIds = new Set([deletedCategoryId, ...post.categories.map((c) => c.id)]);
        const postVector = this.toVector(
            weightedTokens(post.title, post.content, ...post.comments_text)
        );
        const deletedVector = this.vectors.get(deletedCategoryId) ?? new Map();

        return this.categories
            .filter((category) => !excludedIds.has(category.id))
            .map((category) => {
                const vector = this.vectors.get(category.id);
                const score =
                    WEIGHTS.postText * cosineSimilarity(postVector, vector) +
                    WEIGHTS.deletedCategoryText * cosineSimilarity(deletedVector, vector) +
                    WEIGHTS.coOccurrence * (coOccurrence.get(category.id) ?? 0);
                return { category, score };
            })
            .sort(
                (first, second) =>
                    second.score - first.score ||
                    second.category.posts_count - first.category.posts_count ||
                    first.category.title.localeCompare(second.category.title)
            )
            .slice(0, this.limit)
            .map(({ category, score }) => ({
                id: category.id,
                title: category.title,
                score: Math.round(score * 1000) / 1000,
            }));
    }
}

module.exports = { CategorySuggester, stem, tokenize };
