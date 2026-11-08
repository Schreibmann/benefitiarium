const action = process.argv[2] ?? 'unknown';
console.log(`@moex/persistence db:${action} - migrations start at BL-020; no-op for M0.`);
process.exit(0);
