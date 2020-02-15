import { HostError, TitleError, IdError } from "../../domain";
import { setStatus } from "./setStatus";

export const closeStatuses = async (hostErrors: HostError[], titleErrors: TitleError[], idErrors: IdError[]) => {
  if (hostErrors) {
    hostErrors.forEach((hostError) => {
      console.log(`[${hostError.medium.name}] ${hostError.message}`);
    });

    await setStatus('Host Validation', 'failure', `Failed: ${hostErrors.length} ${hostErrors.length > 1 ? 'hosts' : 'host'} didn't respond.`);
  }

  if (titleErrors) {
    titleErrors.forEach((titleError) => {
      console.log(`[${titleError.medium.name}] ${titleError.message}`);
    });

    await setStatus('Title Validation', 'failure', `Failed: ${titleErrors.length} ${titleErrors.length > 1 ? 'titles' : 'title'} couldn't be found or ${titleErrors.length > 1 ? 'were' : 'was'} mismatched.`);
  }

  if (idErrors) {
    idErrors.forEach((idError) => {
      console.log(`[${idError.medium.name}] ${idError.message}`);
    });

    await setStatus('ID Validation', 'failure', `Failed: ${idErrors.length} ${idErrors.length > 1 ? 'IDs' : 'ID'} couldn't be found or ${idErrors.length > 1 ? 'were' : 'was'} mismatched.`);
  }

  return;
}
