const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { logInfo, logError, logWarning, logSuccess } = require('../utils/logger');
const customerStatusManager = require('../utils/customer-status-manager');
const PackageDataExtractor = require('../utils/package-data-extractor');
const DataManager = require('../utils/data-manager');

/**
 * 检查客户打包状态
 * POST /api/customers/:id/check-status
 */
router.post('/:id/check-status', async (req, res) => {
  try {
    const customerName = req.params.id;
    console.log(`检查客户状态: ${customerName}`);

    // 从数据管理器获取客户数据
    const customerData = await DataManager.getCustomer(customerName);
    if (!customerData) {
      return res.status(404).json({
        success: false,
        message: '客户不存在'
      });
    }

    // 获取packages.json文件路径
    const packagesPath = path.join(customerData.outputPath, 'packages.json');

    // 读取packages.json数据
    let packagesData = [];
    if (fs.existsSync(packagesPath)) {
      packagesData = PackageDataExtractor.extractCustomerPackageData(packagesPath);
    }

    // 检查客户状态
    const statusInfo = customerStatusManager.checkPackStatus(customerData, packagesData);

    // 更新客户状态
    const updatedData = customerStatusManager.updateCustomerStatus(
      customerData, 
      statusInfo, 
      req.user ? req.user.name : 'API',
      'API检查状态'
    );

    // 保存更新后的数据
    await DataManager.upsertCustomer(updatedData);

    logSuccess(customerName, 'API', `状态检查完成: ${statusInfo.status} (${statusInfo.packProgress}%)`);

    return res.json({
      success: true,
      status: statusInfo.status,
      packedCount: statusInfo.packedCount,
      totalParts: statusInfo.totalParts,
      packProgress: statusInfo.packProgress,
      packSeqs: statusInfo.packSeqs,
      timestamp: statusInfo.timestamp
    });
  } catch (error) {
    logError(customerName, 'API', `状态检查失败: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * 归档客户
 * POST /api/customers/:id/archive
 */
router.post('/:id/archive', async (req, res) => {
  try {
    const customerName = req.params.id;
    console.log(`归档客户: ${customerName}`);

    // 从数据管理器获取客户数据
    const customerData = await DataManager.getCustomer(customerName);
    if (!customerData) {
      return res.status(404).json({
        success: false,
        message: '客户不存在'
      });
    }

    // 检查客户状态是否为已打包
    if (customerData.status !== customerStatusManager.STATUS.PACKED) {
      return res.status(400).json({
        success: false,
        message: `只有已打包的客户才能进行归档，当前状态: ${customerData.status}`
      });
    }

    // 归档客户
    const updatedData = customerStatusManager.archiveCustomer(
      customerData,
      req.user ? req.user.name : 'API',
      req.body.remark || 'API归档'
    );

    // 保存更新后的数据
    await DataManager.upsertCustomer(updatedData);

    logSuccess(customerName, 'API', '客户归档成功');

    return res.json({
      success: true,
      status: updatedData.status,
      archiveDate: updatedData.archiveDate,
      message: '客户归档成功'
    });
  } catch (error) {
    logError(customerName, 'API', `客户归档失败: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * 出货客户
 * POST /api/customers/:id/ship
 */
router.post('/:id/ship', async (req, res) => {
  try {
    const customerName = req.params.id;
    console.log(`出货客户: ${customerName}`);

    // 从数据管理器获取客户数据
    const customerData = await DataManager.getCustomer(customerName);
    if (!customerData) {
      return res.status(404).json({
        success: false,
        message: '客户不存在'
      });
    }

    // 检查客户状态是否为已打包或正在处理
    if (customerData.status !== customerStatusManager.STATUS.PACKED && 
        customerData.status !== customerStatusManager.STATUS.IN_PROGRESS) {
      return res.status(400).json({
        success: false,
        message: `只有已打包或正在处理的客户才能进行出货，当前状态: ${customerData.status}`
      });
    }

    // 出货客户
    const updatedData = customerStatusManager.shipCustomer(
      customerData,
      req.user ? req.user.name : 'API',
      req.body.remark || 'API出货'
    );

    // 保存更新后的数据
    await DataManager.upsertCustomer(updatedData);

    logSuccess(customerName, 'API', '客户出货成功');

    return res.json({
      success: true,
      status: updatedData.status,
      shipmentDate: updatedData.shipmentDate,
      message: '客户出货成功'
    });
  } catch (error) {
    logError(customerName, 'API', `客户出货失败: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * 部分出货客户
 * POST /api/customers/:id/partial-ship
 */
router.post('/:id/partial-ship', async (req, res) => {
  try {
    const customerName = req.params.id;
    console.log(`部分出货客户: ${customerName}`);

    // 从数据管理器获取客户数据
    const customerData = await DataManager.getCustomer(customerName);
    if (!customerData) {
      return res.status(404).json({
        success: false,
        message: '客户不存在'
      });
    }

    // 检查客户状态是否为已打包或正在处理
    if (customerData.status !== customerStatusManager.STATUS.PACKED && 
        customerData.status !== customerStatusManager.STATUS.IN_PROGRESS) {
      return res.status(400).json({
        success: false,
        message: `只有已打包或正在处理的客户才能进行部分出货，当前状态: ${customerData.status}`
      });
    }

    // 部分出货客户
    const updatedData = customerStatusManager.partialShipCustomer(
      customerData,
      req.user ? req.user.name : 'API',
      req.body.remark || 'API部分出货'
    );

    // 保存更新后的数据
    await DataManager.upsertCustomer(updatedData);

    logSuccess(customerName, 'API', '客户部分出货成功');

    return res.json({
      success: true,
      status: updatedData.status,
      shipmentDate: updatedData.shipmentDate,
      message: '客户部分出货成功'
    });
  } catch (error) {
    logError(customerName, 'API', `客户部分出货失败: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * 标记客户为未出货
 * POST /api/customers/:id/mark-not-shipped
 */
router.post('/:id/mark-not-shipped', async (req, res) => {
  try {
    const customerName = req.params.id;
    console.log(`标记客户为未出货: ${customerName}`);

    // 从数据管理器获取客户数据
    const customerData = await DataManager.getCustomer(customerName);
    if (!customerData) {
      return res.status(404).json({
        success: false,
        message: '客户不存在'
      });
    }

    // 检查客户状态是否为已打包或正在处理
    if (customerData.status !== customerStatusManager.STATUS.PACKED && 
        customerData.status !== customerStatusManager.STATUS.IN_PROGRESS) {
      return res.status(400).json({
        success: false,
        message: `只有已打包或正在处理的客户才能标记为未出货，当前状态: ${customerData.status}`
      });
    }

    // 标记客户为未出货
    const updatedData = customerStatusManager.markCustomerNotShipped(
      customerData,
      req.user ? req.user.name : 'API',
      req.body.remark || 'API标记为未出货'
    );

    // 保存更新后的数据
    await DataManager.upsertCustomer(updatedData);

    logSuccess(customerName, 'API', '客户已标记为未出货');

    return res.json({
      success: true,
      status: updatedData.status,
      message: '客户已标记为未出货'
    });
  } catch (error) {
    logError(customerName, 'API', `客户标记为未出货失败: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * 获取客户状态历史
 * GET /api/customers/:id/status-history
 */
router.get('/:id/status-history', async (req, res) => {
  try {
    const customerName = req.params.id;
    console.log(`获取客户状态历史: ${customerName}`);

    // 从数据管理器获取客户数据
    const customerData = await DataManager.getCustomer(customerName);
    if (!customerData) {
      return res.status(404).json({
        success: false,
        message: '客户不存在'
      });
    }

    // 返回状态历史
    return res.json({
      success: true,
      statusHistory: customerData.statusHistory || []
    });
  } catch (error) {
    logError(customerName, 'API', `获取客户状态历史失败: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;