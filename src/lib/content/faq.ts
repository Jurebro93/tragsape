/**
 * Česta pitanja iz teksta članka, za strukturirane podatke (FAQPage). U Markdownu su to
 * podnaslov „## Česta pitanja", ispod njega pitanja kao „### …" i odgovor kao običan tekst.
 */

export type FaqItem = { question: string; answer: string };

const FAQ_HEADING = /^##\s+(česta|najčešća)\s+pitanja\s*$/i;

function plain(text: string): string {
  return text
    .replace(/\[(\d+)\]/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`>#]/g, "")
    .replace(/^\s*[-+]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractFaq(markdown: string): FaqItem[] {
  const items: FaqItem[] = [];
  let inFaq = false;
  let question: string | null = null;
  let answer: string[] = [];
  const flush = () => {
    if (question) {
      const text = plain(answer.join("\n"));
      if (text !== "") {
        items.push({ question: plain(question), answer: text.slice(0, 1200) });
      }
    }
    question = null;
    answer = [];
  };
  for (const line of markdown.split("\n")) {
    if (/^##\s+/.test(line)) {
      flush();
      inFaq = FAQ_HEADING.test(line.trim());
      continue;
    }
    if (!inFaq) {
      continue;
    }
    const heading = /^###\s+(.+?)\s*$/.exec(line);
    if (heading) {
      flush();
      question = heading[1];
    } else if (question) {
      answer.push(line);
    }
  }
  flush();
  return items;
}
