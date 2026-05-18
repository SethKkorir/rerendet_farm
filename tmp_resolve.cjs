const dns = require('dns');

dns.resolveSrv('_mongodb._tcp.rerendetcoffee.5hjr5pi.mongodb.net', (err, addresses) => {
  if (err) console.error('SRV Error:', err);
  console.log('SRV:', addresses);
});
dns.resolveTxt('rerendetcoffee.5hjr5pi.mongodb.net', (err, records) => {
  if (err) console.error('TXT Error:', err);
  console.log('TXT:', records);
});
