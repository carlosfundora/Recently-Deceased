import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import process from 'node:process';

const repoRoot = process.cwd();
const publicRoot = path.join(repoRoot, 'public_html');
const requiredFiles = [
  'public_html/index.html',
  'public_html/styles.css',
  'public_html/app.js',
  'public_html/modules/state.js',
  'public_html/modules/dom.js',
  'public_html/modules/ui.js',
  'public_html/modules/render.js',
  'public_html/modules/sensors.js',
  'public_html/modules/words.js',
];

function assertExists(relPath) {
  const absPath = path.join(repoRoot, relPath);
  if (!fs.existsSync(absPath)) {
    throw new Error(`Missing required file: ${relPath}`);
  }
}

function collectJsFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...collectJsFiles(abs));
    else if (entry.isFile() && abs.endsWith('.js')) files.push(abs);
  }
  return files;
}

function parseImports(filePath, source) {
  const imports = [];
  const patterns = [
    /import\s+[^'"\n]+\s+from\s+['"]([^'"]+)['"]/g,
    /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      imports.push(match[1]);
    }
  }
  return imports
    .filter(spec => spec.startsWith('.'))
    .map(spec => path.normalize(path.resolve(path.dirname(filePath), spec)));
}

function detectCycles(graph) {
  const visiting = new Set();
  const visited = new Set();
  const stack = [];

  function visit(node) {
    if (visited.has(node)) return null;
    if (visiting.has(node)) {
      const cycleStart = stack.indexOf(node);
      return stack.slice(cycleStart).concat(node);
    }
    visiting.add(node);
    stack.push(node);
    for (const next of graph.get(node) || []) {
      const cycle = visit(next);
      if (cycle) return cycle;
    }
    stack.pop();
    visiting.delete(node);
    visited.add(node);
    return null;
  }

  for (const node of graph.keys()) {
    const cycle = visit(node);
    if (cycle) return cycle;
  }
  return null;
}

for (const relPath of requiredFiles) assertExists(relPath);

const html = fs.readFileSync(path.join(publicRoot, 'index.html'), 'utf8');
if (!html.includes('<link rel="stylesheet" href="./styles.css" />')) {
  throw new Error('public_html/index.html is missing the standalone stylesheet reference.');
}
if (!html.includes('<script src="./app.js" type="module"></script>')) {
  throw new Error('public_html/index.html is missing the standalone module entrypoint.');
}

const jsFiles = collectJsFiles(publicRoot).sort();
const graph = new Map();
for (const file of jsFiles) {
  execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
  const source = fs.readFileSync(file, 'utf8');
  const imports = parseImports(file, source);
  for (const imported of imports) {
    if (!fs.existsSync(imported)) {
      throw new Error(`Broken relative import in ${path.relative(repoRoot, file)} -> ${path.relative(repoRoot, imported)}`);
    }
  }
  graph.set(file, imports.filter(spec => spec.startsWith(publicRoot)));
}

const cycle = detectCycles(graph);
if (cycle) {
  const pretty = cycle.map(file => path.relative(repoRoot, file)).join(' -> ');
  throw new Error(`Circular dependency detected in public_html modules: ${pretty}`);
}

console.log('public_html standalone smoke check passed');
