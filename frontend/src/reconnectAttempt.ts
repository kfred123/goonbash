export function reconnectWithinDeadline<T>(
  reconnect: () => Promise<T>,
  deadline: number,
  signal: AbortSignal,
  closeLateRoom: (room: T) => void
): Promise<T> {
  let interrupted = false;
  let timeout: ReturnType<typeof setTimeout>;
  let rejectInterrupted: (reason: Error) => void = () => {};
  const attempt = reconnect();
  void attempt.then(room => {
    if (interrupted) closeLateRoom(room);
  }, () => {});

  const interruption = new Promise<never>((_resolve, reject) => {
    rejectInterrupted = reject;
    timeout = globalThis.setTimeout(() => {
      interrupted = true;
      reject(new Error("Reconnect attempt timed out"));
    }, Math.max(0, deadline - Date.now()));
  });
  const abort = () => {
    interrupted = true;
    rejectInterrupted(new Error("Reconnect attempt cancelled"));
  };
  if (signal.aborted) abort();
  else signal.addEventListener("abort", abort, { once: true });

  return Promise.race([attempt, interruption]).finally(() => {
    globalThis.clearTimeout(timeout);
    signal.removeEventListener("abort", abort);
  });
}
