# RSS模板配置使用指南

## 概述

本系统支持模板配置，让你可以快速创建多个博主的RSS订阅，而无需重复编写相同的抓取逻辑。只需要提供不同的博主ID和名称即可。

## 支持的平台

### 1. B站UP主视频更新

**接口**: `POST /api/website-rss/template/bilibili`

**请求参数**:
```json
{
  "upId": "355327690",
  "upName": "某UP主",
  "customKey": "optional_custom_key"
}
```

**示例**:
```bash
curl -X POST http://localhost:8009/api/website-rss/template/bilibili \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{
    "upId": "355327690",
    "upName": "科技UP主"
  }'
```

### 2. 抖音博主视频更新

**接口**: `POST /api/website-rss/template/douyin`

**请求参数**:
```json
{
  "upId": "douyin_user_id",
  "upName": "某抖音博主",
  "customKey": "optional_custom_key"
}
```

### 3. YouTube频道视频更新

**接口**: `POST /api/website-rss/template/youtube`

**请求参数**:
```json
{
  "channelId": "UC_x5XG1OV2P6uZZ5FSM9Ttw",
  "channelName": "某YouTube频道",
  "customKey": "optional_custom_key"
}
```

## 模板系统工作原理

### 1. 参数替换

模板使用 `{{参数名}}` 或 `${参数名}` 格式进行参数替换：

```javascript
// 模板脚本示例
const result = await utils.fetchApi('https://api.bilibili.com/x/polymer/web-dynamic/v1/feed/space?type=video&host_mid={{upId}}&platform=web');

// 会被替换为
const result = await utils.fetchApi('https://api.bilibili.com/x/polymer/web-dynamic/v1/feed/space?type=video&host_mid=355327690&platform=web');
```

### 2. 自动生成的配置

系统会自动生成以下配置：
- **key**: 自动生成的唯一标识符（如 `bilibili_355327690`）
- **title**: 博主名称 + "的视频更新"
- **url**: 包含博主ID的API地址
- **script**: 预定义的抓取脚本（支持参数替换）
- **fetchMode**: 自动设置为 "script"
- **favicon**: 平台图标

## 批量创建示例

### 创建多个B站UP主配置

```bash
# UP主1
curl -X POST http://localhost:8009/api/website-rss/template/bilibili \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{"upId": "355327690", "upName": "科技UP主"}'

# UP主2
curl -X POST http://localhost:8009/api/website-rss/template/bilibili \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{"upId": "123456789", "upName": "游戏UP主"}'

# UP主3
curl -X POST http://localhost:8009/api/website-rss/template/bilibili \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{"upId": "987654321", "upName": "生活UP主"}'
```

### 创建多个YouTube频道配置

```bash
# 频道1
curl -X POST http://localhost:8009/api/website-rss/template/youtube \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{"channelId": "UC_x5XG1OV2P6uZZ5FSM9Ttw", "channelName": "Google Developers"}'

# 频道2
curl -X POST http://localhost:8009/api/website-rss/template/youtube \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{"channelId": "UCJWh7F3AFyQx01V5J9uQ5VA", "channelName": "Another Channel"}'
```

## 获取RSS Feed

创建配置后，可以通过以下方式获取RSS Feed：

```bash
# 使用自动生成的key获取RSS
curl "http://localhost:8009/api/rss/bilibili_355327690"

# 或者使用自定义key
curl "http://localhost:8009/api/rss/your_custom_key"
```

## 自定义模板

如果需要创建自定义模板，可以：

1. 在 `WebsiteRssService` 中添加新的模板方法
2. 在 `WebsiteRssController` 中添加对应的控制器方法
3. 在路由中添加新的路由

### 示例：创建自定义模板

```typescript
// 在 WebsiteRssService 中添加
public createCustomTemplate(param1: string, param2: string): Partial<WebsiteRssConfigAttributes> {
  return {
    key: `custom_${param1}`,
    title: `${param2}的更新`,
    url: `https://api.example.com/data?param={{param1}}`,
    fetchMode: "script" as const,
    script: {
      enabled: true,
      template: true,
      parameters: {
        param1: param1,
        param2: param2
      },
      script: `
        let items = []
        try {
          const result = await utils.fetchApi('https://api.example.com/data?param={{param1}}');
          // 处理数据...
        } catch (error) {
          console.error('请求失败:', error.message);
        }
        return items;
      `
    }
  };
}
```

## 注意事项

1. **参数验证**: 系统会自动验证必需的参数（如upId、upName等）
2. **唯一性**: 每个配置的key都是唯一的，避免冲突
3. **错误处理**: 模板脚本包含完整的错误处理机制
4. **性能**: 模板处理在服务端进行，不影响客户端性能

## 扩展支持

系统可以轻松扩展支持更多平台：

- 微博博主
- 知乎用户
- 小红书博主
- 微信公众号
- 等等...

只需要按照相同的模式添加新的模板方法即可。 