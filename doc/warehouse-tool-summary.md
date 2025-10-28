## 仓库数据录入 BlockTool 改造总结（基于 @editorjs/quote）

本次工作将原 `@editorjs/quote` 插件改造为用于库房数据录入的 Editor.js 块级工具（BlockTool），提供结构化表单字段：SKU、品名、单价、数量、供应商。

### 变更概览
- 替换工具逻辑为 `WarehouseForm`：`src/index.ts`
- 新增表单样式与占位符伪元素：`src/index.css`
- 调整构建产物名称：`vite.config.js`（库名 `Warehouse`、文件前缀 `warehouse`）
- 更新包元数据：`package.json`（名称改为 `@editorjs/warehouse`，入口与描述同步）
- 重写使用文档：`README.md`（中文说明，安装/使用/输出格式）

### 主要能力与 API
- 五个字段（contentEditable）：SKU、品名、单价、数量、供应商
- 支持只读模式（Editor.js `readOnly`）
- 支持占位符 i18n 配置：
  - `skuPlaceholder`、`namePlaceholder`、`unitPricePlaceholder`、`quantityPlaceholder`、`supplierPlaceholder`
- 工具箱与标题：`toolbox.title = 'Warehouse'`

### 数据结构与保存
- 保存方法：`save(wrapper): WarehouseData`
- 输出数据结构：

```json
{
  "type": "warehouse",
  "data": {
    "sku": "SKU-001",
    "name": "示例品名",
    "unitPrice": "100",
    "quantity": "2",
    "supplier": "示例供应商"
  }
}
```

- 净化规则：仅允许 `<br>`（`sanitize` 针对每个字段开启 `br: true`）
- 保存策略：
  - `static get contentless() { return true }` 允许空块也可被保存
  - `validate(data)` 始终返回 `true`，不会在保存阶段被过滤
  - 如需“至少一个字段非空才保存”，可将 `validate` 改为：任一字段非空时返回 `true`

### 样式说明（`src/index.css`）
- `.cdx-warehouse` 使用网格布局展示 label-输入对
- 占位符伪元素：`[contentEditable=true][data-placeholder]::before`，在 `:empty` 时显示
- 输入容器类名：`cdx-warehouse__value`，并叠加 Editor.js 的 `this.api.styles.input`

### 修复与兼容性
- 修复 `classList` 空格 token 问题：将 `cdx-input cdx-warehouse__value` 拆分为独立类传递
- 运行时兼容 Editor.js v2.x（dev 依赖 `@editorjs/editorjs@^2.30.7`）

### 构建与产物
- 命令：

```bash
# 推荐：使用 npm（如果本机未安装 Yarn）
npm install --no-audit --no-fund
npx vite build

# 或使用 Yarn
yarn install --frozen-lockfile --non-interactive
yarn build
```

- 产物（`dist/`）：
  - `warehouse.mjs`（ESM，用于打包器）
  - `warehouse.umd.js`（UMD，用于浏览器 `<script>` 直接引入）
  - `index.d.ts`（类型声明）

### 使用示例

```js
import Warehouse from '@editorjs/warehouse';

const editor = new EditorJS({
  tools: {
    warehouse: {
      class: Warehouse,
      inlineToolbar: true,
      config: {
        skuPlaceholder: '输入 SKU',
        namePlaceholder: '输入品名',
        unitPricePlaceholder: '输入单价',
        quantityPlaceholder: '输入数量',
        supplierPlaceholder: '输入供应商'
      }
    }
  }
});
```

浏览器直接引入 UMD：

```html
<script src="/dist/warehouse.umd.js"></script>
```

### 已知注意事项与建议
- 字段值保存为 `innerHTML`（允许 `<br>`）。若需严格格式，请在保存后做数据清洗与校验。
- 可选增强：
  - 编辑态校验（仅允许数字/小数点的输入、格式化单价/数量等）
  - `validate` 政策调整（全空不保存）
  - 只读态样式区分、更完善的可访问性属性（`role`/`aria-*`）

### 版本信息
- 包名：`@editorjs/warehouse`
- 版本：`0.1.0`
- 许可证：MIT

### 迁移自 @editorjs/quote 的要点
- 替换逻辑与 UI：两栏表单布局，移除对齐设置
- 更新导出名称与构建产物前缀（`quote` → `warehouse`）
- 入口类名变更：默认导出 `WarehouseForm`
