import type { DividerMoveEvent } from '../src'
import * as L from 'leaflet'
import { describe, expect, it, vi } from 'vitest'
import * as packageExports from '../src'
import { sideBySide } from '../src'

type LayerInput = Parameters<typeof sideBySide>[0]
type SideBySideControl = ReturnType<typeof sideBySide>

interface TestLayerInstance extends L.Layer {
  getContainer: () => HTMLElement
}

interface TestLayerConstructor {
  new (): TestLayerInstance
}

const TestLayer = L.Layer.extend({
  onAdd(this: TestLayerInstance & { _container?: HTMLElement }, map: L.Map): void {
    this._container = L.DomUtil.create('div', 'test-layer', map.getPane('tilePane'))
  },

  onRemove(this: TestLayerInstance & { _container?: HTMLElement }): void {
    this._container?.remove()
  },

  getContainer(this: TestLayerInstance & { _container?: HTMLElement }): HTMLElement {
    return this._container!
  },
}) as unknown as TestLayerConstructor

function createMap(): L.Map {
  const container = document.createElement('div')
  document.body.append(container)

  const map = L.map(container, {
    attributionControl: false,
    center: [0, 0],
    zoom: 0,
    zoomControl: false,
  })

  vi.spyOn(map, 'getSize').mockReturnValue(L.point(800, 600))
  vi.spyOn(map, 'containerPointToLayerPoint').mockImplementation(
    point => L.point(point),
  )
  return map
}

function addLayers(map: L.Map, count: number): TestLayerInstance[] {
  return Array.from({ length: count }, () => new TestLayer().addTo(map))
}

function createControl(
  leftLayers: LayerInput,
  rightLayers: LayerInput,
): SideBySideControl {
  return sideBySide(leftLayers, rightLayers)
}

