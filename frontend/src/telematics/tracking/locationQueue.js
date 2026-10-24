export function locationFix(location, source) {
  const { coords, timestamp } = location;
  if (
    location.mocked ||
    !Number.isFinite(coords?.latitude) ||
    !Number.isFinite(coords?.longitude) ||
    Math.abs(coords.latitude) > 90 ||
    Math.abs(coords.longitude) > 180 ||
    !Number.isFinite(timestamp)
  )
    throw new Error("A valid device location is required.");
  return {
    latitude: coords.latitude,
    longitude: coords.longitude,
    mocked: false,
    accuracyMeters: coords.accuracy >= 0 ? coords.accuracy : null,
    speedMps: coords.speed >= 0 ? coords.speed : null,
    headingDegrees:
      coords.heading >= 0 && coords.heading <= 360 ? coords.heading : null,
    recordedAt: new Date(timestamp).toISOString(),
    source,
  };
}
export function queueKey(user) {
  const orgId = typeof user.orgId === "object" ? user.orgId?._id : user.orgId;
  return `driver-location-queue:${orgId}:${user._id}`;
}
const locks = new Map();
export function createLocationQueue({
  storage,
  key,
  send,
  isActive = () => true,
}) {
  const serialized = (action) => {
    const next = (locks.get(key) || Promise.resolve())
      .catch(() => {})
      .then(action);
    locks.set(key, next);
    return next.finally(() => {
      if (locks.get(key) === next) locks.delete(key);
    });
  };
  const read = async () => {
    const value = JSON.parse((await storage.getItem(key)) || "[]");
    if (!Array.isArray(value)) throw new Error("Location queue is unreadable.");
    return value;
  };
  return {
    enqueue: (fixes) =>
      serialized(async () => {
        if (!isActive()) return;
        const rows = await read();
        const merged = [
          ...new Map(
            [...rows, ...fixes].map((fix) => [fix.recordedAt, fix]),
          ).values(),
        ];
        if (merged.length > 5000) {
          const error = new Error(
            "Location queue is full. Connect to the internet to resume sharing.",
          );
          error.code = "QUEUE_FULL";
          throw error;
        }
        await storage.setItem(key, JSON.stringify(merged));
      }),
    flush: () =>
      serialized(async () => {
        let rows = await read();
        for (
          let attempt = 0;
          rows.length && attempt < 3 && isActive();
          attempt += 1
        ) {
          const batch = rows.slice(0, 100);
          const result = await send(batch);
          if (!isActive()) return;
          if (
            result?.requested !== batch.length ||
            !Number.isFinite(result?.written) ||
            result.written < batch.length
          )
            throw new Error(
              "Server did not confirm the location batch. It remains queued.",
            );
          rows = rows.slice(batch.length);
          await storage.setItem(key, JSON.stringify(rows));
        }
        return rows.length;
      }),
    count: () => serialized(async () => (await read()).length),
    clear: () => serialized(() => storage.removeItem(key)),
  };
}

export async function recordAndFlush(queue, fixes) {
  try {
    await queue.enqueue(fixes);
  } catch (error) {
    if (error.code !== "QUEUE_FULL") throw error;
    await queue.flush();
    await queue.enqueue(fixes);
  }
  return queue.flush();
}
