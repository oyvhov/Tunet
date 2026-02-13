import React from 'react';
import { 
  Zap, Hash, Wind, Car, Settings, ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
  Flame, User, UserCheck, MapPin, X, TrendingUp, Clock, Edit2, GripVertical, Check, 
  Fan, ArrowUpDown, ArrowLeftRight, Plus, Minus, Lightbulb, RefreshCw, BatteryCharging, 
  Navigation, Thermometer, DoorOpen, Snowflake, Battery, AlertCircle, TrendingDown, 
  BarChart3, Eye, EyeOff, Play, Pause, SkipBack, SkipForward, Music, Clapperboard, 
  Server, HardDrive, Tv, Coins, Speaker, Sofa, Utensils, AirVent, LampDesk, LayoutGrid, 
  Trash2, Workflow, Home, Bed, Bath, ShowerHead, Droplets, Sun, Moon, Cloud, CloudRain, 
  Power, Wifi, Lock, Unlock, Shield, Video, Camera, Bell, Volume2, Mic, Radio, Gamepad2, 
  Laptop, Smartphone, Watch, Coffee, Beer, Armchair, ShoppingCart, Calendar, Activity, 
  Heart, Star, AlertTriangle, Warehouse, Columns, Bot, Shuffle, Repeat, Repeat1, VolumeX, 
  Volume1, Link, Unlink, Search, Palette, Download, ArrowRight, CloudSun, AlarmClock, 
  Archive, Award, Book, BookOpen, Bookmark, Briefcase, Building2, Bus, Cpu, Database, 
  DollarSign, Feather, Gift, Globe, Key, Leaf, Monitor, Paintbrush, PenTool, Plug, 
  Puzzle, Rocket, Router, Siren, Sprout, Sunrise, Sunset, Truck, Wrench, ToggleLeft, 
  ToggleRight
} from 'lucide-react';
import {
  FiHome, FiSettings, FiSun, FiMoon, FiCloud, FiCloudRain, FiWind, FiDroplet, FiZap,
  FiBattery, FiLock, FiUnlock, FiCamera, FiBell, FiWatch, FiMapPin, FiCompass, FiRadio,
  FiWifi, FiBluetooth, FiAnchor, FiActivity, FiAirplay, FiArchive, FiAward, FiBriefcase,
  FiCalendar, FiCast, FiCpu, FiDatabase, FiFeather, FiFlag, FiGift, FiGlobe, FiKey,
  FiLayers, FiLayout, FiLifeBuoy, FiMap, FiMonitor, FiMusic, FiPackage, FiPrinter,
  FiShoppingBag, FiShoppingCart, FiSpeaker, FiStar, FiTag, FiTool, FiTruck, FiUmbrella,
  FiUsers, FiVideo, FiVolume2, FiBatteryCharging
} from 'react-icons/fi';
import { BiFridge, BiSolidFridge, BiShower, BiSolidShower, BiSolidCarGarage, BiCloudSnow, BiSolidFlame, BiSolidThermometer } from 'react-icons/bi';
import { CgSmartHomeRefrigerator } from 'react-icons/cg';
import { CgThermometer, CgThermostat, CgSmartHomeHeat } from 'react-icons/cg';
import { LuRefrigerator } from 'react-icons/lu';
import { RiFridgeFill, RiFridgeLine } from 'react-icons/ri';
import { TbFridge, TbFridgeOff } from 'react-icons/tb';
import { BsThermometer, BsThermometerHalf, BsThermometerHigh, BsThermometerLow, BsThermometerSnow, BsThermometerSun, BsSnow, BsSnow2, BsSnow3 } from 'react-icons/bs';
import { FiThermometer, FiCloudSnow } from 'react-icons/fi';
import { FaTemperatureHigh, FaTemperatureLow, FaThermometer, FaTemperatureArrowDown, FaTemperatureArrowUp, FaTemperatureEmpty, FaTemperatureFull, FaTemperatureHalf, FaTemperatureQuarter, FaTemperatureThreeQuarters, FaSnowflake, FaSnowman, FaSnowplow } from 'react-icons/fa6';
import { GiCellarBarrels, GiCeilingLight, GiStairs } from 'react-icons/gi';
import {
  FaHouseChimney, FaCarSide, FaBolt, FaFan, FaLightbulb,
  FaRegSnowflake, FaDoorClosed, FaDoorOpen, FaPersonWalking, FaTree, FaCouch,
  FaKitchenSet, FaBath, FaShower, FaBed, FaPlug, FaSolarPanel, FaDroplet,
  FaGaugeHigh, FaGauge, FaFire, FaFireFlameCurved, FaSun, FaMoon, FaCloudSun,
  FaCloudMoon, FaCloudRain, FaCloudShowersHeavy, FaUmbrella, FaWind, FaLeaf,
  FaBatteryHalf, FaBatteryFull, FaBatteryEmpty, FaShieldHalved, FaLock, FaUnlock,
  FaKey, FaHouseSignal, FaWifi, FaSatelliteDish,
  FaFaucet, FaFaucetDrip, FaSink, FaSoap, FaPumpSoap, FaMugHot, FaMugSaucer,
  FaPlateWheat, FaBeerMugEmpty, FaUtensils,
  FaSeedling, FaTreeCity, FaMountainSun, FaSunPlantWilt, FaDropletSlash,
  FaBottleDroplet, FaBottleWater, FaGlassWater, FaGlassWaterDroplet,
  FaHandHoldingDroplet, FaArrowUpFromGroundWater, FaArrowUpFromWaterPump,
  FaHouseFloodWater, FaHouseFloodWaterCircleArrowRight, FaCloudShowersWater,
  FaCloudSunRain, FaTruckDroplet, FaWaterLadder, FaWater, FaTarpDroplet,
  FaStairs
} from 'react-icons/fa6';
import {
  MdHome, MdHomeFilled, MdHomeMini, MdHomeMax, MdHomeWork, MdHomeRepairService,
  MdLightbulb, MdLightbulbOutline, MdLightbulbCircle, MdLight, MdLightMode,
  MdWbIncandescent, MdWbSunny, MdWbTwilight, MdWbCloudy, MdWbShade,
  MdThermostat, MdThermostatAuto, MdAcUnit, MdAir,
  MdSensorDoor, MdSensorWindow, MdSensorOccupied, MdSensors, MdSensorsOff,
  MdDoorFront, MdDoorBack, MdDoorSliding, MdDoorbell, MdGarage,
  MdRoom, MdStairs, MdBathroom, MdBedroomBaby, MdBedroomChild, MdBedroomParent,
  MdDining, MdLiving, MdMeetingRoom, MdNoMeetingRoom, MdRoomPreferences,
  MdRoomService, MdFamilyRestroom, MdShower,
  MdPower, MdPowerOff, MdPowerSettingsNew, MdPowerInput,
  MdToggleOn, MdToggleOff, MdSwitchLeft, MdSwitchRight,
  MdSwitchAccessShortcut, MdSwitchAccessShortcutAdd,
  MdWifi, MdWifiOff, MdWifiLock, MdWifiTethering,
  MdSmartDisplay, MdSmartScreen, MdSmartToy, MdSmartphone,
  MdCamera, MdCameraAlt, MdCameraIndoor, MdCameraOutdoor,
  MdLock, MdLockOpen, MdLockOutline,
  MdKitchen, MdMicrowave, MdWash, MdDry, MdDryCleaning, MdLocalLaundryService,
  MdBlender, MdCoffeeMaker, MdCoffee,
  MdCountertops, MdRiceBowl, MdTableRestaurant, MdCookie, MdLocalDining,
  MdRestaurantMenu, MdRestaurant, MdSoupKitchen,
  MdOutlineCountertops, MdOutlineKitchen, MdOutlineMicrowave, MdOutlineRiceBowl,
  MdOutlineBlender, MdOutlineCoffeeMaker, MdOutlineCoffee, MdOutlineTableRestaurant,
  MdOutlineCookie, MdOutlineLocalDining, MdOutlineRestaurantMenu, MdOutlineRestaurant,
  MdOutlineSoupKitchen,
  MdOutlineRoom,
  MdYard, MdGrass, MdPark, MdNature, MdNaturePeople, MdOutdoorGrill,
  MdWater, MdWaterDrop, MdWaterDamage, MdWaterfallChart, MdEmojiNature,
  MdOutlineYard, MdOutlineGrass, MdOutlinePark, MdOutlineNature, MdOutlineNaturePeople,
  MdOutlineOutdoorGrill, MdOutlineWater, MdOutlineWaterDrop, MdOutlineWaterDamage,
  MdOutlineWaterfallChart, MdOutlineEmojiNature
} from 'react-icons/md';
import { Icon as MdiIcon } from '@mdi/react';
import * as mdiIcons from '@mdi/js';

