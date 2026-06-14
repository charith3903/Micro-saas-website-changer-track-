import dns from 'dns';
import { promisify } from 'util';

const resolve4 = promisify(dns.resolve4);
const lookup = promisify(dns.lookup);

async function test() {
  console.log('Testing dns.resolve4...');
  try {
    const res1 = await resolve4('www.applantics.com');
    console.log('resolve4:', res1);
  } catch (err) {
    console.error('resolve4 failed:', err.message);
  }

  console.log('Testing dns.lookup...');
  try {
    const res2 = await lookup('www.applantics.com');
    console.log('lookup:', res2);
  } catch (err) {
    console.error('lookup failed:', err.message);
  }
}
test();
