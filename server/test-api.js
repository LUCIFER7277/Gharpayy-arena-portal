import http from 'http';
import { readFileSync } from 'fs';

// Try to grab the arena_token from the localStorage if possible, but since we are in node, we can't.
// Let's generate a token for Amit Kumar using the backend's auth system.
import jwt from 'jsonwebtoken';
import { config } from 'dotenv';
config({path: '.env'});

const token = jwt.sign(
  { id: 'u-amit', email: 'amit@example.com', role: 'employee', employeeId: 'e-mqetmn6j312a' },
  process.env.JWT_SECRET || 'secret',
  { expiresIn: '1d' }
);

const req = http.request('http://localhost:4000/api/employees', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);
    console.log('Returned employees:', json.items?.length);
    json.items?.forEach(i => console.log(`- ${i.name} (role: ${i.role})`));
  });
});

req.on('error', console.error);
req.end();
