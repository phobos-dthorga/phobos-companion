import {
  heard,
  started,
  type ProgressMessage,
  type ProgressState,
} from "./progress";
import { untrack } from "svelte";
import { remember } from "./timing";

/**
 * What the window is waiting for, for the activity strip under the page bar (0.21.0): every request to the host is a job from
 * the moment it is asked until it answers, whatever page asked it, so work keeps showing when the owner changes page. The strip
 * shows only jobs that take a while, and says how long the last one took once it ends.
 */
export type Job = {
  id: number;
  command: string;
  begun: number;
  progress: ProgressState;
};

export type Finished = {
  command: string;
  label: string;
  ms: number;
  at: number;
};

export const activity = $state<{ jobs: Job[]; finished: Finished | null }>({
  jobs: [],
  finished: null,
});

let next = 1;

/** Work shorter than this never shows on the strip, and never replaces the last finished one it shows. */
export const SHOW_AFTER_MS = 600;

/** A request has been asked. */
export function begin(command: string, now = Date.now()): number {
  const id = next++;
  // A page often asks from inside one of its effects: the job list is read and written untracked, or that effect would depend
  // on the list it just changed and run again forever.
  untrack(() => {
    activity.jobs = [
      ...activity.jobs,
      { id, command, begun: now, progress: started() },
    ];
  });
  return id;
}

/** A progress line came for a job. */
export function hear(id: number, message: ProgressMessage): void {
  untrack(() => {
    activity.jobs = activity.jobs.map((job) =>
      job.id === id ? { ...job, progress: heard(job.progress, message) } : job,
    );
  });
}

/** A request answered: the job leaves the strip, and how long it took is kept for next time. */
export function end(id: number, now = Date.now()): void {
  untrack(() => finish(id, now));
}

function finish(id: number, now: number): void {
  const job = activity.jobs.find((j) => j.id === id);
  activity.jobs = activity.jobs.filter((j) => j.id !== id);
  if (!job) return;
  const ms = now - job.begun;
  remember(jobTask(job.command), ms);
  if (ms < SHOW_AFTER_MS) return;
  activity.finished = {
    command: job.command,
    label: job.progress.label,
    ms,
    at: now,
  };
}

/** The name a command's timing is kept by. */
export function jobTask(command: string): string {
  return `job:${command}`;
}
