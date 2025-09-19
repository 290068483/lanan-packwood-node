/**
 * 归档历史页面
 * 提供归档数据的查看、搜索和恢复功能
 */

document.addEventListener('DOMContentLoaded', () => {
  // 添加归档历史菜单项点击事件
  const archiveHistoryNav = document.getElementById('archive-history-nav');
  if (archiveHistoryNav) {
    archiveHistoryNav.addEventListener('click', e => {
      e.preventDefault();
      showArchiveHistory();
    });
  }
});

/**
 * 显示归档历史页面
 * @param {number} page - 页码
 * @param {number} pageSize - 每页数量
 */
function showArchiveHistory(page = 1, pageSize = 20) {
  // 创建模态框
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.display = 'block';

  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>归档历史</h2>
        <span class="close">&times;</span>
      </div>
      <div class="modal-body">
        <!-- 搜索区域 -->
        <div class="search-area">
          <div class="search-row">
            <label>客户名称:</label>
            <input type="text" id="archive-customer-name" class="search-input">
          </div>
          <div class="search-row">
            <label>归档日期:</label>
            <input type="date" id="archive-start-date" class="search-input">
            <span>至</span>
            <input type="date" id="archive-end-date" class="search-input">
          </div>
          <div class="search-row">
            <label>操作员:</label>
            <select id="archive-operator" class="search-select">
              <option value="">全部</option>
              <option value="admin">admin</option>
              <option value="user1">user1</option>
              <option value="user2">user2</option>
            </select>
          </div>
          <div class="search-row">
            <button id="search-archive-btn" class="btn btn-primary">搜索</button>
          </div>
        </div>

        <!-- 数据表格 -->
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>客户名称</th>
                <th>归档日期</th>
                <th>包数量</th>
                <th>板件总数</th>
                <th>操作员</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody id="archive-list-tbody">
              <!-- 数据将通过JavaScript动态加载 -->
            </tbody>
          </table>
        </div>

        <!-- 分页控件 -->
        <div class="pagination-container">
          <div class="pagination-info">
            显示第 <span id="page-start">1</span> 至 <span id="page-end">20</span> 条，共 <span id="total-records">0</span> 条记录
          </div>
          <div class="pagination-controls">
            <button id="prev-page-btn" class="btn btn-secondary">上一页</button>
            <div class="page-numbers" id="page-numbers">
              <!-- 页码将通过JavaScript动态生成 -->
            </div>
            <button id="next-page-btn" class="btn btn-secondary">下一页</button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // 关闭按钮事件
  modal.querySelector('.close').addEventListener('click', () => {
    modal.remove();
  });

  // 点击模态框外部关闭
  window.addEventListener('click', event => {
    if (event.target === modal) {
      modal.remove();
    }
  });

  // 加载归档列表数据
  loadArchiveList(page, pageSize);

  // 搜索按钮事件
  document
    .getElementById('search-archive-btn')
    .addEventListener('click', () => {
      const customerName = document.getElementById(
        'archive-customer-name'
      ).value;
      const startDate = document.getElementById('archive-start-date').value;
      const endDate = document.getElementById('archive-end-date').value;
      const operator = document.getElementById('archive-operator').value;

      // 执行搜索
      searchArchives(customerName, startDate, endDate, operator, 1, pageSize);
    });

  // 分页按钮事件
  document.getElementById('prev-page-btn').addEventListener('click', () => {
    if (page > 1) {
      loadArchiveList(page - 1, pageSize);
    }
  });

  document.getElementById('next-page-btn').addEventListener('click', () => {
    loadArchiveList(page + 1, pageSize);
  });
}

/**
 * 加载归档列表数据
 * @param {number} page - 页码
 * @param {number} pageSize - 每页数量
 */
async function loadArchiveList(page = 1, pageSize = 20) {
  try {
    const response = await window.electronAPI.getArchiveList(page, pageSize);
    if (response.success) {
      const {
        data: archives,
        total,
        currentPage,
        pageSize: currentPageSize,
      } = response;

      // 更新表格数据
      const tbody = document.getElementById('archive-list-tbody');
      tbody.innerHTML = '';

      if (archives.length === 0) {
        tbody.innerHTML =
          '<tr><td colspan="6" class="no-data">暂无归档数据</td></tr>';
      } else {
        archives.forEach(archive => {
          const row = document.createElement('tr');
          row.innerHTML = `
            <td>${archive.customer_name}</td>
            <td>${formatDate(archive.archive_date)}</td>
            <td>${archive.packages_count || 0}</td>
            <td>${archive.total_parts_count || 0}</td>
            <td>${archive.archive_user}</td>
            <td>
              <button class="btn btn-info view-archive-btn" data-id="${
                archive.id
              }">查看详情</button>
              <button class="btn btn-warning restore-archive-btn" data-id="${
                archive.id
              }">恢复</button>
            </td>
          `;
          tbody.appendChild(row);

          // 添加查看详情按钮事件
          document.querySelectorAll('.view-archive-btn').forEach(btn => {
            btn.addEventListener('click', () => {
              const archiveId = btn.getAttribute('data-id');
              showArchiveDetail(archiveId);
            });
          });

          // 添加恢复按钮事件
          document.querySelectorAll('.restore-archive-btn').forEach(btn => {
            btn.addEventListener('click', () => {
              const archiveId = btn.getAttribute('data-id');
              confirmRestoreArchive(archiveId);
            });
          });
        });

        // 更新分页控件
        updatePagination(total, currentPage, currentPageSize);
      }
    } else {
      alert(response.message);
    }
  } catch (error) {
    alert(`加载归档列表失败: ${error.message}`);
  }
}

