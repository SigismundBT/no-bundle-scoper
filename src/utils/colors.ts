import chalk from 'chalk';

export const bold = chalk.bold;
export const dim = chalk.dim;
export const gray = chalk.gray;

export const info = chalk.cyanBright;
export const warn = chalk.yellow;
export const error = chalk.red;

export const success = chalk.green;
export const underline = chalk.underline;

export const tag = (name: string) => chalk.bold(`█ ${name} █`);
