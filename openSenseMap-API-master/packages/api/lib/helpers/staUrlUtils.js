'use strict';

const handleError = require('../helpers/errorHandler');
const axios = require('axios');
const config = require('config');
const staCreator = require('../helpers/staUtils');

const notImplementedString = 'Due to the internal structure of the openSenseMap, this API function is not supported yet!';

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

const redirectStandardStaURLs = function redirectStandardStaURLs (req, res, next) {
  const paramValue = getParamValue(req.params.param);
  if (req.params.param.includes('Things')) {
    axios
      .get(`${config.api_url}:${config.port}/boxes/${paramValue}?sta=auto`)
      .then(response => {
        console.log(typeof response.data);
        if (typeof response.data === String) {
          res.send(JSON.parse(JSON.stringify(response.data)));
        } else {res.send(response.data);}
      })
      .catch(error => {
        handleError(error, next);
      });
  } else if (req.params.param.includes('Sensors')) {
    axios
      .get(`${config.api_url}:${config.port}/boxes`)
      .then(response => {
        res.send(staCreator.transformSensors(response.data, paramValue));
      })
      .catch(error => {
        handleError(error, next);
      });
  } else if (req.params.param.includes('Observations')) {
    axios
      .get(`${config.api_url}:${config.port}/boxes`)
      .then(response => {
        res.send(staCreator.transformSensors(response.data, paramValue));
      })
      .catch(error => {
        handleError(error, next);
      });
  }
  else {
    res.send(notImplementedString);
  }
};

const redirectLocationURLs = function redirectLocationURLs (req, res, next) {
  const paramValue = getParamValue(req.params.param);
  if (req.params.param.includes('Things')) {
    axios
      .get(`${config.api_url}:${config.port}/boxes/${paramValue}`)
      .then(response => {
        res.send(staCreator.createSTALocation(response.data.currentLocation));
      })
      .catch(error => {
        handleError(error, next);
      });
  }
};

const redirectThingURLs = function redirectThingURLs (req, res) {
  if (req.params.param.includes('Things')) {
    res.send('possible');
  } else {
    res.send(notImplementedString);
  }
};

const redirectDatastreamURLs = function redirectDatastreamURLs (req, res, next) {
  const paramValue = getParamValue(req.params.param);
  if (req.params.param.includes('Things')) {
    axios
      .get(`${config.api_url}:${config.port}/boxes/${paramValue}`)
      .then(response => {
        res.send(staCreator.createSTADatastream(response.data, false, paramValue));
      })
      .catch(error => {
        handleError(error, next);
      });
  } else if (req.params.param.includes('Sensors')) {
    axios
      .get(`${config.api_url}:${config.port}/boxes`)
      .then(response => {
        res.send(staCreator.createSTADatastream(response.data, true, paramValue));
      })
      .catch(error => {
        handleError(error, next);
      });
  } else {
    res.send(notImplementedString);
  }
};

const redirectSensorURLs = function redirectSensorURLs (req, res) {
  if (req.params.param.includes('Things')) {
    res.send('possible');
  } else {
    res.send(notImplementedString);
  }
};


const redirectObservationURLs = function redirectObservationURLs (req, res) {
  if (req.params.param.includes('Things')) {
    res.send('possible');
  } else {
    res.send(notImplementedString);
  }
};

const redirectPropertyURLs = function redirectPropertyURLs (req, res) {
  if (req.params.param.includes('Things')) {
    res.send('possible');
  } else {
    res.send(notImplementedString);
  }
};

module.exports = {
  redirectStandardStaURLs,
  redirectLocationURLs,
  redirectThingURLs,
  redirectDatastreamURLs,
  redirectPropertyURLs,
  redirectObservationURLs,
  redirectSensorURLs
};
