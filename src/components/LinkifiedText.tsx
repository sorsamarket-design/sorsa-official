import React from 'react';

const URL_PATTERN = /((?:https?:\/\/|www\.)[^\s<]+|(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s<]*)?)/gi;
const TRAILING_PUNCTUATION = /[),.;!?]+$/;

function getLinkParts(text: string) {
  const parts: Array<{ text: string; url?: string }> = [];
  let lastIndex = 0;

  for (const match of text.matchAll(URL_PATTERN)) {
    const raw = match[0];
    const index = match.index ?? 0;
    const punctuation = raw.match(TRAILING_PUNCTUATION)?.[0] || '';
    const cleanText = punctuation ? raw.slice(0, -punctuation.length) : raw;

    if (index > lastIndex) {
      parts.push({ text: text.slice(lastIndex, index) });
    }

    parts.push({
      text: cleanText,
      url: cleanText.startsWith('http') ? cleanText : `https://${cleanText}`
    });

    if (punctuation) {
      parts.push({ text: punctuation });
    }

    lastIndex = index + raw.length;
  }

  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex) });
  }

  return parts;
}

type LinkifiedTextProps = {
  text?: string | null;
  className?: string;
};

export default function LinkifiedText({ text, className }: LinkifiedTextProps) {
  const value = String(text || '');
  const parts = getLinkParts(value);

  return (
    <span className={className}>
      {parts.map((part, index) =>
        part.url ? (
          <a
            key={`${part.url}-${index}`}
            href={part.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => event.stopPropagation()}
            className="text-cyan hover:underline break-all"
          >
            {part.text}
          </a>
        ) : (
          <React.Fragment key={`${part.text}-${index}`}>{part.text}</React.Fragment>
        )
      )}
    </span>
  );
}