export const ICON_MAP = {
  Zap, Wind, Car, Settings, Flame, User, UserCheck, MapPin, TrendingUp, Clock, 
  Edit2, Check, Fan, ArrowUpDown, ArrowLeftRight, Plus, Minus, Lightbulb, 
  RefreshCw, BatteryCharging, Navigation, Thermometer, DoorOpen, Snowflake, 
  Battery, AlertCircle, TrendingDown, BarChart3, Eye, EyeOff, Play, Pause, 
  SkipBack, SkipForward, Music, Clapperboard, Server, HardDrive, Tv, Coins,
  Speaker, Sofa, Utensils, AirVent, LampDesk, LayoutGrid, Trash2, Workflow,
  Home, Bed, Bath, ShowerHead, Droplets, Sun, Moon, Cloud, CloudRain, Power,
  Wifi, Lock, Unlock, Shield, Video, Camera, Bell, Volume2, Mic, Radio, Warehouse,
  Gamepad2, Laptop, Smartphone, Watch, Coffee, Beer, Armchair, ShoppingCart, Bot,
  Calendar, Activity, Heart, Star, AlertTriangle,
  AlarmClock, Archive, Award, Book, BookOpen, Bookmark, Briefcase, Building2,
  Bus, Cpu, Database, DollarSign, Feather, Gift, Globe, Key, Leaf, Monitor,
  Paintbrush, PenTool, Plug, Puzzle, Rocket, Router, Siren, Sprout, Sunrise,
  Sunset, Truck, Wrench, ToggleLeft, ToggleRight,
  Hash, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, X, GripVertical,
  Columns, Shuffle, Repeat, Repeat1, VolumeX, Volume1, Link, Unlink,
  Search, Palette, Download, ArrowRight, CloudSun,
  FiHome, FiSettings, FiSun, FiMoon, FiCloud, FiCloudRain, FiWind, FiDroplet, FiZap,
  FiBattery, FiLock, FiUnlock, FiCamera, FiBell, FiWatch, FiMapPin, FiCompass, FiRadio,
  FiWifi, FiBluetooth, FiAnchor, FiActivity, FiAirplay, FiArchive, FiAward, FiBriefcase,
  FiCalendar, FiCast, FiCpu, FiDatabase, FiFeather, FiFlag, FiGift, FiGlobe, FiKey,
  FiLayers, FiLayout, FiLifeBuoy, FiMap, FiMonitor, FiMusic, FiPackage, FiPrinter,
  FiShoppingBag, FiShoppingCart, FiSpeaker, FiStar, FiTag, FiTool, FiTruck, FiUmbrella,
  FiUsers, FiVideo, FiVolume2, FiBatteryCharging,
  FiThermometer, FiCloudSnow,
  BiFridge, BiSolidFridge, BiShower, BiSolidShower, BiSolidCarGarage,
  BiCloudSnow, BiSolidFlame, BiSolidThermometer,
  CgSmartHomeRefrigerator, LuRefrigerator,
  CgThermometer, CgThermostat, CgSmartHomeHeat,
  RiFridgeFill, RiFridgeLine, TbFridge, TbFridgeOff,
  BsThermometer, BsThermometerHalf, BsThermometerHigh, BsThermometerLow, BsThermometerSnow, BsThermometerSun, BsSnow, BsSnow2, BsSnow3,
  FaHouseChimney, FaCarSide, FaBolt, FaFan, FaLightbulb,
  FaRegSnowflake, FaDoorClosed, FaDoorOpen, FaPersonWalking, FaTree, FaCouch,
  FaKitchenSet, FaBath, FaShower, FaBed, FaPlug, FaSolarPanel, FaWater, FaDroplet,
  FaGaugeHigh, FaGauge, FaFire, FaFireFlameCurved, FaSun, FaMoon, FaCloudSun,
  FaCloudMoon, FaCloudRain, FaCloudShowersHeavy, FaUmbrella, FaWind, FaLeaf,
  FaBatteryHalf, FaBatteryFull, FaBatteryEmpty, FaShieldHalved, FaLock, FaUnlock,
  FaKey, FaHouseSignal, FaWifi, FaSatelliteDish,
  FaFaucet, FaFaucetDrip, FaSink, FaSoap, FaPumpSoap, FaMugHot, FaMugSaucer,
  FaPlateWheat, FaBeerMugEmpty, FaUtensils,
  FaSeedling, FaTreeCity, FaMountainSun, FaSunPlantWilt, FaDropletSlash,
  FaBottleDroplet, FaBottleWater, FaGlassWater, FaGlassWaterDroplet,
  FaHandHoldingDroplet, FaArrowUpFromGroundWater, FaArrowUpFromWaterPump,
  FaHouseFloodWater, FaHouseFloodWaterCircleArrowRight, FaCloudShowersWater,
  FaCloudSunRain, FaTruckDroplet, FaWaterLadder, FaTarpDroplet,
  FaStairs,
  FaTemperatureHigh, FaTemperatureLow, FaThermometer, FaTemperatureArrowDown, FaTemperatureArrowUp,
  FaTemperatureEmpty, FaTemperatureFull, FaTemperatureHalf, FaTemperatureQuarter, FaTemperatureThreeQuarters,
  FaSnowflake, FaSnowman, FaSnowplow,
  GiCellarBarrels, GiCeilingLight, GiStairs,
  MdHome, MdHomeFilled, MdHomeMini, MdHomeMax, MdHomeWork, MdHomeRepairService,
  MdLightbulb, MdLightbulbOutline, MdLightbulbCircle, MdLight, MdLightMode,
  MdWbIncandescent, MdWbSunny, MdWbTwilight, MdWbCloudy, MdWbShade,
  MdThermostat, MdThermostatAuto, MdAcUnit, MdAir,
  MdSensorDoor, MdSensorWindow, MdSensorOccupied, MdSensors, MdSensorsOff,
  MdDoorFront, MdDoorBack, MdDoorSliding, MdDoorbell, MdGarage,
  MdRoom, MdStairs, MdBathroom, MdBedroomBaby, MdBedroomChild, MdBedroomParent,
  MdDining, MdLiving, MdMeetingRoom, MdNoMeetingRoom, MdRoomPreferences,
  MdRoomService, MdFamilyRestroom, MdShower,
  MdPower, MdPowerOff, MdPowerSettingsNew, MdPowerInput,
  MdToggleOn, MdToggleOff, MdSwitchLeft, MdSwitchRight,
  MdSwitchAccessShortcut, MdSwitchAccessShortcutAdd,
  MdWifi, MdWifiOff, MdWifiLock, MdWifiTethering,
  MdSmartDisplay, MdSmartScreen, MdSmartToy, MdSmartphone,
  MdCamera, MdCameraAlt, MdCameraIndoor, MdCameraOutdoor,
  MdLock, MdLockOpen, MdLockOutline,
  MdKitchen, MdMicrowave, MdWash, MdDry, MdDryCleaning, MdLocalLaundryService,
  MdBlender, MdCoffeeMaker, MdCoffee,
  MdCountertops, MdRiceBowl, MdTableRestaurant, MdCookie, MdLocalDining,
  MdRestaurantMenu, MdRestaurant, MdSoupKitchen,
  MdOutlineCountertops, MdOutlineKitchen, MdOutlineMicrowave, MdOutlineRiceBowl,
  MdOutlineBlender, MdOutlineCoffeeMaker, MdOutlineCoffee, MdOutlineTableRestaurant,
  MdOutlineCookie, MdOutlineLocalDining, MdOutlineRestaurantMenu, MdOutlineRestaurant,
  MdOutlineSoupKitchen,
  MdOutlineRoom,
  MdYard, MdGrass, MdPark, MdNature, MdNaturePeople, MdOutdoorGrill,
  MdWater, MdWaterDrop, MdWaterDamage, MdWaterfallChart, MdEmojiNature,
  MdOutlineYard, MdOutlineGrass, MdOutlinePark, MdOutlineNature, MdOutlineNaturePeople,
  MdOutlineOutdoorGrill, MdOutlineWater, MdOutlineWaterDrop, MdOutlineWaterDamage,
  MdOutlineWaterfallChart, MdOutlineEmojiNature
};

