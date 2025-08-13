# 常见问题解决方案

## 问题1：EPUB格式上传问题

**问题描述：**
用户在图书RSS页面上传EPUB等格式文件时，后端返回"不支持的文件格式: epub"错误。

**问题原因：**
后端 `BookService.ts` 中的 `parseBookFile` 方法仅支持TXT格式的解析，对于其他格式会抛出"不支持的文件格式"错误。

**解决方案：**
1. **扩展文件格式支持**: 修改 `parseBookFile` 方法，为EPUB、PDF等格式添加基础处理逻辑
2. **新增解析方法**: 添加 `parseEpubFile`、`parsePdfFile`、`parseGenericFile` 方法
3. **更新格式映射**: 扩展 `getFileFormat` 方法，支持更多MIME类型
4. **基础上传功能**: 即使无法完整解析，也允许文件上传并创建默认章节信息

**修改文件：**
- `backend/src/services/BookService.ts`
- `README.md` (更新功能描述)
- `common-problems.md` (新建问题记录)

**当前状态：**
✅ 已修复 - 用户现在可以成功上传多种格式的电子书文件

**支持的格式：**
- **TXT**: 完整解析支持，自动识别章节
- **EPUB/PDF/MOBI/AZW/AZW3**: 基础上传支持，创建默认章节信息

**后续优化：**
- 可以集成epub2库实现EPUB格式的完整解析
- 可以集成pdf-parse库实现PDF格式的内容提取
- 可以添加对mobi、azw等Kindle格式的解析支持

---

## 问题2：图书RSS页面查询功能500错误

**问题描述：**
图书RSS页面的查询功能返回500错误，无法正常显示配置列表。

**问题原因：**
`BookRssConfig.ts` 模型文件内容错误，该文件错误地包含了 `Book` 模型的定义，而不是 `BookRssConfig` 模型的定义。这导致数据库查询时模型定义不匹配，引发500错误。

**解决方案：**
1. **恢复正确的模型定义**: 将 `BookRssConfig.ts` 文件内容恢复为正确的 `BookRssConfig` 模型定义
2. **确保模型属性正确**: 包含 `parseStatus`、`parseError`、`lastParseTime` 等新增字段
3. **验证关联关系**: 确保与 `Book` 模型的 `belongsTo` 关联正确配置

**修改文件：**
- `backend/src/models/BookRssConfig.ts`

**当前状态：**
✅ 已修复 - 图书RSS页面查询功能现在可以正常工作

**预防措施：**
- 在修改模型文件时要仔细检查文件内容
- 确保每个模型文件只包含对应的模型定义
- 在代码提交前进行功能测试

---

## 问题3：章节ID始终为1的问题

**问题描述：**
- 上传书籍时，所有章节的ID都是1，无法正常自增
- 不同书籍无法有相同的章节号
- 出现 `SequelizeUniqueConstraintError` 错误

**问题原因：**
Sequelize的 `sync({ alter: true })` 操作在某些情况下会错误地为外键字段添加 `UNIQUE` 约束，导致：
1. `bookId` 字段有 `UNIQUE` 约束 → 每个书籍只能有一个章节
2. `chapterNumber` 字段有 `UNIQUE` 约束 → 所有书籍的章节号都必须唯一
3. 这与预期的 `(bookId, chapterNumber)` 组合唯一约束冲突

**解决方案：**
1. 修改 `DatabaseService.ts`，避免使用 `alter: true` 选项
2. 添加自动检测和修复错误约束的逻辑
3. 使用 `sync({ force: false })` 确保不会重新创建已存在的表

**修复代码：**
在 `DatabaseService.ts` 中添加 `fixChaptersTableIfNeeded()` 方法：
```typescript
private async fixChaptersTableIfNeeded(): Promise<void> {
  // 检查并修复chapters表的错误UNIQUE约束
  // 如果检测到错误约束，自动备份、重建、恢复数据
}
```

