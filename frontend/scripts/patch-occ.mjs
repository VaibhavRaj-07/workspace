import fs from 'fs';
import path from 'path';

const filePath = path.resolve('../algo bknd/src/modules/tasks/task.occ.service.ts');
let code = fs.readFileSync(filePath, 'utf-8');

code = code.replaceAll(
  `    const result = await prisma.$transaction(async (tx) => {`,
  `    const result = await prisma.$transaction(async (tx) => {`
);

// Add { maxWait: 15000, timeout: 20000 }
code = code.replace(
  `    });\n\n    // Async AI background updates`,
  `    }, { maxWait: 15000, timeout: 20000 });\n\n    // Async AI background updates`
);

code = code.replace(
  `      return updatedTask;\n    });`,
  `      return updatedTask;\n    }, { maxWait: 15000, timeout: 20000 });`
);

fs.writeFileSync(filePath, code, 'utf-8');
console.log('Added maxWait and timeout options to prisma.$transaction');
