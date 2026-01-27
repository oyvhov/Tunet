export const getWeatherInfo = (state, t) => {
  const weatherMap = {
    sunny: { label: t('weather.condition.sunny'), icon: 'clear-day' },
    'clear-night': { label: t('weather.condition.clearNight'), icon: 'clear-night' },
    partlycloudy: { label: t('weather.condition.partlyCloudy'), icon: 'partly-cloudy-day' },
    cloudy: { label: t('weather.condition.cloudy'), icon: 'cloudy' },
    rainy: { label: t('weather.condition.rainy'), icon: 'rain' },
    pouring: { label: t('weather.condition.pouring'), icon: 'thunderstorms-rain' },
    snowy: { label: t('weather.condition.snowy'), icon: 'snow' },
    fog: { label: t('weather.condition.fog'), icon: 'fog' },
    hail: { label: t('weather.condition.hail'), icon: 'hail' },
    lightning: { label: t('weather.condition.lightning'), icon: 'thunderstorms' },
    windy: { label: t('weather.condition.windy'), icon: 'wind' },
    exceptional: { label: t('weather.condition.exceptional'), icon: 'warning' }
  };

  return weatherMap[state] || { label: state || t('common.unknown'), icon: 'cloudy' };
};
