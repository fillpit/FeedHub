const axios = require("axios");
const fs = require("fs");
const path = require("path");

async function testOpdsDownload() {
  try {
    console.log("开始测试OPDS下载功能...");

    // 1. 登录获取token
    console.log("1. 登录系统...");
    const loginResponse = await axios.post("http://localhost:8009/user/login", {
      username: "admin",
      password: "admin@123",
    });

    if (!loginResponse.data.success) {
      throw new Error("登录失败: " + loginResponse.data.message);
    }

    const token = loginResponse.data.data.token;
    console.log("登录成功，token:", token.substring(0, 20) + "...");

    // 2. 添加OPDS书籍配置
    console.log("2. 添加OPDS书籍配置...");
    const configData = {
      title: "测试OPDS书籍RSS配置",
      description: "这是一个测试OPDS书籍的RSS配置",
      opdsBook: {
        id: "test-book-" + Date.now(),
        title: "测试EPUB书籍",
        author: "测试作者",
        description: "这是一本测试书籍",
        link: "https://www.gutenberg.org/ebooks/74.epub.noimages", // 使用一个小的测试文件
        fileFormat: "epub",
      },
      includeContent: true,
      updateInterval: 1,
      minReturnChapters: 3,
      chaptersPerUpdate: 3,
      sourceType: "opds",
    };

    const addConfigResponse = await axios.post("http://localhost:8009/book-rss/", configData, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!addConfigResponse.data.success) {
      throw new Error("添加OPDS配置失败: " + addConfigResponse.data.message);
    }

    const configId = addConfigResponse.data.data.id;
    const bookId = addConfigResponse.data.data.bookId;
    console.log("OPDS配置添加成功，配置ID:", configId, "书籍ID:", bookId);

    // 3. 等待一段时间让下载完成
    console.log("3. 等待下载完成...");
    await new Promise((resolve) => setTimeout(resolve, 10000)); // 等待10秒

    // 4. 查询书籍信息
    console.log("4. 查询书籍信息...");
    const bookResponse = await axios.get(`http://localhost:8009/book-rss/books/${bookId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (bookResponse.data.success) {
      const book = bookResponse.data.data;
      console.log("书籍信息:");
      console.log("- 标题:", book.title);
      console.log("- 作者:", book.author);
      console.log("- 来源类型:", book.sourceType);
      console.log("- 来源URL:", book.sourceUrl);
      console.log("- 本地路径:", book.sourcePath);
      console.log("- 总章节数:", book.totalChapters);

      // 5. 检查文件是否存在
      if (book.sourcePath) {
        const fullPath = path.resolve("/Users/fei/Code/me/FeedHub/backend", book.sourcePath);
        console.log("5. 检查文件是否存在:", fullPath);

        if (fs.existsSync(fullPath)) {
          const stats = fs.statSync(fullPath);
          console.log("✅ 文件存在！文件大小:", stats.size, "字节");
        } else {
          console.log("❌ 文件不存在！");
        }
      } else {
        console.log("❌ sourcePath为空，文件未下载");
      }

      // 6. 检查uploads/books目录
      console.log("6. 检查uploads/books目录内容:");
      const uploadsDir = "/Users/fei/Code/me/FeedHub/backend/uploads/books";
      if (fs.existsSync(uploadsDir)) {
        const files = fs.readdirSync(uploadsDir);
        console.log("目录中的文件:", files);
      } else {
        console.log("uploads/books目录不存在");
      }
    } else {
      console.log("获取书籍信息失败:", bookResponse.data.error);
    }
  } catch (error) {
    console.error("测试失败:", error.message);
    if (error.response) {
      console.error("响应状态:", error.response.status);
      console.error("响应数据:", error.response.data);
    }
  }
}

testOpdsDownload();
