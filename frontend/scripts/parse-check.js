/**
 * parse-check.js — every source file must parse.
 *
 * The DriverApp had no test runner and no lint config for years, so a syntax
 * error in a screen shipped. This is the cheapest possible guard against that:
 * it walks src/ and asks @babel/parser to parse each file as JSX.
 *
 * It needs no dependencies beyond what Expo already installs, so it runs even if
 * eslint/jest are unavailable. Exit code 1 with the offending files listed.
 */
const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');

const ROOT = path.join(__dirname, '..', 'src');
const EXT = new Set(['.js', '.jsx']);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (EXT.has(path.extname(entry.name))) out.push(full);
  }
  return out;
}

function main() {
  const files = walk(ROOT);
  const failed = [];

  for (const file of files) {
    try {
      parser.parse(fs.readFileSync(file, 'utf8'), {
        sourceType: 'module',
        plugins: ['jsx', 'classProperties', 'objectRestSpread', 'optionalChaining', 'nullishCoalescingOperator'],
      });
    } catch (err) {
      failed.push(`${path.relative(path.join(__dirname, '..'), file)}: ${err.message}`);
    }
  }

  if (failed.length) {
    console.error(`parse-check: ${failed.length} of ${files.length} file(s) failed to parse\n`);
    for (const f of failed) console.error(`  ${f}`);
    process.exit(1);
  }

  console.log(`parse-check: ${files.length} file(s) parsed.`);
}

main();