const { runUnitTests } = require('./unit_tests');
const { runPropertyTests } = require('./property_based_tests');

console.log('====================================================');
console.log('   MEDVERIFY: EXTENSIVE TEST SUITE RUNNER           ');
console.log('====================================================\n');

try {
  runUnitTests();
  runPropertyTests();
  console.log('\n  ✓ ALL MEDVERIFY TESTS PASSED 100%\n');
  process.exit(0);
} catch (err) {
  console.error('\n  ✗ TEST SUITE FAILED:', err);
  process.exit(1);
}
