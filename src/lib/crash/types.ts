/** One crash dump Windows kept, as the tools name it; never opened by the program (0.105.0). */
export type Dump = {
  file: string;
  program: string;
  /** When Windows wrote it, ISO in UTC. */
  time: string;
  size: number;
};

/** The crash dumps kept and whether a look for zero-filled files is due (phobos-modkit 1.138.0). */
export type CrashStatus = {
  lastShutdown: string | null;
  lastCheck: string | null;
  due: boolean;
  days: number;
  dumps: Dump[];
};

/** One file a crash left filled with zeros, with what the tools say puts it right. */
export type ZeroedFile = {
  path: string;
  kind: string;
  repository: string;
  size: number;
  advice: string;
  restorable: boolean;
};

/** What a look after a crash found. */
export type CrashLook = {
  lastShutdown: string | null;
  days: number;
  files: ZeroedFile[];
};
