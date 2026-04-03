import { readFileSync, writeFileSync } from 'fs';

// These files use useEffect([], []) without user but fetch protected data
const filesToFix = [
  {
    file: 'src/portals/admin/pages/DashboardPage.tsx',
    oldEffect: `  useEffect(() => {
const load = async () => {`,
    newEffect: `  useEffect(() => {
    if (!user) return;
const load = async () => {`,
    oldDep: `  }, []);`,
    newDep: `  }, [user]);`,
    needsUser: true,
  },
  {
    file: 'src/portals/admin/pages/DriversPage.tsx',
    oldEffect: `  useEffect(() => {
fetchDrivers().then`,
    newEffect: `  useEffect(() => {
    if (!user) return;
fetchDrivers().then`,
    oldDep: `  }, []);`,
    newDep: `  }, [user]);`,
    needsUser: true,
  },
  {
    file: 'src/portals/admin/pages/CompaniesPage.tsx',
    needsUser: true,
  },
  {
    file: 'src/portals/admin/pages/WalletManagementPage.tsx',
    needsUser: true,
  },
];

// For DriversPage we also need to import useAuth
for (const config of filesToFix) {
  let content = readFileSync(config.file, 'utf8');
  const original = content;
  
  if (config.needsUser) {
    // Add useAuth import if not present
    if (!content.includes('useAuth')) {
      content = content.replace(
        `import { useEffect, useState } from 'react';`,
        `import { useEffect, useState } from 'react';\nimport { useAuth } from '@/services/auth.tsx';`
      );
    }
    
    // Add user extraction if not present
    if (!content.includes('const { user }') && !content.includes('const {user}')) {
      // Find the component function start
      const funcMatch = content.match(/export function \w+\(\) \{/);
      if (funcMatch) {
        const insertPos = content.indexOf(funcMatch[0]) + funcMatch[0].length;
        content = content.slice(0, insertPos) + '\n  const { user } = useAuth();' + content.slice(insertPos);
      }
    }
    
    // Add user guard to useEffect and add user dependency
    if (config.oldEffect && config.newEffect) {
      content = content.replace(config.oldEffect, config.newEffect);
    }
    if (config.oldDep && config.newDep) {
      // Only replace the first instance of }, []);
      content = content.replace(config.oldDep, config.newDep);
    }
  }
  
  if (content !== original) {
    writeFileSync(config.file, content, 'utf8');
    console.log('Fixed:', config.file);
  } else {
    console.log('No change (may need manual fix):', config.file);
  }
}
