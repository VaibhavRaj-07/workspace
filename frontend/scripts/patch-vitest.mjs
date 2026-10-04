import fs from 'fs';
import path from 'path';

const filePath = path.resolve('../algo bknd/vitest.config.ts');
let config = fs.readFileSync(filePath, 'utf-8');

if (!config.includes('fileParallelism: false')) {
  config = config.replace(
    'testTimeout: 30000,',
    `testTimeout: 30000,\n    fileParallelism: false,`
  );
  fs.writeFileSync(filePath, config, 'utf-8');
  console.log('Added fileParallelism: false to backend vitest.config.ts');
}
