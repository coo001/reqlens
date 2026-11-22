"""Build planted-gap drafts from the two complete drafts and print word counts.

usage: python3 -I make_gaps.py <drafts_dir>
Paragraphs are separated by a blank line. Word count = whitespace-separated tokens
(the same rule the product's counting code will use).
"""
import os
import sys

d = sys.argv[1]
EXTRA_B = (
    "There were also smaller setbacks that winter. My car battery died twice in the cold, and "
    "once I walked forty minutes through snow to reach the bakery on time because I did not want "
    "to let the morning crew down. I picked up a second, shorter job shelving books at the campus "
    "library on weekends to pay for a new battery, and I learned to fall asleep on the bus. I kept "
    "a paper calendar on the fridge where I crossed off every shift and every class, and seeing "
    "that wall of crosses at the end of each month reminded me that I was still moving forward, "
    "even on the days it did not feel like it."
)

GAPS = [
    # (output, source, action, paragraph index, requirement removed)
    # The first six rows use the pre-build key ids (prep/); eval/score.ts DRAFTS has
    # the eval/answer_key.json ids for all rows.
    ("A_gap1_problem.txt", "A_complete.txt", "delete", 2, "S2-08"),
    ("A_gap2_ai_details.txt", "A_complete.txt", "delete", 3, "S2-09"),
    ("A_gap3_credits.txt", "A_complete.txt", "delete", 6, "S2-04"),
    ("B_gap1_future.txt", "B_complete.txt", "delete", 4, "S5-07"),
    ("B_gap2_persevere.txt", "B_complete.txt", "delete", 2, "S5-06"),
    ("B_gap3_overlength.txt", "B_complete.txt", "insert", 3, "S5-05"),
    # Held out (2026-11-22): built before compare-v3 was written and not run with any
    # prompt until v3 is frozen. Ids here are eval/answer_key.json ids.
    ("A_hold1_ai_tools.txt", "A_complete.txt", "delete", 7, "S2-09 S2-10"),
    ("B_hold1_grandparent.txt", "B_complete.txt", "delete", 3, "S5-08"),
]


def paras(path):
    return [p.strip() for p in open(path, encoding="utf-8").read().split("\n\n") if p.strip()]


def words(ps):
    return sum(len(p.split()) for p in ps)


for src in ("A_complete.txt", "B_complete.txt"):
    print(f"{src}: {words(paras(os.path.join(d, src)))} words")
for out, src, action, idx, req in GAPS:
    ps = paras(os.path.join(d, src))
    if action == "delete":
        removed = ps.pop(idx)
        note = f"deleted paragraph {idx} ({len(removed.split())} words): {removed[:60]}..."
    else:
        ps.insert(idx + 1, EXTRA_B)
        note = f"inserted paragraph after {idx} ({len(EXTRA_B.split())} words)"
    open(os.path.join(d, out), "w", encoding="utf-8").write("\n\n".join(ps) + "\n")
    print(f"{out}: {words(ps)} words | {req} | {note}")
