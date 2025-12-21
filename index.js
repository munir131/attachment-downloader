import { getAuthAndGmail } from './integration/googleAuth.js';
import { GmailClient } from './integration/gmailClient.js';
import { startInteractive } from './view/interactive.js';
import { startAutomated } from './view/automated.js';

getAuthAndGmail((auth) => {
    const gmailClient = new GmailClient(auth);
    
    // Check if arguments are provided (ignoring node and script path)
    if (process.argv.length > 2) {
        startAutomated(auth, gmailClient);
    } else {
        startInteractive(auth, gmailClient);
    }
});
