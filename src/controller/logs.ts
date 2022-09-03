import fs from 'fs';
import path from 'path';
import ora from 'ora';
import STUDY_CONFIG from '../config/study';
import { formatDate, formatDateTime } from '../utils';

/**
 * @description 日志保存路径
 */
const { logsPath } = STUDY_CONFIG;
/**
 * @description 日志类型
 */
type LogType =
  | 'start'
  | 'finish'
  | 'info'
  | 'warn'
  | 'fail'
  | 'success'
  | 'loading'
  | 'loaded';

/**
 * @description 日志
 */
export class Log {
  /**
   * @description 进度显示
   */
  ora: ora.Ora;
  /**
   * @description 日志
   */
  logs: string[];
  /**
   * @description 启用日志
   */
  enabled: boolean;
  constructor(text?: string) {
    this.ora = ora(text);
    this.logs = [];
    this.enabled = false;
  }
  /**
   * @description 开启日志
   */
  start() {
    // 开启未启用的日志
    if (!this.enabled) {
      // 启用日志
      this.enabled = true;
      this.collect('start', '开启日志!');
    }
  }
  /**
   * @description 等待日志
   * @param text
   */
  loading(text?: string) {
    if (this.enabled && text) {
      this.collect('loading', text);
    }
    this.ora.start(text);
  }
  /**
   * @description 等待完毕日志
   * @param text
   */
  loaded(text?: string) {
    if (this.enabled && text) {
      this.collect('loaded', text);
    }
    this.ora.stop();
  }
  /**
   * @description 通知日志
   * @param text
   */
  info(text?: string) {
    if (this.enabled && text) {
      this.collect('info', text);
    }
    this.ora.info(text);
  }
  /**
   * @description 警告日志
   * @param text
   */
  warn(text?: string) {
    if (this.enabled && text) {
      this.collect('warn', text);
    }
    this.ora.warn(text);
  }
  /**
   * @description 失败日志
   * @param text
   */
  fail(text?: string) {
    if (this.enabled && text) {
      this.collect('fail', text);
    }
    this.ora.fail(text);
  }
  /**
   * @description 成功日志
   * @param text
   */
  success(text?: string) {
    if (this.enabled && text) {
      this.collect('success', text);
    }
    this.ora.succeed(text);
  }
  /**
   * @description 收集日志
   * @param data
   */
  collect(type: LogType, data: string) {
    // 数据文本
    const dataText = this.format(data);
    this.logs.push(`[${formatDateTime()} ${type}] ${dataText}`);
  }
  /**
   * @description 结束日志
   */
  finish() {
    // 关闭启用的日志
    if (this.enabled) {
      // 关闭日志
      this.enabled = false;
      this.collect('finish', '关闭日志!');
      // 当天时间
      const date = new Date();
      // 文件路径
      const filePath = path.join(logsPath, `${formatDate(date)}.log`);
      // 日志数据
      const logsData = this.logs.join('\n');
      // 文件是否存在
      if (fs.existsSync(filePath)) {
        // 追加文件
        fs.appendFileSync(filePath, `\n${logsData}\n`);
        return;
      }
      // 写入文件
      fs.writeFileSync(filePath, logsData);
    }
  }
  /**
   * @description 格式化数据
   * @param data
   * @returns
   */
  format(data: string) {
    return data.trim().replace(/\33\[\d+m/g, '');
  }
  /**
   * @description 清除缓存日志
   */
  clear() {
    // 清除缓存日志
    this.logs = [];
    this.collect('success', '清除缓存日志成功!');
  }
  /**
   * @description 自动删除日志
   */
  autoClean() {
    // 文件
    fs.readdir(logsPath, (err, files) => {
      if (err) {
        return;
      }
      // 存在文件
      if (files.length) {
        for (const i in files) {
          // 文件名
          const fileName = files[i];
          // 获取后缀
          const extname = path.extname(fileName);
          if (extname === '.log') {
            // 获取日志时间
            const fileDate = fileName.substring(0, fileName.lastIndexOf('.'));
            // 过去日期
            const oldDate = new Date(fileDate);
            // 当前时间
            const newDate = new Date();
            // 相差天数
            const days =
              (newDate.getTime() - oldDate.getTime()) / 1000 / 60 / 60 / 24;
            // 相差超过间隔
            if (days >= STUDY_CONFIG.logsAutoCleanInterval) {
              // 日志文件路径
              const filePath = path.join(logsPath, fileName);
              // 删除日志
              fs.unlink(filePath, () => {
                this.start();
                this.success(`日志: ${fileName}, 删除日志成功!`);
                this.finish();
              });
            }
          }
        }
      }
    });
  }
}

/**
 * @description 日志
 * @param text
 * @returns
 */
export const log = (text?: string) => {
  return new Log(text);
};
