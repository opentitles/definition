import { setStatus } from "./setStatus";

export const initStatuses = async () => {
  if (!process.env.GITHUB_REPOSITORY) {
    return;
  }

  await setStatus('Host Validation', 'pending', 'Running host check..');
  await setStatus('Title Validation', 'pending', 'Running title check..');
  await setStatus('ID Validation', 'pending', 'Running ID check..');
  return;
}