import { askForFilter } from './lib/questions.js';

console.log('Starting reproduction script...');
try {
    const answer = await askForFilter();
    console.log('Selected:', answer);
} catch (error) {
    console.error('Error:', error);
}
