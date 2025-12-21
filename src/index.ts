import './index.css';

import { IconQuote } from '@codexteam/icons';
import { make } from '@editorjs/dom';
import type { API, BlockAPI, BlockTool, ToolConfig, SanitizerConfig } from '@editorjs/editorjs';

/**
 * 仓库数据录入工具的配置
 */
export interface WarehouseConfig extends ToolConfig {
  libraryNamePlaceholder?: string;
  categoryPlaceholder?: string;
  namePlaceholder?: string;
  unitPriceWithTaxPlaceholder?: string;
  quantityPlaceholder?: string;
  taxRatePlaceholder?: string;
  supplierPlaceholder?: string;
  skuPlaceholder?: string;
  /**
   * 通用块查询回调，由外部注入，用于“从已有条目选择”
   */
  queryBlocks?: (params: {
    type: string;
    field?: string;
    q?: string;
    limit?: number;
  }) => Promise<{ items: Array<{ type: string; note_id: number; block_index: number; data: WarehouseData }> }>;

  /**
   * 获取当前登录用户的展示名称（用于自动生成“录入人”/createdBy）
   */
  getCurrentUserLabel?: () => string;

  /**
   * 获取当前时间的展示字符串（用于自动生成“录入时间”/createdAt）
   */
  getNowLabel?: () => string;
}

/**
 * 仓库数据录入工具的数据结构（10 字段）
 *
 * - libraryName: 库名
 * - category: 分类
 * - name: 品名
 * - unitPriceWithTax: 含税单价
 * - quantity: 数量
 * - taxRate: 税率
 * - supplier: 供应商
 * - sku: SKU
 * - createdAt: 录入时间（由系统自动生成）
 * - createdBy: 录入人（由系统自动生成）
 */
export interface WarehouseData {
  libraryName: string;
  category: string;
  name: string;
  unitPriceWithTax: string;
  quantity: string;
  taxRate: string;
  supplier: string;
  sku: string;
  createdAt: string;
  createdBy: string;
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
  item: string;
  label: string;
  value: string;
  valueLibraryName: string;
  valueCategory: string;
  valueName: string;
  valueUnitPriceWithTax: string;
  valueQuantity: string;
  valueTaxRate: string;
  valueSupplier: string;
  valueSku: string;
  valueCreatedAt: string;
  valueCreatedBy: string;
  bottomBar: string;
  footer: string;
  divider: string;
  chooseButton: string;
  chooser: string;
  chooserHeader: string;
  chooserFieldSelect: string;
  chooserQueryInput: string;
  chooserTable: string;
  chooserRow: string;
  chooserRowSelected: string;
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

  /**
   * 当前选择/聚焦的字段 key，用于 queryBlocks 的 field
   */
  private activeField: keyof WarehouseData | null = null;

  /**
   * 选择表 DOM 元素及其状态
   */
  private chooserElement: HTMLElement | null = null;
  private chooserResultsTbody: HTMLTableSectionElement | null = null;
  private chooserFieldSelect: HTMLSelectElement | null = null;
  private chooserQueryInput: HTMLInputElement | null = null;
  private chooserItems: WarehouseData[] = [];

