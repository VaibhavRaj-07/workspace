import fs from 'fs';
import { execSync } from 'child_process';

const ws = 'C:/Users/HP/OneDrive/Desktop/workspace';
const gitignore = fs.readFileSync(`${ws}/.gitignore`, 'utf8');
if (!gitignore.includes('__pycache__')) {
  fs.appendFileSync(`${ws}/.gitignore`, '\n__pycache__/\n*.pyc\n*.pyo\n');
}

console.log(execSync('git rm -r --cached -f .', { cwd: ws, encoding: 'utf8' }));
console.log(execSync('git add .', { cwd: ws, encoding: 'utf8' }));
console.log(execSync('git commit -m "feat: complete collaborative workspace monorepo (frontend, backend, ML service)"', { cwd: ws, encoding: 'utf8' }));
console.log(execSync('git branch -M main', { cwd: ws, encoding: 'utf8' }));

try {
  console.log(execSync('git remote add origin https://github.com/VaibhavRaj-07/workspace.git', { cwd: ws, encoding: 'utf8' }));
} catch (e) {
  console.log(execSync('git remote set-url origin https://github.com/VaibhavRaj-07/workspace.git', { cwd: ws, encoding: 'utf8' }));
}

console.log('Repo initialized and committed. Ready for git push.');
