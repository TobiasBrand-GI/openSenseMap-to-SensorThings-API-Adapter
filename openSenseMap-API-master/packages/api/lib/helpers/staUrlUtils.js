'use strict';

const handleError = require('../helpers/errorHandler');
const axios = require('axios');
const config = require('config');
const staCreator = require('../helpers/staUtils');

const notImplementedString = 'Due to the internal structure of the openSenseMap, this API function is not supported yet!';
const wrongParamString = 'This parameter is not supported by this function:';
const notExistString = 'Unknown resource. This address does not exist.';

/**
 * Extracts a substring from between 2 parentheses.
 * @param {String} string The string to be splittet.
 * @returns substring.
 */
const splitParenthesesString = function splitParenthesesString (string) {
  const sub1 = string.split('(');
  const sub2 = sub1[1].split(')');

  return sub2[0];
};

const getParamValue = function getParamValue (param) {
  let paramValue;
  if (param.includes('(') && param.includes(')')) {
    paramValue = splitParenthesesString(param);
  } else { paramValue = ''; }

  return paramValue;
};

const sendLengthSpecific = function sendLengthSpecific (entities) {
  if (entities === {} || entities === []) {
    return JSON.parse('{[]}');
  }
  if (entities.length === 1) {
    return entities[0];
  } else if (entities.length === undefined) {
    return entities;
  }

  return { '@iot.count': entities.length, 'value': entities };
};

const serverCapabilities = function serverCapabilities (req, res, next) {
  try {
    const serverString = {};
    const serverSettings = {};
    serverSettings['conformance'] = ['http://www.opengis.net/spec/iot_sensing/1.1/req/datamodel', 'http://www.opengis.net/spec/iot_sensing/1.1/req/resource-path/resource-path-to-entities'];
    serverString['serverSettings'] = serverSettings;
    const value = [{ 'name': 'Things', 'url': `${config.api_url}:${config.port}/v1.1/Things` }, { 'name': 'Locations', 'url': `${config.api_url}:${config.port}/v1.1/Locations` },
      { 'name': 'Datastreams', 'url': `${config.api_url}:${config.port}/v1.1/Datastreams` }, { 'name': 'Sensors', 'url': `${config.api_url}:${config.port}/v1.1/Sensors` },
      { 'name': 'Observations', 'url': `${config.api_url}:${config.port}/v1.1/Observations` }, { 'name': 'ObservedProperties', 'url': `${config.api_url}:${config.port}/ObservedProperties` },
      { 'name': 'FeaturesOfInterest', 'url': `${config.api_url}:${config.port}/v1.1/FeaturesOfInterest` }];
    serverString['value'] = value;
    res.send(serverString);
  } catch (error) {
    handleError(error, next);
  }
};

const redirectStandardStaURLs = function redirectStandardStaURLs (req, res, next) {
  const paramValue = getParamValue(req.params.param);
  const rejectArray = [ 'ObservedProperties', 'Datastreams', 'FeatureOfInterests', 'Locations', 'HistoricalLocations' ];
  let resData;
  if (req.params.param.includes('Things')) {
    axios
      .get(`${config.api_url}:${config.port}/boxes/${paramValue}`)
      .then(response => {
        resData = sendLengthSpecific(staCreator.transformBoxes(response.data, paramValue));
        res.send(resData);
      })
      .catch(error => {
        handleError(error, next);
      });
  } else if (req.params.param.includes('Sensors')) {
    axios
      .get(`${config.api_url}:${config.port}/boxes`)
      .then(response => {
        resData = sendLengthSpecific(staCreator.transformSensors(response.data, paramValue));
        res.send(resData);
      })
      .catch(error => {
        handleError(error, next);
      });
  } else if (req.params.param.includes('Observations')) {
    axios
      .get(`${config.api_url}:${config.port}/boxes`)
      .then(response => {
        resData = sendLengthSpecific(staCreator.transformSensors(response.data, paramValue));
        res.send(resData);
      })
      .catch(error => {
        handleError(error, next);
      });
  }
  else if (rejectArray.includes(req.params.param)) {
    resData = notImplementedString;
  }
  else {
    resData = notExistString;
  }

  return resData;
};

