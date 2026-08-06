# Leaflet 图层对比控件

[![在 DeepWiki 中查看](https://deepwiki.com/badge.svg)](https://deepwiki.com/ZvonimirSun/leaflet-side-by-side)

一个面向 Leaflet 的图层对比控件。本项目将在保持
[`leaflet-side-by-side`](https://github.com/digidem/leaflet-side-by-side)
现有参数、方法和事件兼容的基础上，提供更完整、可靠且易于维护的实现，
并作为公开包发布到 npm。

与原插件不同，本项目会处理左右列表中的全部活动图层，而不是只处理遍历到的
最后一个图层。项目使用 TypeScript 和现代库构建方式，旧项目的 Browserify
产物格式不属于兼容范围。

## 安装

```bash
pnpm add leaflet @zvonimirsun/leaflet-side-by-side
```

Leaflet 是本包的 peer dependency。使用控件前需要同时引入 Leaflet 和本包样式：

```ts
import type {
  SideBySideControl,
  SideBySideOptions,
} from '@zvonimirsun/leaflet-side-by-side'
import { sideBySide, SideBySide } from '@zvonimirsun/leaflet-side-by-side'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import '@zvonimirsun/leaflet-side-by-side/style.css'
```

## 使用

工厂方法和构造器使用标准模块导出，参数语义与原插件保持一致：

```ts
const leftA = L.tileLayer('https://example.com/left-a/{z}/{x}/{y}.png')
const leftB = L.tileLayer('https://example.com/left-b/{z}/{x}/{y}.png')
const right = L.tileLayer('https://example.com/right/{z}/{x}/{y}.png')

leftA.addTo(map)
leftB.addTo(map)
right.addTo(map)

const control = sideBySide([leftA, leftB], right, {
  padding: 0,
  thumbSize: 42,
}).addTo(map)
```

也可以直接使用构造器：

```ts
const control = new SideBySide(leftA, right)
control.addTo(map)
```

左右参数都接受单个 `L.Layer`、图层数组或 `undefined`。单图层会在内部归一化
为数组，调用方传入的数组不会被修改。

## 图层处理规则

控件会根据地图中当前存在的图层计算显示范围：

| 图层归属 | 显示方式 |
| --- | --- |
| 仅在左侧列表 | 只显示分割线左侧 |
| 仅在右侧列表 | 只显示分割线右侧 |
| 同时在左右列表 | 完整显示，不进行裁剪 |
| 两侧列表均未包含 | 完全裁剪并隐藏 |

只有已经添加到地图、能通过 `map.hasLayer(layer)` 检查的图层才会参与对应侧的
裁剪。地图动态添加或移除图层时，控件会自动重新计算。控件移除后会恢复图层
元素原有的 `clip-path` 和 `visibility` 样式。

## API

### 选项

| 选项 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `thumbSize` | `number` | `42` | 滑块尺寸，用于计算分割位置偏移 |
| `padding` | `number` | `0` | 滑块左右内边距 |

### 方法

- `setLeftLayers(layers)`：替换左侧图层，返回当前控件。
- `setRightLayers(layers)`：替换右侧图层，返回当前控件。
- `setPosition(position)`：按地图容器内的横向像素位置设置卷帘，需在
  `addTo(map)` 后调用。位置超出滑块可拖动范围时会收敛到边界；返回当前控件。
- `setPositionRatio(ratio)`：按 `0` 到 `1` 的归一化比例设置卷帘，例如 `0.25`
  表示 25%。位置会在控件移除和重新添加后保留，也可以在 `addTo(map)` 前设置；
  返回当前控件。
- `getPosition()`：返回分割线在地图容器中的横向像素位置。
- `addTo(map)`：将控件添加到地图。
- `remove()`：移除控件并恢复图层样式。

### 事件

| 事件 | 事件数据 | 说明 |
| --- | --- | --- |
| `leftlayeradd` | `{ layer }` | 左侧活动图层增加 |
| `leftlayerremove` | `{ layer }` | 左侧活动图层移除 |
| `rightlayeradd` | `{ layer }` | 右侧活动图层增加 |
| `rightlayerremove` | `{ layer }` | 右侧活动图层移除 |
| `dividermove` | `{ x }` | 分割位置更新，`x` 为容器内像素坐标 |

当一侧包含多个活动图层时，图层增删事件会针对每个变化的图层分别触发。

### 类型

包入口提供以下纯类型导出，不会增加运行时代码：

- `LayerInput`
- `SideBySideOptions`
- `SideBySideControl`
- `SideBySideConstructor`
- `SideBySideLayerEvent`
- `DividerMoveEvent`

## 浏览器兼容性

图层裁剪使用现代 CSS `clip-path: polygon(...)`，不使用已弃用的 `clip` 属性。
目标浏览器为 Chrome 80 及以上版本，并适用于支持 CSS 基本图形裁剪的现代浏览器。

## 本地开发

要求 Node.js，并使用 pnpm 安装依赖：

```bash
pnpm install
pnpm dev
```

执行测试和生产构建：

```bash
pnpm test
pnpm build
```

代码检查和自动修复：

```bash
pnpm lint
pnpm lint:fix
pnpm typecheck
```

## 项目文档

仓库公开并推送到 GitHub 后，可通过
[DeepWiki](https://deepwiki.com/ZvonimirSun/leaflet-side-by-side)
浏览代码文档并针对项目提问。

## 开源许可证

[MIT](./LICENSE)。本项目基于原 `leaflet-side-by-side` 的 MIT 许可实现。
