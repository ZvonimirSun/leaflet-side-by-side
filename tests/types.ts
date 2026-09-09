import type * as L from 'leaflet'
import type {
  DividerMoveEvent,
  LayerInput,
  SideBySideConstructor,
  SideBySideControl,
  SideBySideLayerEvent,
  SideBySideOptions,
} from '../src'
import { sideBySide, SideBySide } from '../src'

declare const layer: L.Layer
declare const layers: L.Layer[]

const input: LayerInput = layers
const options: SideBySideOptions = {
  direction: 'vertical',
  excludeFeatureGroup: true,
  hideOtherLayers: false,
  padding: 4,
}
const constructor: SideBySideConstructor = SideBySide
const fromConstructor: SideBySideControl = new SideBySide(layer, layers)
const fromFactory: SideBySideControl = sideBySide(layers, layer, {
  padding: 4,
  thumbSize: 36,
})

fromConstructor.setLeftLayers(layers)
fromConstructor.setPositionRatio(0.25)
fromFactory.setPosition(300)
fromFactory.setRightLayers(layer)

const onLayerChange = (event: SideBySideLayerEvent) => event.layer
const onDividerMove = (event: DividerMoveEvent) => event.x
const onVerticalDividerMove = (event: DividerMoveEvent) => event.y

// @ts-expect-error 左右图层参数都是必需的
const missingRightLayers = new SideBySide(layer)

// @ts-expect-error 只接受 Leaflet 图层或图层数组
const invalidLeftLayers = sideBySide('left', layer)

// @ts-expect-error 只接受横向或纵向
const invalidDirection = sideBySide(layer, layer, { direction: 'diagonal' })

// @ts-expect-error 只接受布尔值
const invalidHideOtherLayers = sideBySide(layer, layer, { hideOtherLayers: 'yes' })

// @ts-expect-error 只接受布尔值
const invalidExcludeFeatureGroup = sideBySide(layer, layer, { excludeFeatureGroup: 1 })

void missingRightLayers
void invalidLeftLayers
void invalidDirection
void invalidHideOtherLayers
void invalidExcludeFeatureGroup
void input
void options
void constructor
void onLayerChange
void onDividerMove
void onVerticalDividerMove
