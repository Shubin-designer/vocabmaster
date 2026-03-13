/**
 * Parse pasted text into test questions
 * Handles formats like:
 * 1. Question text with . . . blanks
 * 1. option a  2. option b  3. option c  4. option d
 */

/**
 * Parse raw text into structured test questions
 * @param {string} text - Raw pasted text
 * @returns {Array} Array of question objects
 */
export function parseTestText(text) {
  if (!text || !text.trim()) return [];

  const questions = [];
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);

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
      const questionNum = parseInt(questionStart[1]);
      const questionContent = questionStart[2];

      currentQuestion = {
        num: questionNum,
        question_text: '',
        question_type: 'multiple_choice',
        options: ['', '', '', ''],
        correct_answer: '',
      };
      questionBuffer = [questionContent];
    } else if (currentQuestion) {
      // Continue collecting content for current question
      questionBuffer.push(line);
    }
  }

  // Don't forget the last question
  if (currentQuestion) {
    questions.push(finalizeQuestion(currentQuestion, questionBuffer));
  }

  return questions;
}

/**
 * Process collected lines for a question
 */
function finalizeQuestion(question, lines) {
  const fullText = lines.join(' ');

  // Try to extract options from the text
  // Pattern: 1. option  2. option  3. option  4. option
  // Or: 1) option 2) option
  // Or: a) option b) option c) option d) option
  // Or: a. option b. option

  const { questionText, options, correctAnswer } = extractOptionsFromText(fullText);

  question.question_text = cleanQuestionText(questionText);

  if (options.length > 0) {
    question.options = options;
  }

  // Determine question type based on content
  // If question has blanks (...), it's fill_blank
  // If no blanks but has options, it's multiple_choice
  const hasBlanks = /\.{2,}|…/.test(question.question_text);

  if (hasBlanks) {
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
  let options = ['', '', '', ''];
  let correctAnswer = '';

  // Try letter-based options first (most common): a) ... b) ... c) ... d) ...
  // Look for pattern where a) appears, then b), c), d)
  const letterOptionsMatch = text.match(/\ba\s*\)\s*(.+?)\s+b\s*\)\s*(.+?)\s+c\s*\)\s*(.+?)\s+d\s*\)\s*(.+?)$/i);

  if (letterOptionsMatch) {
    // Find where 'a)' starts
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
  if (options.every(o => !o)) {
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

  // Try numbered options: 1) ... 2) ... 3) ... 4) ...
  if (options.every(o => !o)) {
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
  if (options.every(o => !o)) {
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
