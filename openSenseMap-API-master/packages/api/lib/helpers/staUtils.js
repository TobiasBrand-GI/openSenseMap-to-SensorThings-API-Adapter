'use strict';

const config = require('config');

/**
 * Calls the specific transformation for the feature it is given.
 * @param {JSON Object} item. Can either be a box, a sensor or a measurement feature.
 * @returns converted feature as JSON String.
 */
const transformOne = function transformOne (item) {
  if (item.name && item.exposure && item.model) {
    return transformOneBox(item);
  } else if (item.value && item._id) {
    return transformOneMeasurement(item);
  }
};

/**
 * Takes a box entity from the OSeM database and converts it into a SensorThings API confirm Thing-Object.
 * @param {JSON Object} box The box enitity to be converted in SensorThings API confirm JSON-Structure.
 * @returns The converted box as a JSON String.
 */
const transformOneBox = function transformOneBox (box) {
  const old = box;
  const newBox = JSON.parse(JSON.stringify(old).split('"_id":')
    .join('"@iot.id":'));
  newBox['@iot.selflink'] = `${config.api_url}:${config.port}/v1.1/Things(${old._id})`;
  newBox['Locations@iot.navigationLink'] = `${config.api_url}:${config.port}/v1.1/Things(${old._id})/Locations`;
  newBox['HistoricalLocations@iot.navigationLink'] = `${config.api_url}:${config.port}/v1.1/Things(${old._id})/HistoricalLocations`;
  newBox['Datastreams@iot.navigationLink'] = `${config.api_url}:${config.port}/v1.1/Things(${old._id})/Datastreams`;
  delete newBox.name;
  newBox.name = old.name;
  if (old.description) {
    delete newBox.description;
    newBox.description = old.description;
  } else {
    newBox.description = '';
  }
  const properties = { 'lastMeasurementAt': newBox.lastMeasurementAt, 'exposure': newBox.exposure, 'createdAt': newBox.createdAt, 'model': newBox.model, 'updatedAt': newBox.updatedAt, 'grouptag': newBox.grouptag };
  newBox.properties = properties;
  ['lastMeasurementAt', 'sensors', 'loc', 'currentLocation', 'exposure', 'createdAt', 'model', 'updatedAt', 'grouptag'].forEach(e => delete newBox[e]);

  return JSON.stringify(newBox);
};

const transformOneMeasurement = function transformOneMeasurement (measurement) {
  console.log(measurement);
};

const createSTALocation = function createSTALocation (location) {
  const staLoc = {};
  staLoc['@iot.id'] = Date.now();
  staLoc['@iot.selflink'] = `${config.api_url}:${config.port}/v1.1/Locations(${staLoc['@iot.id']})`;
  staLoc['Things@iot.navigationLink'] = `${config.api_url}:${config.port}/v1.1/Locations(${staLoc['@iot.id']})/Things`;
  staLoc['HistoricalLocations@iot.navigationLink'] = `${config.api_url}:${config.port}/v1.1/Locations(${staLoc['@iot.id']})/HistoricalLocations`;
  staLoc['name'] = '';
  staLoc['description'] = '';
  staLoc['encodingType'] = 'geoJSON';
  staLoc['location'] = { 'type': location.type, 'coordinates': location.coordinates };
  staLoc['properties'] = { 'timestamp': location.timestamp };

  return staLoc;
};

const createSTADatastream = function createSTADatastream (box) {

  const returnString = [];
  for (let i = 0; i < box.sensors.length; ++i) {
    const sensor = box.sensors[i];
    const staDS = {};
    staDS['@iot.id'] = Date.now();
    staDS['@iot.selflink'] = `${config.api_url}:${config.port}/v1.1/Datastreams(${staDS['@iot.id']})`;
    staDS['Thing@iot.navigationLink'] = `${config.api_url}:${config.port}/v1.1/Datastreams(${staDS['@iot.id']})/Thing`;
    staDS['Sensor@iot.navigationLink'] = `${config.api_url}:${config.port}/v1.1/Datastreams(${staDS['@iot.id']})/Sensor`;
    staDS['ObervedProperty@iot.navigationLink'] = `${config.api_url}:${config.port}/v1.1/Datastreams(${staDS['@iot.id']})/ObervedProperty`;
    staDS['Observations@iot.navigationLink'] = `${config.api_url}:${config.port}/v1.1/Datastreams(${staDS['@iot.id']})/Observations`;
    staDS['name'] = '';
    staDS['description'] = '';
    staDS['unitOfMeasurement'] = createUnitOfMeasurement(sensor);
    staDS['observationType'] = staDS.unitOfMeasurement.name === 'Not found' ? 'OM_Observation' : 'OM_Measurement';
    staDS['properties'] = {};
    staDS['observedArea'] = {};
    staDS['phenomenonTime'] = {};
    staDS['resultTime'] = {};
    returnString.push(staDS);
  }

  return returnString;
};

const createUnitOfMeasurement = function createUnitOfMeasurement (sensor) {
  const unit = sensor.unit;
  let string = '';
  const defUrl = 'https://sensors.wiki/unit/detail/';
  switch (unit) {
  case 'µg/m³' :
    string = `{"name": ${'"Microgram per cubic meter"'}, "symbol": "${unit}", "definition": "${defUrl}microgram_per_cubic_meter"}`;
    break;
  case '°C' :
    string = `{"name": ${'"Degree Celsius"'}, "symbol": "${unit}", "definition": "${defUrl}degree_celsius"}`;
    break;
  case '°F' :
    string = `{"name": ${'"Degree Fahrenheit"'}, "symbol": "${unit}", "definition": "${defUrl}degree_fahrenheit"}`;
    break;
  case 'lx' :
    string = `{"name": ${'"Lux"'}, "symbol": "${unit}", "definition": "${defUrl}lux"}`;
    break;
  case 'm/s' :
    string = `{"name": ${'"Meter per second"'}, "symbol": "${unit}", "definition": "${defUrl}meter_per_second"}`;
    break;
  case 'mm' :
    string = `{"name": ${'"Millimeter"'}, "symbol": "${unit}", "definition": "${defUrl}millimeter"}`;
    break;
  case 'ppm' :
    string = `{"name": ${'"Parts per million"'}, "symbol": "${unit}", "definition": "${defUrl}parts_per_million"}`;
    break;
  case 'Pa' :
    string = `{"name": ${'"Pascal"'}, "symbol": "${unit}", "definition": "${defUrl}pascal"}`;
    break;
  case '%' :
    string = `{"name": ${'"Percent"'}, "symbol": "${unit}", "definition": "${defUrl}percent"}`;
    break;
  case 'V' :
    string = `{"name": ${'"Volt"'}, "symbol": "${unit}", "definition": "${defUrl}volt"}`;
    break;
  case 'W/m²' :
    string = `{"name": ${'"Watt per square meter"'}, "symbol": "${unit}", "definition": "${defUrl}watt_per_square_meter"}`;
    break;
  default :
    string = `{"name": ${'"Not found"'}, "symbol": "${unit}", "definition": "${defUrl}not_specified"}`;
  }

  return JSON.parse(string);
};
module.exports = {
  transformOne,
  transformOneBox,
  transformOneMeasurement,
  createSTALocation,
  createSTADatastream
};
