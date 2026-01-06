# Linux.do 帖子导出到 Obsidian 使用指南

## 功能简介

这是一个油猴脚本，可以将 Linux.do 论坛的帖子导出为 Obsidian 兼容的 Markdown 格式，支持：

- 通过 Obsidian Local REST API 直接写入笔记
- 图片处理（Base64 内嵌 / 单独文件导出）
- 多种筛选条件（楼层范围、用户、关键词等）
- Obsidian Callout 格式美化显示
- 自动生成 YAML frontmatter 元数据

---

## 安装前提

### 1. 安装油猴扩展

在浏览器中安装以下任一扩展：
- [Tampermonkey](https://www.tampermonkey.net/)（推荐）
- [Violentmonkey](https://violentmonkey.github.io/)
- [Greasemonkey](https://www.greasespot.net/)（仅 Firefox）

### 2. 安装 Obsidian Local REST API 插件

1. 打开 Obsidian → 设置 → 第三方插件
2. 关闭"安全模式"
3. 点击"浏览"，搜索 `Local REST API`
4. 安装并启用该插件
5. 在插件设置中：
   - 记录 **API Key**（必需）
   - 默认端口为 `27124`，使用 HTTPS

> 插件地址：https://github.com/coddingtonbear/obsidian-local-rest-api

### 3. 安装本脚本

将 `linux_do_export.js` 导入到油猴扩展中。

---

## 配置说明

访问任意 Linux.do 帖子页面，右下角会出现导出面板。

### Obsidian 连接设置

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| API 地址 | Obsidian REST API 地址 | `https://127.0.0.1:27124` |
| API Key | 在 Obsidian 插件设置中获取 | （必填） |
| 导出目录 | 笔记保存的 Vault 内目录 | `Linux.do` |
| 图片模式 | Base64 内嵌 / 导出图片文件 | Base64 内嵌 |
| 图片目录 | 图片文件保存目录（仅文件模式） | `Linux.do/attachments` |

### 图片模式对比

| 模式 | 优点 | 缺点 |
|------|------|------|
| **Base64 内嵌** | 离线可用，单文件完整 | 文件体积较大 |
| **导出图片文件** | 文件体积小，可复用图片 | 需额外管理图片目录 |

---

## 使用方法

1. 打开要导出的 Linux.do 帖子页面
2. 配置 Obsidian 连接（首次使用）
3. 点击「测试连接」确认配置正确
4. 根据需要设置筛选条件（可选）
5. 点击「导出到 Obsidian」按钮
6. 等待导出完成，笔记将自动保存到 Obsidian

---

## 高级筛选

展开「高级筛选」面板可使用以下功能：

### 楼层范围

| 选项 | 说明 |
|------|------|
| 全部楼层 | 导出所有楼层 |
| 指定范围 | 只导出指定楼层区间（如 1-50） |

### 筛选条件

| 条件 | 说明 | 示例 |
|------|------|------|
| 只看楼主 | 仅导出楼主的回复 | - |
| 只看含图 | 仅导出包含图片的楼层 | - |
| 指定用户 | 仅导出指定用户的回复 | `user1, user2` |
| 包含关键词 | 必须包含任一关键词 | `教程, 指南` |
| 排除关键词 | 排除包含关键词的楼层 | `广告, 水贴` |
| 最少字数 | 过滤字数不足的楼层 | `100` |

> 多个用户/关键词用逗号、空格或分号分隔

---

## 导出格式示例

导出的 Markdown 包含：

### YAML Frontmatter

```yaml
---
title: "帖子标题"
topic_id: 12345
url: "https://linux.do/t/topic/12345"
author: "楼主用户名"
category: "分类名"
tags:
  - "标签1"
  - "linuxdo"
export_time: "2024-01-01T12:00:00.000Z"
floors: 50
---
```

### 帖子信息 Callout

```markdown
> [!info] 帖子信息
> - **原始链接**: [链接](链接)
> - **主题 ID**: 12345
> - **楼主**: @username
> - **分类**: 分类名
> - **标签**: 标签1, linuxdo
> - **导出时间**: 2024/1/1 12:00:00
> - **楼层数**: 50
```

### 楼层 Callout

楼主回复使用 `[!success]`，其他用户使用 `[!note]`：

```markdown
> [!success]+ #1 用户名 (@username) 楼主 · 2024/1/1 12:00:00
> 帖子内容...
> ^floor-1
```

---

## 常见问题

### Q: 连接测试失败？

1. 确认 Obsidian 已打开且 Local REST API 插件已启用
2. 检查 API Key 是否正确复制
3. 浏览器可能需要信任自签名证书：
   - 访问 `https://127.0.0.1:27124` 并接受证书警告

### Q: 图片无法显示？

- **Base64 模式**：检查网络是否正常，部分图片可能无法下载
- **文件模式**：确认图片目录路径正确，且 Obsidian 有写入权限

### Q: 导出很慢？

- 帖子楼层多时需要分批拉取数据
- 图片多时下载转换需要时间
- 可使用筛选条件减少导出内容

### Q: 如何更新脚本？

在油猴扩展中删除旧脚本，重新导入新版本即可。

---

## 版本信息

- **版本**: 4.1.2
- **作者**: ilvsx
- **适用站点**: https://linux.do/t/*