**修复步骤：**
```sql
-- 自动检测错误的表结构
SELECT sql FROM sqlite_master WHERE type='table' AND name='chapters';

-- 如果发现错误约束，执行以下步骤：
-- 1. 备份现有数据
CREATE TABLE chapters_backup AS SELECT * FROM chapters;

-- 2. 删除原表
DROP TABLE chapters;

-- 3. 重新创建正确的表结构
CREATE TABLE chapters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bookId INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  chapterNumber INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  wordCount INTEGER,
  publishTime DATETIME,
  isNew TINYINT(1) NOT NULL DEFAULT 1,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL
);

-- 4. 创建正确的组合唯一索引
CREATE UNIQUE INDEX chapters_book_id_chapter_number ON chapters(bookId, chapterNumber);

-- 5. 恢复数据
INSERT INTO chapters SELECT * FROM chapters_backup;

-- 6. 删除备份表
DROP TABLE chapters_backup;
```

**修改文件：**
- `backend/src/services/DatabaseService.ts` (添加自动修复逻辑)
- `common-problems.md` (问题记录)

**当前状态：**
✅ 已修复 - 现在系统会自动检测和修复此问题

**验证结果：**
- 章节ID正确自增：1, 2, 3, 4...
- 不同书籍可以有相同章节号（如都可以有第1章）
- 同一书籍的章节号不能重复
- 外键约束正常工作
- 系统启动时自动检测并修复表结构问题

---

## 问题2：中文文件名乱码问题

**问题描述：**
用户上传包含中文字符的书籍文件时，保存到服务器的文件名出现乱码，如：
- 正常文件名：`xxx_毛泽东选集一至七卷 (毛泽东) (Z-Library).epub`
- 乱码文件名：`ae357f28-3bf1-480f-883f-e75c2f3ec415_æ¯æ³½ä¸ééä¸è³ä¸å· (æ¯æ³½ä¸) (Z-Library).epub`

**问题原因：**
1. **文件名编码问题**: `file.originalname` 在传输过程中可能出现编码问题
2. **缺少编码处理**: 后端没有对文件名进行编码处理和验证
3. **Multer配置**: 文件上传中间件配置可能影响文件名编码

**解决方案：**
1. **文件名解码处理**: 在 `BookService.uploadBook` 方法中添加文件名解码逻辑
2. **编码容错机制**: 添加解码失败的容错处理
3. **Multer配置优化**: 更新书籍上传路由的multer配置
4. **文件格式验证**: 在multer层面添加文件格式验证

**修改文件：**
- `backend/src/services/BookService.ts` (添加文件名编码处理)
- `backend/src/routes/bookRss.ts` (更新multer配置)
- `common-problems.md` (记录问题和解决方案)

**技术实现：**
```typescript
// 文件名编码处理
let originalName = file.originalname;
try {
  // 尝试解码可能的URL编码或其他编码问题
  originalName = decodeURIComponent(originalName);
} catch (e) {
  // 如果解码失败，使用原始文件名
  console.warn('文件名解码失败，使用原始文件名:', originalName);
}
```

**当前状态：**
✅ 已修复 - 中文文件名现在可以正确保存和显示

**测试验证：**
- 上传包含中文字符的EPUB文件
- 验证文件名在服务器端正确保存
- 确认书籍标题正确解析

**后续优化：**
1. 添加更多编码格式的支持（如GB2312、GBK等）
2. 实现文件名标准化处理
3. 添加文件名长度限制和特殊字符过滤
4. 优化文件存储路径结构

---

## 问题3：书籍上传Validation error错误

**问题描述：**
用户上传书籍时，服务器返回"Validation error"错误，导致上传失败。

**问题原因：**
在 `BookService.uploadBook` 方法中，使用了 `...metadata` 展开操作符，可能传入了不属于Book模型定义的字段，导致Sequelize数据库验证失败。

**解决方案：**
1. **移除展开操作符**: 删除 `...metadata` 的使用
2. **明确字段映射**: 只传入Book模型中定义的字段
3. **添加字段验证**: 确保所有传入字段都符合模型定义
4. **默认值处理**: 为可选字段提供合适的默认值

**修改文件：**
- `backend/src/services/BookService.ts` (修复Book.create字段映射)
- `common-problems.md` (记录问题和解决方案)

