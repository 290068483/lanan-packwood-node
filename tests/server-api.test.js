/**
 * 服务器端API的单元测试
 */

const fs = require('fs');
const path = require('path');
const request = require('supertest');
const { app } = require('../src/ui/server');
const { CustomerStatus } = require('../src/utils/status-manager');

// 模拟配置文件
const mockConfig = {
  basePath: {
    workspace: "c:/Users/Administrator/Desktop/pack-node-1.0",
    projectStorage: "C:/Program Files (x86)/MPM/temp/local"
  },
  sourcePath: "//A6/蓝岸文件/1、客户总文件/3、生产/1、正单",
  localPath: "C:/Program Files (x86)/MPM/temp/local",
  networkPath: "//c1/mpm/temp/local/test",
  targetFileName: "打包明细.xlsx",
  workerPackagesPath: "D:/backup_data/backup/worker",
  customerPackedPath: "D:/backup_data/backup/customer"
};

// 模拟客户数据
const mockCustomerData = {
  name: "测试客户",
  panels: [
    { id: "part1" },
    { id: "part2" },
    { id: "part3" }
  ],
  status: CustomerStatus.UNPACKED,
  statusHistory: [
    {
      status: CustomerStatus.UNPACKED,
      timestamp: "2023-01-01 10:00:00",
      operator: "系统",
      remark: "初始状态"
    }
  ],
  lastStatusUpdate: "2023-01-01 10:00:00"
};

// 模拟packages.json数据
const mockPackagesData = [
  {
    packSeq: "1",
    packNo: "1110953111252",
    packDate: "2023-01-01 10:52:30",
    partIDs: ["part1", "part2"]
  },
  {
    packSeq: "2",
    packNo: "1110953111253",
    packDate: "2023-01-01 11:00:00",
    partIDs: ["part3"]
  }
];

describe('服务器端API测试', () => {
  // 模拟配置文件和客户数据
  beforeAll(() => {
    // 创建测试目录
    const testDir = path.join(__dirname, 'test-data');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir);
    }

    // 创建测试客户目录
    const customerDir = path.join(testDir, '250901_测试客户#');
    if (!fs.existsSync(customerDir)) {
      fs.mkdirSync(customerDir);
    }

    // 写入模拟配置文件
    const configPath = path.join(__dirname, '../config.json');
    fs.writeFileSync(configPath, JSON.stringify(mockConfig, null, 2));

    // 写入模拟客户数据
    const customerDataPath = path.join(customerDir, 'customer.json');
    fs.writeFileSync(customerDataPath, JSON.stringify(mockCustomerData, null, 2));

    // 写入模拟packages.json数据
    const packagesPath = path.join(customerDir, 'packages.json');
    fs.writeFileSync(packagesPath, JSON.stringify(mockPackagesData, null, 2));
  });

  // 清理测试数据
  afterAll(() => {
    const testDir = path.join(__dirname, 'test-data');
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }

    // 恢复原始配置文件（如果存在）
    const configPath = path.join(__dirname, '../config.json');
    if (fs.existsSync(configPath + '.bak')) {
      fs.renameSync(configPath + '.bak', configPath);
    }
  });

  // 测试检查客户状态API
  test('检查客户状态API应该返回正确的状态信息', async () => {
    const response = await request(app)
      .post('/api/customers/测试客户/check-status')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.status).toBe(CustomerStatus.PACKED);
    expect(response.body.packProgress).toBe(100);
    expect(response.body.packedCount).toBe(3);
    expect(response.body.totalParts).toBe(3);
    expect(response.body.packSeqs).toEqual(['1', '2']);
    expect(response.body.statusHistory).toHaveLength(2);
  });

  // 测试归档客户API
  test('归档客户API应该成功归档已打包的客户', async () => {
    // 首先将客户状态设置为已打包
    const customerDir = path.join(__dirname, 'test-data/250901_测试客户#');
    const customerDataPath = path.join(customerDir, 'customer.json');
    const customerData = JSON.parse(fs.readFileSync(customerDataPath, 'utf8'));
    customerData.status = CustomerStatus.PACKED;
    fs.writeFileSync(customerDataPath, JSON.stringify(customerData, null, 2));

    const response = await request(app)
      .post('/api/customers/测试客户/archive')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.status).toBe(CustomerStatus.ARCHIVED);

    // 验证客户数据是否已更新
    const updatedCustomerData = JSON.parse(fs.readFileSync(customerDataPath, 'utf8'));
    expect(updatedCustomerData.status).toBe(CustomerStatus.ARCHIVED);
    expect(updatedCustomerData.archiveDate).toBeDefined();
  });

  // 测试出货API
  test('出货API应该成功出货已归档的客户', async () => {
    // 首先将客户状态设置为已归档
    const customerDir = path.join(__dirname, 'test-data/250901_测试客户#');
    const customerDataPath = path.join(customerDir, 'customer.json');
    const customerData = JSON.parse(fs.readFileSync(customerDataPath, 'utf8'));
    customerData.status = CustomerStatus.ARCHIVED;
    fs.writeFileSync(customerDataPath, JSON.stringify(customerData, null, 2));

    const response = await request(app)
      .post('/api/customers/测试客户/ship')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.status).toBe(CustomerStatus.SHIPPED);

    // 验证客户数据是否已更新
    const updatedCustomerData = JSON.parse(fs.readFileSync(customerDataPath, 'utf8'));
    expect(updatedCustomerData.status).toBe(CustomerStatus.SHIPPED);
    expect(updatedCustomerData.shipmentDate).toBeDefined();
  });

  // 测试标记为未出货API
  test('标记为未出货API应该成功标记已归档的客户为未出货', async () => {
    // 首先将客户状态设置为已归档
    const customerDir = path.join(__dirname, 'test-data/250901_测试客户#');
    const customerDataPath = path.join(customerDir, 'customer.json');
    const customerData = JSON.parse(fs.readFileSync(customerDataPath, 'utf8'));
    customerData.status = CustomerStatus.ARCHIVED;
    fs.writeFileSync(customerDataPath, JSON.stringify(customerData, null, 2));

    const response = await request(app)
      .post('/api/customers/测试客户/mark-not-shipped')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.status).toBe(CustomerStatus.NOT_SHIPPED);

    // 验证客户数据是否已更新
    const updatedCustomerData = JSON.parse(fs.readFileSync(customerDataPath, 'utf8'));
    expect(updatedCustomerData.status).toBe(CustomerStatus.NOT_SHIPPED);
  });

  // 测试获取客户详细信息API
  test('获取客户详细信息API应该返回正确的客户信息', async () => {
    const response = await request(app)
      .get('/api/customers/测试客户/details')
      .expect(200);

    expect(response.body.name).toBe('测试客户');
    expect(response.body.status).toBeDefined();
    expect(response.body.packProgress).toBeDefined();
    expect(response.body.packSeqs).toBeDefined();
    expect(response.body.lastUpdate).toBeDefined();
  });
});
