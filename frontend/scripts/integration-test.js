#!/usr/bin/env node
import { execSync } from 'child_process';
import http from 'http';

console.log('🧪 Phase 1.6 整合測試執行\n');

const tests = [
  {
    name: '前端服務可用性測試',
    test: async () => {
      try {
        const response = await fetch('http://localhost:3000');
        if (response.status === 200) {
          return { success: true, message: '前端服務正常運行 (http://localhost:3000)' };
        } else {
          return { success: false, message: `前端服務異常 (狀態碼: ${response.status})` };
        }
      } catch (error) {
        return { success: false, message: '前端服務未啟動，請執行 npm run dev' };
      }
    }
  },
  {
    name: 'API 代理設定測試',
    test: async () => {
      try {
        const response = await fetch('http://localhost:3000/api/health');
        // 即使 Backend 未運行，代理設定正確的話應該會得到 500 錯誤而不是 404
        if (response.status === 500) {
          return { success: true, message: 'API 代理設定正確 (Backend 未運行為正常狀況)' };
        } else if (response.status === 200) {
          return { success: true, message: 'API 代理設定正確且 Backend 正常運行' };
        } else if (response.status === 404) {
          return { success: false, message: 'API 代理設定失敗 - 返回 404' };
        } else {
          return { success: false, message: `API 代理異常 (狀態碼: ${response.status})` };
        }
      } catch (error) {
        if (error.code === 'ECONNREFUSED') {
          return { success: false, message: '無法連接到前端服務，請確認 npm run dev 已啟動' };
        }
        return { success: false, message: `API 代理測試失敗: ${error.message}` };
      }
    }
  },
  {
    name: 'TypeScript 編譯測試',
    test: async () => {
      try {
        execSync('npx tsc --noEmit', { stdio: 'pipe' });
        return { success: true, message: 'TypeScript 編譯檢查通過' };
      } catch (error) {
        return { success: false, message: 'TypeScript 編譯錯誤，請檢查程式碼' };
      }
    }
  },
  {
    name: 'Vite 建置測試',
    test: async () => {
      try {
        execSync('npm run build', { stdio: 'pipe' });
        return { success: true, message: 'Vite 生產建置成功' };
      } catch (error) {
        return { success: false, message: 'Vite 建置失敗，請檢查程式碼和配置' };
      }
    }
  },
  {
    name: 'ESLint 檢查測試',
    test: async () => {
      try {
        execSync('npm run lint', { stdio: 'pipe' });
        return { success: true, message: 'ESLint 檢查通過' };
      } catch (error) {
        return { success: false, message: 'ESLint 檢查發現問題，請修復程式碼風格' };
      }
    }
  }
];

// 執行測試
let passedCount = 0;
console.log('執行整合測試項目:\n');

for (let i = 0; i < tests.length; i++) {
  const test = tests[i];
  process.stdout.write(`${i + 1}. ${test.name}... `);
  
  try {
    const result = await test.test();
    
    if (result.success) {
      console.log(`✅ ${result.message}`);
      passedCount++;
    } else {
      console.log(`❌ ${result.message}`);
    }
  } catch (error) {
    console.log(`❌ 測試執行失敗: ${error.message}`);
  }
}

console.log(`\n📊 整合測試結果: ${passedCount}/${tests.length} 項目通過\n`);

if (passedCount === tests.length) {
  console.log('🎉 Phase 1.6 整合測試全部通過！');
  console.log('✅ Frontend 開發環境完全就緒');
  console.log('🚀 可以開始 Phase 2: 核心 UI 元件開發');
  console.log('\n建議下一步:');
  console.log('1. 保持 frontend 開發伺服器運行 (npm run dev)');
  console.log('2. 在另一個終端啟動 backend 進行完整測試');
  console.log('3. 開始實作 InputForm 元件');
} else {
  console.log('⚠️  請先解決上述問題');
  console.log('\n故障排除建議:');
  console.log('1. 確認前端開發伺服器正在運行: npm run dev');
  console.log('2. 檢查 package.json 中的腳本配置');
  console.log('3. 修復程式碼中的 TypeScript 或 ESLint 錯誤');
  console.log('4. 重新執行測試: npm run integration-test');
  process.exit(1);
}