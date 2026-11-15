export async function inspectOfflineMaps() { return { ready: false, reason: 'Offline map downloads require the native DriverApp.' }; }
export async function downloadOfflineMaps() { throw new Error('Offline map downloads require the native DriverApp.'); }
