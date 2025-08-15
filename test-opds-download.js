const axios = require("axios");
const fs = require("fs");
const path = require("path");

async function testOpdsDownload() {
  try {
    console.log("开始测试OPDS下载功能...");

    // 1. 登录获取token
    console.log("1. 登录系统...");
    const loginResponse = await axios.post("http://localhost:8009/api/user/login", {
      username: "admin",
      password: "admin@123",
    });

    if (!loginResponse.data.success) {
      throw new Error("登录失败: " + loginResponse.data.message);
    }

    const token = loginResponse.data.data.token;
    console.log("登录成功");

    // 2. 直接调用添加OPDS书籍API（使用一个较小的测试文件）
    console.log("2. 添加OPDS书籍...");
    const bookData = {
      title: "Test EPUB Book",
      author: "Test Author",
      description: "A test book for OPDS download",
      sourceUrl: "https://www.gutenberg.org/ebooks/74.epub.noimages",
      sourceType: "opds",
      fileFormat: "epub",
    };

    const addBookResponse = await axios.post(
      "http://localhost:8009/api/book-rss/books/opds",
      bookData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!addBookResponse.data.success) {
      throw new Error("添加OPDS书籍失败: " + addBookResponse.data.message);
    }

    const bookId = addBookResponse.data.data.id;
    console.log("OPDS书籍添加成功，ID:", bookId);

    // 3. 等待一段时间让下载完成
    console.log("3. 等待下载完成...");
    await new Promise((resolve) => setTimeout(resolve, 10000)); // 等待10秒

    // 4. 查询书籍信息，检查sourcePath
    console.log("4. 查询书籍信息...");
    const bookInfoResponse = await axios.get(`http://localhost:8009/api/book-rss/books/${bookId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!bookInfoResponse.data.success) {
      throw new Error("查询书籍信息失败: " + bookInfoResponse.data.message);
    }

    const book = bookInfoResponse.data.data;
    console.log("\n=== 书籍信息 ===");
    console.log("ID:", book.id);
    console.log("标题:", book.title);
    console.log("作者:", book.author);
    console.log("源类型:", book.sourceType);
    console.log("源URL:", book.sourceUrl);
    console.log("源路径:", book.sourcePath);
    console.log("总章节数:", book.totalChapters);

    // 5. 检查文件是否存在
    if (book.sourcePath) {
      console.log("\n=== 文件检查 ===");
      console.log("文件路径:", book.sourcePath);

      if (fs.existsSync(book.sourcePath)) {
        const stats = fs.statSync(book.sourcePath);
        console.log("✅ 文件存在");
        console.log("文件大小:", Math.round(stats.size / 1024), "KB");
        console.log("修改时间:", stats.mtime.toISOString());

        // 检查文件是否在正确的目录下
        const expectedDir = path.join(process.cwd(), "backend", "uploads", "books");
        const actualDir = path.dirname(book.sourcePath);
        console.log("期望目录:", expectedDir);
        console.log("实际目录:", actualDir);

        if (actualDir === expectedDir) {
          console.log("✅ 文件保存在正确的目录下");
        } else {
          console.log("❌ 文件目录不匹配");
        }
      } else {
        console.log("❌ 文件不存在");
      }
    } else {
      console.log("❌ sourcePath为空，文件可能未下载成功");
    }

    console.log("\n🎉 测试完成！");
  } catch (error) {
    console.error("❌ 测试失败:", error.message);
    if (error.response) {
      console.error("响应状态:", error.response.status);
      console.error("响应数据:", JSON.stringify(error.response.data, null, 2));
    }
  }
}

testOpdsDownload();
