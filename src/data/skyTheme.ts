export interface SkyTheme {
  label: string;
  gradient: string;
  cloudColor: string;
  showSun: boolean;
}

export function getSkyTheme(code: number): SkyTheme {
  if (code === 0) {
    return { label: 'Clear sky', gradient: 'linear-gradient(180deg, #8FC1E8 0%, #D9E8D0 45%, #F1EBDC 100%)', cloudColor: 'rgba(255,255,255,0.6)', showSun: true };
  }
  if (code === 1 || code === 2) {
    return { label: 'Partly cloudy', gradient: 'linear-gradient(180deg, #8FA5D9 0%, #B8C4D9 40%, #F1EBDC 100%)', cloudColor: 'rgba(255,255,255,0.55)', showSun: true };
  }
  if (code === 3) {
    return { label: 'Overcast', gradient: 'linear-gradient(180deg, #9AA090 0%, #B4B4A5 45%, #F1EBDC 100%)', cloudColor: 'rgba(255,255,255,0.5)', showSun: false };
  }
  if (code === 45 || code === 48) {
    return { label: 'Foggy', gradient: 'linear-gradient(180deg, #B8BDB5 0%, #CBCABF 45%, #F1EBDC 100%)', cloudColor: 'rgba(255,255,255,0.65)', showSun: false };
  }
  if (code >= 51 && code <= 57) {
    return { label: 'Light rain', gradient: 'linear-gradient(180deg, #7C93B0 0%, #9FAEBD 45%, #F1EBDC 100%)', cloudColor: 'rgba(255,255,255,0.45)', showSun: false };
  }
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) {
    return { label: 'Rain', gradient: 'linear-gradient(180deg, #5B7095 0%, #7E8CA0 45%, #F1EBDC 100%)', cloudColor: 'rgba(255,255,255,0.4)', showSun: false };
  }
  if (code >= 95) {
    return { label: 'Thunderstorm', gradient: 'linear-gradient(180deg, #3E4560 0%, #5C6478 45%, #F1EBDC 100%)', cloudColor: 'rgba(255,255,255,0.35)', showSun: false };
  }
  return { label: 'Variable weather', gradient: 'linear-gradient(180deg, #8FA5D9 0%, #B8C4D9 40%, #F1EBDC 100%)', cloudColor: 'rgba(255,255,255,0.5)', showSun: true };
}
