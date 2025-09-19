const Database = require('../src/database/database');

// 模拟数据库模块
jest.mock('../src/database/database');

describe('数据库归档操作', () => {
  let db;

  beforeAll(async () => {
    // 创建测试数据库连接
    db = Database.getInstance();
    const connection = await db.getConnection();

    // 模拟创建表
    connection.query = jest.fn()
      .mockResolvedValueOnce([{ insertId: 1 }]) // 归档记录插入
      .mockResolvedValueOnce([{ insertId: 1 }]) // 包1插入
      .mockResolvedValueOnce([{ insertId: 2 }]) // 包2插入
      .mockResolvedValueOnce([[]]) // 归档列表查询
      .mockResolvedValueOnce([{ insertId: 1 }]) // 归档详情查询
      .mockResolvedValueOnce([{ total: 10 }]); // 归档总数查询
  });

  afterAll(async () => {
    // 清理测试表
    const connection = await db.getConnection();
    connection.query = jest.fn();
    connection.release();
  });

  describe('归档数据存储', () => {
    it('应成功插入归档数据', async () => {
      const connection = await db.getConnection();

      // 插入客户归档记录
      const [archiveResult] = await connection.query(
        `INSERT INTO customer_archive 
        (customer_name, customer_address, archive_date, backup_path, packages_count, total_parts_count, archive_user, remark) 
        VALUES (?, ?, NOW(), ?, ?, ?, ?, ?)`,
        ['测试客户', '测试地址', 'C:\backup\test.zip', 2, 5, '测试操作员', '测试备注']
      );

      expect(archiveResult.insertId).toBeDefined();

      connection.release();
    });

    it('应成功查询归档数据', async () => {
      const connection = await db.getConnection();

      // 查询归档列表
      const [archives] = await connection.query(
        `SELECT * FROM customer_archive ORDER BY archive_date DESC LIMIT 1`
      );

      expect(archives).toBeDefined();

      connection.release();
    });
  });

  describe('归档数据完整性', () => {
    it('应确保归档数据完整性', async () => {
      // 模拟事务
      const connection = await db.getConnection();
      const transaction = await connection.beginTransaction();

      transaction.commit = jest.fn().mockResolvedValue(true);
      transaction.rollback = jest.fn().mockResolvedValue(true);

      try {
        // 执行归档操作
        await connection.beginTransaction();

        // 插入数据
        await connection.query(`INSERT INTO customer_archive (...) VALUES (...)`);
        await connection.query(`INSERT INTO package_archive (...) VALUES (...)`);

        // 提交事务
        await connection.commit();

        // 验证提交被调用
        expect(transaction.commit).toHaveBeenCalled();
      } catch (error) {
        // 回滚事务
        await connection.rollback();

        // 验证回滚被调用
        expect(transaction.rollback).toHaveBeenCalled();
      }

      connection.release();
    });
  });
});
