const readline = require('readline');
const DataManager = require('../utils/data-manager');
const MainUI = require('./main-ui');

class CLIInterface {
  constructor() {
    this.ui = new MainUI();
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    // 标记是否为自动输入模式
    this.isAutoInput = !process.stdin.isTTY;

    // 监听输入流的关闭事件
    this.rl.on('close', () => {
      if (!this.isAutoInput) {
        console.log('\n感谢使用，再见！');
      }
      process.exit(0);
    });
  }

  start() {
    console.log('=== 客户数据打包管理系统 ===');
    this.showMenu();
  }

  showMenu() {
    // 检查readline是否已经关闭
    if (this.rl.closed) {
      return;
    }

    console.log('\n请选择操作:');
    console.log('1. 选择源地址');
    console.log('2. 选择输出地址');
    console.log('3. 选择保存客户打包地址');
    console.log('4. 选择保存工人打包地址');
    console.log('5. 查看保存的数据地址');
    // 这个默认显示的，还有这个必要给个选择按钮吗？
    console.log('6. 显示客户信息表格');
    console.log('0. 退出');

    // 如果是自动输入模式且stdin已结束，则直接退出
    if (this.isAutoInput && process.stdin.readableEnded) {
      this.rl.close();
      return;
    }

    this.rl.question('请输入选项编号: ', answer => {
      this.handleMenuSelection(answer);
    });
  }

  handleMenuSelection(choice) {
    // 检查readline是否已经关闭
    if (this.rl.closed) {
      return;
    }

    switch (choice) {
      case '1':
        this.ui.selectSourceDirectory();
        break;
      case '2':
        this.ui.selectOutputDirectory();
        break;
      case '3':
        this.ui.autoSaveCustomerData();
        break;
      case '4':
        this.ui.autoSaveWorkerData();
        break;
      case '5':
        this.ui.viewAutoSavedData();
        break;
      case '6':
        this.ui.loadCustomers();
        this.ui.showCustomerTable();
        break;
      case '0':
        if (!this.isAutoInput) {
          console.log('感谢使用，再见！');
        }
        this.rl.close();
        return;
      default:
        console.log('无效选项，请重新选择');
    }

    // 返回主菜单（仅在非自动输入模式下）
    if (!this.isAutoInput) {
      setTimeout(() => {
        // 再次检查readline是否已经关闭
        if (!this.rl.closed) {
          this.showMenu();
        }
      }, 1000);
    } else {
      // 自动输入模式下直接退出
      this.rl.close();
    }
  }
}

module.exports = CLIInterface;
