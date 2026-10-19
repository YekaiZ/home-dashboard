# Home Dashboard Card

A minimalist but feature-rich Home Assistant dashboard card. Room tabs, with each room split into
**Lighting**, **Climate** and **Media** sections. Every section has live stats above its controls.

- Per-area light cards (e.g. Living room + Entrance) with a group toggle and brightness slider
- Bottom sheet (modal on desktop) with the individual lights of one area
- Fan, aircon, curtain and media controls (artwork, transport, volume up/down, device dropdown)
- Sensor stats: presence, temperature, humidity, air quality (PM2.5), CO₂, door sensors
- Follows your Home Assistant light/dark theme

## Install (HACS)

1. HACS → ⋮ → **Custom repositories**
2. Add this repository's URL, category **Dashboard**
3. Download **Home Dashboard Card**, then refresh the browser
4. If the resource wasn't added automatically: Settings → Dashboards → ⋮ → Resources → add
   `/hacsfiles/home-dashboard-card/home-dashboard-card.js` as a *JavaScript module*

## Use

Create a dashboard with a single full-width card (a `panel: true` view). See
[`examples/home-dashboard.yaml`](examples/home-dashboard.yaml) for a complete setup.

```yaml
type: custom:home-dashboard-card
theme: auto            # auto | light | dark
font_family: '"Instrument Sans", sans-serif'   # optional
scenes:                # "All off" is built in
  - name: Evening
    actions:
      - service: light.turn_on
        target: { entity_id: light.living_room_lights }
        data: { brightness_pct: 40 }
rooms:
  - name: Living room
    presence: binary_sensor.example
    temperature: sensor.example_temperature
    humidity: sensor.example_humidity
    pm25: sensor.example_pm25
    co2: sensor.example_co2
    climate: climate.example_aircon
    fan: [fan.example_fan]            # fan.* gets speeds, switch.* gets on/off
    cover: cover.example_curtain
    doors: [{ name: Toilet, entity: binary_sensor.example_door }]
    media:
      - { name: Soundbar, entity: media_player.example }
    areas:                            # more than one area = one light card per area
      - name: Living room
        lights: [light.example_one, light.example_two]
      - name: Entrance
        lights: [light.example_three]
```

Every key except `name` is optional; sections, stats and cards for missing or unavailable entities
are hidden automatically. A media dropdown only appears when a room has more than one media device.
