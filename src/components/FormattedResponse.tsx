import React from 'react';

function inline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|`[^`]+`)/g).filter(Boolean);
  return parts.map((part, index) => {
    if ((part.startsWith('**') && part.endsWith('**')) || (part.startsWith('__') && part.endsWith('__'))) {
      return <strong key={index} className="font-semibold text-inherit">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) return <em key={index}>{part.slice(1, -1)}</em>;
    if (part.startsWith('`') && part.endsWith('`')) return <code key={index} className="rounded bg-black/5 px-1 py-0.5 text-[0.92em]">{part.slice(1, -1)}</code>;
    return part;
  });
}

function cells(line: string): string[] {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(value => value.trim());
}

function isTableDivider(line: string) {
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
}

export default function FormattedResponse({ content, className = '' }: { content: string; className?: string }) {
  const lines = content.replace(/\r/g, '').split('\n');
  const blocks: React.ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const raw = lines[index];
    const line = raw.trim();
    if (!line || line === '---' || line === '***') { index++; continue; }

    if (line.startsWith('|') && index + 1 < lines.length && isTableDivider(lines[index + 1])) {
      const headers = cells(line);
      index += 2;
      const rows: string[][] = [];
      while (index < lines.length && lines[index].trim().startsWith('|')) {
        rows.push(cells(lines[index]));
        index++;
      }
      blocks.push(
        <div key={blocks.length} className="my-3 overflow-x-auto rounded-xl border border-[#e6dece]">
          <table className="w-full min-w-[420px] border-collapse text-left text-xs">
            <thead className="bg-[#edf2e9]"><tr>{headers.map((cell, i) => <th key={i} className="px-3 py-2 font-semibold text-[#254b35]">{inline(cell)}</th>)}</tr></thead>
            <tbody>{rows.map((row, ri) => <tr key={ri} className="border-t border-[#eee8dc] even:bg-[#faf8f2]">{headers.map((_, ci) => <td key={ci} className="px-3 py-2 align-top text-[#35483b]">{inline(row[ci] || '')}</td>)}</tr>)}</tbody>
          </table>
        </div>
      );
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/) || line.match(/^\*\*(.{2,90})\*\*:?$/);
    if (heading) {
      const title = (heading[2] || heading[1]).replace(/^\*\*|\*\*$/g, '').replace(/:$/, '');
      blocks.push(<h3 key={blocks.length} className="mb-2 mt-5 first:mt-0 text-sm font-bold tracking-tight text-[#174432]">{inline(title)}</h3>);
      index++;
      continue;
    }

    if (/^[-*•]\s+/.test(line)) {
      const items: React.ReactNode[] = [];
      while (index < lines.length && /^\s*[-*•]\s+/.test(lines[index])) {
        items.push(<li key={items.length}>{inline(lines[index].trim().replace(/^[-*•]\s+/, ''))}</li>);
        index++;
      }
      blocks.push(<ul key={blocks.length} className="my-2 list-disc space-y-1.5 pl-5 text-inherit marker:text-[#719579]">{items}</ul>);
      continue;
    }

    if (/^\d+[.)]\s+/.test(line)) {
      const items: React.ReactNode[] = [];
      while (index < lines.length && /^\s*\d+[.)]\s+/.test(lines[index])) {
        items.push(<li key={items.length}>{inline(lines[index].trim().replace(/^\d+[.)]\s+/, ''))}</li>);
        index++;
      }
      blocks.push(<ol key={blocks.length} className="my-2 list-decimal space-y-1.5 pl-5 text-inherit marker:font-semibold marker:text-[#719579]">{items}</ol>);
      continue;
    }

    const paragraph = [line];
    index++;
    while (index < lines.length) {
      const next = lines[index].trim();
      if (!next || next === '---' || next.startsWith('#') || next.startsWith('|') || /^[-*•]\s+/.test(next) || /^\d+[.)]\s+/.test(next) || /^\*\*[^*]+\*\*:?$/.test(next)) break;
      paragraph.push(next);
      index++;
    }
    blocks.push(<p key={blocks.length} className="my-2 leading-7 text-inherit">{inline(paragraph.join(' '))}</p>);
  }

  return <div className={className}>{blocks}</div>;
}
