import * as L from 'leaflet'
import './style.css'

export type LayerInput = L.Layer | readonly L.Layer[] | undefined

export interface SideBySideOptions extends L.ControlOptions {
  padding?: number
  thumbSize?: number
}

export interface DividerMoveEvent extends L.LeafletEvent {
  x: number
}

export interface SideBySideLayerEvent extends L.LeafletEvent {
  layer: L.Layer
}

interface SideBySideMethods {
  addTo: (map: L.Map) => SideBySideControl
  getPosition: () => number
  remove: () => SideBySideControl
  setLeftLayers: (layers: LayerInput) => SideBySideControl
  setPosition: (position?: L.ControlPosition) => SideBySideControl
  setRightLayers: (layers: LayerInput) => SideBySideControl
}

export type SideBySideControl = L.Evented
  & Omit<L.Control<SideBySideOptions>, keyof SideBySideMethods>
  & SideBySideMethods

export interface SideBySideConstructor {
  new (
    leftLayers: LayerInput,
    rightLayers: LayerInput,
    options?: SideBySideOptions,
  ): SideBySideControl
}

type LayerElement = HTMLElement | SVGElement

interface OriginalStyle {
  clipPath: string
  visibility: string
}

interface TapHandler {
  disable: () => void
  enable: () => void
  enabled: () => boolean
}

type SideBySideMap = L.Map & {
  _controlContainer: HTMLElement
  tap?: TapHandler
}

type InternalSideBySide = SideBySideControl & {
  _activeLeftLayers: Set<L.Layer>
  _activeRightLayers: Set<L.Layer>
  _addEvents: () => void
  _cancelMapDrag: () => void
  _container: HTMLElement
  _divider: HTMLElement
  _leftLayers: L.Layer[]
  _map: SideBySideMap | null
  _mapWasDragEnabled: boolean
  _mapWasTapEnabled: boolean
  _originalStyles: Map<LayerElement, OriginalStyle>
  _range: HTMLInputElement
  _refocusOnMap: (event: Event) => void
  _removeEvents: () => void
  _restoreElement: (element: LayerElement) => void
  _restoreElements: () => void
  _rightLayers: L.Layer[]
  _uncancelMapDrag: (event: Event) => void
  _updateClip: () => void
  _updateLayers: () => InternalSideBySide
}

const LEFT = 1
const RIGHT = 2

function asArray(layers: LayerInput): L.Layer[] {
  if (layers === undefined)
    return []

  return Array.isArray(layers) ? [...layers] : [layers as L.Layer]
}

function getRangeEvent(range: HTMLInputElement): 'change' | 'input' {
  return 'oninput' in range ? 'input' : 'change'
}

function getLayerElement(layer: L.Layer): LayerElement | undefined {
  const candidate = layer as L.Layer & {
    getContainer?: () => LayerElement | null
    getElement?: () => LayerElement | null
  }

  return candidate.getContainer?.() ?? candidate.getElement?.() ?? undefined
}

function fireLayerChanges(
  control: InternalSideBySide,
  previous: Set<L.Layer>,
  next: Set<L.Layer>,
  addEvent: 'leftlayeradd' | 'rightlayeradd',
  removeEvent: 'leftlayerremove' | 'rightlayerremove',
): void {
  previous.forEach((layer) => {
    if (!next.has(layer))
      control.fire(removeEvent, { layer })
  })
  next.forEach((layer) => {
    if (!previous.has(layer))
      control.fire(addEvent, { layer })
  })
}

