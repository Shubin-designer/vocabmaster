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
    question.question_type = 'multiple_choice';
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

  // Try different patterns to find options

  // Pattern 1: Numbered options like "1. a, the  2. -, -  3. the, the  4. -, the"
  const numberedPattern = /(?:^|[\s])([1-4])[.)]\s*([^1-4]+?)(?=(?:\s+[1-4][.)])|$)/g;
  let numberedMatches = [...text.matchAll(numberedPattern)];

  if (numberedMatches.length >= 2) {
    // Find where options start (look for pattern like "1. something 2. something")
    const optionsStartMatch = text.match(/[1-4][.)]\s*[^1-4]+?\s+[1-4][.)]/);
    if (optionsStartMatch) {
      const optionsStartIdx = text.indexOf(optionsStartMatch[0]);
      questionText = text.substring(0, optionsStartIdx).trim();
      const optionsText = text.substring(optionsStartIdx);

      // Re-extract from options portion only
      const optMatches = [...optionsText.matchAll(/([1-4])[.)]\s*([^1-4]+?)(?=(?:\s+[1-4][.)])|$)/g)];
      options = ['', '', '', ''];
      optMatches.forEach(m => {
        const idx = parseInt(m[1]) - 1;
        if (idx >= 0 && idx < 4) {
          options[idx] = m[2].trim().replace(/,\s*$/, '');
        }
      });
    }
  }

  // Pattern 2: Letter options like "a) option b) option" or "a. option b. option"
  if (options.filter(o => o).length < 2) {
    const letterPattern = /(?:^|[\s])([a-d])[.)]\s*([^a-d]+?)(?=(?:\s+[a-d][.)])|$)/gi;
    let letterMatches = [...text.matchAll(letterPattern)];

    if (letterMatches.length >= 2) {
      const optionsStartMatch = text.match(/[a-d][.)]\s*[^a-d]+?\s+[a-d][.)]/i);
      if (optionsStartMatch) {
        const optionsStartIdx = text.indexOf(optionsStartMatch[0]);
        questionText = text.substring(0, optionsStartIdx).trim();
        const optionsText = text.substring(optionsStartIdx);

        const optMatches = [...optionsText.matchAll(/([a-d])[.)]\s*([^a-d]+?)(?=(?:\s+[a-d][.)])|$)/gi)];
        options = ['', '', '', ''];
        optMatches.forEach(m => {
          const idx = m[1].toLowerCase().charCodeAt(0) - 'a'.charCodeAt(0);
          if (idx >= 0 && idx < 4) {
            options[idx] = m[2].trim().replace(/,\s*$/, '');
          }
        });
      }
    }
  }

  // Clean up options - remove trailing numbers that might be part of next question
  options = options.map(opt => opt.replace(/\s+\d+\.\s*$/, '').trim());

  // Filter empty and normalize
  if (options.every(o => !o)) {
    options = ['', '', '', ''];
  }

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
