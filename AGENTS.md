# Leaflet Side by Side Agent 指南

本文档用于帮助协作 Agent 快速理解并维护 `leaflet-side-by-side`。本项目是一个
准备公开发布到 npm 的 Leaflet 图层对比插件，目标是在兼容原
`leaflet-side-by-side` 公开 API 的基础上提供更完整、可靠且类型友好的实现。

## 常用命令

日常改动优先使用 `pnpm lint`、`pnpm typecheck` 和聚焦测试。只有用户明确要求、
排查生产构建问题，或改动影响库构建产物时，才把 `pnpm build` 作为验证步骤。

| 任务 | 命令 |
| --- | --- |
| 安装依赖 | `pnpm install` |
| 启动开发服务 | `pnpm dev` |
| 生产构建 | `pnpm build` |
| 预览生产构建 | `pnpm preview` |
| 代码检查 | `pnpm lint` |
| 自动修复 lint | `pnpm lint:fix` |
| 类型检查 | `pnpm typecheck` |

## 技术栈

- Vite、TypeScript、pnpm。
- Leaflet 作为 peer dependency，不应打包进最终产物。
- ESLint 使用 `@antfu/eslint-config`。
- 项目最终应同时提供可用的 JavaScript 产物和 TypeScript 类型声明。

## 核心目标

- 以原 `leaflet-side-by-side` 的公开参数、方法、事件和默认行为作为兼容基线。
- 修复边界场景时不得无意改变已有 API 语义。
- 新增能力应保持可选，避免影响兼容用法。
- 正确处理控件和图层的添加、移除、替换及地图销毁生命周期。
- 支持鼠标、触摸和键盘交互，并关注无障碍与移动端使用体验。
- 保持实现独立于具体瓦片服务、坐标系和业务图层。

## 代码规范

- 使用 TypeScript 编写插件核心代码，公开 API 必须有明确类型。
- 遵循 `eslint.config.mjs` 中的 Antfu 风格；提交前运行 `pnpm lint`。
- 优先使用 Leaflet 已有抽象和事件系统，不重复实现地图、图层或 DOM 基础能力。
- 不直接修改传入的图层集合或调用方对象。
- 事件监听必须在控件移除时成对清理，避免内存泄漏和重复响应。
- DOM 类名应带稳定的插件前缀，避免污染宿主页面样式。
- CSS 只约束控件自身，不覆盖 Leaflet 或宿主应用的全局样式。
- 不为简单逻辑引入新依赖；源码直接使用的依赖必须在 `package.json` 中显式声明。
- 注释用于说明兼容性、浏览器差异或非显而易见的原因，不复述代码行为。

## API 兼容约束

- 兼容 `L.control.sideBySide(leftLayers, rightLayers, options)`。
- 兼容 `L.Control.SideBySide` 及原插件公开的实例方法。
- 参数应接受原插件支持的单图层和图层集合形式。
- 公开事件的名称、触发时机和事件数据需要通过兼容测试固定。
- 调整默认值、异常处理或图层裁剪机制前，先记录原插件行为并补充测试。
- 新 API 不得占用或改变原 API 字段；必要时通过独立选项显式启用。

## Leaflet 扩展与类型设计

- 控件实现必须使用 Leaflet 原生的 `L.Control.extend({ ... })` 扩展方式，不得改写为
  `class SideBySide extends L.Control`。这既是本项目的实现约束，也是与 Leaflet
  传统插件注册、初始化钩子和继承行为保持一致的兼容要求。
- 不要直接依赖 `extend` 返回值推导公开构造器类型。Leaflet 类型定义中的
  `extend` 无法完整表达插件自定义构造参数，推导结果可能退化为宽泛构造器。
- 不要用 `typeof L.Control & SideBySideConstructor` 一类交叉类型表示公开构造器。
  交叉后会同时保留基类和插件构造签名，`new` 表达式可能匹配到错误签名，导致参数
  数量和类型提示不正确。
- 实例类型、选项类型和构造器类型应分别声明。运行时仍由 `L.Control.extend`
  创建，随后只在实现边界将返回值断言为精确构造器类型。
