import bcrypt from 'bcrypt';
const salt = await bcrypt.genSalt(10);
const hash = await bcrypt.hash('test', salt);
console.log('Bcrypt test hash:', hash);
