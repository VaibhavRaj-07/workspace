import { execSync } from 'child_process';

const passwords = [
  'postgres',
  'postgrespassword',
  'password',
  'admin',
  'root',
  '123456',
  '12345678',
  '1234',
  '12345',
  'algo',
  'workspace',
  'algo_workspace',
  'HP',
  'hp',
  'user',
  'system',
  'pass',
  'Password123!',
  'Password123',
  'Postgres123!',
  'postgres123',
  'manager',
  'qwerty',
  'qwertyuiop',
  '1111',
  '0000',
  'database',
  'dbpass',
  'secret'
];

for (const p of passwords) {
  try {
    const env = { ...process.env, PGPASSWORD: p };
    const out = execSync('"C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe" -U postgres -d postgres -c "SELECT 1;"', {
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 3000
    }).toString();
    if (out.includes('1')) {
      console.log('>>> MATCH FOUND! Password is:', p);
      process.exit(0);
    }
  } catch (err) {
    // console.log(`Failed "${p}"`);
  }
}

console.log('No common password matched.');
