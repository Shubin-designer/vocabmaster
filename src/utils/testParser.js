/**
 * Parse pasted text into test questions
 * Supports multiple formats:
 * - Fill in blank: "Two hours... (be) enough"
 * - Multiple choice with inline options: "Question a) opt1 b) opt2"
 * - Numbered options on separate lines
 * - Slash choices: "sheep\sheeps" or "are/is"
 */

export function parseTestText(text) {
  if (!text || !text.trim()) return [];

  const lines = text.split('\n').map(l => l.trim()).filter(l => l);

  // Detect format and parse accordingly
  const format = detectFormat(lines, text);

  let questions = [];

  if (format === 'numbered_options_multiline') {
    questions = parseNumberedOptionsMultiline(lines);
  } else if (format === 'slash_choices') {
    questions = parseSlashChoices(lines);
  } else {
    questions = parseStandard(lines);
  }

  // Clean up: remove questions without text, remove empty options
  return questions
    .filter(q => q.question && q.question.trim())
    .map(q => ({
      ...q,
      // Only keep non-empty options
      options: (q.options || []).filter(o => o && o.trim()),
    }));
}

/**
 * Detect the format of the test
 */
function detectFormat(lines, fullText) {
  // Check for slash choices: word\word or word/word (not URLs)
  if (lines.some(l => /\b\w+[\\\/]\w+\b/.test(l) && !l.includes('http'))) {
    return 'slash_choices';
  }

  // Check for numbered options on separate lines:
  // Pattern: question line followed by short option lines (1. is, 2. are)
  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i];
    const nextLines = lines.slice(i + 1, i + 4);

    // Current line has ... or ? (is a question)
    if (/\.{2,}|…|\?/.test(line)) {
      // Next lines are short numbered items (options)
      const areOptions = nextLines.filter(l => {
        const match = l.match(/^(\d+)[.)]\s*(.*)$/);
        return match && match[2].length < 30 && !/\.{2,}|…/.test(match[2]);
      });
      if (areOptions.length >= 2) {
        return 'numbered_options_multiline';
      }
    }
  }

  return 'standard';
}

/**
 * Parse format where options are on separate numbered lines
 */
function parseNumberedOptionsMultiline(lines) {
  const questions = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Skip section headers (Russian text without question markers)
    if (line.match(/^\d+\.\s*[А-Яа-яЁё]/) && !/\.{2,}|…|\?/.test(line)) {
      i++;
      continue;
    }

    // Check if this is a question (has blanks or is substantial)
    const questionMatch = line.match(/^(\d+)[.)]\s*(.+)/);

    if (questionMatch) {
      const questionText = questionMatch[2];
      const hasBlank = /\.{2,}|…/.test(questionText);
      const isLongEnough = questionText.length > 20;

      if (hasBlank || isLongEnough) {
        // Collect options from following lines
        const options = [];
        let j = i + 1;

        while (j < lines.length) {
          const optLine = lines[j];
          const optMatch = optLine.match(/^(\d+)[.)]\s*(.+)$/);

          if (optMatch) {
            const optText = optMatch[2].trim();
            // Short text without blanks = option
            if (optText.length < 30 && !/\.{2,}|…/.test(optText)) {
              options.push(optText);
              j++;
            } else {
              break;
            }
          } else if (optLine.match(/^[a-d][.)]\s*.+$/i)) {
            // Letter options like "a) is"
            const letterMatch = optLine.match(/^[a-d][.)]\s*(.+)$/i);
            if (letterMatch) {
              options.push(letterMatch[1].trim());
              j++;
            }
          } else {
            break;
          }
        }

        questions.push({
          question: cleanText(questionText),
          type: hasBlank ? 'fill_blank' : 'multiple_choice',
          options: options,
          answer: '',
        });

        i = j;
        continue;
      }
    }

    // Not a question, might be standalone text with blanks
    if (/\.{2,}|…/.test(line) && !line.match(/^\d+[.)]/)) {
      questions.push({
        question: cleanText(line),
        type: 'fill_blank',
        options: [],
        answer: '',
      });
    }

    i++;
  }

  return questions;
}

/**
 * Parse slash-separated choices
 */
