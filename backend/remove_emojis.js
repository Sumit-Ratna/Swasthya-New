const fs = require('fs');
const path = require('path');

// Emoji mapping for replacements
const emojiReplacements = {
    '🔥': '[FIREBASE]',
    '✅': '[SUCCESS]',
    '🚀': '[SERVER]',
    '📊': '[DATABASE]',
    '💾': '[STORAGE]',
    '🔍': '[DEBUG]',
    '⚠️': '[WARNING]',
    '📱': '[PHONE]',
    '🔐': '[AUTH]',
    '📝': '[UPDATE]',
    '💊': '[PRESCRIPTION]',
    '📄': '[DOCUMENT]',
    '🤖': '[AI]',
    '❌': '[ERROR]',
    '🔎': '[SEARCH]',
    '🔗': '[LINK]',
    '🔄': '[SYNC]',
    '🔒': '[SECURE]',
    '🗑️': '[DELETE]',
};

function removeEmojisFromFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    for (const [emoji, replacement] of Object.entries(emojiReplacements)) {
        if (content.includes(emoji)) {
            content = content.split(emoji).join(replacement);
            modified = true;
        }
    }

    if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`[UPDATED] ${filePath}`);
    }
}

function processDirectory(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            if (entry.name !== 'node_modules' && entry.name !== '.git') {
                processDirectory(fullPath);
            }
        } else if (entry.name.endsWith('.js')) {
            removeEmojisFromFile(fullPath);
        }
    }
}

console.log('[START] Removing emojis from backend files...');
processDirectory(path.join(__dirname, 'src'));
console.log('[DONE] All emojis removed!');
