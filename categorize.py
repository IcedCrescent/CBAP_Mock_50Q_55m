import json
import random

with open('./src/cbap_bank_min.json', 'r') as f:
    questions = json.load(f)

# unique questions
seen = set()
unique_questions = []
for q in questions:
    if q['question'] not in seen:
        seen.add(q['question'])
        unique_questions.append(q)

print(f"Total unique questions: {len(unique_questions)}")

kas = {"KA3": [], "KA4": [], "KA5": [], "KA6": [], "KA7": [], "KA8": [], "KA10": []}
ka_keywords = {
    "KA3": ["plan", "monitor", "approach", "governance", "information management", "performance improvement", "stakeholder engagement"],
    "KA4": ["elicit", "prepare", "conduct", "confirm", "communicate", "collaborat"],
    "KA5": ["lifecycle", "trace", "maintain", "prioritize", "assess", "approve", "requirements management"],
    "KA6": ["strategy", "current state", "future state", "risk", "change strategy", "business case", "objective", "transition", "enterprise analysis"],
    "KA7": ["analysis", "design", "model", "verify", "validate", "architecture", "solution option", "value", "specify", "concept"],
    "KA8": ["evaluation", "measure", "performance", "limitation", "enterprise", "recommend", "solution assessment"],
    "KA10": ["technique", "tool", "backlog", "interview", "workshop", "process", "diagram", "chart", "matrix", "prototyping"]
}

for q in unique_questions:
    text = (q['question'] + " " + q['correct']).lower()
    best_ka = None
    best_score = 0
    for ka, kwds in ka_keywords.items():
        score = sum(text.count(k) for k in kwds)
        if score > best_score:
            best_score = score
            best_ka = ka
    if best_ka:
        kas[best_ka].append(q)
    else:
        # random assign or assign to KA10
        kas["KA10"].append(q)

for ka, qs in kas.items():
    print(f"{ka}: {len(qs)}")
