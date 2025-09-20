const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { logInfo, logError, logWarning, logSuccess } = require('../utils/logger');
const { updateReplacementStatus } = require('../utils/replacement-manager');
const { generateReplacementXML } = require('../utils/replacement-xml-generator');
const { createReplacement, getReplacementsByCustomerId, updateReplacement } = require('../database/models/replacement');
const DataManager = require('../utils/data-manager');

/**
 * 标记客户补件状态
 * POST /api/replacement/:id/mark
 */
router.post('/:id/mark', async (req, res) => {
  try {
    const customerId = req.params.id;
    const { replacementStatus, reason } = req.body;
    const operator = req.user ? req.user.name : 'API';

    // 从数据管理器获取客户数据
    const customerData = await DataManager.getCustomerById(customerId);
    if (!customerData) {
      return res.status(404).json({
        success: false,
        message: '客户不存在'
      });
    }

    // 更新补件状态
    const updatedData = updateReplacementStatus(
      customerData,
      replacementStatus,
      operator,
      reason || '标记补件'
    );

    // 保存更新后的数据
    await DataManager.upsertCustomer(updatedData);

    logSuccess(customerId, 'API', `补件状态更新为: ${replacementStatus}`);

    return res.json({
      success: true,
      message: '补件状态更新成功',
      replacementStatus: updatedData.replacementStatus
    });
  } catch (error) {
    logError(customerId, 'API', `补件状态更新失败: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * 生成补件XML
 * POST /api/replacement/:id/generate-xml
 */
router.post('/:id/generate-xml', async (req, res) => {
  try {
    const customerId = req.params.id;
    const { replacementType, replacementParts, originalShipmentID, reason } = req.body;

    // 从数据管理器获取客户数据
    const customerData = await DataManager.getCustomerById(customerId);
    if (!customerData) {
      return res.status(404).json({
        success: false,
        message: '客户不存在'
      });
    }

    // 生成补件XML
    const result = generateReplacementXML(
      customerData,
      replacementType,
      replacementParts,
      originalShipmentID,
      reason || '生成补件XML'
    );

    // 保存补件记录
    await createReplacement({
      customerId: customerData.id,
      customerName: customerData.name,
      replacementType,
      parts: replacementParts,
      originalShipmentId: originalShipmentID,
      reason: reason || '生成补件XML',
      xmlFilePath: result.filePath
    });

    logSuccess(customerId, 'API', `补件XML生成成功: ${result.filePath}`);

    return res.json({
      success: true,
      message: '补件XML生成成功',
      filePath: result.filePath
    });
  } catch (error) {
    logError(customerId, 'API', `补件XML生成失败: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * 获取客户补件记录
 * GET /api/replacement/:id/history
 */
router.get('/:id/history', async (req, res) => {
  try {
    const customerId = req.params.id;

    // 获取客户补件记录
    const replacements = await getReplacementsByCustomerId(customerId);

    return res.json({
      success: true,
      replacements
    });
  } catch (error) {
    logError(customerId, 'API', `获取补件记录失败: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * 完成补件处理
 * POST /api/replacement/:id/complete
 */
router.post('/:id/complete', async (req, res) => {
  try {
    const customerId = req.params.id;
    const { replacementId, completionNotes } = req.body;
    const operator = req.user ? req.user.name : 'API';

    // 从数据管理器获取客户数据
    const customerData = await DataManager.getCustomerById(customerId);
    if (!customerData) {
      return res.status(404).json({
        success: false,
        message: '客户不存在'
      });
    }

    // 更新补件记录状态
    if (replacementId) {
      await updateReplacement(replacementId, {
        status: 'completed',
        completionNotes: completionNotes || '补件处理完成'
      });
    }

    // 更新客户补件状态为无补件
    const updatedData = updateReplacementStatus(
      customerData,
      'none',
      operator,
      completionNotes || '补件处理完成'
    );

    // 保存更新后的数据
    await DataManager.upsertCustomer(updatedData);

    logSuccess(customerId, 'API', '补件处理完成');

    return res.json({
      success: true,
      message: '补件处理完成',
      replacementStatus: updatedData.replacementStatus
    });
  } catch (error) {
    logError(customerId, 'API', `补件处理完成失败: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;