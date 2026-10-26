import pc from 'picocolors';
import { TunestraError } from '../shared/errors/tunestra-error.ts';

/** Prints the report of a command; an error in the user's input is shown without a stack. */
export async function runCommand(action: () => Promise<string>): Promise<void> {
  try {
    const report = await action();

    console.log(report);
  } catch (error) {
    if (error instanceof TunestraError) {
      const message = pc.red(error.message);

      console.error(message);
      process.exitCode = 1;

      return;
    }

    throw error;
  }
}
