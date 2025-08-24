export default {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './index.html'],
  darkMode: 'class',
  theme: {
    extend: {
      // SEO Analyzer 品牌色彩系統
      colors: {
        // 主要品牌色 - Google Blue 變體
        primary: {
          50: '#eff6ff',
          100: '#dbeafe', 
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#1a73e8', // 主色
          600: '#1557b0',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#0c4a6e',
          950: '#082f49'
        },
        // 語意化顏色
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#34a853', // Google Green
          600: '#16a34a',
          900: '#14532d'
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          500: '#fbbc04', // Google Yellow
          600: '#d97706',
          900: '#92400e'
        },
        error: {
          50: '#fef2f2',
          100: '#fee2e2',
          500: '#ea4335', // Google Red
          600: '#dc2626',
          900: '#991b1b'
        },
        // 中性色系 - Google Material 風格
        neutral: {
          50: '#f8f9fa',   // 極淺灰
          100: '#f1f3f4',  // 淺灰
          200: '#e8eaed',  // 邊框灰
          300: '#dadce0',  // 分隔線灰
          400: '#bdc1c6',  // 次要文字灰
          500: '#5f6368',  // 次要文字
          600: '#3c4043',  // 主要文字淺
          700: '#202124',  // 主要文字
          800: '#171717',  // 深色文字
          900: '#0f0f0f',  // 最深
          950: '#050505'   // 純黑
        },
        // 背景色系
        background: {
          light: '#ffffff',
          DEFAULT: '#f8f9fa',
          dark: '#202124'
        },
        surface: {
          light: '#ffffff',
          DEFAULT: '#ffffff', 
          elevated: '#f8f9fa',
          dark: '#303134'
        }
      },
      // 字體系統
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['Fira Code', 'Monaco', 'Consolas', 'monospace'],
        display: ['Inter', 'system-ui', 'sans-serif']
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }]
      },
      // 間距系統 - 8px 基礎網格
      spacing: {
        '0.5': '0.125rem', // 2px
        '1': '0.25rem',    // 4px
        '1.5': '0.375rem', // 6px  
        '2': '0.5rem',     // 8px
        '2.5': '0.625rem', // 10px
        '3': '0.75rem',    // 12px
        '3.5': '0.875rem', // 14px
        '4': '1rem',       // 16px
        '5': '1.25rem',    // 20px
        '6': '1.5rem',     // 24px
        '7': '1.75rem',    // 28px
        '8': '2rem',       // 32px
        '10': '2.5rem',    // 40px
        '12': '3rem',      // 48px
        '14': '3.5rem',    // 56px
        '16': '4rem',      // 64px
        '20': '5rem',      // 80px
        '24': '6rem',      // 96px
        '32': '8rem',      // 128px
      },
      // 邊框半徑
      borderRadius: {
        'none': '0',
        'sm': '0.25rem',   // 4px
        'DEFAULT': '0.5rem', // 8px
        'md': '0.5rem',    // 8px
        'lg': '0.75rem',   // 12px
        'xl': '1rem',      // 16px
        '2xl': '1.5rem',   // 24px
        'full': '9999px'
      },
      // 陰影系統 - Material Design 風格
      boxShadow: {
        'xs': '0 1px 2px 0 rgba(60, 64, 67, 0.3), 0 1px 3px 1px rgba(60, 64, 67, 0.15)',
        'sm': '0 1px 2px 0 rgba(60, 64, 67, 0.3), 0 2px 6px 2px rgba(60, 64, 67, 0.15)',
        'DEFAULT': '0 2px 4px -1px rgba(60, 64, 67, 0.3), 0 4px 12px -1px rgba(60, 64, 67, 0.15)',
        'md': '0 4px 6px -1px rgba(60, 64, 67, 0.3), 0 8px 20px -2px rgba(60, 64, 67, 0.15)',
        'lg': '0 10px 15px -3px rgba(60, 64, 67, 0.3), 0 16px 24px -4px rgba(60, 64, 67, 0.15)',
        'xl': '0 20px 25px -5px rgba(60, 64, 67, 0.3), 0 25px 50px -12px rgba(60, 64, 67, 0.25)',
        '2xl': '0 25px 50px -12px rgba(60, 64, 67, 0.25)',
        'none': 'none',
      },
      // 響應式斷點
      screens: {
        'xs': '475px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
      },
      // 動畫系統
      animation: {
        // 基礎動畫
        'fade-in': 'fadeIn 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'fade-out': 'fadeOut 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'slide-down': 'slideDown 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'slide-in-right': 'slideInRight 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'slide-out-right': 'slideOutRight 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        
        // 載入動畫
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 1.5s ease-in-out infinite',
        'spin-slow': 'spin 2s linear infinite',
        
        // 進度動畫
        'progress': 'progress 1.5s ease-in-out',
        'skeleton': 'skeleton 1.5s ease-in-out infinite',
        
        // 互動動畫
        'button-press': 'buttonPress 0.1s ease-in-out',
        'scale-in': 'scaleIn 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'scale-out': 'scaleOut 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      },
      keyframes: {
        // 基礎動畫
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideOutRight: {
          '0%': { transform: 'translateX(0)', opacity: '1' },
          '100%': { transform: 'translateX(100%)', opacity: '0' },
        },
        
        // 進度動畫
        progress: {
          '0%': { width: '0%' },
          '100%': { width: '100%' },
        },
        skeleton: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        
        // 互動動畫
        buttonPress: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(0.95)' },
          '100%': { transform: 'scale(1)' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        scaleOut: {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(0.9)', opacity: '0' },
        },
      },
      // 過渡效果
      transitionTimingFunction: {
        'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'ease-in-expo': 'cubic-bezier(0.95, 0.05, 0.795, 0.035)',
        'ease-out-expo': 'cubic-bezier(0.19, 1, 0.22, 1)',
      },
    },
  },
  plugins: [],
}