function parseSlashChoices(lines) {
  const questions = [];

  for (const line of lines) {
    // Skip section headers
    if (line.match(/^\d+\.\s*[А-Яа-яЁё]/) && line.length < 60 && !/[\\\/]/.test(line)) {
      continue;
    }

    // Find slash choices
    const slashPattern = /\b(\w+)[\\\/](\w+)\b/g;
    const matches = [...line.matchAll(slashPattern)];

    if (matches.length > 0) {
      // Collect all options from slashes
      const options = [];
      matches.forEach(m => {
        if (!options.includes(m[1])) options.push(m[1]);
        if (!options.includes(m[2])) options.push(m[2]);
      });

      // Create question text with blanks
      let questionText = line;
      matches.forEach(m => {
        questionText = questionText.replace(m[0], '...');
      });

      questions.push({
        question: cleanText(questionText),
        type: 'fill_blank',
        options: options,
        answer: '',
      });
    }
  }

  return questions;
}

/**
 * Parse standard format with inline options
 */
function parseStandard(lines) {
  const questions = [];
  let currentQ = null;
  let buffer = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // New question starts with number
    const qMatch = line.match(/^(\d+)[.)]\s*(.+)/);

    if (qMatch) {
      // Save previous question
      if (currentQ) {
        questions.push(finalizeStandardQuestion(currentQ, buffer));
      }

      currentQ = { num: parseInt(qMatch[1]) };
      buffer = [qMatch[2]];
    } else if (currentQ) {
      buffer.push(line);
    } else {
      // Line without question number - might be a standalone fill-blank
      if (/\.{2,}|…|\([a-z]+\)/i.test(line)) {
        questions.push({
          question: cleanText(line),
          type: 'fill_blank',
          options: [],
          answer: '',
        });
      }
    }
  }

  // Don't forget last question
  if (currentQ) {
    questions.push(finalizeStandardQuestion(currentQ, buffer));
  }

  return questions;
}

/**
 * Finalize a standard format question
 */
function finalizeStandardQuestion(q, buffer) {
  const fullText = buffer.join(' ');

  // Try to extract inline options
  const { questionText, options } = extractInlineOptions(fullText);

  const hasBlank = /\.{2,}|…|\([a-z]+\)/i.test(questionText);

  return {
    question: cleanText(questionText),
    type: hasBlank ? 'fill_blank' : (options.length > 0 ? 'multiple_choice' : 'fill_blank'),
    options: options,
    answer: '',
  };
}

/**
 * Extract inline options from text
 * Handles: a) opt b) opt c) opt OR a. opt b. opt
 */
function extractInlineOptions(text) {
  let questionText = text;
  let options = [];

  // Try a) b) c) d) format
  const letterParenMatch = text.match(/^(.+?)\s+a\s*\)\s*(.+?)\s+b\s*\)\s*(.+?)(?:\s+c\s*\)\s*(.+?))?(?:\s+d\s*\)\s*(.+?))?$/i);

  if (letterParenMatch) {
    questionText = letterParenMatch[1];
    options = [
      letterParenMatch[2]?.trim(),
      letterParenMatch[3]?.trim(),
      letterParenMatch[4]?.trim(),
      letterParenMatch[5]?.trim(),
    ].filter(Boolean);
    return { questionText, options };
  }

  // Try a. b. c. d. format
  const letterDotMatch = text.match(/^(.+?)\s+a\s*\.\s*(.+?)\s+b\s*\.\s*(.+?)(?:\s+c\s*\.\s*(.+?))?(?:\s+d\s*\.\s*(.+?))?$/i);

  if (letterDotMatch) {
    questionText = letterDotMatch[1];
    options = [
      letterDotMatch[2]?.trim(),
      letterDotMatch[3]?.trim(),
      letterDotMatch[4]?.trim(),
      letterDotMatch[5]?.trim(),
    ].filter(Boolean);
    return { questionText, options };
  }

  // Try comma-separated in parentheses: (is, are)
  const parenOptionsMatch = text.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (parenOptionsMatch && parenOptionsMatch[2].includes(',')) {
    questionText = parenOptionsMatch[1];
    options = parenOptionsMatch[2].split(',').map(o => o.trim()).filter(Boolean);
    return { questionText, options };
  }

  return { questionText, options: [] };
}

/**
 * Clean text
 */
function cleanText(text) {
  return text
    .replace(/\.\s*\.\s*\./g, '...')
    .replace(/…/g, '...')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Simple line-by-line parser
 */
export function parseSimpleQuestions(text) {
  const lines = text.split('\n').filter(l => l.trim());
  return lines.map(line => {
    const cleaned = line.replace(/^\d+[.)]\s*/, '').trim();
    return {
      question: cleaned,
      type: 'fill_blank',
      options: [],
      answer: '',
    };
  });
}
