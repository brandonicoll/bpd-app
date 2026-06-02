const ViewShot = ({ children }) => children;
ViewShot.captureRef = jest.fn(() => Promise.resolve('mock-uri'));
module.exports = ViewShot;
module.exports.default = ViewShot;
