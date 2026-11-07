/* global jest */
const React = require('react');
const { View } = require('react-native');

/**
 * Stand-in for react-native-video. It renders nothing real: tests read the props the screen
 * passed (`lastVideo.props`) and call the event handlers to simulate what the player reports.
 * It proves Nova's wiring and logic, NOT that any video plays on Android.
 */
const lastVideo = { props: null, seeks: [], pipRequests: 0 };

const Video = React.forwardRef(function VideoMock(props, ref) {
  lastVideo.props = props;
  React.useImperativeHandle(ref, () => ({
    seek: (seconds) => {
      lastVideo.seeks.push(seconds);
    },
    enterPictureInPicture: () => {
      lastVideo.pipRequests += 1;
    },
  }));
  return React.createElement(View, { testID: props.testID ?? 'video' });
});

module.exports = { __esModule: true, default: Video, lastVideo, jest };