  constructor({ data, config, api, readOnly, block }: WarehouseParams) {
    this.api = api;
    this.readOnly = readOnly;
    this.block = block;

    // 占位符配置，兼容默认文案
    this.placeholders = {
      libraryNamePlaceholder: api.i18n.t(config?.libraryNamePlaceholder ?? '输入库名'),
      categoryPlaceholder: api.i18n.t(config?.categoryPlaceholder ?? '输入分类'),
      namePlaceholder: api.i18n.t(config?.namePlaceholder ?? '输入品名'),
      unitPriceWithTaxPlaceholder: api.i18n.t(config?.unitPriceWithTaxPlaceholder ?? '输入含税单价'),
      quantityPlaceholder: api.i18n.t(config?.quantityPlaceholder ?? '输入数量'),
      taxRatePlaceholder: api.i18n.t(config?.taxRatePlaceholder ?? '输入税率'),
      supplierPlaceholder: api.i18n.t(config?.supplierPlaceholder ?? '输入供应商'),
      skuPlaceholder: api.i18n.t(config?.skuPlaceholder ?? '输入 SKU'),
      queryBlocks: config?.queryBlocks,
      getCurrentUserLabel: config?.getCurrentUserLabel,
      getNowLabel: config?.getNowLabel,
    } as Required<WarehouseConfig>;

    // 解析/生成“录入时间”“录入人”默认值（仅在数据中不存在时生成一次）
    const resolveNowLabel = () => {
      // 优先使用外部注入的格式化函数
      try {
        if (config && typeof config.getNowLabel === 'function') {
          const v = config.getNowLabel();
          if (typeof v === 'string' && v.trim()) return v.trim();
        }
      } catch (e) {
        // 忽略外部函数异常，退回内置逻辑
      }
      // 退回到 ISO 风格的本地时间字符串
      try {
        const d = new Date();
        const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
        const yyyy = d.getFullYear();
        const MM = pad(d.getMonth() + 1);
        const dd = pad(d.getDate());
        const hh = pad(d.getHours());
        const mm = pad(d.getMinutes());
        const ss = pad(d.getSeconds());
        return `${yyyy}-${MM}-${dd} ${hh}:${mm}:${ss}`;
      } catch (e) {
        return '';
      }
    };

    const resolveUserLabel = () => {
      // 优先使用外部注入的获取用户函数
      try {
        if (config && typeof config.getCurrentUserLabel === 'function') {
          const v = config.getCurrentUserLabel();
          if (typeof v === 'string' && v.trim()) return v.trim();
        }
      } catch (e) {
        // 忽略外部函数异常
      }
      // 若运行在浏览器环境下，尝试从全局 QNotes 变量推断
      try {
        if (typeof window !== 'undefined') {
          const w: any = window as any;
          const cu = w && w.currentUser;
          if (cu) {
            if (typeof cu.full_name === 'string' && cu.full_name.trim()) {
              return cu.full_name.trim();
            }
            if (typeof cu.username === 'string' && cu.username.trim()) {
              return cu.username.trim();
            }
          }
          // 进一步尝试从 JWT 中解析用户名（QNotes 默认使用 localStorage.qnotes_token 存储）
          try {
            const token = w.localStorage && typeof w.localStorage.getItem === 'function'
              ? w.localStorage.getItem('qnotes_token')
              : null;
            if (token && typeof token === 'string') {
              const parts = token.split('.');
              if (parts.length >= 2) {
                const base64 = parts[1]
                  .replace(/-/g, '+')
                  .replace(/_/g, '/')
                  .padEnd(Math.ceil(parts[1].length / 4) * 4, '=');
                try {
                  const json = atob(base64);
                  const payload = JSON.parse(json);
                  if (payload) {
                    if (typeof payload.full_name === 'string' && payload.full_name.trim()) {
                      return payload.full_name.trim();
                    }
                    if (typeof payload.username === 'string' && payload.username.trim()) {
                      return payload.username.trim();
                    }
                  }
                } catch (e) {
                  // 忽略 JWT 解析异常
                }
              }
            }
          } catch (e) {
            // 忽略 localStorage / JWT 解析异常
          }
        }
      } catch (e) {
        // 忽略全局变量访问异常
      }
      return '';
    };

    const defaultCreatedAt = resolveNowLabel();
    const defaultCreatedBy = resolveUserLabel();

    // 数据兼容：优先读取新结构字段，其次回退到旧结构（仅 sku/name/unitPrice/quantity/supplier）
    const legacy: any = data || {};
    this.data = {
      libraryName: (legacy.libraryName as string) ?? '',
      category: (legacy.category as string) ?? '',
      name: (legacy.name as string) ?? '',
      unitPriceWithTax:
        (legacy.unitPriceWithTax as string) ??
        (legacy.unitPrice as string) ?? // 兼容旧字段名
        '',
      quantity: (legacy.quantity as string) ?? '',
      taxRate: (legacy.taxRate as string) ?? '',
      supplier: (legacy.supplier as string) ?? '',
      sku: (legacy.sku as string) ?? '',
      createdAt: (legacy.createdAt as string) ?? defaultCreatedAt,
      createdBy: (legacy.createdBy as string) ?? defaultCreatedBy,
    };

    this.css = {
      baseClass: this.api.styles.block,
      wrapper: 'cdx-warehouse',
      row: 'cdx-warehouse__row',
      item: 'cdx-warehouse__item',
      label: 'cdx-warehouse__label',
      value: this.api.styles.input,
      valueLibraryName: 'cdx-warehouse__value--libraryName',
      valueCategory: 'cdx-warehouse__value--category',
      valueName: 'cdx-warehouse__value--name',
      valueUnitPriceWithTax: 'cdx-warehouse__value--unitPriceWithTax',
      valueQuantity: 'cdx-warehouse__value--quantity',
      valueTaxRate: 'cdx-warehouse__value--taxRate',
      valueSupplier: 'cdx-warehouse__value--supplier',
      valueSku: 'cdx-warehouse__value--sku',
      valueCreatedAt: 'cdx-warehouse__value--createdAt',
      valueCreatedBy: 'cdx-warehouse__value--createdBy',
      bottomBar: 'cdx-warehouse__bottom',
      footer: 'cdx-warehouse__footer',
      divider: 'cdx-warehouse__divider',
      chooseButton: 'cdx-warehouse__choose-button',
      chooser: 'cdx-warehouse__chooser',
      chooserHeader: 'cdx-warehouse__chooser-header',
      chooserFieldSelect: 'cdx-warehouse__chooser-field-select',
      chooserQueryInput: 'cdx-warehouse__chooser-query-input',
      chooserTable: 'cdx-warehouse__chooser-table',
      chooserRow: 'cdx-warehouse__chooser-row',
      chooserRowSelected: 'cdx-warehouse__chooser-row--selected',
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

    const setActiveField = (field: keyof WarehouseData) => {
      this.activeField = field;
    };

    const createItem = (
      labelText: string,
      field: keyof WarehouseData,
      valueClasses: string[],
      valueHTML: string,
      placeholder: string,
      editable: boolean = true
    ) => {
      const item = make('div', [this.css.item, this.css.row]);
      const label = make('div', [this.css.label], { innerHTML: this.api.i18n.t(labelText) });
      const value = make('div', [this.css.value, 'cdx-warehouse__value', ...valueClasses], {
        contentEditable: editable && !this.readOnly,
        innerHTML: valueHTML,
      });
      value.dataset.placeholder = placeholder;
      value.dataset.field = field;
      value.addEventListener('focus', () => setActiveField(field));
      item.appendChild(label);
      item.appendChild(value);
      return item;
    };

    container.appendChild(
      createItem(
        '库名',
        'libraryName',
        [this.css.valueLibraryName],
        this.data.libraryName,
        this.placeholders.libraryNamePlaceholder!
      )
    );
    container.appendChild(
      createItem(
        '分类',
        'category',
        [this.css.valueCategory],
        this.data.category,
        this.placeholders.categoryPlaceholder!
      )
    );
    container.appendChild(
      createItem(
        '品名',
        'name',
        [this.css.valueName],
        this.data.name,
        this.placeholders.namePlaceholder!
      )
    );
    container.appendChild(
      createItem(
        '含税单价',
        'unitPriceWithTax',
        [this.css.valueUnitPriceWithTax],
        this.data.unitPriceWithTax,
        this.placeholders.unitPriceWithTaxPlaceholder!
      )
    );
    container.appendChild(
      createItem(
        '数量',
        'quantity',
        [this.css.valueQuantity],
        this.data.quantity,
        this.placeholders.quantityPlaceholder!
      )
    );
    container.appendChild(
      createItem(
        '税率',
        'taxRate',
        [this.css.valueTaxRate],
        this.data.taxRate,
        this.placeholders.taxRatePlaceholder!
      )
    );
    container.appendChild(
      createItem(
        '供应商',
        'supplier',
        [this.css.valueSupplier],
        this.data.supplier,
        this.placeholders.supplierPlaceholder!
      )
    );
    container.appendChild(
      createItem(
        'SKU',
        'sku',
        [this.css.valueSku],
        this.data.sku,
        this.placeholders.skuPlaceholder!
      )
    );
    // 录入时间（只读、由系统自动生成）
    container.appendChild(
      createItem(
        '录入时间',
        'createdAt',
        [this.css.valueCreatedAt],
        this.data.createdAt,
        '',
        false
      )
    );
    // 录入人（只读、由系统自动生成）
    container.appendChild(
      createItem(
        '录入人',
        'createdBy',
        [this.css.valueCreatedBy],
        this.data.createdBy,
        '',
        false
      )
    );

    /**
     * 底部区域：把“从已有条目选择”按钮与分隔符放到同一行
     * - divider 采用 absolute 居中，避免因按钮宽度导致视觉偏移
     * - readOnly 时不渲染按钮，但仍保留 divider 作为块分隔
     */
    const bottomBar = make('div', [this.css.bottomBar]);

    if (!this.readOnly) {
      const footer = make('div', [this.css.footer]);
      const chooseBtn = make('button', [this.css.chooseButton], {
        type: 'button',
        innerHTML: this.api.i18n.t('从已有条目选择'),
      }) as HTMLButtonElement;
      chooseBtn.addEventListener('click', () => this.openChooser(container));
      footer.appendChild(chooseBtn);
      bottomBar.appendChild(footer);
    }

    // 底部分割符：用于在一个笔记中连续出现多个 warehouse 块时形成清晰分隔
    bottomBar.appendChild(make('div', [this.css.divider], { ariaHidden: 'true' } as any));
    container.appendChild(bottomBar);

    return container;
  }

  public save(wrapper: HTMLDivElement): WarehouseData {
    const select = (cls: string) => wrapper.querySelector(`.${cls}`) as HTMLDivElement | null;

    const result: WarehouseData = {
      // 元数据字段沿用内存中的值（由系统自动生成，不暴露为可编辑字段）
      createdAt: this.data.createdAt,
      createdBy: this.data.createdBy,
      libraryName: select(this.css.valueLibraryName)?.innerHTML ?? '',
      category: select(this.css.valueCategory)?.innerHTML ?? '',
      name: select(this.css.valueName)?.innerHTML ?? '',
      unitPriceWithTax: select(this.css.valueUnitPriceWithTax)?.innerHTML ?? '',
      quantity: select(this.css.valueQuantity)?.innerHTML ?? '',
      taxRate: select(this.css.valueTaxRate)?.innerHTML ?? '',
      supplier: select(this.css.valueSupplier)?.innerHTML ?? '',
      sku: select(this.css.valueSku)?.innerHTML ?? '',
    };

    // 同步内存数据，确保后续回填/选择表使用最新值
    this.data = result;

    return result;
  }

  public static get sanitize(): SanitizerConfig {
    return {
      libraryName: { br: true },
      category: { br: true },
      name: { br: true },
      unitPriceWithTax: { br: true },
      quantity: { br: true },
      taxRate: { br: true },
      supplier: { br: true },
      sku: { br: true },
       createdAt: { br: true },
       createdBy: { br: true },
    };
  }

  public validate(data: WarehouseData): boolean {
    // 始终允许保存（如需至少有一个字段非空，可改为条件判断）
    return true;
  }

  /**
   * 打开选择表浮层
   */
  private async openChooser(root: HTMLElement): Promise<void> {
    if (!this.placeholders.queryBlocks) {
      // 外部未注入查询回调，则不打开
      this.api.notifier.show({
        message: this.api.i18n.t('未配置查询接口，无法从已有条目选择'),
        style: 'warning',
      });
      return;
    }

    if (this.chooserElement) {
      // 已存在则切换可见性
      this.chooserElement.classList.toggle('is-open');
      return;
    }

    const chooser = make('div', [this.css.chooser, 'is-open']);
    const header = make('div', [this.css.chooserHeader]);

    // 字段选择下拉
    const fieldSelect = make('select', [this.css.chooserFieldSelect]) as HTMLSelectElement;
    const fieldOptions: Array<{ value: keyof WarehouseData; label: string }> = [
      { value: 'sku', label: 'SKU' },
      { value: 'category', label: '分类' },
      { value: 'name', label: '品名' },
      { value: 'supplier', label: '供应商' },
      { value: 'libraryName', label: '库名' },
    ];
    fieldOptions.forEach(opt => {
      const o = document.createElement('option');
      o.value = opt.value;
      o.textContent = this.api.i18n.t(opt.label);
      fieldSelect.appendChild(o);
    });

    // 以当前 activeField 作为默认字段
    if (this.activeField) {
      const found = fieldOptions.find(f => f.value === this.activeField);
      if (found) {
        fieldSelect.value = found.value;
      }
    }

    // 前缀输入框
    const queryInput = make('input', [this.css.chooserQueryInput], {
      type: 'text',
      placeholder: this.api.i18n.t('输入前缀进行过滤'),
    }) as HTMLInputElement;

    // 如果当前有 focus 字段，则用其当前值作为默认前缀
    if (this.activeField) {
      const fieldClass = (this.css as any)[`value${this.capitalize(this.activeField)}`];
      if (fieldClass) {
        const el = root.querySelector(`.${fieldClass}`) as HTMLDivElement | null;
        if (el && el.innerText) {
          queryInput.value = el.innerText.trim();
        }
      }
    }

    const searchButton = document.createElement('button');
    searchButton.type = 'button';
    searchButton.textContent = this.api.i18n.t('查询');
    searchButton.addEventListener('click', () => {
      this.runQuery();
    });

    header.appendChild(fieldSelect);
    header.appendChild(queryInput);
    header.appendChild(searchButton);

    // 结果表格
    const table = make('table', [this.css.chooserTable]);
    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    ['库名', '分类', '品名', '含税单价', '数量', '税率', '供应商', 'SKU', '录入时间', '录入人'].forEach(label => {
      const th = document.createElement('th');
      th.textContent = this.api.i18n.t(label);
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    table.appendChild(tbody);

    chooser.appendChild(header);
    chooser.appendChild(table);

    root.appendChild(chooser);

    this.chooserElement = chooser;
    this.chooserResultsTbody = tbody;
    this.chooserFieldSelect = fieldSelect;
    this.chooserQueryInput = queryInput;

    // 初次打开立即查询一次
    await this.runQuery();
  }

  /**
   * 执行查询并渲染结果
   */
  private async runQuery(): Promise<void> {
    if (!this.placeholders.queryBlocks || !this.chooserResultsTbody || !this.chooserFieldSelect) {
      return;
    }
    const field = this.chooserFieldSelect.value as keyof WarehouseData;
    const q = (this.chooserQueryInput && this.chooserQueryInput.value || '').trim();

    try {
      const resp = await this.placeholders.queryBlocks({
        type: 'warehouse',
        field,
        q,
        limit: 200,
      });
      const items = Array.isArray(resp.items) ? resp.items : [];
      this.chooserItems = items.map(it => it.data || {}) as WarehouseData[];
      this.renderChooserRows();
    } catch (e) {
      this.api.notifier.show({
        message: this.api.i18n.t('查询失败，请稍后重试'),
        style: 'error',
      });
    }
  }

  /**
   * 渲染选择表行，并绑定点击回填
   */
  private renderChooserRows(): void {
    if (!this.chooserResultsTbody) return;
    this.chooserResultsTbody.innerHTML = '';
    this.chooserItems.forEach((item, index) => {
      const tr = document.createElement('tr');
      tr.classList.add(this.css.chooserRow);
      const cells: Array<keyof WarehouseData> = [
        'libraryName',
        'category',
        'name',
        'unitPriceWithTax',
        'quantity',
        'taxRate',
        'supplier',
        'sku',
        'createdAt',
        'createdBy',
      ];
      cells.forEach(key => {
        const td = document.createElement('td');
        td.textContent = (item[key] || '').toString();
        tr.appendChild(td);
      });
      tr.addEventListener('click', () => {
        this.applyItem(item);
        if (this.chooserElement) {
          this.chooserElement.classList.remove('is-open');
        }
      });
      this.chooserResultsTbody!.appendChild(tr);
    });
  }

  /**
   * 将选中的一行数据回填到当前块
   */
  private applyItem(item: WarehouseData): void {
    this.data = { ...item };
    // 通过 BlockAPI 强制重新渲染当前块
    try {
      const holder = this.block.holder;
      const inputs = holder.querySelectorAll('.cdx-warehouse__value');
      inputs.forEach((el: Element) => {
        const div = el as HTMLDivElement;
        const field = (div.dataset.field || '') as keyof WarehouseData;
        if (field && field in this.data) {
          div.innerHTML = this.data[field] || '';
        }
      });
    } catch (e) {
      // 忽略渲染异常
    }
  }

  private capitalize(field: string): string {
    if (!field) return field;
    return field.charAt(0).toUpperCase() + field.slice(1);
  }
}
