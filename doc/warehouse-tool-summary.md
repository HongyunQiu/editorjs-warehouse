## 仓库数据录入 BlockTool（Warehouse）改造总结

本工具基于 `@editorjs/quote` 改造，用于录入和复用库房物料数据，已升级为 **10 字段结构 + 选择表查询能力**。

### 一、字段与数据结构

- **10 个字段**：
  - 库名：`libraryName`
  - 分类：`category`
  - 品名：`name`
  - 含税单价：`unitPriceWithTax`
  - 数量：`quantity`
  - 税率：`taxRate`
  - 供应商：`supplier`
  - SKU：`sku`
  - 录入时间：`createdAt`
  - 录入人：`createdBy`

- **输出数据结构示例**：

```json
{
  "type": "warehouse",
  "data": {
    "libraryName": "一号库房",
    "category": "电子元件",
    "name": "示例品名",
    "unitPriceWithTax": "100.00",
    "quantity": "2",
    "taxRate": "13%",
    "supplier": "示例供应商",
    "sku": "SKU-001",
    "createdAt": "2025-01-01 10:20:30",
    "createdBy": "张三"
  }
}
```

- **旧数据兼容**：
  - 构造函数中对 `data` 做兼容处理：
    - 若存在旧字段 `unitPrice`，会自动映射到新字段 `unitPriceWithTax`；
    - 新增字段 `createdAt` / `createdBy` 缺失时：
      - 首次渲染时自动填充：
        - `createdAt`：当前时间（形如 `YYYY-MM-DD HH:mm:ss`）；
        - `createdBy`：当前登录用户（优先全名 `full_name`，否则 `username`）；
      - 随后在保存时持久化至笔记内容中。

- **净化规则（sanitize）**：
  - 对 10 个字段统一配置 `{ br: true }`，仅允许换行 `<br>`。

### 二、UI 与交互

- **行式布局**：
  - 使用 CSS Grid 在 `.cdx-warehouse` 下以 2 列展示：左侧 label，右侧内容。
  - 每个字段是一个独立的行：`库名 / 分类 / 品名 / 含税单价 / 数量 / 税率 / 供应商 / SKU / 录入时间 / 录入人`。
  - 其中 **录入时间 / 录入人两行为只读显示**，不会开放给用户编辑。

- **占位符与 i18n**：
  - 通过 `WarehouseConfig` 提供 8 个占位符配置：
    - `libraryNamePlaceholder`、`categoryPlaceholder`、`namePlaceholder`、`unitPriceWithTaxPlaceholder`、`quantityPlaceholder`、`taxRatePlaceholder`、`supplierPlaceholder`、`skuPlaceholder`
  - 构造函数中统一走 `api.i18n.t`，可配合 EditorJS 国际化。
  - 录入时间、录入人不提供占位符配置，由系统自动填充值。

- **字段焦点标记**：
  - 每个 value 元素带有 `data-field` 标记，对应 `WarehouseData` 的字段名；
  - 聚焦时会记录当前 `activeField`，用于打开“从已有条目选择”面板时默认选中查询字段。

### 三、“从已有条目选择”选择表

- 在块底部新增一个按钮：**“从已有条目选择”**。
- 点击后会在块内浮出一个选择面板，包含：
  - 顶部：
    - 字段选择下拉框：可选 `SKU / 分类 / 品名 / 供应商 / 库名`；
    - 前缀输入框：默认填入当前聚焦字段的内容作为初始前缀；
    - “查询”按钮：触发一次查询；
  - 中部：
    - 结果表格，按列展示 10 个字段：库名、分类、品名、含税单价、数量、税率、供应商、SKU、录入时间、录入人。

- **回填逻辑**：
  - 点击某一行：
    - 将该行 `data` 的 10 个字段值全部写回当前 BlockTool（包括录入时间、录入人）；
    - 直接更新 DOM 中带有 `.cdx-warehouse__value` 且 `data-field=...` 的元素；
    - 关闭选择面板。

