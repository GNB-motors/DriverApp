// One OS location subscription drives local guidance and independently paced upload consumers.
export function createDeviceLocationBroker({ watch, now = Date.now }) {
  const consumers = new Map(); let nextId = 0; let subscription; let revision = 0;
  let operations = Promise.resolve(); let background = false; let latest;
  function publish(location) {
    latest = location;
    for (const consumer of consumers.values()) {
      if (consumer.lastAt != null && now() - consumer.lastAt < consumer.interval) continue;
      consumer.lastAt = now(); consumer.onLocation(location);
    }
  }
  function reconfigure() {
    const ticket = ++revision;
    operations = operations.catch(() => {}).then(async () => {
      subscription?.remove(); subscription = undefined;
      if (ticket !== revision || background || !consumers.size) return;
      const interval = Math.min(...[...consumers.values()].map(c => c.interval));
      const handle = await watch({ interval, navigation: interval <= 1000 }, publish);
      if (ticket !== revision || background || !consumers.size) handle.remove();
      else subscription = handle;
    });
    return operations;
  }
  return {
    async subscribe({ interval = 1000, onLocation }) {
      const id = ++nextId; consumers.set(id, { interval, onLocation, lastAt: null });
      try { await reconfigure(); } catch (error) { consumers.delete(id); throw error; }
      return { remove() { consumers.delete(id); reconfigure(); } };
    },
    publish,
    latest: () => latest,
    async setBackground(active) { background = active; await reconfigure(); },
    async clear() { consumers.clear(); latest = undefined; await reconfigure(); },
  };
}
