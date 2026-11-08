import type { Metadata } from 'next';
import Link from 'next/link';
import { FUTURE_TASKS } from '@/lib/future-tasks';
import { LAB_ITEMS } from '@/lib/site-nav';

export const metadata: Metadata = {
  title: 'Labs',
  description: 'Arsenal prototypes, experiments and the modules planned next.',
};

export default function LabsPage() {
  return (
    <div className="site-container">
      <header className="max-w-3xl pt-10">
        <div className="site-label">&sect; 05 &middot; Labs</div>
        <h1 className="site-title mt-3">Labs</h1>
        <p className="site-lede mt-4">
          Full working prototypes that are still being shaped, and the modules planned next.
        </p>
      </header>

      <section aria-label="Prototypes" className="mt-12 grid gap-5 md:grid-cols-3">
        {LAB_ITEMS.map((lab) => (
          <Link key={lab.href} href={lab.href} className="site-card group flex flex-col p-6">
            <span className="w-fit rounded-md border border-arsenal-border px-2.5 py-1 text-xs text-arsenal-secondary">
              {lab.tag}
            </span>
            <h2 className="mt-4 text-lg font-medium text-arsenal-primary">
              {lab.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-arsenal-secondary">
              {lab.description}
            </p>
            <span className="mt-auto pt-6 text-sm font-medium text-arsenal-accent">
              View prototype
            </span>
          </Link>
        ))}
      </section>

      <section id="next" aria-label="Next" className="mt-24 scroll-mt-28">
        <div className="site-label">&sect; 06 &middot; Planned work</div>
        <h2 className="mt-3 text-2xl font-medium text-arsenal-primary">
          On the roadmap
        </h2>
        <p className="mt-3 max-w-2xl text-[15px] text-arsenal-secondary">
          Not built yet. Each one says what it will do and why it is worth building.
        </p>
        <ul className="mt-8 divide-y divide-arsenal-border border-y border-arsenal-border">
          {FUTURE_TASKS.map((task) => (
            <li key={task.title} className="grid gap-2 py-5 md:grid-cols-[220px_1fr_1fr] md:gap-8">
              <div>
                <div className="font-semibold text-arsenal-primary">{task.title}</div>
                <div className="mt-1 text-xs text-arsenal-secondary">{task.category}</div>
              </div>
              <p className="text-sm leading-relaxed text-arsenal-secondary">{task.description}</p>
              <p className="text-sm leading-relaxed text-arsenal-secondary">
                <span className="text-arsenal-primary">Why: </span>
                {task.value}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
