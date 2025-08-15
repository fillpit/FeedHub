const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const axios = require("axios");
const fs = require("fs");

// 连接数据库
const dbPath = path.join(__dirname, "backend/data/database.sqlite");
const db = new sqlite3.Database(dbPath);

console.log("开始测试OPDS书籍解析...");

// 查询书籍信息
db.get("SELECT * FROM books WHERE id = 15", (err, book) => {
  if (err) {
    console.error("查询书籍失败:", err);
    return;
  }

  if (!book) {
    console.log("未找到ID为15的书籍");
    return;
  }

  console.log("书籍信息:", {
    id: book.id,
    title: book.title,
    author: book.author,
    sourceType: book.sourceType,
    sourceUrl: book.sourceUrl,
    fileFormat: book.fileFormat,
  });

  // 查询章节数量和内容
  db.all(
    "SELECT title, LENGTH(content) as content_length FROM chapters WHERE bookId = 15",
    (err, chapters) => {
      if (err) {
        console.error("查询章节失败:", err);
        return;
      }

      console.log("当前章节数量:", chapters.length);
      chapters.forEach((chapter, index) => {
        console.log(`章节${index + 1}: ${chapter.title} (内容长度: ${chapter.content_length})`);
      });

      // 检查是否只有默认章节
      const hasOnlyDefaultChapter =
        chapters.length === 1 &&
        (chapters[0].title === "交涉的藝術" || chapters[0].content_length > 1000);

      console.log("是否只有默认章节:", hasOnlyDefaultChapter);

      // 查询配置状态
      db.get("SELECT parseStatus FROM book_rss_configs WHERE id = 1", (err, config) => {
        if (err) {
          console.error("查询配置失败:", err);
          return;
        }

        console.log("配置状态:", config.parseStatus);

        // 测试EPUB下载
        if (book.sourceUrl) {
          console.log("\n测试EPUB下载...");
          const fullUrl = `http://localhost:8009${book.sourceUrl}`;
          console.log("下载URL:", fullUrl);

          axios({
            method: "GET",
            url: fullUrl,
            responseType: "stream",
            timeout: 10000,
          })
            .then((response) => {
              console.log("下载响应状态:", response.status);
              console.log("内容类型:", response.headers["content-type"]);
              console.log("内容长度:", response.headers["content-length"]);

              // 保存到临时文件测试
              const tempFile = path.join(__dirname, "temp-test.epub");
              const writer = fs.createWriteStream(tempFile);
              response.data.pipe(writer);

              writer.on("finish", () => {
                const stats = fs.statSync(tempFile);
                console.log("下载完成，文件大小:", stats.size, "bytes");

                // 清理临时文件
                fs.unlinkSync(tempFile);

                db.close();
              });

              writer.on("error", (error) => {
                console.error("文件写入失败:", error);
                db.close();
              });
            })
            .catch((error) => {
              console.error("下载失败:", error.message);
              db.close();
            });
        } else {
          db.close();
        }
      });
    }
  );
});
