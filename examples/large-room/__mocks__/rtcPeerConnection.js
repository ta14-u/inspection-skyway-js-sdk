class MockRTCRtpTransceiver {
  constructor() {
    this.receiver = {};
    this.sender = {};
  }
}

class MockRTCPeerConnection {
  addTransceiver() {
    return new MockRTCRtpTransceiver();
  }
}

module.exports = MockRTCPeerConnection;
