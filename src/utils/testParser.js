/**
 * Parse pasted text into test questions
 * Handles formats like:
 * 1. Question text with ... blanks
 * 1. option a  2. option b  3. option c  4. option d
 *
 * Also handles:
 * - Verbs in parentheses: "Two hours... (be) enough"
 * - Options on separate numbered lines
 * - Slash-separated choices: "sheep\sheeps" or "are/is"
 */

/**
 * Parse raw text into structured test questions
 * @param {string} text - Raw pasted text
 * @returns {Array} Array of question objects
 */
export function parseTestText(text) {
  if (!text || !text.trim()) return [];

  const lines = text.split('\n').map(l => l.trim()).filter(l => l);

  // First, try to detect the format
  const format = detectFormat(lines);

  if (format === 'numbered_options') {
    return parseNumberedOptionsFormat(lines);
  } else if (format === 'slash_choices') {
    return parseSlashChoicesFormat(lines);
  } else {
    return parseStandardFormat(lines);
  }
}

/**
 * Detect the format of the test
 */
function detectFormat(lines) {
  // Check for numbered options format (options on separate lines like "2. is" "3. are")
  let hasQuestionWithOptions = false;
  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i];
    const nextLine = lines[i + 1];

    // Question line followed by short numbered option
    if (line.match(/^\d+[.)]\s*.+/) && nextLine.match(/^\d+[.)]\s*\w{1,20}$/)) {
      hasQuestionWithOptions = true;
      break;
    }
  }

  if (hasQuestionWithOptions) {
    return 'numbered_options';
  }

  // Check for slash choices format (sheep\sheeps or are/is)
  const hasSlashChoices = lines.some(l => /\w+[\\\/]\w+/.test(l) && !l.match(/^\d+[.)]/));
  if (hasSlashChoices) {
    return 'slash_choices';
  }

  return 'standard';
}

/**
 * Parse format where options are on separate numbered lines
 * Example:
 * 1. Cattle ... kept for their meat.
 * 2. is
 * 3. are
 */
function parseNumberedOptionsFormat(lines) {
  const questions = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const questionMatch = line.match(/^(\d+)[.)]\s*(.+)/);

    if (questionMatch) {
      const questionText = questionMatch[2];

      // Check if this is a question (has ... or is longer) or just an option
      const isQuestion = questionText.length > 25 || /\.{2,}|…|\?/.test(questionText);

      if (isQuestion) {
        // Collect options from following lines
        const options = [];
        let j = i + 1;

        while (j < lines.length) {
          const optLine = lines[j];
          const optMatch = optLine.match(/^(\d+)[.)]\s*(.+)/);

          if (optMatch) {
            const optText = optMatch[2].trim();
            // Short text = option, long text = next question
            if (optText.length <= 25 && !/\.{2,}|…/.test(optText)) {
              options.push(optText);
              j++;
            } else {
              break;
            }
          } else {
            break;
          }
        }

        if (options.length > 0) {
          // Pad options to at least 4
          while (options.length < 4) options.push('');

          questions.push({
            question: cleanQuestionText(questionText),
            type: /\.{2,}|…/.test(questionText) ? 'fill_blank' : 'multiple_choice',
            options: options.slice(0, 8),
            answer: '',
          });

          i = j;
          continue;
        }
      }
    }

    i++;
  }

  return questions;
}

/**
 * Parse format with slash-separated choices
 * Example: "On this farm there are many sheep\sheeps, swine\swines."
 * Or: "The police are/is investigating"
 */
function parseSlashChoicesFormat(lines) {
  const questions = [];

  for (const line of lines) {
    // Skip section headers
    if (line.match(/^\d+\.\s*[А-Яа-яЁё]/) && line.length < 80) continue;

    // Find all slash choices in the line
    const slashMatches = line.match(/\w+[\\\/]\w+/g);

    if (slashMatches && slashMatches.length > 0) {
      // Create question with choices
      let questionText = line;
      const allOptions = [];

      for (const match of slashMatches) {
        const separator = match.includes('\\') ? '\\' : '/';
        const choices = match.split(separator);
        allOptions.push(...choices);

        // Replace the choice in question text with blank
        questionText = questionText.replace(match, '...');
      }

      // Remove duplicates and limit options
      const uniqueOptions = [...new Set(allOptions)];
      while (uniqueOptions.length < 4) uniqueOptions.push('');

      questions.push({
        question: cleanQuestionText(questionText),
        type: 'fill_blank',
        options: uniqueOptions.slice(0, 8),
        answer: '',
      });
    }
  }

  return questions;
}

/**
 * Parse standard format with inline options
 */
function parseStandardFormat(lines) {
  const questions = [];
  let currentQuestion = null;
  let questionBuffer = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if line starts a new question (number followed by period or parenthesis)
    const questionStart = line.match(/^(\d+)[.)]\s*(.+)/);

    if (questionStart) {
      // Save previous question if exists
      if (currentQuestion) {
        questions.push(finalizeQuestion(currentQuestion, questionBuffer));
      }

      // Start new question
      currentQuestion = {
        num: parseInt(questionStart[1]),
        question_text: '',
        question_type: 'multiple_choice',
        options: ['', '', '', ''],
        correct_answer: '',
      };
      questionBuffer = [questionStart[2]];
    } else if (currentQuestion) {
      // Continue collecting content for current question
      questionBuffer.push(line);
    }
  }

  // Don't forget the last question
  if (currentQuestion) {
    questions.push(finalizeQuestion(currentQuestion, questionBuffer));
  }

  // Convert to standard format
  return questions.map(q => ({
    question: q.question_text,
    type: q.question_type,
    options: q.options,
    answer: q.correct_answer,
  }));
}

