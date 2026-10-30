import { useMemo, useState } from 'react';

// Curated locally on purpose: it loads instantly, works offline (installed app) and cannot break
// when a third-party API is down. A new pair is shown every day; the buttons cycle through the rest.
const QUOTES = [
  { text: 'The beautiful thing about learning is that no one can take it away from you.', author: 'B.B. King' },
  { text: 'Education is the most powerful weapon which you can use to change the world.', author: 'Nelson Mandela' },
  { text: "It always seems impossible until it's done.", author: 'Nelson Mandela' },
  { text: 'Success is the sum of small efforts, repeated day in and day out.', author: 'Robert Collier' },
  { text: "Don't watch the clock; do what it does. Keep going.", author: 'Sam Levenson' },
  { text: "You don't have to be great to start, but you have to start to be great.", author: 'Zig Ziglar' },
  { text: 'A journey of a thousand miles begins with a single step.', author: 'Lao Tzu' },
  { text: "Whether you think you can, or you think you can't, you're right.", author: 'Henry Ford' },
  { text: 'An investment in knowledge pays the best interest.', author: 'Benjamin Franklin' },
  { text: 'Seeking knowledge is an obligation upon every Muslim.', author: 'Hadith · Ibn Majah' },
  { text: 'Well done is better than well said.', author: 'Benjamin Franklin' },
  { text: 'The expert in anything was once a beginner.', author: 'Helen Hayes' },
];

const DUAS = [
  { ar: 'رَبِّ زِدْنِي عِلْمًا', en: 'My Lord, increase me in knowledge.', ref: 'Surah Ta-Ha · 20:114 (excerpt)' },
  { ar: 'رَبِّ ٱشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي', en: 'My Lord, open up my heart for me and make my task easy for me.', ref: 'Surah Ta-Ha · 20:25-26' },
  { ar: 'فَإِنَّ مَعَ ٱلْعُسْرِ يُسْرًا', en: 'Indeed, with hardship comes ease.', ref: 'Surah Ash-Sharh · 94:5' },
  { ar: 'حَسْبُنَا ٱللَّهُ وَنِعْمَ ٱلْوَكِيلُ', en: 'Allah is sufficient for us, and He is the best disposer of affairs.', ref: "Surah Ali 'Imran · 3:173 (excerpt)" },
  { ar: 'لَا يُكَلِّفُ ٱللَّهُ نَفْسًا إِلَّا وُسْعَهَا', en: 'Allah does not burden a soul beyond its capacity.', ref: 'Surah Al-Baqarah · 2:286 (excerpt)' },
  { ar: 'هَلْ يَسْتَوِي ٱلَّذِينَ يَعْلَمُونَ وَٱلَّذِينَ لَا يَعْلَمُونَ', en: 'Are those who know equal to those who do not know?', ref: 'Surah Az-Zumar · 39:9 (excerpt)' },
  { ar: 'وَمَن يَتَوَكَّلْ عَلَى ٱللَّهِ فَهُوَ حَسْبُهُ', en: 'Whoever puts their trust in Allah, He is enough for them.', ref: 'Surah At-Talaq · 65:3 (excerpt)' },
];

const dayOfYear = () => {
  const now = new Date();
  return Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
};

const NextButton = ({ onClick, label, dark }) => (
  <button type="button" onClick={onClick} aria-label={label}
    className={`group inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition active:scale-95 ${dark ? 'bg-white/10 text-emerald-100 hover:bg-white/20' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'}`}>
    <span className="transition-transform duration-500 group-hover:rotate-180">↻</span> {label}
  </button>
);

export default function InspirationWidget() {
  const base = useMemo(dayOfYear, []);
  const [qOffset, setQOffset] = useState(0);
  const [dOffset, setDOffset] = useState(0);

  const quote = QUOTES[(base + qOffset) % QUOTES.length];
  const dua = DUAS[(base + dOffset + 3) % DUAS.length];

  return (
    <section aria-label="Daily inspiration" className="grid gap-4 md:grid-cols-2">
      {/* Daily motivation */}
      <div className="rounded-2xl bg-gradient-to-br from-indigo-300 via-violet-300 to-fuchsia-300 p-[1.5px] shadow-lg shadow-indigo-500/10">
        <div className="relative flex h-full flex-col justify-between overflow-hidden rounded-[15px] bg-white p-5">
          <span aria-hidden className="pointer-events-none absolute -right-1 -top-6 select-none font-serif text-[120px] leading-none text-indigo-100">”</span>
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-indigo-700">💡 Daily motivation</span>
            <blockquote key={quote.text} className="animate-fade-up mt-4">
              <p className="text-lg font-semibold leading-snug text-slate-800">“{quote.text}”</p>
              <footer className="mt-3 flex items-center gap-2 text-sm text-slate-500">
                <span className="h-px w-6 bg-gradient-to-r from-indigo-400 to-fuchsia-400" />
                {quote.author}
              </footer>
            </blockquote>
          </div>
          <div className="relative mt-5"><NextButton onClick={() => setQOffset((n) => n + 1)} label="New quote" /></div>
        </div>
      </div>

      {/* Study dua */}
      <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900 p-5 text-white shadow-lg shadow-emerald-900/20">
        <div aria-hidden className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-emerald-400/20 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-12 -right-8 h-44 w-44 rounded-full bg-amber-300/10 blur-3xl" />
        <span aria-hidden className="pointer-events-none absolute right-4 top-3 select-none text-4xl opacity-20">🌙</span>
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-300">🌙 Study dua &amp; guidance</span>
          <div key={dua.ref} className="animate-fade-up mt-4 text-center">
            <p dir="rtl" lang="ar" className="font-arabic text-[28px] leading-[2] text-emerald-100 sm:text-3xl">{dua.ar}</p>
            <p className="mt-2 text-sm italic leading-relaxed text-emerald-50/90">“{dua.en}”</p>
            <p className="mt-3 inline-block rounded-full bg-amber-300/15 px-3 py-1 text-[11px] font-semibold text-amber-200">{dua.ref}</p>
          </div>
        </div>
        <div className="relative mt-5 flex items-center justify-between gap-3">
          <NextButton dark onClick={() => setDOffset((n) => n + 1)} label="Next dua" />
          <p className="text-right text-[10px] leading-tight text-emerald-200/60">Meaning only, not a word-for-word translation.</p>
        </div>
      </div>
    </section>
  );
}
