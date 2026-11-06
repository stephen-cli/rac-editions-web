// Writes src/styles/tokens.css from src/tokens/tokens.ts.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { tokensCss } from '../src/tokens/tokens.ts';

const target = fileURLToPath(new URL('../src/styles/tokens.css', import.meta.url));
writeFileSync(target, tokensCss());
console.log(`wrote ${target}`);
