// models/index.js
const User = require('./user');
const Property = require('./property');
const Booking = require('./booking');
const Report = require('./report');
const HouseHunt = require('./househunt');

module.exports = {
  User,
  Property,
  Booking,
  Report,
  HouseHunt,
};