import fs from 'fs';
import ora from 'ora';
import path from 'path';
import STUDY_CONFIG from '../config/study';
import { formatDate, formatDateTime } from './fomat';

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
   * @example true 启用 false 禁用
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
  loading(text?: string | string[]) {
    if (this.enabled && text) {
      let textFormat: string;
      // 数组
      if (Array.isArray(text)) {
        textFormat = text.join('\n');
      } else {
        textFormat = text;
      }
      this.ora.prefixText = `[${formatDateTime()}]`;
      this.ora.start(textFormat);
      this.collect('loading', text);
    }
  }
  /**
   * @description 等待完毕日志
   * @param text
   */
  loaded(text?: string | string[]) {
    if (this.enabled && text) {
      let textFormat: string;
      // 数组
      if (Array.isArray(text)) {
        textFormat = text.join('\n');
      } else {
        textFormat = text;
      }
      this.collect('loaded', textFormat);
    }
    this.ora.stop();
  }
  /**
   * @description 通知日志
   * @param text
   */
  info(text?: string | string[]) {
    if (this.enabled && text) {
      let textFormat: string;
      // 数组
      if (Array.isArray(text)) {
        textFormat = text.join('\n');
      } else {
        textFormat = text;
      }
      this.ora.prefixText = `[${formatDateTime()}]`;
      this.ora.info(textFormat);
      this.collect('info', text);
    }
  }
  /**
   * @description 警告日志
   * @param text
   */
  warn(text?: string | string[]) {
    if (this.enabled && text) {
      let textFormat: string;
      // 数组
      if (Array.isArray(text)) {
        textFormat = text.join('\n');
      } else {
        textFormat = text;
      }
      this.ora.prefixText = `[${formatDateTime()}]`;
      this.ora.warn(textFormat);
      this.collect('warn', text);
    }
  }
  /**
   * @description 失败日志
   * @param text
   */
  fail(text?: string | string[]) {
    if (this.enabled && text) {
      let textFormat: string;
      // 数组
      if (Array.isArray(text)) {
        textFormat = text.join('\n');
      } else {
        textFormat = text;
      }
      this.ora.prefixText = `[${formatDateTime()}]`;
      this.ora.fail(textFormat);
      this.collect('fail', text);
    }
  }
  /**
   * @description 成功日志
   * @param text
   */
  success(text?: string | string[]) {
    if (this.enabled && text) {
      let textFormat: string;
      // 数组
      if (Array.isArray(text)) {
        textFormat = text.join('\n');
      } else {
        textFormat = text;
      }
      this.ora.prefixText = `[${formatDateTime()}]`;
      this.ora.succeed(textFormat);
      this.collect('success', text);
    }
  }
  /**
   * @description 收集日志
   * @param data
   */
  collect(type: LogType, data: string | string[]) {
    // 数组
    if (Array.isArray(data)) {
      // 数据文本
      const dataText = this.format(data.join('\n'));
      this.logs.push(`[${formatDateTime()} ${type}] ${dataText}`);
      return;
    }
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
      this.collect('finish', '关闭日志!');
      // 关闭日志
      this.enabled = false;
      // 文件路径
      const filePath = path.join(logsPath, `${formatDate()}.log`);
      // 日志数据
      const logsData = this.logs.join('\n');
      try {
        // 文件是否存在
        if (fs.existsSync(filePath)) {
          // 追加文件
          fs.appendFileSync(filePath, `\n\n${logsData}`);
        } else {
          // 日志文件夹不存在
          if (!fs.existsSync(logsPath)) {
            // 创建路径
            fs.mkdirSync(logsPath);
          }
          // 写入文件
          fs.writeFileSync(filePath, logsData);
        }
        console.log(`日志文件保存路径: ${filePath}`);
        // 清除缓存日志
        this.clear();
      } catch (e: any) {
        // 错误
        const err = new Error(e);
        console.log('日志写入失败!', err.message, err.stack || 'unkown stack');
      }
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
  }
  /**
   * @description 自动删除日志
   */
  autoClean() {
    // 文件
    fs.readdir(logsPath, (err, files) => {
      // 错误
      if (err) {
        return;
      }
      // 存在文件
      if (files.length) {
        // 遍历文件
        for (const i in files) {
          // 文件名
          const fileName = files[i];
          // 获取后缀
          const extname = path.extname(fileName);
          if (extname === '.log') {
            // 日志文件路径
            const filePath = path.join(logsPath, fileName);
            // 文件信息
            const fileInfo = fs.statSync(filePath);
            // 获取日志时间
            const logDate = new Date(formatDate(fileInfo.mtime));
            // 当前时间
            const nowDate = new Date(formatDate());
            // 相差天数
            const days =
              (nowDate.getTime() - logDate.getTime()) / 1000 / 60 / 60 / 24;
            // 相差超过间隔
            if (days >= STUDY_CONFIG.logsAutoCleanInterval) {
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
