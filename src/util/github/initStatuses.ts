import { setStatus } from "./setStatus";

export const initStatuses = async () => {
  await setStatus('Host Validation', 'pending', 'Running host check..');
  await setStatus('Title Validation', 'pending', 'Running title check..');
  await setStatus('ID Validation', 'pending', 'Running ID check..');
  return;
}