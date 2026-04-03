const fs = require('fs');
const path = require('path');

const fixMap = {
  AlertCircle: 'WarningCircle',
  LayoutDashboard: 'SquaresFour',
  FileSearch: 'MagnifyingGlass',
  Mail: 'Envelope',
  Save: 'FloppyDisk',
  ArrowUpCircle: 'ArrowCircleUp',
  ArrowDownCircle: 'ArrowCircleDown',
  ReceiptText: 'Receipt',
  BarChart3: 'ChartBar'
};

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
  });
}

walk('./src', (filePath) => {
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes('@phosphor-icons/react')) return;

  let textReplaced = false;

  Object.entries(fixMap).forEach(([bad, good]) => {
    if (content.match(new RegExp(`\\b${bad}\\b`))) {
      content = content.replace(new RegExp(`\\b${bad}\\b`, 'g'), good);
      textReplaced = true;
    }
  });
  
  if (textReplaced) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  }
});
