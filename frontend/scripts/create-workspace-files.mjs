import fs from 'fs';

const gitignore = `# Dependencies
node_modules/
.pnp
.pnp.js

# Environment variables
.env*
!.env.example

# Next.js & Build Outputs
.next/
.next-build/
dist/
build/
out/

# Database & Uploads
pgdata/
local_pgdata/
uploads/
*.log

# Testing & Coverage
coverage/
.test-output*
screenshots/

# OS & IDE Files
.DS_Store
*.pem
.vscode/
.idea/
`;

const readme = `# ALG-WEB-01: Collaborative Project Workspace

A real-time collaborative workspace engineered with Neo-Brutalist design aesthetics, Optimistic Concurrency Control (OCC) with version vector conflict resolution, AI-assisted 3-way conflict synthesis, and ML risk forecasting.

## Architecture

- **Frontend (\`/frontend\`):** Next.js 14, React 18, Tailwind CSS (Neo-Brutalist Maximalist Design System), TanStack Query, Zustand, Socket.IO client, @dnd-kit.
- **Backend (\`/backend\`):** Node.js, Express, TypeScript, PostgreSQL (OCC versioning), Socket.IO with multi-tab presence and reconnect event replay buffers.
- **ML Service (\`/backend/ml-service\`):** FastAPI Python service providing semantic task embeddings (all-MiniLM-L6-v2) and project delivery risk forecasting with rule-based fallback.
- **AI Gateway:** Built-in intelligent rule-based 3-way conflict synthesis with zero external dependencies (supports Claude 3.5 Sonnet when \`ANTHROPIC_API_KEY\` is configured).

## Quick Start

### 1. Backend Setup
\`\`\`bash
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
\`\`\`

### 2. ML Service Setup (Optional)
\`\`\`bash
cd backend/ml-service
pip install -r requirements.txt
python main.py
\`\`\`

### 3. Frontend Setup
\`\`\`bash
cd frontend
npm install
npm run dev
\`\`\`

Visit [http://localhost:3000](http://localhost:3000).

## License
MIT
`;

fs.mkdirSync('C:/Users/HP/OneDrive/Desktop/workspace', { recursive: true });
fs.writeFileSync('C:/Users/HP/OneDrive/Desktop/workspace/.gitignore', gitignore, 'utf8');
fs.writeFileSync('C:/Users/HP/OneDrive/Desktop/workspace/README.md', readme, 'utf8');
console.log('Created .gitignore and README.md in workspace');
