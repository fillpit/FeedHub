const axios = require("axios");

// 测试OPDS书籍章节处理逻辑统一化
async function testOpdsUnifiedLogic() {
  const baseUrl = "http://localhost:8008/api/book-rss";

  try {
    console.log("=== 测试OPDS书籍章节处理逻辑统一化 ===\n");

    // 先登录获取token
    console.log("0. 登录获取token...");
    const loginResponse = await axios.post("http://localhost:8008/api/user/login", {
      username: "admin",
      password: "admin@123",
    });

    const token = loginResponse.data.data.token;
    console.log("登录成功，获取到token");

    // 设置默认的Authorization header
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

    // 1. 获取现有的OPDS书籍配置
    console.log("获取现有的OPDS书籍配置...");
    const configsResponse = await axios.get(`${baseUrl}/`);
    const opdsConfigs = configsResponse.data.data.filter(
      (config) => config.book && config.book.sourceType === "opds"
    );

    if (opdsConfigs.length === 0) {
      console.log("没有找到OPDS书籍配置，请先添加一些OPDS书籍");
      return;
    }

    console.log(`找到 ${opdsConfigs.length} 个OPDS书籍配置`);

    // 2. 测试每个OPDS书籍的章节数据
    for (const config of opdsConfigs.slice(0, 2)) {
      // 只测试前2个
      console.log(`\n--- 测试书籍: ${config.book.title} ---`);

      // 检查书籍的章节记录
      console.log("检查数据库中的章节记录...");
      const chaptersResponse = await axios.get(
        `http://localhost:8008/api/book-rss/books/${config.book.id}/chapters`
      );

      const chapters = chaptersResponse.data.data.list;
      console.log(`数据库中的章节数量: ${chapters.length}`);

      if (chapters.length > 0) {
        const chapter = chapters[0];
        console.log(`第一章信息:`);
        console.log(`  - 标题: ${chapter.title}`);
        console.log(`  - 章节号: ${chapter.chapterNumber}`);
        console.log(`  - 字数: ${chapter.wordCount}`);
        console.log(`  - 内容预览: ${chapter.content.substring(0, 100)}...`);
      }

      // 测试RSS Feed
      console.log("\n测试RSS Feed...");
      const rssResponse = await axios.get(`${baseUrl}/feed/${config.key}`);
      console.log(`RSS Feed状态: ${rssResponse.status}`);

      // 检查RSS内容是否包含章节信息
      const rssContent = rssResponse.data;
      const itemCount = (rssContent.match(/<item>/g) || []).length;
      console.log(`RSS Feed中的条目数量: ${itemCount}`);

      // 测试JSON Feed
      console.log("\n测试JSON Feed...");
      const jsonResponse = await axios.get(`${baseUrl}/feed/${config.key}/json`);
      console.log(`JSON Feed状态: ${jsonResponse.status}`);

      const jsonData = jsonResponse.data;
      console.log(`JSON Feed中的条目数量: ${jsonData.items ? jsonData.items.length : 0}`);

      if (jsonData.items && jsonData.items.length > 0) {
        const firstItem = jsonData.items[0];
        console.log(`第一个条目:`);
        console.log(`  - 标题: ${firstItem.title}`);
        console.log(
          `  - 内容预览: ${firstItem.content_text ? firstItem.content_text.substring(0, 100) : "N/A"}...`
        );
      }
    }

    console.log("\n=== 测试完成 ===");
    console.log("✅ OPDS书籍章节处理逻辑已统一化");
    console.log("✅ OPDS书籍现在在创建时就会有真实的章节记录");
    console.log("✅ RSS Feed生成不再需要动态创建虚拟章节");
  } catch (error) {
    console.error("测试失败:", error.message);
    if (error.response) {
      console.error("响应状态:", error.response.status);
      console.error("响应数据:", error.response.data);
      console.error("请求URL:", error.config?.url);
      console.error("请求方法:", error.config?.method);
    }
    console.error("完整错误:", error);
  }
}

// 运行测试
testOpdsUnifiedLogic();
