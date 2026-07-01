import re
import os

def parse_results(filepath):
    if not os.path.exists(filepath):
        print(f"Error: {filepath} not found")
        return []
    with open(filepath, 'r') as f:
        content = f.read()

    sections = re.split(r'TILING: ', content)[1:]
    results = []
    for section in sections:
        lines = section.split('\n')
        tiling_name = lines[0].strip()
        total_tiles = re.search(r'Total tiles: (\d+)', section)
        avg_turns = re.search(r'Average turns: ([\d.]+)', section)
        turns_per_100 = re.search(r'Turns per 100 tiles: ([\d.]+)', section)
        dominance = re.search(r'Average winner dominance: ([\d.]+)%', section)
        lead_changes = re.search(r'Average lead changes: ([\d.]+)', section)
        ponr = re.search(r'Average Point of No Return: ([\d.]+)%', section)
        max_lead = re.search(r'Average Max Lead of Winner: ([\d.]+)%', section)

        if total_tiles and avg_turns and turns_per_100:
            results.append({
                'name': tiling_name,
                'total_tiles': int(total_tiles.group(1)),
                'avg_turns': float(avg_turns.group(1)),
                'turns_per_100': float(turns_per_100.group(1)),
                'dominance': float(dominance.group(1)) if dominance else 0,
                'lead_changes': float(lead_changes.group(1)) if lead_changes else 0,
                'ponr': float(ponr.group(1)) if ponr else 0,
                'max_lead': float(max_lead.group(1)) if max_lead else 0
            })
    deduped = {}
    for r in results:
        if r['name'] not in deduped or r['avg_turns'] > 0:
             deduped[r['name']] = r
    return sorted(deduped.values(), key=lambda x: x['turns_per_100'])

def generate_markdown(results, bot_type="Aggressive"):
    md = f"# Tiling Speed Study Results ({bot_type} Bots)\n"
    md += "Ranking of board tilings by game speed (Turns per 100 tiles). Faster tilings have a lower value.\n\n"
    md += "## Methodology\n"
    md += "- **Games per tiling**: 1000\n"
    md += "- **Grid Size**: 20x20 base\n"
    md += "- **Colors**: 6\n"
    md += f"- **Bots**: 2x {bot_type}\n\n"
    md += "## Results Table\n\n"
    md += "| Rank | Tiling | Total Tiles | Avg Turns | **Turns / 100 Tiles** | Lead Changes | PONR | Max Lead |\n"
    md += "|------|--------|-------------|-----------|-----------------------|--------------|------|----------|\n"
    for i, r in enumerate(results):
        md += f"| {i+1} | {r['name']} | {r['total_tiles']} | {r['avg_turns']:.2f} | **{r['turns_per_100']:.2f}** | {r['lead_changes']:.2f} | {r['ponr']:.1f}% | {r['max_lead']:.1f}% |\n"
    return md

if __name__ == "__main__":
    results = parse_results('raw_results.txt')
    markdown = generate_markdown(results, "Aggressive")
    with open('results.md', 'w') as f:
        f.write(markdown)