const redirectNestedURLs = function redirectNestedURLs (req, res, next) {
  const paramValue = getParamValue(req.params.param);
  const nestValue = req.params.nest;
  const valueOnly = req.params.subrequest ? req.params.subrequest : '';
  const possibilities = ['Datastreams', 'Locations', 'HistoricalLocations', 'Sensors', 'ObservedProperties', 'FeatureOfInterests', 'Observations', 'Things'];
  if (!['$value', '$ref', ''].includes(valueOnly)) {
    return res.send(`${wrongParamString} ${valueOnly}`);
  }

  if (paramValue !== '' && paramValue !== {} && paramValue !== null) {
    if (nestValue[0].toUpperCase() === nestValue[0]) {
      if (valueOnly === '$ref') {
        return res.send(notImplementedString);
      }
      if (getParamValue(nestValue) === '') {
        let resData = null;
        if (req.params.param.includes('Things')) {
          axios
            .get(`${config.api_url}:${config.port}/boxes/${paramValue}`)
            .then(response => {
              switch (nestValue) {
              case 'Locations' :
                resData = staCreator.createSTALocation(response.data.currentLocation);
                break;
              case 'HistoricalLocations' :
                resData = staCreator.createSTALocation(response.data.currentLocation);
                break;
              case 'Datastreams' :
                resData = staCreator.createSTADatastream(response.data, false, paramValue);
                break;
              default :
                if (possibilities.some(v => nestValue.includes(v))) {
                  resData = `${wrongParamString} ${nestValue}`;
                }
                else { resData = notExistString; }
                break;
              }
              res.send(resData);
            })
            .catch(error => {
              handleError(error, next);
            });
        } else if (req.params.param.includes('Sensors')) {
          const possibilities = ['Datastreams'];
          axios
            .get(`${config.api_url}:${config.port}/boxes`)
            .then(response => {
              switch (nestValue) {
              case 'Datastreams' :
                resData = staCreator.createSTADatastream(response.data, true, paramValue);
                break;
              default :
                if (possibilities.some(v => nestValue.includes(v))) {
                  resData = `${wrongParamString} ${nestValue}`;
                }
                else { resData = notExistString; }
                break;
              }
              res.send(resData);
            })
            .catch(error => {
              handleError(error, next);
            });
        } else if (req.params.param.includes('Observations')) {
          const possibilities = ['Datastreams', 'FeatureOfInterest'];
          axios
            .get(`${config.api_url}:${config.port}/boxes`)
            .then(response => {
              switch (nestValue) {
              case 'Datastream' :
                resData = staCreator.createSTADatastream(response.data, false, paramValue);
                break;
              case 'FeatureOfInterest' :
                resData = staCreator.createSTADatastream(response.data, false, paramValue);
                break;
              default :
                if ((possibilities.includes(nestValue) && getParamValue(nestValue) !== '')) {
                  resData = notImplementedString;
                }
                else { resData = notExistString; }
                break;
              }
              res.send(resData);
            })
            .catch(error => {
              handleError(error, next);
            });
        } else if (['Datastreams', 'ObservedProperties', 'FeatureOfInterests', 'Locations', 'HistoricalLocations'].includes(req.params.param)) {
          resData = notImplementedString;
        }

        return resData;
      }

      return res.send(`${notImplementedString}. Please select a nested parameter without an id like /Things(id)/Locations.`);
    } else if (nestValue[0].toUpperCase() !== nestValue[0]) {
      if (valueOnly === '$ref') {
        return res.send('The parameter "$ref" is only supported by collection requests like /Things(id)/Datastreams');
      }
      if (req.params.param.includes('Things')) {
        axios
          .get(`${config.api_url}:${config.port}/v1.1/Things(${paramValue})`)
          .then(response => {
            return valueOnly === '$value' ? res.send(staCreator.selectAttribute(response.data, nestValue, true)) : res.send(staCreator.selectAttribute(response.data, nestValue, false));
          })
          .catch(error => {
            handleError(error, next);
          });
      } else if (req.params.param.includes('Sensors')) {
        axios
          .get(`${config.api_url}:${config.port}/v1.1/Sensors(${paramValue})`)
          .then(response => {
            return valueOnly === '$value' ? res.send(staCreator.selectAttribute(response.data, nestValue, true)) : res.send(staCreator.selectAttribute(response.data, nestValue, false));
          })
          .catch(error => {
            handleError(error, next);
          });
      }
    }
  }

  return res.send('This function can only be used for single objects. Please submit a valid ID.');
};

module.exports = {
  serverCapabilities,
  redirectStandardStaURLs,
  redirectNestedURLs,
};
