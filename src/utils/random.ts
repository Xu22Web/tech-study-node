import { Bounds } from './utils';

/**
 * @description 点
 */
export type Point = { x: number; y: number };

/**
 * @description 创建随机点
 * @param bounds 范围
 * @returns
 */
export const createRandomPoint = (bounds: Bounds): Point => {
  // 范围
  const { x, y, width, height } = bounds;
  // 横坐标
  const randX = x + Math.random() * width * 0.5 + width * 0.25;
  // 纵坐标
  const randY = y + Math.random() * height * 0.5 + height * 0.25;
  return {
    x: randX,
    y: randY,
  };
};

/**
 * @description 生成随机路径
 * @param start
 * @param end
 * @param steps
 * @returns
 */
export const createRandomPath = (start: Point, end: Point, steps: number) => {
  // 最小水平增量
  const minDeltaX = (end.x - start.x) / steps;
  // 最大垂直增量
  const maxDeltaY = (end.y - start.y) / steps;
  // 路径
  const path: Point[] = [];
  // 开始节点
  path.push(start);
  // 插入点
  for (let i = 0; i < steps; i++) {
    // 横坐标
    const x = path[i].x + Math.random() * 5 + minDeltaX;
    // 纵坐标
    const y =
      path[i].y +
      Math.random() * 5 * Math.pow(-1, ~~(Math.random() * 2 + 1)) +
      maxDeltaY;
    path.push({
      x,
      y,
    });
  }
  return path;
};
