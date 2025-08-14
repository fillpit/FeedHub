# 图书RSS增量更新功能说明

## 功能概述

图书RSS功能现在支持根据更新间隔设置进行智能的增量更新，不再每次都返回整本书的所有章节，而是根据配置的更新间隔和上次生成RSS的时间来决定返回哪些章节。

## 核心功能

### 1. 增量更新逻辑

- **时间窗口计算**：根据`updateInterval`（更新间隔，单位：天）和`lastFeedTime`（上次RSS生成时间）计算时间窗口
- **章节过滤**：只返回在时间窗口内创建或更新的章节
- **智能回退**：当时间窗口内没有新章节时，返回最近的`minReturnChapters`章节，避免空RSS

### 2. 配置参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `updateInterval` | Integer | 1 | 更新间隔（天），用于计算时间窗口 |
| `minReturnChapters` | Integer | 3 | 最小返回章节数，当无新章节时的回退策略 |

| `lastFeedTime` | DateTime | null | 最后RSS生成时间，系统自动维护 |

### 3. 工作流程

#### 首次生成RSS
```
1. lastFeedTime为空
2. 返回最新的章节
3. 更新lastFeedTime为当前时间
4. 日志："配置X首次生成RSS，返回最新Y章"
```

#### 增量更新
```
1. 计算时间窗口：从(lastFeedTime - updateInterval天)到现在
2. 过滤在时间窗口内的章节
3. 如果有新章节：返回新章节
4. 如果无新章节：返回最近的minReturnChapters章节
5. 更新lastFeedTime为当前时间
6. 日志："配置X在时间窗口内找到Y个新章节" 或 "配置X在时间窗口内无新章节，返回最近Y章"
```



## 使用示例

### 示例1：日更新配置
```json
{
  "updateInterval": 1,
  "minReturnChapters": 3
}
```
- 每天检查一次新章节
- 如果有新章节，返回新章节
- 如果没有新章节，返回最近3章

### 示例2：周更新配置
```json
{
  "updateInterval": 7,
  "minReturnChapters": 5
}
```
- 每周检查一次新章节
- 如果没有新章节，返回最近5章




## 技术实现

### 数据库字段

在`book_rss_configs`表中新增了以下字段：

```sql
lastFeedTime DATETIME,           -- 最后RSS生成时间
minReturnChapters INTEGER DEFAULT 3,  -- 最小返回章节数

```

### 核心代码逻辑

位于`BookRssService.fetchChaptersForConfig()`方法中：

1. **时间窗口计算**
```typescript
const timeWindowStart = new Date(lastFeedTime.getTime() - (updateIntervalDays * 24 * 60 * 60 * 1000));
```

2. **章节过滤**
```typescript
chapters = newChaptersResult.data.list.filter(chapter => {
  const chapterTime = new Date(chapter.createdAt || chapter.updatedAt || 0);
  return chapterTime >= timeWindowStart;
});
```

3. **智能回退**
```typescript
if (chapters.length === 0) {
  chapters = newChaptersResult.data.list.slice(0, minReturnChapters);
}
```

## 监控和调试

### 日志信息

系统会输出详细的日志信息，帮助了解RSS生成过程：

- `配置X首次生成RSS，返回最新Y章`
- `配置X在时间窗口内找到Y个新章节`
- `配置X在时间窗口内无新章节，返回最近Y章`
- `配置X强制全量更新，返回最新Y章`

### RSS大小变化

通过RSS Feed的大小变化可以观察增量更新效果：

- 全量更新：通常几十万字符
- 增量更新（有新章节）：根据新章节数量变化
- 增量更新（无新章节）：只有几万字符（最小章节数）

## 最佳实践

1. **合理设置更新间隔**：根据书籍更新频率设置`updateInterval`
2. **适当的最小章节数**：设置`minReturnChapters`避免空RSS
3. **监控RSS大小**：通过RSS大小变化判断增量更新是否正常工作


## 兼容性说明

- 现有配置会自动获得增量更新功能
- 首次访问时会进行全量更新并设置`lastFeedTime`
- 所有新字段都有合理的默认值，确保向后兼容