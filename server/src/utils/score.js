// score = (Correct * Positive Mark) - (Wrong * Negative Mark), applied per question.
export function evaluate(questions, answers = {}) {
  let correct = 0, wrong = 0, unanswered = 0, score = 0, totalMarks = 0;

  const breakdown = questions.map((q) => {
    const marks = Number(q.marks);
    const neg = Math.abs(Number(q.negative_marks));
    const chosen = ['A', 'B', 'C', 'D'].includes(answers[q.id]) ? answers[q.id] : null;
    totalMarks += marks;

    let status = 'unanswered';
    if (!chosen) unanswered++;
    else if (chosen === q.correct_option) { status = 'correct'; correct++; score += marks; }
    else { status = 'wrong'; wrong++; score -= neg; }

    return {
      id: q.id,
      question_text: q.question_text,
      options: { A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d },
      chosen,
      correct_option: q.correct_option,
      status,
    };
  });

  return {
    score: Math.round(score * 100) / 100,
    totalMarks: Math.round(totalMarks * 100) / 100,
    correct, wrong, unanswered,
    total: questions.length,
    breakdown,
  };
}
