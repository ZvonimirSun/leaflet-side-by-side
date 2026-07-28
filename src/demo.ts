import * as L from 'leaflet'
import { sideBySide } from './index'
import 'leaflet/dist/leaflet.css'
import './demo.css'

const attribution
  = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'

function createTileLayer(style: string): L.TileLayer {
  return L.tileLayer(
    `https://{s}.basemaps.cartocdn.com/${style}/{z}/{x}/{y}{r}.png`,
    {
      attribution,
      maxZoom: 20,
      subdomains: 'abcd',
    },
  )
}

const map = L.map('map', {
  center: [31.2304, 121.4737],
  zoom: 12,
})

const lightMap = createTileLayer('light_nolabels')
const lightLabels = createTileLayer('light_only_labels')
const darkMap = createTileLayer('dark_nolabels')
const darkLabels = createTileLayer('dark_only_labels')

const leftLayers = [lightMap, lightLabels]
const rightLayers = [darkMap, darkLabels]

for (const layer of [...leftLayers, ...rightLayers])
  layer.addTo(map)

sideBySide(leftLayers, rightLayers).addTo(map)
L.control.scale({ imperial: false }).addTo(map)
