import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'fs/promises';

const files = [
  'src/portals/admin/pages/WalletManagementPage.tsx',
  'src/portals/admin/pages/DriversPage.tsx',
  'src/portals/admin/pages/CompaniesPage.tsx',
  'src/portals/admin/pages/DashboardPage.tsx',
  'src/portals/manager/pages/AnalyticsPage.tsx',
  'src/portals/manager/pages/DashboardPage.tsx',
  'src/portals/manager/pages/DriversListPage.tsx',
  'src/portals/manager/pages/ClaimsOverviewPage.tsx',
  'src/portals/driver/pages/ProfilePage.tsx',
  'src/portals/driver/pages/WalletPage.tsx',
  'src/portals/driver/pages/ClaimHistoryPage.tsx',
  'src/portals/driver/pages/DashboardPage.tsx',
];

for (const file of files) {
  let content = readFileSync(file, 'utf8');
  let original = content;
  
  // Remove the failsafe timeout line (with any whitespace/newline variations)
  content = content.replace(/\s*\/\/ FAILSAFE TIMEOUT[^\n]*\n\s*const __failsafe = setTimeout[^\n]*\n/g, '\n');
  
  if (content !== original) {
    writeFileSync(file, content, 'utf8');
    console.log('Fixed:', file);
  } else {
    console.log('No change:', file);
  }
}
