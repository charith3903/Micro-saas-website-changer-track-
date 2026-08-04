import { validateUrlDns } from '../src/lib/ssrf';

async function test() {
  const result = await validateUrlDns('http://www.applantics.com/');
  console.log('Validation result:', result);
}
test();
