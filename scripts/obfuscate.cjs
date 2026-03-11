#!/usr/bin/env node
/**
 * Post-build obfuscation script
 * Protects JavaScript code from reverse engineering
 */

const JavaScriptObfuscator = require('javascript-obfuscator');
const fs = require('fs');
const path = require('path');

const DIST_DIR = path.join(__dirname, '..', 'dist', 'assets');

const OBFUSCATOR_OPTIONS = {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.4,
  deadCodeInjection: false,
  debugProtection: false,
  disableConsoleOutput: false,
  identifierNamesGenerator: 'hexadecimal',
  log: false,
  numbersToExpressions: true,
  renameGlobals: false,
  selfDefending: false,
  simplify: true,
  splitStrings: true,
  splitStringsChunkLength: 8,
  stringArray: true,
  stringArrayCallsTransform: true,
  stringArrayCallsTransformThreshold: 0.5,
  stringArrayEncoding: ['base64'],
  stringArrayIndexShift: true,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayWrappersCount: 1,
  stringArrayWrappersChainedCalls: true,
  stringArrayWrappersParametersMaxCount: 2,
  stringArrayWrappersType: 'variable',
  stringArrayThreshold: 0.5,
  target: 'browser',
  transformObjectKeys: false,
  unicodeEscapeSequence: false,
};

console.log('🔒 Starting code obfuscation...\n');

const files = fs.readdirSync(DIST_DIR).filter(f => f.endsWith('.js'));

for (const file of files) {
  const filePath = path.join(DIST_DIR, file);
  const code = fs.readFileSync(filePath, 'utf8');

  console.log(`  Obfuscating ${file}...`);
  const startTime = Date.now();

  try {
    const obfuscated = JavaScriptObfuscator.obfuscate(code, OBFUSCATOR_OPTIONS);
    fs.writeFileSync(filePath, obfuscated.getObfuscatedCode());

    const originalSize = (code.length / 1024).toFixed(1);
    const newSize = (obfuscated.getObfuscatedCode().length / 1024).toFixed(1);
    const time = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(`  ✓ ${file}: ${originalSize}KB → ${newSize}KB (${time}s)\n`);
  } catch (err) {
    console.error(`  ✗ Error obfuscating ${file}:`, err.message);
  }
}

console.log('🔒 Obfuscation complete!');
