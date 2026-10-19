# Home Dashboard Card

A minimalist but feature-rich Home Assistant dashboard card. Room tabs, with each room split into
**Lighting**, **Climate** and **Media** sections. Every section has live stats above its controls.

- Rooms discovered from your Home Assistant areas, with a visual editor to include / exclude entities
- Full-screen layout on phones, optional glass style
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

Create a dashboard with a single full-width card (a `panel: true` view) and add **Home dashboard**
from the card picker. With no configuration, the card makes one room per Home Assistant area and fills it
with that area's entities:

| Group    | Picked up automatically |
|----------|-------------------------|
| Lighting | `light.*` (one card per area), curtains/blinds (`cover.*`), presence/occupancy/motion and door sensors |
| Climate  | `fan.*`, `climate.*`, temperature / humidity / PM2.5 / CO₂ sensors |
| Media    | `media_player.*` |

Entities are matched through their own area or their device's area. Hidden entities and
diagnostic/config entities are skipped, and so is a light group whose members are all in the room already.

### Visual editor

Open the card editor to:

- untick any discovered entity to exclude it, or add one that isn't in the area (switches can be added as a light or fan)
- rename, hide or re-assign a room to a different area, or add a room with no area
- choose the theme, the default room and the mobile layout

All of it is saved as YAML, so you can also write it by hand:

```yaml
type: custom:home-dashboard-card
theme: auto            # auto | light | dark
mobile_layout: fill    # fill | cover | card (see below)
style: solid           # solid | glass
background: /local/wallpaper.jpg   # optional, shown behind the glass
auto_discover: true    # add a room for every HA area
default_room: living_room
rooms:                 # only the rooms you want to change
  - area: living_room
    exclude: [light.tv_backlight, sensor.living_room_aircon_temperature]
    include:
      - switch.kitchen_fan_plug            # guessed: switches named "fan" -> fan, others -> light
      - { entity: switch.lamp, role: light, name: Floor lamp }
  - area: garage
    hidden: true
  - name: Outdoor                          # a room with no area
    include: [light.garden, light.porch]
scenes:                # "All off" is built in
  - name: Evening
    actions:
      - service: light.turn_on
        target: { entity_id: light.living_room_lights }
        data: { brightness_pct: 40 }
```

A room can cover more than one area (`area: [living_room, entrance]`). It then gets one light card
per area. Valid `role` values are `light`, `cover`, `presence`, `door`, `fan`, `climate`,
`temperature`, `humidity`, `pm25`, `co2` and `media`.

### Mobile layout

On screens narrower than 520px:

- `fill` (default): the card goes edge to edge with no rounded corners and fills the height below the HA header
- `cover`: the card covers the whole screen, HA header included, and scrolls on its own. It goes back to `fill` while the dashboard is being edited
- `card`: keeps the regular card look

Phones always get at most two cards per row. An odd card at the end stays half width.

### Glass style

`style: glass` uses translucent, blurred cards with a bright edge over a wallpaper, similar to
iOS. It works in light and dark mode. Without `background` you get a built-in gradient. Put your
own image in `config/www/` and set `background: /local/<file>`. If your device has *Reduce
transparency* turned on, the cards become solid.

### Manual rooms (older configs)

Rooms can still list their entities explicitly. These keys work with or without `area`, and are added
to whatever the area discovers:

```yaml
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

If no room in the config has an `area`, `auto_discover` defaults to `false`, so an existing manual
setup looks exactly as before. Set `auto_discover: true` to add your other areas as well.

Sections, stats and cards for missing or unavailable entities are hidden automatically. A media
dropdown only appears when a room has more than one media device.
