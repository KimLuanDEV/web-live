const HEALTH_KEY = "health_data_v1";

function getHealthData(){
  return JSON.parse(localStorage.getItem(HEALTH_KEY)) || {};
}

function setHealthData(part, data){
  const h = getHealthData();
  h[part] = { ...(h[part]||{}), ...data };
  h.updatedAt = Date.now();
  localStorage.setItem(HEALTH_KEY, JSON.stringify(h));
}

function getHealthPart(part){
  return getHealthData()[part] || {};
}
