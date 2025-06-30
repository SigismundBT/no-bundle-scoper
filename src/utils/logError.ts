export function logError(context: string, err: unknown) {
  console.error(context);
  if (err instanceof Error) {
    console.error(`  ${err.name}: ${err.message}`);
  } else {
    console.error(err);
  }
}
