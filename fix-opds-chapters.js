// 修复OPDS书籍章节记录脚本
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 数据库路径
const dbPath = path.join(__dirname, 'backend', 'data', 'database.sqlite');

const fixOpdsChapters = async () => {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    
    console.log('开始检查OPDS书籍章节记录...');
    
    // 查找没有章节记录的OPDS书籍
    const query = `
      SELECT b.* FROM books b
      LEFT JOIN chapters c ON b.id = c.bookId
      WHERE b.sourceType = 'opds' AND c.id IS NULL
    `;
    
    db.all(query, [], (err, books) => {
      if (err) {
        console.error('查询OPDS书籍失败:', err);
        db.close();
        reject(err);
        return;
      }
      
      console.log(`找到 ${books.length} 个没有章节记录的OPDS书籍`);
      
      if (books.length === 0) {
        console.log('所有OPDS书籍都已有章节记录，无需修复');
        db.close();
        resolve();
        return;
      }
      
      // 为每个OPDS书籍创建默认章节
      let processedCount = 0;
      
      books.forEach((book, index) => {
        console.log(`正在为书籍 "${book.title}" (ID: ${book.id}) 创建章节记录...`);
        
        const chapterData = {
          bookId: book.id,
          chapterNumber: 1,
          title: book.title,
          content: book.description || `《${book.title}》\n\n作者：${book.author}\n\n这是一本来自OPDS服务的电子书。完整内容请访问原始链接获取。\n\n原始链接：${book.sourceUrl || '暂无'}`,
          wordCount: (book.description || '').length,
          publishTime: new Date().toISOString(),
          isNew: 0, // OPDS书籍默认不标记为新章节
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        const insertQuery = `
          INSERT INTO chapters (bookId, chapterNumber, title, content, wordCount, publishTime, isNew, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        db.run(insertQuery, [
          chapterData.bookId,
          chapterData.chapterNumber,
          chapterData.title,
          chapterData.content,
          chapterData.wordCount,
          chapterData.publishTime,
          chapterData.isNew,
          chapterData.createdAt,
          chapterData.updatedAt
        ], function(err) {
          if (err) {
            console.error(`为书籍 "${book.title}" 创建章节失败:`, err);
          } else {
            console.log(`✅ 为书籍 "${book.title}" 创建章节成功，章节ID: ${this.lastID}`);
          }
          
          processedCount++;
          
          // 所有书籍处理完成
          if (processedCount === books.length) {
            console.log(`\n修复完成！共为 ${books.length} 个OPDS书籍创建了章节记录`);
            db.close();
            resolve();
          }
        });
      });
    });
  });
};

// 验证修复结果
const verifyFix = async () => {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    
    console.log('\n验证修复结果...');
    
    // 统计OPDS书籍和章节数量
    const queries = [
      'SELECT COUNT(*) as count FROM books WHERE sourceType = "opds"',
      'SELECT COUNT(*) as count FROM chapters WHERE bookId IN (SELECT id FROM books WHERE sourceType = "opds")'
    ];
    
    let results = [];
    let queryCount = 0;
    
    queries.forEach((query, index) => {
      db.get(query, [], (err, row) => {
        if (err) {
          console.error(`查询失败 (${index}):`, err);
          reject(err);
          return;
        }
        
        results[index] = row.count;
        queryCount++;
        
        if (queryCount === queries.length) {
          console.log(`OPDS书籍总数: ${results[0]}`);
          console.log(`OPDS书籍章节总数: ${results[1]}`);
          
          if (results[0] === results[1]) {
            console.log('✅ 验证通过：所有OPDS书籍都有章节记录');
          } else {
            console.log('❌ 验证失败：仍有OPDS书籍缺少章节记录');
          }
          
          db.close();
          resolve();
        }
      });
    });
  });
};

// 主函数
const main = async () => {
  try {
    await fixOpdsChapters();
    await verifyFix();
    console.log('\n脚本执行完成！');
  } catch (error) {
    console.error('脚本执行失败:', error);
    process.exit(1);
  }
};

// 检查是否直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = { fixOpdsChapters, verifyFix };