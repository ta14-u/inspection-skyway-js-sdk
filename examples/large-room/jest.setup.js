// eslint-disable-next-line @typescript-eslint/no-var-requires
const RTCPeerConnectionMock = require('./__mocks__/rtcPeerConnection');
global.RTCPeerConnection = RTCPeerConnectionMock;