const toKebab = (name) => name
  .replace(/^mdi/, '')
  .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
  .replace(/_/g, '-')
  .toLowerCase();

let cachedMdiEntries = null;
let cachedMdiPathByName = null;
let cachedMdiKeys = null;
let cachedAllIconKeys = null;

const ensureMdiCache = () => {
  if (cachedMdiEntries) return;
  const entries = Object.entries(mdiIcons)
    .filter(([key, value]) => key.startsWith('mdi') && typeof value === 'string');
  cachedMdiEntries = entries;
  cachedMdiPathByName = new Map(
    entries.map(([key, value]) => [`mdi:${toKebab(key)}`, value])
  );
  cachedMdiKeys = entries.map(([key]) => `mdi:${toKebab(key)}`);
};

export function getAllIconKeys() {
  if (!cachedAllIconKeys) {
    ensureMdiCache();
    cachedAllIconKeys = [...Object.keys(ICON_MAP), ...cachedMdiKeys];
  }
  return cachedAllIconKeys;
}

export function getIconComponent(iconName) {
  if (!iconName) return null;
  if (ICON_MAP[iconName]) return ICON_MAP[iconName];
  if (iconName.startsWith('mdi:')) {
    ensureMdiCache();
    const path = cachedMdiPathByName.get(iconName);
    if (!path) return null;
    return (props) => React.createElement(MdiIcon, { path, size: '1.4em', ...props });
  }
  return null;
}
