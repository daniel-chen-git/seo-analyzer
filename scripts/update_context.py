# 1. 建立上下文更新腳本
#!/usr/bin/env python3
import json
import datetime
import sys


def update_context(message):
    """更新專案上下文"""

    # 讀取現有上下文
    with open('.claude/context.md', 'r') as f:
        content = f.read()

    # 更新時間戳
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    content = content.replace(
        content.split('\n')[2],
        f"## 最後更新：{timestamp}"
    )

    # 加入新的更新訊息
    if message:
        content += f"\n\n### 最新更新\n- {message}"

    # 寫回檔案
    with open('.claude/context.md', 'w') as f:
        f.write(content)

    print(f"✅ 上下文已更新: {message}")


if __name__ == "__main__":
    message = sys.argv[1] if len(sys.argv) > 1 else ""
    update_context(message)
