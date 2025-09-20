const fs = require('fs').promises;

// 模拟文件路径
const archiveDataPath = './data/archive.json';
const packageArchiveDataPath = './data/package-archive.json';
const partArchiveDataPath = './data/part-archive.json';

async function test() {
  try {
    // 创建测试数据目录
    await fs.mkdir('./data', { recursive: true });
    
    // 写入测试数据
    const mockArchive = [{
      id: 1,
      customer_name: 'TestCustomer',
      archive_date: '2023-01-01T00:00:00Z'
    }];
    
    const mockPackages = [{
      id: 1,
      archive_id: 1,
      pack_seq: '001'
    }];
    
    const mockParts = [{
      id: 1,
      package_id: 1,
      part_id: 'part1'
    }];
    
    await fs.writeFile(archiveDataPath, JSON.stringify(mockArchive));
    await fs.writeFile(packageArchiveDataPath, JSON.stringify(mockPackages));
    await fs.writeFile(partArchiveDataPath, JSON.stringify(mockParts));
    
    console.log('测试数据已创建');
    
    // 读取数据
    const archiveData = await fs.readFile(archiveDataPath, 'utf8');
    const archives = JSON.parse(archiveData || '[]');
    console.log('归档数据:', archives);
    
    const packageData = await fs.readFile(packageArchiveDataPath, 'utf8');
    const packages = JSON.parse(packageData || '[]');
    console.log('包数据:', packages);
    
    const partData = await fs.readFile(partArchiveDataPath, 'utf8');
    const parts = JSON.parse(partData || '[]');
    console.log('部件数据:', parts);
    
    // 过滤包数据
    const archivePackages = packages.filter(p => p.archive_id === 1);
    console.log('过滤后的包数据:', archivePackages);
    
    // 为每个包添加部件信息
    for (const pkg of archivePackages) {
      pkg.parts = parts.filter(p => p.package_id === pkg.id);
    }
    
    console.log('最终结果:', {
      ...archives[0],
      packages: archivePackages
    });
    
    // 清理测试数据
    await fs.rm('./data', { recursive: true });
    console.log('测试数据已清理');
  } catch (error) {
    console.error('测试出错:', error);
  }
}

test();