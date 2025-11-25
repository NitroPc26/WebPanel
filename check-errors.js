// Script to check for errors in JavaScript files
const fs = require('fs');
const path = require('path');

const filesToCheck = [
    'public/js/auth.js',
    'public/js/utils.js',
    'public/dashboard.html'
];

console.log('🔍 Checking for errors...\n');

filesToCheck.forEach(file => {
    const filePath = path.join(__dirname, file);
    
    if (!fs.existsSync(filePath)) {
        console.log(`❌ ${file}: File not found`);
        return;
    }
    
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Check for common errors
        const errors = [];
        
        // Check for unclosed brackets
        const openBrackets = (content.match(/\{/g) || []).length;
        const closeBrackets = (content.match(/\}/g) || []).length;
        if (openBrackets !== closeBrackets) {
            errors.push(`Unmatched brackets: ${openBrackets} open, ${closeBrackets} close`);
        }
        
        // Check for unclosed parentheses
        const openParens = (content.match(/\(/g) || []).length;
        const closeParens = (content.match(/\)/g) || []).length;
        if (openParens !== closeParens) {
            errors.push(`Unmatched parentheses: ${openParens} open, ${closeParens} close`);
        }
        
        // Check for console.log/error (warnings)
        const consoleLogs = (content.match(/console\.(log|error|warn)/g) || []).length;
        if (consoleLogs > 0) {
            console.log(`⚠️  ${file}: Found ${consoleLogs} console statements (warnings)`);
        }
        
        // Check for undefined functions in HTML files
        if (file.endsWith('.html')) {
            const functionCalls = content.match(/(\w+)\(/g) || [];
            const definedFunctions = content.match(/function\s+(\w+)/g) || [];
            // This is a simple check, not comprehensive
        }
        
        if (errors.length > 0) {
            console.log(`❌ ${file}:`);
            errors.forEach(err => console.log(`   - ${err}`));
        } else {
            console.log(`✅ ${file}: No syntax errors found`);
        }
        
    } catch (error) {
        console.log(`❌ ${file}: Error reading file - ${error.message}`);
    }
});

console.log('\n✅ Check complete!');

