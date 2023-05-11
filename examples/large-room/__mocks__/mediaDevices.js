/* global jest */
const mockMediaDevices = {
  getUserMedia: jest.fn(),
  addEventListener: jest.fn(),
};

module.exports = mockMediaDevices;