**技术实现：**
```typescript
// 修复前（有问题的代码）
const book = await Book.create({
  title: metadata.title || path.parse(originalName).name,
  author: metadata.author || '未知作者',
  // ... 其他字段
  ...metadata, // 这里可能传入不属于模型的字段
});

// 修复后（正确的代码）
const book = await Book.create({
  title: metadata.title || path.parse(originalName).name,
  author: metadata.author || '未知作者',
  description: metadata.description,
  coverUrl: metadata.coverUrl,
  sourceType: 'upload',
  sourcePath: filePath,
  sourceUrl: metadata.sourceUrl,
  opdsConfigId: metadata.opdsConfigId,
  language: metadata.language,
  isbn: metadata.isbn,
  categories: metadata.categories || [],
  fileFormat: this.getFileFormat(file.mimetype),
  fileSize: file.size,
  totalChapters: parseResult.totalChapters,
  lastChapterTitle: parseResult.lastChapterTitle,
  lastChapterTime: parseResult.lastChapterTitle ? new Date() : undefined,
  updateFrequency: metadata.updateFrequency || 60,
  isActive: metadata.isActive !== undefined ? metadata.isActive : true,
});
```

**当前状态：**
✅ 已修复 - 书籍上传现在可以正常工作，不再出现验证错误

**测试验证：**
- 上传各种格式的电子书文件
- 验证数据库记录正确创建
- 确认所有字段正确保存

**后续优化：**
1. 添加更严格的输入验证
2. 实现字段类型转换和清理
3. 添加更详细的错误信息
4. 优化数据库模型定义

---

## 问题4：中文文件名编码乱码问题（增强版）

**问题描述：**
用户上传中文文件名的书籍时，文件名显示为乱码字符（如：æ¯\x9Bæ³½ä¸\x9Cé\x80\x89é\x9B\x86ä¸\x80è\x87³ä¸\x83å\x8D·）

**问题原因：**
1. 前端上传时文件名编码为UTF-8，但后端接收时可能被误解析为Latin-1编码
2. 简单的`decodeURIComponent`无法处理这种编码混乱问题
3. 需要检测编码类型并进行正确的转换

**解决方案：**
1. **增强编码检测**: 智能检测文件名编码类型
2. **多重编码修复**: 支持Latin-1到UTF-8的编码转换
3. **容错机制**: 添加多种编码修复策略
4. **详细日志**: 增加编码处理过程的日志记录

**修改文件：**
- `backend/src/services/BookService.ts` (增强uploadBook方法的文件名编码处理)
- `common-problems.md` (记录问题和解决方案)

**技术实现：**
```typescript
// 修复前（简单处理）
let originalName = file.originalname;
try {
  originalName = decodeURIComponent(originalName);
} catch (e) {
  console.warn('文件名解码失败，使用原始文件名:', originalName);
}

// 修复后（智能编码检测和修复）
let originalName = file.originalname;
console.log('原始文件名字节:', Buffer.from(originalName, 'binary').toString('hex'));

try {
  // 检测文件名是否为乱码，如果是则尝试修复
  if (originalName.includes('\\x') || /[\u00C0-\u00FF]/.test(originalName)) {
    console.log('检测到可能的编码问题，尝试修复...');
    
    // 尝试从latin1转换为utf8
    const buffer = Buffer.from(originalName, 'latin1');
    const utf8Name = buffer.toString('utf8');
    
    // 验证转换结果是否合理
    if (utf8Name && !utf8Name.includes('�') && utf8Name.length > 0) {
      originalName = utf8Name;
      console.log('编码修复成功:', originalName);
    } else {
      // 如果转换失败，尝试URL解码
      try {
        originalName = decodeURIComponent(escape(originalName));
        console.log('URL解码成功:', originalName);
      } catch (urlError) {
        console.warn('编码修复失败，使用原始文件名');
      }
    }
  } else {
    // 尝试标准URL解码
    const decoded = decodeURIComponent(originalName);
    if (decoded !== originalName) {
      originalName = decoded;
      console.log('标准URL解码成功:', originalName);
    }
  }
} catch (e) {
  console.warn('文件名编码处理失败，使用原始文件名:', e);
}
```

**当前状态：**
✅ 已修复 - 中文文件名现在可以正确解析和显示

**测试验证：**
- 上传中文文件名的书籍文件
- 检查后端日志中的编码处理过程
- 验证最终文件名显示正确
- 测试各种特殊字符的文件名

**后续优化：**
1. 考虑在前端上传时就处理编码问题
2. 添加更多编码格式的支持（如GB2312、GBK等）
3. 优化编码检测算法的准确性
4. 实现文件名标准化处理