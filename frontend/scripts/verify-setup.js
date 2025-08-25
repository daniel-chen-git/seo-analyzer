#!/usr/bin/env node
import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

console.log('🔍 Phase 1.6 環境設定驗證\n');

const checks = [
  {
    name: 'TypeScript 編譯檢查',
    test: () => {
      try {
        execSync('npx tsc --noEmit', { cwd: projectRoot, stdio: 'pipe' });
        return { success: true, message: 'TypeScript 編譯無錯誤' };
      } catch (error) {
        return { success: false, message: `TypeScript 錯誤: ${error.message}` };
      }
    }
  },
  {
    name: 'Vite 建置測試',
    test: () => {
      try {
        execSync('npm run build', { cwd: projectRoot, stdio: 'pipe' });
        return { success: true, message: 'Vite 建置成功' };
      } catch (error) {
        return { success: false, message: `建置失敗: ${error.message}` };
      }
    }
  },
  {
    name: '環境變數檢查',
    test: () => {
      const envFiles = ['.env.development', '.env.production'];
      const missing = envFiles.filter(file => !existsSync(join(projectRoot, file)));
      
      if (missing.length > 0) {
        return { success: false, message: `缺少環境檔案: ${missing.join(', ')}` };
      }
      return { success: true, message: '環境變數檔案完整' };
    }
  },
  {
    name: '必要目錄結構檢查',
    test: () => {
      const requiredDirs = [
        'src/components',
        'src/hooks',
        'src/types',
        'src/utils',
        'src/styles'
      ];
      
      const missing = requiredDirs.filter(dir => !existsSync(join(projectRoot, dir)));
      
      if (missing.length > 0) {
        return { success: false, message: `缺少目錄: ${missing.join(', ')}` };
      }
      return { success: true, message: '目錄結構完整' };
    }
  },
  {
    name: '配置檔案檢查',
    test: () => {
      const configFiles = [
        'vite.config.ts',
        'tailwind.config.js',
        'tsconfig.json',
        'package.json'
      ];
      
      const missing = configFiles.filter(file => !existsSync(join(projectRoot, file)));
      
      if (missing.length > 0) {
        return { success: false, message: `缺少配置檔案: ${missing.join(', ')}` };
      }
      return { success: true, message: '配置檔案完整' };
    }
  },
  {
    name: '依賴套件檢查',
    test: () => {
      try {
        const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8'));
        const requiredDeps = ['react', 'vite', '@tailwindcss/vite', 'typescript'];
        const missingDeps = requiredDeps.filter(dep => 
          !packageJson.dependencies?.[dep] && !packageJson.devDependencies?.[dep]
        );
        
        if (missingDeps.length > 0) {
          return { success: false, message: `缺少依賴: ${missingDeps.join(', ')}` };
        }
        return { success: true, message: '核心依賴完整' };
      } catch (error) {
        return { success: false, message: `套件檢查失敗: ${error.message}` };
      }
    }
  },
  {
    name: 'Tailwind 配置檢查',
    test: () => {
      try {
        const tailwindConfig = readFileSync(join(projectRoot, 'tailwind.config.js'), 'utf8');
        if (tailwindConfig.includes('content:') && tailwindConfig.includes('./src/**/*.{js,jsx,ts,tsx}')) {
          return { success: true, message: 'Tailwind 配置正確' };
        } else {
          return { success: false, message: 'Tailwind 配置不完整' };
        }
      } catch (error) {
        return { success: false, message: `Tailwind 配置檢查失敗: ${error.message}` };
      }
    }
  }
];

// 執行檢查
let passedCount = 0;
console.log('執行檢查項目:\n');

for (let i = 0; i < checks.length; i++) {
  const check = checks[i];
  process.stdout.write(`${i + 1}. ${check.name}... `);
  
  try {
    const result = check.test();
    
    if (result.success) {
      console.log(`✅ ${result.message}`);
      passedCount++;
    } else {
      console.log(`❌ ${result.message}`);
    }
  } catch (error) {
    console.log(`❌ 執行失敗: ${error.message}`);
  }
}

console.log(`\n📊 驗證結果: ${passedCount}/${checks.length} 項目通過\n`);

if (passedCount === checks.length) {
  console.log('🎉 Phase 1.6 環境設定驗證完成！');
  console.log('✅ 所有檢查項目都已通過');
  console.log('🚀 準備進入 Phase 2: 核心 UI 元件開發');
  console.log('\n下一步執行:');
  console.log('  npm run dev    # 啟動開發伺服器');
  console.log('  npm run build  # 測試生產建置');
} else {
  console.log('⚠️  請修復上述問題後重新執行驗證');
  console.log('\n建議修復步驟:');
  console.log('1. 檢查缺少的檔案和目錄');
  console.log('2. 執行 npm install 確保依賴完整');
  console.log('3. 修復 TypeScript 編譯錯誤');
  console.log('4. 重新執行: npm run verify');
  process.exit(1);
}