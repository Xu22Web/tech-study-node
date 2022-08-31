/**
 * @description 点
 */
export type Point = { x: number; y: number };

/**
 * @description 范围
 */
export type Bounds = { x: number; y: number; width: number; height: number };

/**
 * @description 消息模板类型
 */
export type TemplateType =
  | 'html'
  | 'txt'
  | 'json'
  | 'markdown'
  | 'cloudMonitor';

/**
 * @description 推送选项
 */
export type PushOptions = {
  title: string;
  content: string;
  template?: TemplateType;
  to: string;
};

/**
 * @description 模态框
 */
export type ModalOptions = {
  title: string;
  subTitle?: string;
  content: string | string[];
  to?: string;
  from?: string;
  type: ModalType;
};

/**
 * @description 类型
 */
export type ModalType = 'info' | 'warn' | 'fail' | 'success';
