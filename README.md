# EAN List Bridge

> A simple REST Service with adapter-like integrations into various EAN Database Sources, Shopping List APIs and Message Bots

## Features

- Add EAN's to your shopping list (eg. to Bring! Shopping Lists)
- Add unknown products via Messaging Services (eg. Telegram) and cache them with SQLite - This only needs to be done once for each unknown EAN.
- Get notified via Messaging Service as soon as new products were added to your list

## Configuration

See the [example Config](./config/example.config.json) for a standard config using the OpenGTINDB API, Bring! API and Telegram Bot API.

You can define multiple `services` in your config which will each have their own adapters. This is nice if you want to have multiple lists or want to use multiple ESP32's as scanners. Each `service` will get their own API-Endpoint, defined by it's `serviceName`.

If you define a service called `default`, the following API Endpoint can be used:

```
POST localhost:3000/api/v1/service/default/scan

Authorization: Token someSecretToken

{
  "ean": "12345678"
}
```

There might be new Adapters in the future. Please see the README of the adapter you would like to use for more information on Configuration.

### Source Adapters
- [OpenGTINDB](./src/adapters/source/opengtindb/README.md)

### List Adapters
- [Bring!](./src/adapters/list/bring/README.md)

### Bot Adapters
- [Telegram](./src/adapters/bot/telegram/README.md)

# ESP32 EAN Scanner

Want to build your own scanner to just scan empty packages and automatically add them to your shopping list? Just put it near to your trash bin and you'll never have to add products again manually (if the EAN is known to the selected EAN-Database provider).

## Components

- ESP32 (Whichever you like, I recommend a simple ESP32 Dev Module like the ESP32-WROOM)
- GM861 Barcode Scanner

You can get these components for under 20€ at AliExpress!

### How-To

1. Connect your GM861 Module to your ESP32 (I use 3.3v, GND and GPIO16)
2. Install ESPHome on your ESP32. [Install EPSHome in HomeAssistant](https://esphome.io/guides/getting_started_hassio.html) / [Install ESPHome in Standalone Mode](https://esphome.io/guides/installing_esphome.html)

Then use this yaml Configuration for ESPHome (Replace everything in \<brackets\>):

```yaml
esphome:
  name: <name>
  friendly_name: <friendly_name>

esp32:
  board: esp32dev
  framework:
    type: esp-idf

# Enable HTTP requests
http_request:
  useragent: esphome/<name>
  timeout: 10s

ota:
  - platform: esphome
    password: "<random_password>"

wifi:
  ssid: !secret wifi_ssid
  password: !secret wifi_password

  # Enable fallback hotspot (captive portal) in case wifi connection fails
  ap:
    ssid: "<name> Fallback Hotspot"
    password: "<random_password>"

captive_portal:

logger:
  baud_rate: 0  # disables logging over UART0 so UART2 can be used freely

# Disable this if you're installing ESPHome in standalone mode and without a local Home-Assistant installation
api:
  encryption:
    key: "<random_key>"

globals:
  - id: barcode_buffer
    type: std::string
    initial_value: ""

script:
  - id: handle_barcode
    then:
      - http_request.post:
          url: "http://<server_ip>:3000/api/v1/service/<service_name>/scan"
          request_headers:
            Content-Type: "application/json"
            Authorization: "Token <service_api_token>"
          body: !lambda |-
            return std::string("{\"ean\":\"") + id(barcode_buffer) + "\"}";

uart:
  id: scanner_uart
  rx_pin: GPIO16
  baud_rate: 9600

interval:
  - interval: 100ms
    then:
      - lambda: |-
          static std::string buffer;
          uint8_t c;
          while (id(scanner_uart).available() > 0) {
            id(scanner_uart).read_byte(&c);
            if (c == '\n' || c == '\r') {
              if (!buffer.empty()) {
                id(barcode_buffer) = buffer;
                buffer.clear();
                id(handle_barcode).execute();
              }
            } else {
              buffer += c;
            }
          }

```