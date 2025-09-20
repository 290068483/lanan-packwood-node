const fs = require('fs');
const path = require('path');

// Mock fs module
jest.mock('fs');

// Test data directory
const testDataDir = path.join(__dirname, '../src/data');
const testReplacementsPath = path.join(testDataDir, 'replacements.json');

// Mock data
const mockReplacementData = [
  {
    id: 1,
    customerId: 'customer1',
    customerName: '客户1',
    replacementType: 'partial',
    status: 'pending',
    parts: [{ id: 'part1', quantity: 1 }],
    originalShipmentId: 'ship1',
    reason: '测试原因',
    createdAt: '2023-01-01T00:00:00.000Z',
    updatedAt: '2023-01-01T00:00:00.000Z',
    completedAt: null,
    xmlFilePath: '/path/to/file.xml'
  }
];

describe('ReplacementModel', () => {
  let replacementModel;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Setup fs mock default behavior
    fs.existsSync.mockImplementation((filePath) => {
      if (filePath === testDataDir) return true;
      if (filePath === testReplacementsPath) return true;
      return false;
    });
    
    fs.readFileSync.mockImplementation((filePath) => {
      if (filePath === testReplacementsPath) {
        return JSON.stringify(mockReplacementData);
      }
      return '[]';
    });
    
    fs.writeFileSync.mockImplementation(() => {});
    
    // Load the module after mocks are set up
    jest.isolateModules(() => {
      replacementModel = require('../src/database/models/replacement');
    });
  });

  describe('createReplacement', () => {
    test('应该创建新的补件记录', async () => {
      const newReplacement = {
        customerId: 'customer2',
        customerName: '客户2',
        replacementType: 'full',
        parts: [],
        originalShipmentId: 'ship2',
        reason: '测试创建'
      };

      fs.readFileSync.mockReturnValueOnce(JSON.stringify(mockReplacementData));
      
      const result = await replacementModel.createReplacement(newReplacement);
      
      expect(result).toBeDefined();
      expect(result.id).toBe(2); // Next ID after mock data
      expect(result.customerId).toBe('customer2');
      expect(result.status).toBe('pending');
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });
  });

  describe('getReplacementById', () => {
    test('应该根据ID获取补件记录', async () => {
      fs.readFileSync.mockReturnValueOnce(JSON.stringify(mockReplacementData));
      
      const result = await replacementModel.getReplacementById(1);
      
      expect(result).toBeDefined();
      expect(result.id).toBe(1);
      expect(result.customerId).toBe('customer1');
    });

    test('应该返回null当记录不存在时', async () => {
      fs.readFileSync.mockReturnValueOnce(JSON.stringify(mockReplacementData));
      
      const result = await replacementModel.getReplacementById(999);
      
      expect(result).toBeNull();
    });
  });

  describe('getReplacementsByCustomerId', () => {
    test('应该根据客户ID获取补件记录', async () => {
      fs.readFileSync.mockReturnValueOnce(JSON.stringify(mockReplacementData));
      
      const result = await replacementModel.getReplacementsByCustomerId('customer1');
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0].customerId).toBe('customer1');
    });
  });

  describe('getAllReplacements', () => {
    test('应该获取所有补件记录', async () => {
      fs.readFileSync.mockReturnValueOnce(JSON.stringify(mockReplacementData));
      
      const result = await replacementModel.getAllReplacements();
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
    });
  });

  describe('updateReplacement', () => {
    test('应该更新补件记录', async () => {
      const updateData = {
        status: 'completed',
        completedAt: '2023-01-02T00:00:00.000Z'
      };

      fs.readFileSync.mockReturnValueOnce(JSON.stringify(mockReplacementData));
      fs.writeFileSync.mockImplementation(() => {});
      
      const result = await replacementModel.updateReplacement(1, updateData);
      
      expect(result).toBeDefined();
      expect(result.status).toBe('completed');
      expect(result.completedAt).toBe('2023-01-02T00:00:00.000Z');
      expect(result.updatedAt).toBeDefined();
    });

    test('应该返回null当记录不存在时', async () => {
      fs.readFileSync.mockReturnValueOnce(JSON.stringify(mockReplacementData));
      
      const result = await replacementModel.updateReplacement(999, { status: 'completed' });
      
      expect(result).toBeNull();
    });
  });

  describe('deleteReplacement', () => {
    test('应该删除补件记录', async () => {
      fs.readFileSync.mockReturnValueOnce(JSON.stringify(mockReplacementData));
      fs.writeFileSync.mockImplementation(() => {});
      
      const result = await replacementModel.deleteReplacement(1);
      
      expect(result).toBe(true);
    });

    test('应该返回false当记录不存在时', async () => {
      fs.readFileSync.mockReturnValueOnce(JSON.stringify(mockReplacementData));
      
      const result = await replacementModel.deleteReplacement(999);
      
      expect(result).toBe(false);
    });
  });
});