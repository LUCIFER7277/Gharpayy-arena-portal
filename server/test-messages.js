import http from 'http';
import jwt from 'jsonwebtoken';
import { config } from 'dotenv';
config({path: '.env'});

const token = jwt.sign(
  { id: 'u-amit', email: 'amit@example.com', role: 'employee', employeeId: 'e-mqetmn6j312a' },
  process.env.JWT_SECRET || 'secret',
  { expiresIn: '1d' }
);

const req = http.request('http://localhost:4000/api/messages', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
}, (res) => {
  console.log('Status:', res.statusCode);
});
req.on('error', console.error);
req.end();