- 工厂函数 `L.control.sideBySide(...)` 与 `new L.Control.SideBySide(...)` 必须
  复用同一组参数类型，并通过类型测试验证两种调用方式。

推荐采用以下类型结构：

```ts
export interface SideBySideOptions extends L.ControlOptions {
  // 插件选项
}

export interface SideBySideControl extends L.Control {
  setLeftLayers: (layers: L.Layer | L.Layer[]) => this
  setRightLayers: (layers: L.Layer | L.Layer[]) => this
}

export interface SideBySideConstructor {
  new (
    leftLayers: L.Layer | L.Layer[],
    rightLayers: L.Layer | L.Layer[],
    options?: SideBySideOptions,
  ): SideBySideControl
}

const SideBySide = L.Control.extend({
  // Leaflet 风格实现
}) as unknown as SideBySideConstructor
```

- 上述 `unknown` 双重断言只能集中在 `extend` 的实现边界，不应扩散到公开方法或业务
  逻辑中。
- 如果需要公开静态成员，应在 `SideBySideConstructor` 中逐项声明真实使用的成员，
  不要为了继承全部静态类型而与 `typeof L.Control` 交叉。
- Leaflet 模块增强应单独声明 `L.Control.SideBySide` 和
  `L.control.sideBySide` 的精确签名，并让它们分别引用
  `SideBySideConstructor` 和 `SideBySideControl`。
- 为类型入口增加编译期测试，至少覆盖合法构造、工厂调用、缺少左右图层参数以及错误
  图层类型；带 `@ts-expect-error` 的错误用例必须确实触发类型错误。

## 测试与验证

- 纯逻辑改动应增加单元测试，公开 API 变更必须有兼容性测试。
- DOM 与交互改动应覆盖添加、拖动、移除、重复挂载及图层动态变化。
- 修复问题时先添加能复现问题的测试，再实现修复。
- 普通源码改动至少运行 `pnpm lint` 和 `pnpm typecheck`。
- 构建配置、导出入口或发布文件变更还应运行 `pnpm build`，并检查 npm 包内容。
- 示例页面用于人工验证，不应成为插件核心代码的隐式依赖。

## 文档与发布

- README、公开 API 文档和面向用户的项目说明使用中文，代码标识保留原文。
- 新增或修改公开参数、方法和事件时同步更新 README 与类型声明。
- README 保留 DeepWiki 入口，仓库路径变更时同步更新链接。
- npm 包名固定为 `@zvonimirsun/leaflet-side-by-side`，仓库地址为
  `https://github.com/ZvonimirSun/leaflet-side-by-side`。
- 包发布前确认 npm 包名可用、版本号正确、许可证文件存在且 `exports` 完整。
- 发布使用 GitHub Actions OIDC trusted publishing，不提交或配置长期 npm token。
- 发布包不得包含演示源码、缓存、测试产物或本地配置等无关文件。
- 不在仓库中提交 token、npm 凭据、私有 registry 地址或其他敏感信息。

## Git 与改动范围

- 修改前先检查 `git status`，仓库中可能存在用户未提交的改动。
- 不回滚、不覆盖用户改动；无关改动保持原样。
- 避免无关格式化、批量整理和无意义的 lockfile 元数据更新。
- 依赖变更必须同步提交 `package.json` 与 `pnpm-lock.yaml`。
- 大规模重命名或 API 调整前先说明范围，并把机械改动和行为改动合理拆分。
- Commit 使用常见前缀：`feat`、`fix`、`chore`、`docs`、`refactor`、`test`、
  `perf`、`style`、`build`、`ci`。
- Commit 格式为 `<type>: <中文提交内容>`，例如
  `feat: 增加垂直方向图层对比`、`fix: 修复控件移除后的事件残留`、
  `chore: 更新开发依赖`。
- 提交内容使用中文准确说明本次变更，不使用含糊的 `update`、`misc` 等描述。
- 一个提交应表达一个清晰目的；文档、工具链和功能实现按需要拆分提交。
