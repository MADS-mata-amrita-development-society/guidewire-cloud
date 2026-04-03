const fs = require('fs');
const path = require('path');

const replacementMap = {
  AlertTriangle: 'Warning',
  Building2: 'Buildings',
  LogOut: 'SignOut',
  Calendar: 'CalendarBlank',
  ChevronRight: 'CaretRight',
  Search: 'MagnifyingGlass',
  Home: 'House'
};

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
  });
}

walk('./src', (filePath) => {
  if (!filePath.endsWith('.tsx')) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  Object.entries(replacementMap).forEach(([oldIcon, newIcon]) => {
    // replace tag usage
    const tagRegex = new RegExp(`<${oldIcon}\\b`, 'g');
    if (tagRegex.test(content)) {
      content = content.replace(tagRegex, `<${newIcon}`);
      changed = true;
    }
    // replace prop usage
    const propRegex = new RegExp(`icon=\\{${oldIcon}\\b`, 'g');
    if (propRegex.test(content)) {
      content = content.replace(propRegex, `icon={${newIcon}`);
      changed = true;
    }
    // replace import from phosphor
    const importRegex = /import\s+{[^}]*}\s+from\s+['"]@phosphor-icons\/react['"];/;
    if (changed && !content.includes(newIcon) && importRegex.test(content)) {
      content = content.replace(importRegex, (match) => {
        // Just add to the end of the imports
        return match.replace(/}\s+from/, `, ${newIcon} } from`);
      });
    }
  });

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed ${filePath}`);
  }
});
