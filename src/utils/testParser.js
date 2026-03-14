/**
 * Parse pasted text into test questions
 *
 * Returns: { title, description, questions }
 *
 * Supports:
 * - Numbered questions: "1. Question text..."
 * - Fill in blanks: lines with "..." or "…"
 * - Title extraction from headers like "Упражнение 1" or "Exercise 1"
 * - Description extraction from instruction lines
 */

export function parseTestText(text) {
  if (!text || !text.trim()) return { title: '', description: '', questions: [] };

  const lines = text.split('\n').map(l => l.trim()).filter(l => l);

  const result = {
    title: '',
    description: '',
    questions: []
  };

  let currentQuestionLines = [];
  let lastQuestionNum = 0;
  let collectingDescription = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for title (Упражнение X, Exercise X, etc.)
    if (!result.title && isTitle(line)) {
      result.title = line;
      collectingDescription = true;
      continue;
    }

    // Check for numbered question start
    const numMatch = line.match(/^(\d+)[.)]\s*(.+)/);

    if (numMatch) {
      const num = parseInt(numMatch[1]);
      const content = numMatch[2].trim();

      // If this is a continuation of numbering (sequential number)
      // and the content looks like a question (has text), treat it as a question
      if (content.length > 0) {
        // Save previous question if exists
        if (currentQuestionLines.length > 0) {
          const q = createQuestion(currentQuestionLines.join(' '));
          if (q) result.questions.push(q);
        }

        collectingDescription = false;
        currentQuestionLines = [content];
        lastQuestionNum = num;
        continue;
      }
    }

    // If we're collecting description (between title and first question)
    if (collectingDescription && !numMatch) {
      if (result.description) {
        result.description += ' ' + line;
      } else {
        result.description = line;
      }
      continue;
    }

    // If we have a current question and this line continues it
    if (currentQuestionLines.length > 0 && !numMatch) {
      // Check if this line might be a new unnumbered question with blanks
      if (hasBlanks(line) && !hasBlanks(currentQuestionLines[currentQuestionLines.length - 1])) {
        // Save previous
        const q = createQuestion(currentQuestionLines.join(' '));
        if (q) result.questions.push(q);
        currentQuestionLines = [line];
      } else {
        // Continue current question
        currentQuestionLines.push(line);
      }
      continue;
    }

    // Standalone line with blanks = new question
    if (hasBlanks(line)) {
      if (currentQuestionLines.length > 0) {
        const q = createQuestion(currentQuestionLines.join(' '));
        if (q) result.questions.push(q);
      }
      currentQuestionLines = [line];
      continue;
    }
  }

  // Don't forget last question
  if (currentQuestionLines.length > 0) {
    const q = createQuestion(currentQuestionLines.join(' '));
    if (q) result.questions.push(q);
  }

  // Return full result object with title, description, and questions
  return result;
}

/**
 * Check if line is a title
 */
function isTitle(line) {
  // Упражнение X, Exercise X, Task X, etc.
  return /^(упражнение|exercise|task|задание)\s*\d*/i.test(line) ||
         // Short uppercase lines might be titles
         (line.length < 50 && /^[А-ЯA-Z]/.test(line) && !/\.{2,}|…/.test(line) && !line.match(/^\d+[.)]/));
}

/**
 * Check if text has blanks
 */
function hasBlanks(text) {
  return /\.{2,}|…/.test(text);
}

/**
 * Create a question object from text
 */
function createQuestion(text) {
  if (!text || !text.trim()) return null;

  const cleanText = cleanQuestionText(text);

  // Skip if too short or looks like a header
  if (cleanText.length < 5) return null;
  if (isTitle(cleanText)) return null;

  // Check for inline options (a) b) c) d) format)
  const { questionText, options } = extractInlineOptions(cleanText);

  const hasBlank = hasBlanks(questionText);

  return {
    question: questionText,
    type: hasBlank ? 'fill_blank' : (options.length > 0 ? 'multiple_choice' : 'fill_blank'),
    options: options,
    answer: '',
  };
}

/**
 * Extract inline options from text
 */
function extractInlineOptions(text) {
  let questionText = text;
  let options = [];

  // Try a) b) c) d) format
  const letterMatch = text.match(/^(.+?)\s+a\s*\)\s*(.+?)\s+b\s*\)\s*(.+?)(?:\s+c\s*\)\s*(.+?))?(?:\s+d\s*\)\s*(.+?))?$/i);

  if (letterMatch) {
    questionText = letterMatch[1].trim();
    options = [
      letterMatch[2]?.trim(),
      letterMatch[3]?.trim(),
      letterMatch[4]?.trim(),
      letterMatch[5]?.trim(),
    ].filter(Boolean);
  }

  // Try slash-separated options: word/word or word\word
  if (options.length === 0) {
    const slashMatches = [...text.matchAll(/\b(\w+)[\\\/](\w+)\b/g)];
    if (slashMatches.length > 0) {
      const allOptions = [];
      slashMatches.forEach(m => {
        if (!allOptions.includes(m[1])) allOptions.push(m[1]);
        if (!allOptions.includes(m[2])) allOptions.push(m[2]);
      });
      options = allOptions;

      // Replace slashes with blanks in question text
      questionText = text;
      slashMatches.forEach(m => {
        questionText = questionText.replace(m[0], '...');
      });
    }
  }

  return { questionText, options };
}

/**
 * Clean question text
 */
function cleanQuestionText(text) {
  return text
    .replace(/\.\s*\.\s*\./g, '...')
    .replace(/…/g, '...')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Simple parser - each line with blanks is a question
 */
export function parseSimpleQuestions(text) {
  const lines = text.split('\n').filter(l => l.trim());
  return lines
    .filter(line => hasBlanks(line))
    .map(line => {
      const cleaned = line.replace(/^\d+[.)]\s*/, '').trim();
      return {
        question: cleanQuestionText(cleaned),
        type: 'fill_blank',
        options: [],
        answer: '',
      };
    });
}