/**
 * 搜索归档
 * @param {string} customerName - 客户名称
 * @param {string} startDate - 开始日期
 * @param {string} endDate - 结束日期
 * @param {string} operator - 操作员
 * @param {number} page - 页码
 * @param {number} pageSize - 每页数量
 */
async function searchArchives(
  customerName,
  startDate,
  endDate,
  operator,
  page,
  pageSize
) {
  try {
    const response = await window.electronAPI.searchArchives({
      customerName,
      startDate,
      endDate,
      operator
    });

    if (response.success) {
      const {
        data: archives,
        total,
        currentPage,
        pageSize: currentPageSize,
      } = response;

      // 更新表格数据
      const tbody = document.getElementById('archive-list-tbody');
      tbody.innerHTML = '';

      if (archives.length === 0) {
        tbody.innerHTML =
          '<tr><td colspan="6" class="no-data">暂无归档数据</td></tr>';
      } else {
        archives.forEach(archive => {
          const row = document.createElement('tr');
          row.innerHTML = `
            <td>${archive.customer_name}</td>
            <td>${formatDate(archive.archive_date)}</td>
            <td>${archive.packages_count || 0}</td>
            <td>${archive.total_parts_count || 0}</td>
            <td>${archive.archive_user}</td>
            <td>
              <button class="btn btn-info view-archive-btn" data-id="${
                archive.id
              }">查看详情</button>
              <button class="btn btn-warning restore-archive-btn" data-id="${
                archive.id
              }">恢复</button>
            </td>
          `;
          tbody.appendChild(row);

          // 添加查看详情按钮事件
          document.querySelectorAll('.view-archive-btn').forEach(btn => {
            btn.addEventListener('click', () => {
              const archiveId = btn.getAttribute('data-id');
              showArchiveDetail(archiveId);
            });
          });

          // 添加恢复按钮事件
          document.querySelectorAll('.restore-archive-btn').forEach(btn => {
            btn.addEventListener('click', () => {
              const archiveId = btn.getAttribute('data-id');
              confirmRestoreArchive(archiveId);
            });
          });
        });

        // 更新分页控件
        updatePagination(total, currentPage, currentPageSize);
      }
    } else {
      alert(response.message);
    }
  } catch (error) {
    alert(`搜索归档失败: ${error.message}`);
  }
}

/**
 * 更新分页控件
 * @param {number} total - 总记录数
 * @param {number} currentPage - 当前页码
 * @param {number} pageSize - 每页数量
 */
function updatePagination(total, currentPage, pageSize) {
  const totalPages = Math.ceil(total / pageSize);
  const startRecord = (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, total);

  document.getElementById('page-start').textContent = startRecord;
  document.getElementById('page-end').textContent = endRecord;
  document.getElementById('total-records').textContent = total;

  // 更新页码按钮
  const pageNumbers = document.getElementById('page-numbers');
  pageNumbers.innerHTML = '';

  // 计算显示的页码范围
  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(totalPages, startPage + 4);

  if (endPage - startPage < 4) {
    startPage = Math.max(1, endPage - 4);
  }

  for (let i = startPage; i <= endPage; i++) {
    const pageBtn = document.createElement('button');
    pageBtn.className = `btn ${
      i === currentPage ? 'btn-primary' : 'btn-secondary'
    }`;
    pageBtn.textContent = i;
    pageBtn.addEventListener('click', () => {
      loadArchiveList(i, pageSize);
    });
    pageNumbers.appendChild(pageBtn);
  }

  // 更新上一页/下一页按钮状态
  document.getElementById('prev-page-btn').disabled = currentPage === 1;
  document.getElementById('next-page-btn').disabled =
    currentPage === totalPages;
}

/**
 * 显示归档详情
 * @param {number} archiveId - 归档ID
 */
