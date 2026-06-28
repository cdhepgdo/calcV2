const fs = require('fs');
const path = require('path');

const PAIRS = [
    { pair: ['bg-white', 'dark:bg-slate-800'], replacement: 'surface-card' },
    { pair: ['bg-slate-50', 'dark:bg-slate-900'], replacement: 'surface-base-bg' },
    { pair: ['text-gray-800', 'dark:text-slate-100'], replacement: 'text-themed' },
    { pair: ['text-slate-800', 'dark:text-slate-100'], replacement: 'text-themed' },
    { pair: ['text-gray-700', 'dark:text-slate-300'], replacement: 'text-themed-secondary' },
    { pair: ['text-gray-600', 'dark:text-slate-300'], replacement: 'text-themed-secondary' },
    { pair: ['text-slate-600', 'dark:text-slate-300'], replacement: 'text-themed-secondary' },
    { pair: ['text-gray-500', 'dark:text-slate-400'], replacement: 'text-themed-muted' },
    { pair: ['text-slate-500', 'dark:text-slate-400'], replacement: 'text-themed-muted' },
    { pair: ['border-slate-200', 'dark:border-slate-700'], replacement: 'border-themed' },
    { pair: ['border-gray-200', 'dark:border-slate-700'], replacement: 'border-themed' },
];

function processClasses(classString) {
    let classes = classString.split(/\s+/).filter(Boolean);
    let changed = false;

    for (const rule of PAIRS) {
        const hasAll = rule.pair.every(c => classes.includes(c));
        if (hasAll) {
            // Remove the old classes
            classes = classes.filter(c => !rule.pair.includes(c));
            // Add the new semantic class if not already there
            if (!classes.includes(rule.replacement)) {
                classes.push(rule.replacement);
            }
            changed = true;
        }
    }
    
    return { newClassString: classes.join(' '), changed };
}

function processFile(filePath) {
    const ext = path.extname(filePath);
    if (!['.html', '.js'].includes(ext)) return;

    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Match class="..." or class='...'
    const regex = /class=(["'])(.*?)\1/g;
    
    content = content.replace(regex, (match, quote, classString) => {
        const result = processClasses(classString);
        if (result.changed) {
            modified = true;
            return `class=${quote}${result.newClassString}${quote}`;
        }
        return match;
    });

    if (modified) {
        console.log(`Updated: ${filePath}`);
        fs.writeFileSync(filePath, content, 'utf8');
    }
}

function walkDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        if (file === 'node_modules' || file === '.git' || file === 'css') continue; // skip css and modules
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walkDir(fullPath);
        } else {
            processFile(fullPath);
        }
    }
}

walkDir(path.join(__dirname, 'public'));
console.log('Done refactoring classes.');
