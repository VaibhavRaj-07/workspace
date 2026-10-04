import fs from 'fs';
import path from 'path';

const backendPath = path.resolve('../algo bknd/src/realtime/socket.server.ts');
let content = fs.readFileSync(backendPath, 'utf8');

content = content.replace(
  'const onlineUsers = presenceService.removeUserFromProject(projectId, user.id);',
  'const onlineUsers = presenceService.removeUserFromProject(projectId, user.id, socket.id);'
);

fs.writeFileSync(backendPath, content, 'utf8');
console.log('Updated socket.server.ts to pass socket.id to removeUserFromProject');