describe('sideBySide', () => {
  it('只公开构造器和工厂函数', () => {
    expect(Object.keys(packageExports).sort()).toEqual(['SideBySide', 'sideBySide'])
  })

  it('会归一化单图层并裁剪列表中的全部活动图层', () => {
    const map = createMap()
    const [leftA, leftB, rightA, rightB] = addLayers(map, 4)
    const control = createControl([leftA, leftB], [rightA, rightB]).addTo(map)

    expect(leftA.getContainer().style.clipPath).toBe('polygon(0px 0px, 400px 0px, 400px 600px, 0px 600px)')
    expect(leftB.getContainer().style.clipPath).toBe('polygon(0px 0px, 400px 0px, 400px 600px, 0px 600px)')
    expect(rightA.getContainer().style.clipPath).toBe('polygon(400px 0px, 800px 0px, 800px 600px, 400px 600px)')
    expect(rightB.getContainer().style.clipPath).toBe('polygon(400px 0px, 800px 0px, 800px 600px, 400px 600px)')

    control.setLeftLayers(leftA)
    expect(leftA.getContainer().style.clipPath).toBe('polygon(0px 0px, 400px 0px, 400px 600px, 0px 600px)')
    expect(leftB.getContainer().style.visibility).toBe('hidden')
  })

  it('使用地图容器比例或像素设置并保留卷帘位置', () => {
    const map = createMap()
    const [left, right] = addLayers(map, 2)
    const control = createControl(left, right)
    const positions: number[] = []

    expect(control.setPositionRatio(0.25)).toBe(control)
    control.on('dividermove', (event) => {
      positions.push((event as DividerMoveEvent).x)
    })
    control.addTo(map)

    expect(control.getPosition()).toBe(200)
    expect(left.getContainer().style.clipPath).toBe('polygon(0px 0px, 200px 0px, 200px 600px, 0px 600px)')
    expect(right.getContainer().style.clipPath).toBe('polygon(200px 0px, 800px 0px, 800px 600px, 200px 600px)')

    control.setPosition(300)
    expect(control.getPosition()).toBeCloseTo(300)
    expect(positions.at(-1)).toBeCloseTo(300)

    control.remove()
    control.addTo(map)
    expect(control.getPosition()).toBeCloseTo(300)
  })

  it('将比例边界映射到地图容器边界', () => {
    const map = createMap()
    const [left, right] = addLayers(map, 2)
    const control = createControl(left, right).addTo(map)

    control.setPositionRatio(0)
    expect(control.getPosition()).toBe(0)

    control.setPositionRatio(1)
    expect(control.getPosition()).toBe(800)
  })

  it('将滑块内边距转换为可拖动的比例边界', () => {
    const map = createMap()
    const [left, right] = addLayers(map, 2)
    sideBySide(left, right, { padding: 20 })
      .setPositionRatio(0.5)
      .addTo(map)

    const range = map.getContainer().querySelector<HTMLInputElement>('.leaflet-sbs-range')!
    expect(range.min).toBe(String((20 + 42 / 2) / 800))
    expect(range.max).toBe(String(1 - (20 + 42 / 2) / 800))
  })

  it('支持纵向裁剪并按地图高度设置位置', () => {
    const map = createMap()
    const [top, bottom] = addLayers(map, 2)
    const positions: DividerMoveEvent[] = []
    const control = sideBySide(top, bottom, { direction: 'vertical' })
      .setPositionRatio(0.25)

    control.on('dividermove', event => positions.push(event as DividerMoveEvent))
    control.addTo(map)

    expect(control.getPosition()).toBe(150)
    expect(top.getContainer().style.clipPath).toBe('polygon(0px 0px, 800px 0px, 800px 150px, 0px 150px)')
    expect(bottom.getContainer().style.clipPath).toBe('polygon(0px 150px, 800px 150px, 800px 600px, 0px 600px)')

    control.setPosition(300)
    expect(control.getPosition()).toBeCloseTo(300)
    expect(positions.at(-1)).toMatchObject({ x: 300, y: 300 })

    control.setPositionRatio(0)
    expect(control.getPosition()).toBe(0)
    control.setPositionRatio(1)
    expect(control.getPosition()).toBe(600)
  })

  it('按纵向尺寸限制滑块并应用纵向样式', () => {
    const map = createMap()
    const [top, bottom] = addLayers(map, 2)
    sideBySide(top, bottom, { direction: 'vertical', padding: 20 }).addTo(map)

    const container = map.getContainer().querySelector<HTMLElement>('.leaflet-sbs')!
    const range = container.querySelector<HTMLInputElement>('.leaflet-sbs-range')!
    const divider = container.querySelector<HTMLElement>('.leaflet-sbs-divider')!

    expect(container.classList.contains('leaflet-sbs-vertical')).toBe(true)
    expect(range.getAttribute('aria-orientation')).toBe('vertical')
    expect(range.style.width).toBe('600px')
    expect(range.min).toBe(String((20 + 42 / 2) / 600))
    expect(range.max).toBe(String(1 - (20 + 42 / 2) / 600))
    expect(divider.style.top).toBe('300px')

    vi.mocked(map.getSize).mockReturnValue(L.point(800, 700))
    map.fire('resize')
    expect(range.style.width).toBe('700px')
    expect(divider.style.top).toBe('350px')
  })

  it('会完整显示左右两侧共有的图层并隐藏未声明图层', () => {
    const map = createMap()
    const [shared, unassigned] = addLayers(map, 2)
    shared.getContainer().style.clipPath = 'inset(2px)'

    createControl([shared], [shared]).addTo(map)

    expect(shared.getContainer().style.clipPath).toBe('inset(2px)')
    expect(shared.getContainer().style.visibility).toBe('')
    expect(unassigned.getContainer().style.clipPath).toBe('polygon(0px 0px, 0px 0px, 0px 0px, 0px 0px)')
    expect(unassigned.getContainer().style.visibility).toBe('hidden')
  })

  it('会为每个活动图层触发兼容的增删事件', () => {
    const map = createMap()
    const [leftA, leftB, right] = addLayers(map, 3)
    const control = createControl([leftA, leftB], right)
    const leftAdds: L.Layer[] = []
    const leftRemoves: L.Layer[] = []
    const rightAdds: L.Layer[] = []

    control.on('leftlayeradd', event => leftAdds.push(event.layer))
    control.on('leftlayerremove', event => leftRemoves.push(event.layer))
    control.on('rightlayeradd', event => rightAdds.push(event.layer))
    control.addTo(map)

    expect(leftAdds).toEqual([leftA, leftB])
    expect(rightAdds).toEqual([right])

    control.setLeftLayers(leftB)
    expect(leftRemoves).toEqual([leftA])
  })

  it('会在动态增删图层时更新裁剪和事件', () => {
    const map = createMap()
    const [left] = addLayers(map, 1)
    const right = new TestLayer()
    const control = createControl(left, right).addTo(map)
    const rightAdds: L.Layer[] = []
    const rightRemoves: L.Layer[] = []

    control.on('rightlayeradd', event => rightAdds.push(event.layer))
    control.on('rightlayerremove', event => rightRemoves.push(event.layer))

    right.addTo(map)
    expect(rightAdds).toEqual([right])
    expect(right.getContainer().style.clipPath).toBe('polygon(400px 0px, 800px 0px, 800px 600px, 400px 600px)')

    const element = right.getContainer()
    right.remove()
    expect(rightRemoves).toEqual([right])
    expect(element.style.clipPath).toBe('')
    expect(element.style.visibility).toBe('')
  })

  it('会在控件移除时恢复所有图层的原始样式', () => {
    const map = createMap()
    const [left, right, unassigned] = addLayers(map, 3)
    left.getContainer().style.visibility = 'visible'
    unassigned.getContainer().style.clipPath = 'inset(2px)'
    const control = createControl(left, right).addTo(map)

    control.remove()

    expect(left.getContainer().style.clipPath).toBe('')
    expect(left.getContainer().style.visibility).toBe('visible')
    expect(right.getContainer().style.clipPath).toBe('')
    expect(unassigned.getContainer().style.clipPath).toBe('inset(2px)')
    expect(unassigned.getContainer().style.visibility).toBe('')
  })
})