- **样式文件**：`src/index.css`
  - `.cdx-warehouse__footer`：选择按钮所在区域；
  - `.cdx-warehouse__choose-button`：触发“从已有条目选择”的按钮；
  - `.cdx-warehouse__chooser`：浮层容器，可通过 `is-open` 控制显示/隐藏；
  - `.cdx-warehouse__chooser-table` 及 `__row` / `__row--selected`：结果表格样式与 hover 高亮。

### 四、通用块查询回调 config.queryBlocks

- **配置入口**：

```ts
export interface WarehouseConfig extends ToolConfig {
  // ... 占位符省略
  queryBlocks?: (params: {
    type: string;
    field?: string;
    q?: string;
    limit?: number;
  }) => Promise<{
    items: Array<{
      type: string;
      note_id: number;
      block_index: number;
      data: WarehouseData;
    }>;
  }>;

  /**
   * 获取当前登录用户展示名称（用于自动生成 createdBy / 录入人）
   */
  getCurrentUserLabel?: () => string;

  /**
   * 获取当前时间展示字符串（用于自动生成 createdAt / 录入时间）
   */
  getNowLabel?: () => string;
}
```

- **插件内部调用方式**：
  - 调用时固定 `type: 'warehouse'`；
  - `field` 取自当前字段选择框或聚焦字段；
  - `q` 为前缀输入框中的内容；
  - `limit` 默认 200；
  - 服务端返回的 `items[*].data` 将直接用于表格展示与字段回填。

- **自动元数据填充逻辑**：
  - 若 `data.createdAt` / `data.createdBy` 缺失：
    - 构造函数会调用 `getNowLabel()` / `getCurrentUserLabel()` 生成默认值；
    - 若未提供上述方法，则：
      - `createdAt` 使用本地时间 `YYYY-MM-DD HH:mm:ss`；
      - `createdBy` 在 QNotes 中尝试从全局 `currentUser.full_name` / `currentUser.username` 推断；
  - 后续保存时，这两个字段将一并写入 EditorJS 输出 JSON。

- **推荐服务端接口**：
  - `GET /api/editor/blocks/query?type=warehouse&field=name&q=前缀&limit=200`
  - 由 QNotes 服务端负责：
    - 按当前用户与 auth_mode 过滤可见 notes；
    - 解析 EditorJS JSON，提取 `type === 'warehouse'` 的块；
    - 在内存中按 `field` + `q` 做前缀过滤；
    - 返回 `{ items: [{ type, note_id, block_index, data }, ...] }`。

### 五、与 QNotes 集成要点

- 在 QNotes 前端 `public/app.js` 的 EditorJS 初始化中：
  - 为 `tools.warehouse` 注入 `config.queryBlocks`，封装为调用 `/api/editor/blocks/query` 的通用回调；
  - 通过 QNotes 自有的 `request()` 方法自动携带 JWT 与会话信息。
- 在 QNotes 服务端 `src/server.js` 中：
  - 新增 `GET /api/editor/blocks/query` 接口，供仓库工具选择表（以及未来其它 EditorJS 工具）复用。
  - 仓库块在 team 模式下仅统计“协作区”（管理员一级节点及其子树）中的数据，严格排除个人一级节点下的记录。

### 六、测试建议

1. **personal 模式**：
   - 用户 A、用户 B 在各自笔记中创建若干 `warehouse` 记录；
   - 在任一用户的仓库块中打开“从已有条目选择”，输入前缀后仅能看到自己笔记中的记录；
   - 彼此的数据在选择表中完全不可见。

2. **team 模式**：
   - 管理员在某个协作区根节点下创建若干 `warehouse` 记录；
   - 普通用户在该协作区下也创建若干 `warehouse` 记录；
   - 所有团队成员在协作区任意笔记中打开选择表时：
     - 可以看到协作区中所有 `warehouse` 记录（无论记录创建者是谁）；
   - 普通用户在其“个人一级节点”下创建的 `warehouse` 记录：
     - 在任何人的选择表中都不可见（包含管理员账户）。

3. **字段前缀过滤**：
   - 以 SKU / 分类 / 品名 / 供应商 / 库名 等字段为前缀输入测试；
   - 确认查询结果仅包含以该前缀开头的记录。
