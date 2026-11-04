// Parse a Bookwhen notification subject/body -> {kind,email,first,last} or null (skip).
// Usage: node scripts/parse-bookwhen-email.mjs "<subject>" ["<body>"]
export function parseBookwhen(subject = '', body = '') {
  const s = subject.replace(/\s+/g, ' ');
  if (!/LOCALS CARD/i.test(s + ' ' + body)) return null;
  let kind = null;
  if (/Membership started:\s*LOCALS CARD/i.test(s)) kind = 'new';
  else if (/cancel/i.test(s)) kind = 'cancelled'; // stub: confirm once a real cancel sample exists
  if (!kind) return null;
  const email = (s.match(/LOCALS CARD\s*-\s*([^\s]+@[^\s]+)/i) || body.match(/Booking contact:\s*([^\s<]+@[^\s>]+)/i) || [])[1];
  if (!email) return null;
  const name = (s.match(/Registration\s*-\s*(.+?)\s*-\s*Membership/i) || [])[1] || '';
  const [first = '', ...rest] = name.trim().split(' ');
  return { kind, email: email.toLowerCase(), first, last: rest.join(' ') };
}
if (process.argv[1]?.endsWith('parse-bookwhen-email.mjs')) console.log(JSON.stringify(parseBookwhen(process.argv[2], process.argv[3] || '')));
