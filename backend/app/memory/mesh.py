import math
import re
from collections import Counter


def score(query: str, text: str) -> float:
    """Deterministic local fallback when Pinecone/OpenAI are not configured."""
    terms = re.findall(r"\w+", query.lower()); document = Counter(re.findall(r"\w+", text.lower()))
    if not terms or not document: return 0.0
    return sum(document[term] for term in terms) / math.sqrt(sum(value * value for value in document.values()))


def search(items: list[dict], query: str, limit: int) -> list[dict]:
    return [{**item, "score": score(query, item["text"])} for item in items if score(query, item["text"])] [:limit]
