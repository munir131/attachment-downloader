import { getAuthAndGmail } from './integration/googleAuth.js';
import { GmailClient } from './integration/gmailClient.js';
import { startInteractive } from './view/interactive.js';
import { startAutomated } from './view/automated.js';

getAuthAndGmail(async (auth) => {
    const gmailClient = new GmailClient(auth);
    
    // Check if arguments are provided (ignoring node and script path)
    if (process.argv.length > 2) {
        await startAutomated(auth, gmailClient);
        process.exit(0);
    } else {
        startInteractive(auth, gmailClient);
    }
});
