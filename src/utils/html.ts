/**
 * @description html进度条
 * @param title
 * @param percent
 * @returns
 */
export const getProgressHTML = (title: string, percent: number) => {
  // html
  const progressHTML = `<div
    style="
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1px 0;
    "
  >
    <span>${title}</span>
    <span>${getHighlightHTML(percent)} %</span>
  </div>
  <div
    style="
      background: white;
      border-radius: 10px;
      height: 10px;
      border: 1px solid #eee;
      flex-shrink: 1;
    "
  >
    <div
      style="
        background: linear-gradient(to left, #188fff80, #1890ff);
        height: 100%;
        width: ${percent}%;
        border-radius: 10px;
      "
    ></div>
  </div>`;
  return progressHTML;
};

/**
 * @description 创建表格
 * @param theadData
 * @param tbodyData
 * @returns
 */
export const getTableHTML = (theadData: string[], tbodyData: string[][]) => {
  // 表头
  const thead = theadData
    .map(
      (head) => `<th
  style="
    padding: 12px;
    border-bottom: solid #efeff5 1px;
    border-right: solid #efeff5 1px;
  "
>
  ${head}
</th>`
    )
    .join('');
  // 表身
  const tbody = tbodyData
    .map(
      (body) => `<tr>
${body
  .map(
    (b) => `<td
style="
  padding: 12px;
  border-bottom: solid #efeff5 1px;
  border-right: solid #efeff5 1px;
"
>
${b}
</td>`
  )
  .join('')}
</tr>`
    )
    .join('');
  // 表
  const table = `<table
  class="n-table n-table--bottom-bordered"
  style="
    background: #fff;
    color: #333639;
    font-size: 14px;
    border-collapse: separate;
    border-spacing: 0;
    outline: none;
    box-sizing: border-box;
    width: 100%;
    border-top: solid #efeff5 1px;
    border-left: solid #efeff5 1px;
  "
>
  <thead>
    <tr style="background: #fafafc; font-weight: 500; color: #1f2225">
      ${thead}
    </tr>
  </thead>
  <tbody>
    ${tbody}
  </tbody>
</table>`;
  return table;
};

/**
 * @description html高亮文本
 * @param text
 * @returns
 */
export const getHighlightHTML = (text: string | number) => {
  // html
  const highlightHTML = `<span style="color: #1890ff">${text}</span>`;
  return highlightHTML;
};
