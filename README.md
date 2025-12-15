![](https://badgen.net/badge/Editor.js/v2.0/blue)

# Warehouse Tool

提供用于库房数据录入的 Editor.js 块级工具（BlockTool）。

- **字段结构（10 个字段）**：库名、分类、品名、含税单价、数量、税率、供应商、SKU、录入时间（createdAt）、录入人（createdBy）
- **支持功能**：占位符配置、只读模式、从已有条目选择（通过通用块查询接口）、自动记录录入时间与录入人

## 编译

```shell
npx --yes vite build
```

## 安装

```shell
yarn add @editorjs/warehouse
```

或在浏览器中直接引入 UMD：

```html
<script src="dist/warehouse.umd.js"></script>
```

## 使用

```javascript
import Warehouse from '@editorjs/warehouse';

const editor = new EditorJS({
  tools: {
    warehouse: {
      class: Warehouse,
      inlineToolbar: true,
      config: {
        libraryNamePlaceholder: '输入库名',
        categoryPlaceholder: '输入分类',
        namePlaceholder: '输入品名',
        unitPriceWithTaxPlaceholder: '输入含税单价',
        quantityPlaceholder: '输入数量',
        taxRatePlaceholder: '输入税率',
        supplierPlaceholder: '输入供应商',
        skuPlaceholder: '输入 SKU',
        /**
         * 通用 EditorJS 块查询回调，用于“从已有条目选择”
         * - 建议调用服务端 `/api/editor/blocks/query`
         */
        queryBlocks: (params) => {
          const searchParams = new URLSearchParams();
          searchParams.set('type', params.type || 'warehouse');
          if (params.field) searchParams.set('field', params.field);
          if (params.q) searchParams.set('q', params.q);
          if (params.limit) searchParams.set('limit', String(params.limit));
          return fetch(`/api/editor/blocks/query?${searchParams.toString()}`, {
            method: 'GET',
            headers: {
              'Accept': 'application/json'
            }
          }).then(res => res.json());
        },
        /**
         * （可选）获取当前登录用户展示名称，用于自动填充 createdBy / 录入人
         */
        getCurrentUserLabel: () => window.currentUser?.full_name || window.currentUser?.username || '',
        /**
         * （可选）获取当前时间展示字符串，用于自动填充 createdAt / 录入时间
         */
        getNowLabel: () => {
          const d = new Date();
          const pad = (n) => (n < 10 ? `0${n}` : String(n));
          return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
        }
      }
    }
  }
});
```

## 配置参数

- **libraryNamePlaceholder**: 库名占位（string）
- **categoryPlaceholder**: 分类占位（string）
- **namePlaceholder**: 品名占位（string）
- **unitPriceWithTaxPlaceholder**: 含税单价占位（string）
- **quantityPlaceholder**: 数量占位（string）
- **taxRatePlaceholder**: 税率占位（string）
- **supplierPlaceholder**: 供应商占位（string）
- **skuPlaceholder**: SKU 占位（string）
- **queryBlocks**: `(params) => Promise<{ items: { type, note_id, block_index, data }[] }>`，通用块查询回调
- **getCurrentUserLabel**: `() => string`，可选，返回当前登录用户的展示名称（用于自动填充 `createdBy`/录入人）
- **getNowLabel**: `() => string`，可选，返回当前时间的展示字符串（用于自动填充 `createdAt`/录入时间）

## 数据输出

保存时的 `warehouse` 块数据结构如下（10 字段）：

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

说明：以上字段依然以 HTML 内容保存（允许 `<br>`），如需严格格式请在服务端做数据清洗与校验；
其中 `createdAt` / `createdBy` 通常由前端根据当前登录用户和当前时间自动生成。
