# RSS模板系统使用指南

## 概述

RSS模板系统允许用户创建可重用的RSS抓取模板，通过参数化配置来快速创建多个相似平台的RSS订阅。

## 功能特性

### 1. 模板管理
- **创建模板**: 用户可以创建自定义的RSS抓取模板
- **编辑模板**: 修改现有模板的配置和参数
- **删除模板**: 删除不需要的模板
- **模板列表**: 查看所有可用的模板

### 2. 参数化配置
- **动态参数**: 支持字符串、数字、选择等参数类型
- **参数验证**: 自动验证必需参数和参数类型
- **默认值**: 支持为参数设置默认值
- **参数描述**: 为每个参数提供详细说明

### 3. 模板使用
- **一键生成**: 通过模板和参数快速生成RSS配置
- **参数填写**: 友好的参数输入界面
- **配置预览**: 生成前预览URL和脚本配置

## 系统架构

### 数据库设计

```sql
-- RSS模板表
CREATE TABLE rss_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR NOT NULL,                    -- 模板名称
  description TEXT NOT NULL,                -- 模板描述
  platform VARCHAR NOT NULL,                -- 平台名称
  icon VARCHAR NOT NULL,                    -- 平台图标
  url_template TEXT NOT NULL,               -- URL模板
  script_template TEXT NOT NULL,            -- 脚本模板
  parameters JSON NOT NULL DEFAULT '[]',    -- 参数定义
  enabled BOOLEAN NOT NULL DEFAULT 1,       -- 是否启用
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);
```

### API接口

#### 模板管理接口
- `GET /api/rss-template` - 获取所有模板
- `GET /api/rss-template/:id` - 获取指定模板
- `POST /api/rss-template` - 创建模板
- `PUT /api/rss-template/:id` - 更新模板
- `DELETE /api/rss-template/:id` - 删除模板

#### 模板使用接口
- `POST /api/rss-template/generate` - 根据模板生成RSS配置
- `POST /api/rss-template/init` - 初始化默认模板

## 使用流程

### 1. 访问模板管理页面
1. 登录系统
2. 点击侧边栏的"RSS模板管理"
3. 进入模板管理界面

### 2. 创建新模板
1. 点击"创建模板"按钮
2. 填写模板基本信息：
   - **模板名称**: 如"B站UP主"
   - **平台名称**: 如"bilibili"
   - **平台图标**: 如"bilibili"
   - **模板描述**: 描述模板用途

3. 配置URL模板：
   ```
   https://space.bilibili.com/{{userId}}/video
   ```

4. 编写脚本模板：
   ```javascript
   // B站UP主视频抓取脚本
   const items = [];
   
   // 获取视频列表
   const videoList = document.querySelectorAll('.bili-video-card');
   
   videoList.forEach(card => {
     const titleElement = card.querySelector('.bili-video-card__info--tit');
     const linkElement = card.querySelector('a');
     const timeElement = card.querySelector('.bili-video-card__info--date');
     const coverElement = card.querySelector('img');
     
     if (titleElement && linkElement) {
       const title = titleElement.textContent.trim();
       const link = 'https:' + linkElement.getAttribute('href');
       const time = timeElement ? timeElement.textContent.trim() : '';
       const cover = coverElement ? coverElement.getAttribute('src') : '';
       
       items.push({
         title,
         link,
         time,
         cover,
         description: title
       });
     }
   });
   
   return items;
   ```

5. 配置参数：
   - **参数名**: userId
   - **显示名称**: UP主ID
   - **类型**: 字符串
   - **必需**: 是
   - **描述**: B站UP主的用户ID

6. 保存模板

### 3. 使用模板
1. 在模板列表中找到要使用的模板
2. 点击"使用模板"按钮
3. 填写参数值：
   - UP主ID: 12345678
4. 点击"生成RSS配置"
5. 系统会生成完整的RSS配置，包括：
   - URL: `https://space.bilibili.com/12345678/video`
   - 脚本: 替换了参数的完整脚本
   - 名称: 包含参数值的模板名称

### 4. 创建RSS订阅
1. 复制生成的配置
2. 进入"网站内容监控"页面
3. 创建新的RSS配置
4. 粘贴生成的URL和脚本
5. 保存配置

## 默认模板

系统提供了以下默认模板：

### 1. B站UP主模板
- **平台**: bilibili
- **参数**: UP主ID
- **用途**: 抓取B站UP主的视频更新

### 2. 抖音博主模板
- **平台**: douyin
- **参数**: 博主ID
- **用途**: 抓取抖音博主的视频更新

### 3. YouTube频道模板
- **平台**: youtube
- **参数**: 频道ID
- **用途**: 抓取YouTube频道的视频更新

## 参数类型说明

### 1. 字符串类型 (string)
- 用于文本输入
- 示例: 用户ID、频道名称等

### 2. 数字类型 (number)
- 用于数值输入
- 示例: 页码、数量等

### 3. 选择类型 (select)
- 用于从预设选项中选择
- 需要配置选项列表
- 示例: 内容类型、排序方式等

## 最佳实践

### 1. 模板设计
- **命名规范**: 使用清晰的模板名称
- **参数设计**: 只包含必要的参数
- **脚本优化**: 编写健壮的抓取脚本
- **错误处理**: 在脚本中添加错误处理

### 2. 参数配置
- **必需参数**: 只将真正必需的参数设为必需
- **默认值**: 为常用参数设置合理的默认值
- **参数描述**: 提供详细的参数说明
- **参数验证**: 在脚本中验证参数有效性

### 3. 脚本编写
- **选择器稳定性**: 使用稳定的CSS选择器
- **容错处理**: 添加空值检查和异常处理
- **性能优化**: 避免不必要的DOM操作
- **数据清理**: 清理和格式化抓取的数据

## 故障排除

### 1. 常见问题
- **模板不显示**: 检查模板是否启用
- **参数验证失败**: 检查参数类型和必需性
- **脚本执行错误**: 检查脚本语法和选择器
- **数据抓取失败**: 检查网站结构是否变化

### 2. 调试技巧
- 使用浏览器开发者工具测试选择器
- 在脚本中添加console.log调试信息
- 检查网络请求和响应
- 验证参数替换是否正确

## 扩展开发

### 1. 添加新模板
1. 分析目标网站结构
2. 设计URL模板和参数
3. 编写抓取脚本
4. 测试脚本有效性
5. 创建模板配置

### 2. 自定义参数类型
- 扩展参数类型定义
- 添加参数验证逻辑
- 更新前端参数组件

### 3. 模板导入导出
- 支持模板的导入导出功能
- 便于模板的分享和备份

## 总结

RSS模板系统大大简化了RSS配置的创建过程，通过参数化配置实现了模板的复用，提高了工作效率。用户可以根据自己的需求创建自定义模板，也可以使用系统提供的默认模板快速开始使用。 