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
const options: SideBySideOptions = { padding: 4 }
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

// @ts-expect-error 左右图层参数都是必需的
const missingRightLayers = new SideBySide(layer)

// @ts-expect-error 只接受 Leaflet 图层或图层数组
const invalidLeftLayers = sideBySide('left', layer)

void missingRightLayers
void invalidLeftLayers
void input
void options
void constructor
void onLayerChange
void onDividerMove
