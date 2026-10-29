const tone = {
  correct: 'border-green-300 bg-green-50',
  wrong: 'border-red-300 bg-red-50',
  unanswered: 'border-slate-300 bg-slate-50',
};

export default function ResultView({ result }) {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-indigo-600 p-6 text-center text-white">
        <p className="text-sm opacity-80">Your score</p>
        <p className="text-4xl font-bold">{result.score} <span className="text-xl opacity-80">/ {result.totalMarks}</span></p>
        <div className="mt-3 flex justify-center gap-4 text-sm">
          <span>✅ {result.correct} correct</span>
          <span>❌ {result.wrong} wrong</span>
          <span>➖ {result.unanswered} skipped</span>
        </div>
      </div>

      {result.breakdown.map((q, i) => (
        <div key={q.id} className={`rounded-xl border p-4 ${tone[q.status]}`}>
          <p className="mb-2 font-medium">{i + 1}. {q.question_text}</p>
          <ul className="space-y-1 text-sm">
            {Object.entries(q.options).map(([k, v]) => (
              <li key={k} className={
                k === q.correct_option ? 'font-semibold text-green-700'
                : k === q.chosen ? 'font-semibold text-red-700' : ''
              }>
                {k}. {v}
                {k === q.correct_option && ' ✓ correct answer'}
                {k === q.chosen && k !== q.correct_option && ' ✗ your answer'}
                {k === q.chosen && k === q.correct_option && ' (your answer)'}
              </li>
            ))}
          </ul>
          {q.status === 'unanswered' && <p className="mt-2 text-xs text-slate-500">You skipped this question.</p>}
        </div>
      ))}
    </div>
  );
}
