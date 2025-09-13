const JavaScriptObfuscator = require('javascript-obfuscator');
const fs = require('fs');

// Leggi il codice originale di app.js
const originalCode = fs.readFileSync('app.js', 'utf8');

// Configura le opzioni per un'offuscamento "High"
// Queste opzioni replicano le impostazioni più forti di obfuscator.io
let obfuscationOptions = {
    compact: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 1,
    deadCodeInjection: true,
    deadCodeInjectionThreshold: 1,
    debugProtection: true,
    debugProtectionInterval: 4000,
    disableConsoleOutput: true,
    identifierNamesGenerator: 'hexadecimal',
    log: false,
    numbersToExpressions: true,
    renameGlobals: true,
    selfDefending: true,
    simplify: true,
    splitStrings: true,
    splitStringsChunkLength: 5,
    stringArray: true,
    stringArrayCallsTransform: true,
    stringArrayEncoding: ['rc4'],
    stringArrayIndexShift: true,
    stringArrayRotate: true,
    stringArrayShuffle: true,
    stringArrayWrappersCount: 5,
    stringArrayWrappersChainedCalls: true,
    stringArrayWrappersParametersMaxCount: 5,
    stringArrayWrappersType: 'function',
    transformObjectKeys: true,
    unicodeEscapeSequence: false,
    domainLock: ['eatventure-loot-predictor.vercel.app'],
    domainLockRedirectUrl:'https://eatventure-loot-predictor.vercel.app'
};

// Offusca il codice
const obfuscationResult = JavaScriptObfuscator.obfuscate(originalCode, obfuscationOptions);

// Salva il codice offuscato in un nuovo file
fs.writeFileSync('public/app.obfuscated.js', obfuscationResult.getObfuscatedCode());

console.log('✅ Success: app.js has been obfuscated into public/app.obfuscated.js');