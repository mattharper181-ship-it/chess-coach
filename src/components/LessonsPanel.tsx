import { useState } from 'react';
import type { Lesson } from '../lib/lessons';

interface Props {
  lessons: Lesson[];
}

const CATEGORY_COLORS: Record<string, string> = {
  opening: 'bg-blue-900 text-blue-300',
  tactics: 'bg-red-900 text-red-300',
  endgame: 'bg-orange-900 text-orange-300',
  strategy: 'bg-purple-900 text-purple-300',
  mindset: 'bg-teal-900 text-teal-300',
};

const DIFFICULTY_DOTS: Record<string, string> = {
  beginner: '●○○',
  intermediate: '●●○',
  advanced: '●●●',
};

function LessonCard({ lesson }: { lesson: Lesson }) {
  const [open, setOpen] = useState(false);
  const relevancePct = Math.round(lesson.relevance * 100);

  return (
    <div className={`bg-gray-800 rounded-xl overflow-hidden border ${relevancePct >= 70 ? 'border-amber-500/40' : 'border-gray-700'}`}>
      <button
        className="w-full text-left p-5 hover:bg-gray-750 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="text-2xl">{lesson.icon}</span>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${CATEGORY_COLORS[lesson.category]}`}>
                  {lesson.category}
                </span>
                <span className="text-xs text-gray-500 font-mono">{DIFFICULTY_DOTS[lesson.difficulty]}</span>
                {relevancePct >= 70 && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-900 text-amber-300">
                    Recommended for you
                  </span>
                )}
              </div>
              <h3 className="text-white font-semibold">{lesson.title}</h3>
              <p className="text-gray-400 text-sm mt-1">{lesson.summary}</p>
            </div>
          </div>
          <span className="text-gray-500 text-lg flex-shrink-0">{open ? '▲' : '▼'}</span>
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-gray-700">
          <ul className="space-y-3 mt-4">
            {lesson.points.map((p, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-gray-300">
                <span className="text-amber-400 font-bold mt-0.5 flex-shrink-0">{i + 1}.</span>
                {p}
              </li>
            ))}
          </ul>
          {lesson.practicePrompt && (
            <div className="mt-4 p-3 bg-amber-900/30 border border-amber-700/40 rounded-lg">
              <span className="text-amber-400 font-medium text-sm">Practice: </span>
              <span className="text-amber-200 text-sm">{lesson.practicePrompt}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function LessonsPanel({ lessons }: Props) {
  const [filter, setFilter] = useState<string>('all');
  const categories = ['all', 'opening', 'tactics', 'strategy', 'endgame', 'mindset'];

  const filtered = filter === 'all' ? lessons : lessons.filter(l => l.category === filter);

  return (
    <div>
      {/* Category filter */}
      <div className="flex gap-2 flex-wrap mb-5">
        {categories.map(c => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
              filter === c ? 'bg-amber-500 text-black' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map(lesson => (
          <LessonCard key={lesson.id} lesson={lesson} />
        ))}
      </div>
    </div>
  );
}
