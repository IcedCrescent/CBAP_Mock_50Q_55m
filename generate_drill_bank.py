import json
import random

with open('./src/cbap_bank_min.json', 'r') as f:
    questions = json.load(f)

# unique questions
seen = set()
unique_questions = []
for q in questions:
    stem = q['question'].strip()
    if stem not in seen and len(q['correct']) > 0:
        seen.add(stem)
        unique_questions.append(q)

kas = {k: [] for k in ["KA3", "KA4", "KA5", "KA6", "KA7", "KA8", "KA10"]}
ka_keywords = {
    "KA3": ["plan", "monitor", "approach", "governance", "information management", "performance improvement", "stakeholder engagement"],
    "KA4": ["elicit", "prepare", "conduct", "confirm", "communicate", "collaborat"],
    "KA5": ["lifecycle", "trace", "maintain", "prioritize", "assess", "approve", "requirements management"],
    "KA6": ["strategy", "current state", "future state", "risk", "change strategy", "business case", "objective", "transition", "enterprise analysis"],
    "KA8": ["evaluation", "measure", "performance", "limitation", "enterprise", "recommend", "solution assessment"],
    "KA7": ["analysis", "design", "model", "verify", "validate", "architecture", "solution option", "value", "specify", "concept"],
    "KA10": ["technique", "tool", "backlog", "interview", "workshop", "process", "diagram", "chart", "matrix", "prototyping"]
}

# sort questions into buckets using heuristic
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
        kas["KA10"].append(q)

# ensure 60 per bucket
target = 60
for k in kas.keys():
    while len(kas[k]) < target:
        # steal from the largest bucket
        largest = max(kas.keys(), key=lambda x: len(kas[x]))
        if len(kas[largest]) <= target:
            break
        idx = random.randint(0, len(kas[largest])-1)
        kas[k].append(kas[largest].pop(idx))

final_bank = {}
for k, qs in kas.items():
    # sort by length
    qs.sort(key=lambda x: len(x['question']))
    # medium gets shortest 30, hard gets the rest (expected 30)
    # limit to 60 total to be safe
    qs = qs[:60]
    medium = qs[:30]
    hard = qs[30:60]
    
    final_bank[k] = {
        "medium": medium,
        "hard": hard
    }

with open('./src/drill_bank_data.json', 'w') as f:
    json.dump(final_bank, f, indent=2)

print("Generated src/drill_bank_data.json")
