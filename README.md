![](https://badgen.net/badge/Editor.js/v2.0/blue)

# Warehouse Tool

提供用于库房数据录入的 Editor.js 块级工具（BlockTool）。包含以下字段：SKU、品名、单价、数量、供应商。

## 编译

```shell
npx --yes vite build
```
## 安装

```shell
yarn add @editorjs/warehouse
```


## 安装

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
        skuPlaceholder: '输入 SKU',
        namePlaceholder: '输入品名',
        unitPricePlaceholder: '输入单价',
        quantityPlaceholder: '输入数量',
        supplierPlaceholder: '输入供应商',
      }
    }
  }
});
```

## 配置参数

- skuPlaceholder: 字段占位（string）
- namePlaceholder: 字段占位（string）
- unitPricePlaceholder: 字段占位（string）
- quantityPlaceholder: 字段占位（string）
- supplierPlaceholder: 字段占位（string）

## 数据输出

保存时的数据结构如下：

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

说明：以上字段是以 HTML 内容保存（允许 <br>），如需严格格式请在服务端再做数据清洗与校验。

