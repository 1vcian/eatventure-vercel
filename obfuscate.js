const JavaScriptObfuscator = require('javascript-obfuscator');
const fs = require('fs');

// Leggi il codice originale di app.js
const originalCode = fs.readFileSync('app.js', 'utf8');

// Configura le opzioni per un'offuscamento "High"
// Queste opzioni replicano le impostazioni più forti di obfuscator.io
const obfuscationOptions = {
     compact: true,
    controlFlowFlattening: false, // Disattivato per ora
    deadCodeInjection: true,
    debugProtection: false,      // Disattivato
    disableConsoleOutput: false, // Lasciamo la console attiva per il debug
    identifierNamesGenerator: 'hexadecimal',
    log: false,
    renameGlobals: false,        // DISATTIVATO - IL PIÙ IMPORTANTE
    selfDefending: false,        // Disattivato per ora
    simplify: true,
    splitStrings: true,
    stringArray: true,
    stringArrayEncoding: ['base64'], // base64 è più veloce di rc4
    stringArrayThreshold: 0.75,
    unicodeEscapeSequence: false,
    domainLock: ['eatventure-loot-predictor.vercel.app'],
    domainLockRedirectUrl:'https://www.eatventure-loot-predictor.vercel.app'
};

// Offusca il codice
const obfuscationResult = JavaScriptObfuscator.obfuscate(originalCode, obfuscationOptions);

// Salva il codice offuscato in un nuovo file
fs.writeFileSync('public/app.obfuscated.js', obfuscationResult.getObfuscatedCode());

console.log('✅ Success: app.js has been obfuscated into public/app.obfuscated.js');