/**
 * Process collected lines for a question
 */
function finalizeQuestion(question, lines) {
  const fullText = lines.join(' ');

  // Try to extract options from the text
  const { questionText, options, correctAnswer } = extractOptionsFromText(fullText);

  question.question_text = cleanQuestionText(questionText);

  if (options.length > 0 && options.some(o => o)) {
    question.options = options;
  }

  // Determine question type based on content
  const hasBlanks = /\.{2,}|…/.test(question.question_text);
  const hasVerbInParens = /\([a-z]+\)/i.test(question.question_text);

  if (hasBlanks || hasVerbInParens) {
    question.question_type = 'fill_blank';
  } else if (options.some(o => o)) {
    question.question_type = 'multiple_choice';
  } else {
    question.question_type = 'fill_blank';
  }

  if (correctAnswer) {
    question.correct_answer = correctAnswer;
  }

  return question;
}

/**
 * Extract options and question text from combined text
 */
function extractOptionsFromText(text) {
  let questionText = text;
  let options = [];
  let correctAnswer = '';

  // Try letter-based options: a) ... b) ... c) ... d) ...
  const letterOptionsMatch = text.match(/\ba\s*\)\s*(.+?)\s+b\s*\)\s*(.+?)\s+c\s*\)\s*(.+?)\s+d\s*\)\s*(.+?)$/i);

  if (letterOptionsMatch) {
    const aMatch = text.match(/\ba\s*\)/i);
    if (aMatch) {
      const optionsStartIdx = text.indexOf(aMatch[0]);
      questionText = text.substring(0, optionsStartIdx).trim();
      options = [
        letterOptionsMatch[1].trim(),
        letterOptionsMatch[2].trim(),
        letterOptionsMatch[3].trim(),
        letterOptionsMatch[4].trim()
      ];
    }
  }

  // Try 3 options: a) ... b) ... c) ...
  if (options.length === 0) {
    const threeOptionsMatch = text.match(/\ba\s*\)\s*(.+?)\s+b\s*\)\s*(.+?)\s+c\s*\)\s*(.+?)$/i);
    if (threeOptionsMatch) {
      const aMatch = text.match(/\ba\s*\)/i);
      if (aMatch) {
        const optionsStartIdx = text.indexOf(aMatch[0]);
        questionText = text.substring(0, optionsStartIdx).trim();
        options = [
          threeOptionsMatch[1].trim(),
          threeOptionsMatch[2].trim(),
          threeOptionsMatch[3].trim(),
          ''
        ];
      }
    }
  }

  // Try 2 options: a) ... b) ...
  if (options.length === 0) {
    const twoOptionsMatch = text.match(/\ba\s*\)\s*(.+?)\s+b\s*\)\s*(.+?)$/i);
    if (twoOptionsMatch) {
      const aMatch = text.match(/\ba\s*\)/i);
      if (aMatch) {
        const optionsStartIdx = text.indexOf(aMatch[0]);
        questionText = text.substring(0, optionsStartIdx).trim();
        options = [
          twoOptionsMatch[1].trim(),
          twoOptionsMatch[2].trim(),
          '',
          ''
        ];
      }
    }
  }

  // Try numbered options: 1) ... 2) ... 3) ... 4) ...
  if (options.length === 0) {
    const numberedMatch = text.match(/\b1\s*\)\s*(.+?)\s+2\s*\)\s*(.+?)\s+3\s*\)\s*(.+?)\s+4\s*\)\s*(.+?)$/);
    if (numberedMatch) {
      const oneMatch = text.match(/\b1\s*\)/);
      if (oneMatch) {
        const optionsStartIdx = text.indexOf(oneMatch[0]);
        questionText = text.substring(0, optionsStartIdx).trim();
        options = [
          numberedMatch[1].trim(),
          numberedMatch[2].trim(),
          numberedMatch[3].trim(),
          numberedMatch[4].trim()
        ];
      }
    }
  }

  // Try with dots: a. ... b. ... c. ... d. ...
  if (options.length === 0) {
    const dotOptionsMatch = text.match(/\ba\s*\.\s*(.+?)\s+b\s*\.\s*(.+?)\s+c\s*\.\s*(.+?)\s+d\s*\.\s*(.+?)$/i);
    if (dotOptionsMatch) {
      const aMatch = text.match(/\ba\s*\./i);
      if (aMatch) {
        const optionsStartIdx = text.indexOf(aMatch[0]);
        questionText = text.substring(0, optionsStartIdx).trim();
        options = [
          dotOptionsMatch[1].trim(),
          dotOptionsMatch[2].trim(),
          dotOptionsMatch[3].trim(),
          dotOptionsMatch[4].trim()
        ];
      }
    }
  }

  // Clean up options - remove trailing question numbers
  options = options.map(opt => opt.replace(/\s+\d+[.)]\s*$/, '').trim());

  // Pad to 4 if needed
  while (options.length < 4) options.push('');

  return { questionText, options, correctAnswer };
}

/**
 * Clean up question text
 */
function cleanQuestionText(text) {
  return text
    // Normalize blanks
    .replace(/\.\s*\.\s*\./g, '...')
    .replace(/…/g, '...')
    // Clean extra whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parse a simple list format where each line is a question
 */
export function parseSimpleQuestions(text) {
  const lines = text.split('\n').filter(l => l.trim());
  return lines.map((line, idx) => {
    // Remove leading number if present
    const cleaned = line.replace(/^\d+[.)]\s*/, '').trim();
    return {
      question_text: cleaned,
      question_type: 'fill_blank',
      options: ['', '', '', ''],
      correct_answer: '',
    };
  });
}
