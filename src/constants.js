export const CLIMATE_ID = "climate.varmepumpe";
export const NORDPOOL_ID = "sensor.nordpool_kwh_no3_nok_1_10_025";
export const TIBBER_ID = "sensor.tibber_strom_pris";
export const LEAF_ID = "sensor.leaf_battery_level";
export const WEATHER_ENTITY = "weather.hjem";
export const OUTSIDE_TEMP_ID = "sensor.utetemperatur_midttunet_temperature";
export const OYVIND_ID = "person.oyvind";
export const TUVA_ID = "person.tuva";
export const LIGHT_KJOKKEN = "light.kjokken";
export const LIGHT_STOVA = "light.stova";
export const LIGHT_STUDIO = "light.studioet_kontorpult";
export const REFRIGERATOR_ID = "binary_sensor.kjoleskap";
export const EILEV_DOOR_ID = "binary_sensor.dorsensor_eilev_opening_2";
export const OLVE_DOOR_ID = "binary_sensor.kleven_dor_sensor_contact";
export const STUDIO_PRESENCE_ID = "binary_sensor.studioet_opphld_presence";
export const ROCKY_ID = "vacuum.rocky";
export const ROCKY_ROOM_ID = "sensor.rocky_rom";
export const PORTEN_MOTION_ID = "binary_sensor.bevegelsessensor_porten";
export const GARAGE_DOOR_ID = "binary_sensor.garasjeport_contact";
export const CAMERA_PORTEN_ID = "camera.porten";
export const OYVIND_BAT_LEVEL = "sensor.pixel_9_pro_xl_battery_level";
export const OYVIND_BAT_STATE = "sensor.pixel_9_pro_xl_battery_state";
export const SHIELD_ID = "media_player.shieldtv";
export const SHIELD_REMOTE_ID = "remote.shield";
export const LEAF_CLIMATE = "climate.leaf_climate";
export const COST_TODAY_ID = "sensor.tibber_forbruk_kroner";
export const COST_MONTH_ID = "sensor.monthly_cost_midttunet";
export const BIBLIOTEK_SESSIONS_ID = "sensor.bibliotek_sessions";
export const MEDIA_PLAYER_IDS = [
  "media_player.bibliotek_sander_tv_65",
  "media_player.bibliotek_hilde_tv",
  "media_player.bibliotek_stue",
  "media_player.bibliotek_gaute_tv",
  "media_player.bibliotek_shield_tv",
  "media_player.bibliotek_google_chrome_windows_3",
  "media_player.midttunet_shield_tv_2",
  "media_player.midttunet_pixel_9_pro_xl",
  "media_player.bibliotek_oyvind_sin_tab_a9",
  "media_player.bibliotek_galaxy_tab_s7",
  "media_player.bibliotek_desktop_9ubckf5",
  "media_player.bibliotek_oneplus_nord2_5g",
  "media_player.bibliotek_chromecast",
  "media_player.bibliotek_chromecast_2",
  "media_player.bibliotek_google_tv_3",
  "media_player.bibliotek_google_chrome_windows",
  "media_player.bibliotek_google_chrome_windows_2",
  "media_player.bibliotek_telia_box",
  "media_player.bibliotek_bibliotek",
  "media_player.bibliotek_samsung_tv_vindheim",
  "media_player.bibliotek_pixel_9a",
  "media_player.bibliotek_chromecast_3",
  "media_player.bibliotek_familiestue",
  "media_player.bibliotek_get_box_asbjorn",
  "media_player.bibliotek_chromecast_4",
  "media_player.bibliotek_chromecast_5",
  "media_player.midttunet_android",
  "media_player.bibliotek_eple",
  "media_player.midttunet_pixel_9_pro_xl_2",
  "media_player.bibliotek_android_2"
];
export const SONOS_IDS = [
  "media_player.sonos_play_1",
  "media_player.sonos_lydplanke",
  "media_player.sonos_kjokken",
  "media_player.sonos_platespelar"
];
export const LEAF_LOCATION = "device_tracker.leaf_location";
export const LEAF_PLUGGED = "binary_sensor.leaf_plugged_in";
export const LEAF_CHARGING = "binary_sensor.leaf_charging";
export const LEAF_UPDATE = "button.leaf_update_data";
export const LEAF_RANGE = "sensor.leaf_range_ac_off";
export const LEAF_LAST_UPDATED = "sensor.leaf_last_updated";
export const LEAF_INTERNAL_TEMP = "sensor.leaf_internal_temperature";

export const HVAC_MAP = {
  off: "Av",
  heat_cool: "Auto",
  cool: "Kjøling",
  dry: "Tørking",
  fan_only: "Vifte",
  heat: "Varme"
};

export const FAN_MAP = {
  Auto: "Auto",
  Low: "Låg",
  LowMid: "Låg-Middels",
  Mid: "Middels",
  HighMid: "Høg-Middels",
  High: "Høg"
};

export const SWING_MAP = {
  Auto: "Auto",
  Up: "Opp",
  UpMid: "Opp-Middels",
  Mid: "Middels",
  DownMid: "Ned-Middels",
  Down: "Ned",
  Swing: "Sving"
};
