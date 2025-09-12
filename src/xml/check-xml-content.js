const fs = require('fs');

// 要检查的XML文件
const xmlFiles = ['优化文件.xml', '优化文件2.xml'];

xmlFiles.forEach(fileName => {
  console.log(`\n=== 检查文件内容: ${fileName} ===`);
  
  try {
    const xmlData = fs.readFileSync(fileName, 'utf8');
    console.log('✓ 成功读取文件');
    
    // 检查乱码问题（通过查找常见的乱码字符模式）
    const garbledChars = [
      { pattern: /[锟斤拷]/g, name: '乱码字符"锟斤拷"' },
      { pattern: /[锘跨⒈]/g, name: '乱码字符"锘跨⒈"' },
      { pattern: /[?]{3,}/g, name: '连续问号"???"' }
    ];
    
    console.log('\n--- 乱码检查 ---');
    let hasGarbled = false;
    garbledChars.forEach(({ pattern, name }) => {
      const matches = xmlData.match(pattern);
      if (matches) {
        console.log(`  ⚠ 发现${name}: ${matches.length} 处`);
        hasGarbled = true;
      }
    });
    
    if (!hasGarbled) {
      console.log('  ✓ 未发现明显乱码字符');
    }
    
    // 检查中文字符
    console.log('\n--- 中文字符检查 ---');
    const chinesePattern = /[\u4e00-\u9fa5]/g;
    const chineseMatches = xmlData.match(chinesePattern);
    if (chineseMatches) {
      console.log(`  ✓ 发现中文字符: ${chineseMatches.length} 个`);
    } else {
      console.log('  - 未发现中文字符');
    }
    
    // 检查XML属性中的中文
    console.log('\n--- XML属性中的中文检查 ---');
    const attributeWithChinesePattern = /[a-zA-Z]*\s*=\s*"[^"]*[\u4e00-\u9fa5][^"]*"/g;
    const attrMatches = xmlData.match(attributeWithChinesePattern);
    if (attrMatches) {
      console.log(`  ✓ 发现包含中文的属性: ${attrMatches.length} 个`);
      // 显示前几个示例
      attrMatches.slice(0, 3).forEach((match, index) => {
        console.log(`    ${index + 1}. ${match.substring(0, 50)}${match.length > 50 ? '...' : ''}`);
      });
      if (attrMatches.length > 3) {
        console.log(`    ... 还有 ${attrMatches.length - 3} 个`);
      }
    } else {
      console.log('  - 未发现包含中文的属性');
    }
    
    // 检查可能的错误信息
    console.log('\n--- 错误信息检查 ---');
    const errorPatterns = [
      { pattern: /\b(error|exception|fault|fail)\b/i, name: '错误相关词汇' },
      { pattern: /null|undefined/i, name: '空值相关词汇' },
      { pattern: /missing|invalid/i, name: '无效相关词汇' }
    ];
    
    let hasErrors = false;
    errorPatterns.forEach(({ pattern, name }) => {
      const matches = xmlData.match(pattern);
      if (matches) {
        console.log(`  ⚠ 发现${name}: ${matches.length} 处`);
        hasErrors = true;
      }
    });
    
    if (!hasErrors) {
      console.log('  ✓ 未发现明显错误信息');
    }
    
    // 检查XML格式问题
    console.log('\n--- XML格式问题检查 ---');
    
    // 检查未闭合的标签
    const openTags = xmlData.match(/<[^\/>]+>/g) || [];
    const closeTags = xmlData.match(/<\/[^>]+>/g) || [];
    
    // 简单统计（不完全准确，但对于检测明显问题有帮助）
    console.log(`  开标签数量: ${openTags.length}`);
    console.log(`  闭标签数量: ${closeTags.length}`);
    
    if (Math.abs(openTags.length - closeTags.length) > 5) {
      console.log('  ⚠ 开标签和闭标签数量差异较大，可能存在未闭合标签');
    } else {
      console.log('  ✓ 开标签和闭标签数量基本匹配');
    }
    
    // 检查特殊字符
    console.log('\n--- 特殊字符检查 ---');
    const specialChars = [
      { pattern: /&(?![a-zA-Z#])/g, name: '未转义的&符号' },
      { pattern: /</g, name: '可能未转义的<符号' },
      { pattern: />/g, name: '可能未转义的>符号' }
    ];
    
    let hasSpecialCharIssues = false;
    specialChars.forEach(({ pattern, name }) => {
      // 只在非标签内的文本中检查
      const textOnly = xmlData.replace(/<[^>]*>/g, '');
      const matches = textOnly.match(pattern);
      if (matches) {
        console.log(`  ⚠ 发现${name}: ${matches.length} 处`);
        hasSpecialCharIssues = true;
      }
    });
    
    if (!hasSpecialCharIssues) {
      console.log('  ✓ 未发现明显特殊字符问题');
    }
    
    console.log('\n✓ 文件内容检查完成');
    
  } catch (error) {
    console.error(`✗ 检查文件 ${fileName} 时出错:`, error.message);
  }
});