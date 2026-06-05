const SPOTLIGHT_HEADING_PATTERN = /^\s*Spotlight Requests:\s*$/i;

export function splitCampaignBrief(overview?: string | null) {
  const lines = String(overview || '').split('\n');
  const headingIndex = lines.findIndex((line) => SPOTLIGHT_HEADING_PATTERN.test(line));

  if (headingIndex === -1) {
    return {
      overview: String(overview || ''),
      spotlightRequests: []
    };
  }

  const overviewText = lines.slice(0, headingIndex).join('\n').trim();
  const spotlightRequests = lines
    .slice(headingIndex + 1)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .map((line) => line.slice(2).trim())
    .filter(Boolean);

  return {
    overview: overviewText,
    spotlightRequests
  };
}