export const SideBySide = L.Control.extend({
  options: {
    padding: 0,
    thumbSize: 42,
  },

  includes: L.Evented.prototype,

  initialize(
    this: InternalSideBySide,
    leftLayers: LayerInput,
    rightLayers: LayerInput,
    options?: SideBySideOptions,
  ): void {
    this._map = null
    this._leftLayers = []
    this._rightLayers = []
    this._activeLeftLayers = new Set()
    this._activeRightLayers = new Set()
    this._originalStyles = new Map()
    this._mapWasDragEnabled = false
    this._mapWasTapEnabled = false
    this.setLeftLayers(leftLayers)
    this.setRightLayers(rightLayers)
    L.setOptions(this, options)
  },

  getPosition(this: InternalSideBySide): number {
    const rangeValue = this._range.valueAsNumber
    const value = Number.isNaN(rangeValue) ? Number(this._range.value) : rangeValue
    const offset = (0.5 - value) * (2 * this.options.padding! + this.options.thumbSize!)
    return this._map!.getSize().x * value + offset
  },

  setPosition(this: InternalSideBySide): SideBySideControl {
    return this
  },

  addTo(this: InternalSideBySide, map: SideBySideMap): SideBySideControl {
    this.remove()
    this._map = map

    this._container = L.DomUtil.create('div', 'leaflet-sbs', map._controlContainer)
    this._divider = L.DomUtil.create('div', 'leaflet-sbs-divider', this._container)
    this._range = L.DomUtil.create('input', 'leaflet-sbs-range', this._container)
    this._range.type = 'range'
    this._range.min = '0'
    this._range.max = '1'
    this._range.step = 'any'
    this._range.value = '0.5'
    this._range.style.paddingLeft = `${this.options.padding}px`
    this._range.style.paddingRight = `${this.options.padding}px`

    this._addEvents()
    this._updateLayers()
    return this
  },

  remove(this: InternalSideBySide): SideBySideControl {
    if (!this._map)
      return this

    this._restoreElements()
    this._removeEvents()
    L.DomUtil.remove(this._container)
    this._activeLeftLayers.clear()
    this._activeRightLayers.clear()
    this._map = null
    return this
  },

  setLeftLayers(this: InternalSideBySide, layers: LayerInput): SideBySideControl {
    this._leftLayers = asArray(layers)
    this._updateLayers()
    return this
  },

  setRightLayers(this: InternalSideBySide, layers: LayerInput): SideBySideControl {
    this._rightLayers = asArray(layers)
    this._updateLayers()
    return this
  },

  _updateLayers(this: InternalSideBySide): InternalSideBySide {
    if (!this._map)
      return this

    const nextLeft = new Set(this._leftLayers.filter(layer => this._map!.hasLayer(layer)))
    const nextRight = new Set(this._rightLayers.filter(layer => this._map!.hasLayer(layer)))

    fireLayerChanges(this, this._activeLeftLayers, nextLeft, 'leftlayeradd', 'leftlayerremove')
    fireLayerChanges(this, this._activeRightLayers, nextRight, 'rightlayeradd', 'rightlayerremove')

    this._activeLeftLayers = nextLeft
    this._activeRightLayers = nextRight
    this._updateClip()
    return this
  },

  _updateClip(this: InternalSideBySide): void {
    if (!this._map)
      return

    const nw = this._map.containerPointToLayerPoint([0, 0])
    const se = this._map.containerPointToLayerPoint(this._map.getSize())
    const dividerX = this.getPosition()
    const clipX = nw.x + dividerX
    const clipLeft = `polygon(${nw.x}px ${nw.y}px, ${clipX}px ${nw.y}px, ${clipX}px ${se.y}px, ${nw.x}px ${se.y}px)`
    const clipRight = `polygon(${clipX}px ${nw.y}px, ${se.x}px ${nw.y}px, ${se.x}px ${se.y}px, ${clipX}px ${se.y}px)`
    const currentElements = new Map<LayerElement, number>()

    this._divider.style.left = `${dividerX}px`
    this.fire('dividermove', { x: dividerX })

    this._map.eachLayer((layer) => {
      const element = getLayerElement(layer)
      if (!element)
        return

      const role
        = (this._activeLeftLayers.has(layer) ? LEFT : 0)
          | (this._activeRightLayers.has(layer) ? RIGHT : 0)
      currentElements.set(element, (currentElements.get(element) ?? 0) | role)
    })

    this._originalStyles.forEach((_style, element) => {
      if (!currentElements.has(element)) {
        this._restoreElement(element)
        this._originalStyles.delete(element)
      }
    })

    currentElements.forEach((role, element) => {
      if (!this._originalStyles.has(element)) {
        this._originalStyles.set(element, {
          clipPath: element.style.clipPath,
          visibility: element.style.visibility,
        })
      }

      const original = this._originalStyles.get(element)!
      element.style.visibility = role === 0 ? 'hidden' : original.visibility

      if (role === LEFT)
        element.style.clipPath = clipLeft
      else if (role === RIGHT)
        element.style.clipPath = clipRight
      else if (role === (LEFT | RIGHT))
        element.style.clipPath = original.clipPath
      else
        element.style.clipPath = 'polygon(0px 0px, 0px 0px, 0px 0px, 0px 0px)'
    })
  },

  _restoreElement(this: InternalSideBySide, element: LayerElement): void {
    const original = this._originalStyles.get(element)
    if (!original)
      return

    element.style.clipPath = original.clipPath
    element.style.visibility = original.visibility
  },

  _restoreElements(this: InternalSideBySide): void {
    this._originalStyles.forEach((_style, element) => this._restoreElement(element))
    this._originalStyles.clear()
  },

  _cancelMapDrag(this: InternalSideBySide): void {
    if (!this._map)
      return

    this._mapWasDragEnabled = this._map.dragging.enabled()
    this._mapWasTapEnabled = this._map.tap?.enabled() ?? false
    this._map.dragging.disable()
    this._map.tap?.disable()
  },

  _uncancelMapDrag(this: InternalSideBySide, event: Event): void {
    if (!this._map)
      return

    this._refocusOnMap(event)
    if (this._mapWasDragEnabled)
      this._map.dragging.enable()
    if (this._mapWasTapEnabled)
      this._map.tap?.enable()
  },

  _addEvents(this: InternalSideBySide): void {
    if (!this._map || !this._range)
      return

    this._map.on('move', this._updateClip, this)
    this._map.on('layeradd layerremove', this._updateLayers, this)
    L.DomEvent.on(this._range, getRangeEvent(this._range), this._updateClip, this)
    L.DomEvent.on(this._range, 'touchstart mousedown', this._cancelMapDrag, this)
    L.DomEvent.on(this._range, 'touchend mouseup', this._uncancelMapDrag, this)
  },

  _removeEvents(this: InternalSideBySide): void {
    if (this._range) {
      L.DomEvent.off(this._range, getRangeEvent(this._range), this._updateClip, this)
      L.DomEvent.off(this._range, 'touchstart mousedown', this._cancelMapDrag, this)
      L.DomEvent.off(this._range, 'touchend mouseup', this._uncancelMapDrag, this)
    }
    if (this._map) {
      this._map.off('layeradd layerremove', this._updateLayers, this)
      this._map.off('move', this._updateClip, this)
    }
  },
}) as unknown as SideBySideConstructor

export function sideBySide(leftLayers: LayerInput, rightLayers: LayerInput, options?: SideBySideOptions) {
  return new SideBySide(leftLayers, rightLayers, options)
}
