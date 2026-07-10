import { ArsenalAppShell } from '@/components/arsenal-app-shell';
import { FUTURE_TASK_CATEGORIES, FUTURE_TASKS } from '@/lib/future-tasks';
import { Badge, GlassCard, GridBackground, NetworkBackground } from '@arsenal/ui';

export const metadata = {
  title: 'Coming Soon - Arsenal Roadmap',
  description: 'Planned Arsenal capabilities and future repository operating-system tasks.',
};

const roadmapStats = [
  { label: 'Future tasks', value: FUTURE_TASKS.length },
  { label: 'Roadmap lanes', value: FUTURE_TASK_CATEGORIES.length },
  { label: 'Status', value: 'Planned' },
];

export default function ComingSoonPage() {
  return (
    <ArsenalAppShell
      title="Coming Soon"
      subtitle="Planned Arsenal capabilities captured as future tasks, not active features."
    >
      <div className="space-y-10">
        <section className="relative overflow-hidden rounded-arsenal-lg border border-arsenal-border/80 bg-arsenal-background/74 p-6 md:p-8">
          <NetworkBackground density="standard" accent="steel" />
          <GridBackground className="opacity-20" />
          <div className="relative z-10 grid gap-8 lg:grid-cols-[1fr_0.72fr] lg:items-end">
            <div>
              <Badge variant="planned">future roadmap</Badge>
              <h2 className="mt-5 max-w-4xl text-4xl font-semibold tracking-tight md:text-6xl">
                The next Arsenal modules live here until they are ready to build.
              </h2>
              <p className="mt-5 max-w-3xl text-lg leading-8 text-arsenal-secondary">
                These ideas are intentionally documented as future tasks. They describe the value,
                expected scope, and product direction without wiring unfinished functionality into
                the current playground.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {roadmapStats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-arsenal-sm border border-arsenal-border bg-arsenal-surface/76 p-4"
                >
                  <p className="text-xs uppercase tracking-[0.2em] text-arsenal-muted">
                    {stat.label}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-arsenal-primary">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="flex flex-wrap gap-2">
          {FUTURE_TASK_CATEGORIES.map((category) => (
            <span
              key={category}
              className="rounded-full border border-arsenal-border bg-arsenal-surface/58 px-3 py-1.5 text-xs font-medium text-arsenal-secondary"
            >
              {category}
            </span>
          ))}
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {FUTURE_TASKS.map((task) => (
            <GlassCard key={task.title} className="h-full">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Badge variant="planned">{task.category}</Badge>
                  <h3 className="mt-3 text-xl font-semibold tracking-tight">{task.title}</h3>
                </div>
                <span className="rounded-full border border-arsenal-border bg-arsenal-background/70 px-2.5 py-1 text-[0.68rem] uppercase tracking-[0.16em] text-arsenal-muted">
                  planned
                </span>
              </div>

              <p className="mt-4 text-sm leading-6 text-arsenal-secondary">{task.description}</p>

              <div className="mt-5 rounded-arsenal-sm border border-arsenal-border bg-arsenal-background/58 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-arsenal-accent">
                  Why it matters
                </p>
                <p className="mt-2 text-sm leading-6 text-arsenal-secondary">{task.value}</p>
              </div>

              <div className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-arsenal-muted">
                  Future scope
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {task.futureScope.map((item) => (
                    <code
                      key={item}
                      className="rounded-full border border-arsenal-border bg-arsenal-background/70 px-2.5 py-1 text-[0.68rem] text-arsenal-muted"
                    >
                      {item}
                    </code>
                  ))}
                </div>
              </div>
            </GlassCard>
          ))}
        </section>
      </div>
    </ArsenalAppShell>
  );
}
