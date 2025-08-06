import fs from 'fs-extra';
import { resolve } from 'path';

import { tag, warn, error, bold, success, info } from './colors.js';
import { ChalkInstance } from 'chalk';

const pkg = JSON.parse(await fs.readFile(resolve('./package.json'), 'utf-8'));

const logLable = pkg.name;

type StyleFn = (text: string) => string;
export function log(
  message: string | StyleFn,
  logTag?: string,
  tagColor?: ChalkInstance,
  style?: StyleFn
) {
  let finalMessage: string;
  if (typeof message === 'function') {
    finalMessage = message('');
  } else {
    finalMessage = style ? style(message) : message;
  }
  console.log(
    `${tag(logLable)} ${tagColor ? tagColor(logTag + ':') : logTag + ':'} ${finalMessage}`
  );
}

export function logInfo(message?: string) {
  console.log(`${tag(logLable)} ${info('ℹ️ Info:')} ${message ?? ''}`);
}

export function logSuccess(message: string) {
  console.log(`${tag(logLable)} ${success('✅ Success:')} ${message || ''}`);
}

export function logWarn(message?: string) {
  console.warn(`${tag(logLable)} ${warn('⚠️ Warn:')} ${warn(message || '')}`);
}

export function logError(err?: unknown) {
  if (err instanceof Error) {
    console.error(
      `${tag(logLable)} ${error('❌ ' + err.name)}: ${err.message}`
    );
  } else if (err) {
    console.error(`${tag(logLable)} ${String(err)}`);
  }
}