async function showArchiveDetail(archiveId) {
  try {
    const response = await window.electronAPI.getArchiveDetail(archiveId);
    if (response.success) {
      const { data: archive } = response;

      // 创建模态框
      const modal = document.createElement('div');
      modal.className = 'modal';
      modal.style.display = 'block';

      modal.innerHTML = `
        <div class="modal-content">
          <div class="modal-header">
            <h2>客户归档详情</h2>
            <span class="close">&times;</span>
          </div>
          <div class="modal-body">
            <!-- 客户基本信息 -->
            <div class="info-section">
              <h3>客户基本信息</h3>
              <div class="info-grid">
                <div class="info-item">
                  <label>客户名称:</label>
                  <span>${archive.customer_name}</span>
                </div>
                <div class="info-item">
                  <label>客户地址:</label>
                  <span>${archive.customer_address || '无'}</span>
                </div>
                <div class="info-item">
                  <label>归档日期:</label>
                  <span>${formatDate(archive.archive_date)}</span>
                </div>
                <div class="info-item">
                  <label>归档操作员:</label>
                  <span>${archive.archive_user}</span>
                </div>
                <div class="info-item">
                  <label>包数量:</label>
                  <span>${archive.packages_count || 0}</span>
                </div>
                <div class="info-item">
                  <label>板件总数:</label>
                  <span>${archive.total_parts_count || 0}</span>
                </div>
                <div class="info-item full-width">
                  <label>备注:</label>
                  <span>${archive.remark || '无'}</span>
                </div>
              </div>
            </div>

            <!-- 包信息列表 -->
            <div class="info-section">
              <h3>包信息列表</h3>
              <div class="table-container">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>包号</th>
                      <th>重量</th>
                      <th>体积</th>
                      <th>创建时间</th>
                      <th>板件列表</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${archive.packages
                      .map(
                        pkg => `
                      <tr>
                        <td>${pkg.pack_seq}</td>
                        <td>${pkg.package_weight || 0}</td>
                        <td>${pkg.package_volume || 0}</td>
                        <td>${formatDate(pkg.created_at)}</td>
                        <td>${pkg.parts.map(p => p.part_id).join(', ')}</td>
                      </tr>
                    `
                      )
                      .join('')}
                  </tbody>
                </table>
              </div>
            </div>

            <!-- 操作按钮 -->
            <div class="action-buttons">
              <button class="btn btn-primary" id="export-excel-btn">导出Excel</button>
              <button class="btn btn-primary" id="export-pdf-btn">导出PDF</button>
              <button class="btn btn-secondary" id="close-detail-btn">关闭</button>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      // 关闭按钮事件
      modal.querySelector('.close').addEventListener('click', () => {
        modal.remove();
      });

      document
        .getElementById('close-detail-btn')
        .addEventListener('click', () => {
          modal.remove();
        });

      // 导出Excel按钮事件
      document
        .getElementById('export-excel-btn')
        .addEventListener('click', () => {
          exportArchiveToExcel(archive);
        });

      // 导出PDF按钮事件
      document
        .getElementById('export-pdf-btn')
        .addEventListener('click', () => {
          exportArchiveToPDF(archive);
        });
    } else {
      alert(response.message);
    }
  } catch (error) {
    alert(`获取归档详情失败: ${error.message}`);
  }
}

/**
 * 确认恢复归档
 * @param {number} archiveId - 归档ID
 */
function confirmRestoreArchive(archiveId) {
  // 创建确认对话框
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.display = 'block';

  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>确认恢复归档</h2>
        <span class="close">&times;</span>
      </div>
      <div class="modal-body">
        <p>您确定要恢复该归档数据吗？</p>
        <p>恢复后，系统将：</p>
        <ul>
          <li>将备份文件解压到输出目录</li>
          <li>从数据库恢复客户状态</li>
          <li>刷新客户列表</li>
        </ul>
        <div class="modal-buttons">
          <button id="confirm-restore-btn" class="btn btn-primary">确认恢复</button>
          <button id="cancel-restore-btn" class="btn btn-secondary">取消</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // 关闭按钮事件
  modal.querySelector('.close').addEventListener('click', () => {
    modal.remove();
  });

  // 取消按钮事件
  document
    .getElementById('cancel-restore-btn')
    .addEventListener('click', () => {
      modal.remove();
    });

  // 确认按钮事件
  document
    .getElementById('confirm-restore-btn')
    .addEventListener('click', async () => {
      modal.remove();

      try {
        const response = await window.electronAPI.restoreArchive(archiveId);
        if (response.success) {
          alert(response.message);
          // 刷新归档列表
          loadArchiveList();
        } else {
          alert(response.message);
        }
      } catch (error) {
        alert(`恢复归档失败: ${error.message}`);
      }
    });
}

/**
 * 导出归档数据到Excel
 * @param {Object} archive - 归档数据
 */
async function exportArchiveToExcel(archive) {
  try {
    const response = await window.electronAPI.exportArchiveToExcel(archive.id);
    if (response.success) {
      alert(`Excel文件已导出到: ${response.filePath}`);
    } else {
      alert(response.message);
    }
  } catch (error) {
    alert(`导出Excel失败: ${error.message}`);
  }
}

/**
 * 导出归档数据到PDF
 * @param {Object} archive - 归档数据
 */
async function exportArchiveToPDF(archive) {
  try {
    const response = await window.electronAPI.exportArchiveToPDF(archive.id);
    if (response.success) {
      alert(`PDF文件已导出到: ${response.filePath}`);
    } else {
      alert(response.message);
    }
  } catch (error) {
    alert(`导出PDF失败: ${error.message}`);
  }
}

/**
 * 格式化日期
 * @param {string} dateString - 日期字符串
 * @returns {string} 格式化后的日期字符串
 */
function formatDate(dateString) {
  if (!dateString) return '';

  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}
