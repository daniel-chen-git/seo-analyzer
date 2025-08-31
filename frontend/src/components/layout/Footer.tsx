import { config, isDevelopment } from '@/config'

function Footer() {
  const currentYear = new Date().getFullYear()
  
  const footerSections = [
    {
      title: '產品',
      links: [
        { name: '關鍵字分析', href: '#analyze' },
        { name: 'SERP 分析', href: '#serp' },
        { name: '內容生成', href: '#content' },
        { name: 'API 文件', href: '#api' },
      ]
    },
    {
      title: '資源',
      links: [
        { name: '使用教學', href: '#guide' },
        { name: 'FAQ', href: '#faq' },
        { name: '部落格', href: '#blog' },
        { name: 'SEO 指南', href: '#seo-guide' },
      ]
    },
    {
      title: '支援',
      links: [
        { name: '聯絡我們', href: '#contact' },
        { name: '意見回饋', href: '#feedback' },
        { name: '技術支援', href: '#support' },
        { name: '狀態監控', href: '#status' },
      ]
    },
    {
      title: '法律',
      links: [
        { name: '隱私政策', href: '#privacy' },
        { name: '服務條款', href: '#terms' },
        { name: 'Cookie 政策', href: '#cookies' },
        { name: '資料安全', href: '#security' },
      ]
    }
  ]

  const socialLinks = [
    {
      name: 'GitHub',
      href: '#github',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 0C5.374 0 0 5.373 0 12 0 17.302 3.438 21.8 8.207 23.387c.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
        </svg>
      )
    },
    {
      name: 'Twitter',
      href: '#twitter',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
        </svg>
      )
    },
    {
      name: 'LinkedIn',
      href: '#linkedin',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      )
    }
  ]

  return (
    <footer className="bg-neutral-50 border-t border-neutral-200">
      {/* 主要 Footer 內容 */}
      <div className="w-full max-w-none mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* 品牌區域 */}
        <div className="mb-8 lg:mb-12">
          <div className="flex items-center mb-4">
            <span className="text-xl font-bold text-primary">
              🔍 {config.app.title}
            </span>
          </div>
          <p className="text-neutral-600 text-sm mb-6 max-w-sm">
            {config.app.description}，助您提升網站搜尋引擎排名，獲得更多自然流量。
          </p>
          
          {/* 社群連結 */}
          <div className="flex space-x-4">
            {socialLinks.map((social) => (
              <a
                key={social.name}
                href={social.href}
                className="text-neutral-400 hover:text-neutral-600 transition-colors"
                aria-label={social.name}
              >
                {social.icon}
              </a>
            ))}
          </div>
        </div>
        
        {/* Footer 導航 - 4列佈局 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4 gap-6">
          {footerSections.map((section) => (
            <div key={section.title}>
              <h3 className="text-sm font-semibold text-neutral-900 uppercase tracking-wider mb-4">
                {section.title}
              </h3>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.name}>
                    <a
                      href={link.href}
                      className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
                    >
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Footer 底部 */}
      <div className="border-t border-neutral-200 bg-neutral-100">
        <div className="w-full max-w-none mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            {/* 版權聲明 */}
            <div className="text-sm text-neutral-600 mb-4 md:mb-0">
              © {currentYear} {config.app.title}. 版權所有。
            </div>

            {/* 技術資訊 */}
            <div className="flex items-center space-x-4 text-xs text-neutral-500">
              <div>版本 {config.app.version}</div>
              {isDevelopment() && (
                <>
                  <div>•</div>
                  <div className="flex items-center">
                    <span className="w-2 h-2 bg-green-400 rounded-full mr-1"></span>
                    開發模式
                  </div>
                </>
              )}
              <div>•</div>
              <div>
                由 React 19 + Vite 6 + Tailwind CSS 4 驅動
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer