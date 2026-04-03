const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// A robust map from Lucide to Phosphor icons.
// Pattern: LucideIcon: "PhosphorIcon"
const iconMap = {
  Home: 'House',
  FileText: 'FileText',
  Wallet: 'Wallet',
  UserCircle: 'UserCircle',
  Settings: 'Gear',
  Users: 'Users',
  Building2: 'Buildings',
  ShieldCheck: 'ShieldCheck',
  Plus: 'Plus',
  AlertTriangle: 'Warning',
  ChevronRight: 'CaretRight',
  CloudRain: 'CloudRain',
  Megaphone: 'Megaphone',
  ArrowLeft: 'ArrowLeft',
  ArrowRight: 'ArrowRight',
  Check: 'Check',
  MapPin: 'MapPin',
  Calendar: 'CalendarBlank',
  CircleDollarSign: 'CurrencyCircleDollar',
  LogOut: 'SignOut',
  Eye: 'Eye',
  EyeOff: 'EyeClosed',
  Star: 'Star',
  Clock: 'Clock',
  Activity: 'Activity',
  Award: 'Trophy',
  Zap: 'Lightning',
  CheckCircle2: 'CheckCircle',
  XCircle: 'XCircle',
  Info: 'Info',
  TrendingUp: 'TrendUp',
  ArrowDownRight: 'ArrowDownRight',
  History: 'ClockCounterClockwise',
  Filter: 'Funnel',
  Search: 'MagnifyingGlass',
  CreditCard: 'CreditCard',
  Download: 'DownloadSimple'
};

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
  });
}

const unmapped = new Set();

walk('./src', (filePath) => {
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes('lucide-react')) return;

  const lucideRegex = /import\s+\{([^}]+)\}\s+from\s+['"]lucide-react['"];/g;
  let match;
  let textReplaced = false;

  while ((match = lucideRegex.exec(content)) !== null) {
    const importStr = match[0];
    const icons = match[1].split(',').map(i => i.trim()).filter(Boolean);
    
    let phosphorIcons = [];
    icons.forEach(lucideIcon => {
      // Handle aliased imports e.g., Clock as HistoryIcon
      let actualIcon = lucideIcon;
      let alias = null;
      if (lucideIcon.includes(' as ')) {
        [actualIcon, alias] = lucideIcon.split(' as ').map(s => s.trim());
      }

      let translated = iconMap[actualIcon];
      if (!translated) {
        translated = actualIcon; // Try raw equivalent
        unmapped.add(actualIcon);
      }
      
      if (alias) {
        phosphorIcons.push(`${translated} as ${alias}`);
      } else {
        phosphorIcons.push(translated);
      }
    });

    const phosphorImport = `import { ${phosphorIcons.join(', ')} } from '@phosphor-icons/react';`;
    content = content.replace(importStr, phosphorImport);
    textReplaced = true;
  }
  
  // also quickly replace size={x} if we want to change stroke weight, Phosphor looks better with slightly different props
  // But for now, we'll just leave props as is. Phosphor accepts size.
  
  if (textReplaced) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  }
});

if (unmapped.size > 0) {
  console.log('Unmapped icons (used raw):', Array.from(unmapped));
}
