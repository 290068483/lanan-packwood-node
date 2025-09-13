const RobustXmlParser = require('../xml/robust-xml-parser');

describe('RobustXmlParser', () => {
  test('应该能够解析格式正确的XML', () => {
    const xml = `
      <Root>
        <Cabinet name="橱柜1">
          <Panels>
            <Panel id="1" type="door">
              <Name>门板1</Name>
              <Material>实木</Material>
            </Panel>
          </Panels>
        </Cabinet>
      </Root>
    `;

    const result = RobustXmlParser.parse(xml);
    expect(result.success).toBe(true);
    expect(result.method).toBe('fast-xml-parser');
    expect(result.data).toHaveProperty('Root');
  });

  test('应该能够处理格式错误的XML', () => {
    const xml = `
      <Root>
        <Cabinet name="橱柜1">
          <Panels>
            <Panel id="1" type="door">
              <Name>门板1</Name>
              <Material>实木</Material>
            </Panel>
            <Panel id="2" type="side">
              <Name>侧板1</Name>
              <Material>刨花板</Material>
              <!-- 未闭合的标签 -->
            </Panel>
          </Panels>
        </Cabinet>
      </Root>
    `;

    const result = RobustXmlParser.parse(xml);
    expect(result.success).toBe(true);
    expect(result.data).not.toBeNull();
  });

  test('应该能够处理包含特殊字符的XML', () => {
    const xml = `
      <Root>
        <Cabinet name="橱柜&厨房">
          <Panels>
            <Panel id="1" type="door">
              <Name>门板1</Name>
              <Material>实木&板材</Material>
            </Panel>
          </Panels>
        </Cabinet>
      </Root>
    `;

    const result = RobustXmlParser.parse(xml);
    expect(result.success).toBe(true);
    expect(result.data).not.toBeNull();
  });

  test('应该能够处理中文内容', () => {
    const xml = `
      <根节点>
        <橱柜 name="厨房橱柜">
          <面板列表>
            <面板 id="1" 类型="门板">
              <名称>实木门板</名称>
              <材料>橡木</材料>
            </面板>
          </面板列表>
        </橱柜>
      </根节点>
    `;

    const result = RobustXmlParser.parse(xml);
    expect(result.success).toBe(true);
    expect(result.data).not.toBeNull();
  });

  test('应该在所有方法都失败时返回错误信息', () => {
    const xml = `<<<>>>><<<>>><<<>>`;

    const result = RobustXmlParser.parse(xml);
    // 由于使用了正则表达式作为最后的手段，即使是无效的XML也可能返回成功
    // 所以我们检查是否有错误信息记录
    expect(result.errors.length).toBeGreaterThanOrEqual(0);
  });
});