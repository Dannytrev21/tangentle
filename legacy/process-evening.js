// Quick helper to process evening reviews
// When you tell me "process evening", I'll run this

const { getPendingClaudeRequests, saveClaudeResponse } = require('./claude-handler.js');

const requests = getPendingClaudeRequests();

if (requests.length === 0) {
    console.log('No pending requests');
    process.exit(0);
}

const req = requests[0];

console.log('Pending Request:');
console.log('================');
console.log('ID:', req.id);
console.log('Type:', req.type);
console.log('\nIncomplete Tasks:');
req.tickTickData.incompleteTasks.forEach(t => {
    console.log(`  • ${t.title} (${t.projectName})`);
});

console.log('\nMemory Context:');
console.log('  - Evening reviews:', req.context.memories.eveningReviews?.length || 0);
console.log('  - Insights:', req.context.memories.insights?.length || 0);

console.log('\n\nNow respond to this in Claude Code!');
console.log('Use: saveClaudeResponse("' + req.id + '", { message: "...", waitingFor: true })');

module.exports = { currentRequest: req };
