# PoseOSC
Send realtime human pose estimation data to your apps!

- [PoseNet](https://github.com/tensorflow/tfjs-models/tree/master/posenet) + [Open Sound Control](http://opensoundcontrol.org/spec-1_0) (via [osc-js](https://www.npmjs.com/package/osc-js))
- Built with [electron](http://electronjs.org)
- Inspired by [FaceOSC](https://github.com/kylemcdonald/ofxFaceTracker/releases)

![](screenshots/screen001.png)
Screenshot with [OSC Data Monitor](https://www.kasperkamperman.com/blog/processing-code/osc-datamonitor/) in the background, the Processing demo can be found in `/demos` folder.


## Download / Installation

Use [NPM](http://npmjs.com) to install and run the app.

```
npm install
npm start
```

macOS binaries can be [downloaded here in release page](https://github.com/LingDong-/PoseOSC/releases). Binaries for other platforms coming soon.

## Parsing Received Data

PoseOSC currently support 4 formats when transferring data through OSC: `ADDR`, `ARR`, `XML` and `JSON`. This can be specified by editing the `format` field on the onscreen GUI. You can pick one that best suits your use case (`ARR` is recommanded for optimal speed).

In `ADDR` mode, each piece of info is sent to a different OSC Address, such as `poses/0/leftWrist/position` or `poses/2/rightElbow/score`. It is relatively easy for a client app with any OSC implementation to read the input. However, it becomes problematic when there are multiple detections in the frame. As PoseNet does detection frame by frame, the "first" pose in one frame might not be the first pose in the next frame. Since all the coordinate are sent to different addresses and OSC does not guarantee the exact order of which they're received, you might read a pose whose lower half belongs to one person while its upper body belongs to another person.

Therefore, it makes sense to send all the data in an entire frame to one single OSC address when there're multiple persons in the frame. `XML` and `JSON` modes encodes all the poses in a given frame, and send it as a string. The client app can then use an XML/JSON parser (for most languages there are many) (plus some small overhead) to extract the pose information. `ARR` mode sends all the data of a frame as a big flat array of values to a single address, this will probably be fastest out of the four, but you'll need to know how interpret the values correctly (by reading example below) as no extra description/hint is being sent.


For more information (e.g. How many keypoints are there for 1 person, etc.) please read [PoseNet's specification](https://github.com/tensorflow/tfjs-models/tree/master/posenet)

### Method 1: ADDR
```
/nPoses 3
/videoWidth 640
/videoHeight 480
/poses/0/score 0.8
/poses/0/keypoints/leftWrist/x 234.4
/poses/0/keypoints/leftWrist/y 432.5
/poses/0/keypoints/leftWrist/score 0.9
/poses/0/keypoints/rightElbow/x 456.2
/poses/0/keypoints/rightElbow/y 654.1
/poses/0/keypoints/rightElbow/score 0.9
...
/poses/1/score 0.7
/poses/1/keypoints/leftWrist/x 789.0
/poses/1/keypoints/leftWrist/y 987.2
...
/poses/2/keypoints/rightAnkle/score 0.2
```

### Method 2: XML
```
<poses videoWidth="640" videoHeight="480" nPoses="3">

	<pose score="0.8">
		<keypoint part="leftWrist" x="234.4" y="432.5" score="0.9"/>
		<keypoint part="rightElbow" x="456.2" y="654.1" score="0.95"/>
		...
	</pose>

	<pose score="0.7">
		<keypoint part="leftWrist" x="789.0" y="987.2" score="0.6"/>
		...
	</pose>
	
	...

</poses>

```
XML will be sent to `poses/xml` OSC Address as a string. The Processing example included in `/demos` folder uses XML parsing.

### Method 3: JSON

JSON format is exactly the same as that of PoseNet's output, see [their documentation](https://github.com/tensorflow/tfjs-models/tree/master/posenet).

JSON will be sent to `poses/json` OSC Address as a string.

### Method 4: ARR

ARR will be sent to `poses/arr` OSC Address as an array of values (OSC spec allows multiple values of different types for each address).

- The frist value (int) is width of the frame.
- The second value (int) is height of the frame.
- The third value (int) is the number of poses. (When you read this value, you'll know how many more values to read, i.e. `nPoses*(1+17*3)`. So if this number is 0 it means no pose is detected, so you can stop reading).
- The next 52 values are data for the first pose, and the 52 values after that are data for the second pose (if there is), and so on...
- For each pose, the first value (float) is the score for that pose, the rest 51 values (floats) can be divided into 17 groups of 3, with each group being (x,y,score) of a keypoint. For the ordering of keypoints, see [PoseNet spec](https://github.com/tensorflow/tfjs-models/tree/master/posenet).

The OpenFrameworks example included in `/demo` folder receives `ARR` format.


## Onscreen GUI

### multiplePoses

Whether or not to detect multiple poses. The switch corresponds to `net.estimateSinglePose` and `net.estimateMultiplePoses` in PoseNet. Single mode is alledgedly faster (according to PoseNet developers), but sometimes multiple mode seem to give better detections even when there's only a single person.


### useTestImage

Sometimes it's hard to find a lot of friends to dance in front of your webcam while you debug your app. Check this box, and a test image containing human figures will move around the screen to help you with testing.

### audioHack

On some systems (e.g. my mac), if an electron app is obscured by other windows or otherwise inactive, its refresh rate will reduce to crawl. (Because Chrome or whatever try to help you save battery.) This is of course extremely undesirable since this app is specifically intended to run in the background.

This seems to be a [known issue](https://github.com/electron/electron/issues/9567) for electron, and I tried a couple of proposed fixes:

- `powerSaveBlocker.start('prevent-app-suspension');`
- `webPreferences: {backgroundThrottling:false, pageVisibility: true}`
- `app.commandLine.appendSwitch('disable-renderer-backgrounding');`

Unfortunately none of them worked. However I found a new hack:

If some sound is playing on the page, the page will be considered active. Therefore I added a hidden looping HTML audio that will play at an extremely low volume when the `audioHack` box is checked. The HTML audio cannot be muted, or have even lower volume, otherwise apparently the app will be considered inactive agian. So if your project doesn't involve listening to really really subtle sound, this hack will work perfectly. If not, there's another hidden hack:

**Press "X" key on your keyboard**, and the window will resize to 1 pixel by 1 pixel, and will float on top of all other apps. This way, the window is always visible (albeit only 1 pixel), and will always be considered active. Press X key again to return to normal mode.

### host/port

OSC host (something like 127.0.0.1) and OSC port (something like 8000). Press Enter key and they will be updated immediately.

### format

One of `ADDR`, `ARR`, `XML`, `JSON`. See **Parsing Received Data** section for details.


## More Settings

More settings can be found in `settings.json`. Some settings involves initializing the neural net are only loaded on start up, such as `poseNetConig`. See [PoseNet documentation](https://github.com/tensorflow/tfjs-models/tree/master/posenet) on what options you can specify. (Hint: their new ResNet seem to be much slower but not much better :P)

(The settings file for compiled macOS app can be found at `PoseOSC.app/Contents/Resources/app/settings.json`)


## Tracking

Posenet detects poses frame by frame, so there's no tracking at all that comes with it.

I plan to develop tracking as an optional feature. On one hand tracking is essential to make sense of the scene when there're multiple persons in the frame. But on the other hand, this will introduce some overhead (& JS is not too fast), and a serious user should be able to implement some tracking better suited to their application and use case.

## Demos

### Processing

See `/demos/PoseOSCProcessingReceiver`. First make sure PoseOSC is running, and that **`format` field is set to `XML`**, then fire up [Processing](http://processing.org) and run the demo. You'll see simple black lines indicating the poses.

### OpenFrameworks

See `/demos/PoseOSCOpenframeworksReceiver`. First compile the OF app (Xcode/make/etc.). While PoseOSC is running and the **`format` field is set to `ARR`**, run the OF app. You'll see simple black lines indicating the poses.


---

**Made possible with support from The [Frank-Ratchye STUDIO For Creative Inquiry](http://studioforcreativeinquiry.org/) at Carnegie Mellon University.**
