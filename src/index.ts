import './index.css';

import { IconQuote } from '@codexteam/icons';
import { make } from '@editorjs/dom';
import type { API, BlockAPI, BlockTool, ToolConfig, SanitizerConfig } from '@editorjs/editorjs';

/**
 * 仓库数据录入工具的配置
 */
export interface WarehouseConfig extends ToolConfig {
  skuPlaceholder?: string;
  namePlaceholder?: string;
  unitPricePlaceholder?: string;
  quantityPlaceholder?: string;
  supplierPlaceholder?: string;
}

/**
 * 仓库数据录入工具的数据结构
 */
export interface WarehouseData {
  sku: string;
  name: string;
  unitPrice: string;
  quantity: string;
  supplier: string;
}

/**
 * 构造参数
 */
interface WarehouseParams {
  data: WarehouseData;
  config?: WarehouseConfig;
  api: API;
  readOnly: boolean;
  block: BlockAPI;
}

/**
 * CSS 类名集合
 */
interface WarehouseCSS {
  baseClass: string;
  wrapper: string;
  row: string;
  label: string;
  value: string;
  valueSku: string;
  valueName: string;
  valueUnitPrice: string;
  valueQuantity: string;
  valueSupplier: string;
}

/**
 * Editor.js 仓库数据录入 BlockTool
 */
export default class WarehouseForm implements BlockTool {
  private api: API;
  private readOnly: boolean;
  private block: BlockAPI;

  private data: WarehouseData;
  private css: WarehouseCSS;

  private placeholders: Required<WarehouseConfig>;

  constructor({ data, config, api, readOnly, block }: WarehouseParams) {
    this.api = api;
    this.readOnly = readOnly;
    this.block = block;

    this.placeholders = {
      skuPlaceholder: api.i18n.t(config?.skuPlaceholder ?? '输入 SKU'),
      namePlaceholder: api.i18n.t(config?.namePlaceholder ?? '输入品名'),
      unitPricePlaceholder: api.i18n.t(config?.unitPricePlaceholder ?? '输入单价'),
      quantityPlaceholder: api.i18n.t(config?.quantityPlaceholder ?? '输入数量'),
      supplierPlaceholder: api.i18n.t(config?.supplierPlaceholder ?? '输入供应商'),
    } as Required<WarehouseConfig>;

    this.data = {
      sku: data?.sku ?? '',
      name: data?.name ?? '',
      unitPrice: data?.unitPrice ?? '',
      quantity: data?.quantity ?? '',
      supplier: data?.supplier ?? '',
    };

    this.css = {
      baseClass: this.api.styles.block,
      wrapper: 'cdx-warehouse',
      row: 'cdx-warehouse__row',
      label: 'cdx-warehouse__label',
      value: this.api.styles.input,
      valueSku: 'cdx-warehouse__value--sku',
      valueName: 'cdx-warehouse__value--name',
      valueUnitPrice: 'cdx-warehouse__value--unitPrice',
      valueQuantity: 'cdx-warehouse__value--quantity',
      valueSupplier: 'cdx-warehouse__value--supplier',
    };
  }

  public static get isReadOnlySupported(): boolean {
    return true;
  }

  public static get toolbox(): { icon: string; title: 'Warehouse'; } {
    return {
      icon: IconQuote,
      title: 'Warehouse',
    };
  }

  public static get contentless(): boolean {
    return true;
  }

  public static get enableLineBreaks(): boolean {
    return true;
  }

  public render(): HTMLElement {
    const container = make('div', [this.css.baseClass, this.css.wrapper]);

    const createRow = (labelText: string, valueClasses: string[], valueHTML: string, placeholder: string) => {
      const row = make('div', [this.css.row]);
      const label = make('div', [this.css.label], { innerHTML: this.api.i18n.t(labelText) });
      const value = make('div', [this.css.value, 'cdx-warehouse__value', ...valueClasses], {
        contentEditable: !this.readOnly,
        innerHTML: valueHTML,
      });
      value.dataset.placeholder = placeholder;
      row.appendChild(label);
      row.appendChild(value);
      return row;
    };

    container.appendChild(createRow('SKU', [this.css.valueSku], this.data.sku, this.placeholders.skuPlaceholder!));
    container.appendChild(createRow('品名', [this.css.valueName], this.data.name, this.placeholders.namePlaceholder!));
    container.appendChild(createRow('单价', [this.css.valueUnitPrice], this.data.unitPrice, this.placeholders.unitPricePlaceholder!));
    container.appendChild(createRow('数量', [this.css.valueQuantity], this.data.quantity, this.placeholders.quantityPlaceholder!));
    container.appendChild(createRow('供应商', [this.css.valueSupplier], this.data.supplier, this.placeholders.supplierPlaceholder!));

    return container;
  }

  public save(wrapper: HTMLDivElement): WarehouseData {
    const select = (cls: string) => wrapper.querySelector(`.${cls}`) as HTMLDivElement | null;

    return {
      sku: select(this.css.valueSku)?.innerHTML ?? '',
      name: select(this.css.valueName)?.innerHTML ?? '',
      unitPrice: select(this.css.valueUnitPrice)?.innerHTML ?? '',
      quantity: select(this.css.valueQuantity)?.innerHTML ?? '',
      supplier: select(this.css.valueSupplier)?.innerHTML ?? '',
    };
  }

  public static get sanitize(): SanitizerConfig {
    return {
      sku: { br: true },
      name: { br: true },
      unitPrice: { br: true },
      quantity: { br: true },
      supplier: { br: true },
    };
  }

  public validate(data: WarehouseData): boolean {
    // 始终允许保存（如需至少有一个字段非空，可改为条件判断）
    return true;
  }
}
