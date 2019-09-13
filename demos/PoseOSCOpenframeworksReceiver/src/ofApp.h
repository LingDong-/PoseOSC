#pragma once

#include "ofMain.h"
#include "ofxOsc.h"

#define OSC_PORT 9527

struct Keypoint{
	ofVec2f position;
	float score;
};
struct Pose{
	vector<Keypoint> keypoints;
	float score;
};

class ofApp : public ofBaseApp{

	public:
		void setup();
		void update();
		void draw();

		void keyPressed(int key);
		void keyReleased(int key);
		void mouseMoved(int x, int y );
		void mouseDragged(int x, int y, int button);
		void mousePressed(int x, int y, int button);
		void mouseReleased(int x, int y, int button);
		void mouseEntered(int x, int y);
		void mouseExited(int x, int y);
		void windowResized(int w, int h);
		void dragEvent(ofDragInfo dragInfo);
		void gotMessage(ofMessage msg);

		ofxOscReceiver receiver;
		vector<Pose> poses;
		int videoWidth;
		int videoHeight;

		int bones[16][2] = {
		    {0,1  },{0,  2},{1, 3 },{2,4  },//face
		    {5,6  },{11,12},{5, 11},{6,12 },//body
		    {5,7  },{7,  9},{6, 8 },{8,10 },//arms
		    {11,13},{13,15},{12,14},{14,16},//legs
		};

		ofFpsCounter fpsCounter;
		
};
