/* eslint-disable @typescript-eslint/no-var-requires */
const RTCPeerConnectionMock = require('./__mocks__/rtcPeerConnection');
const mediaDevicesMock = require('./__mocks__/mediaDevices');
global.RTCPeerConnection = RTCPeerConnectionMock;
global.navigator.mediaDevices = mediaDevicesMock;
