#include "ofApp.h"

//--------------------------------------------------------------
void ofApp::setup(){
	receiver.setup(OSC_PORT);
}

//--------------------------------------------------------------
void ofApp::update(){
	while(receiver.hasWaitingMessages()){
		ofxOscMessage m;
		receiver.getNextMessage(m);
		if(m.getAddress() == "/poses/arr"){
		  	
		  	poses.clear();

			videoWidth = m.getArgAsInt(0);
			videoHeight = m.getArgAsInt(1);
			int nPoses = m.getArgAsInt(2);

			for (int i = 0; i < nPoses; i++){
				Pose pose;

				pose.score = m.getArgAsFloat(3+i*52);


				for (int j = 0; j < 17; j++){
					Keypoint kpt;

					kpt.position.x = m.getArgAsFloat(3+i*52+1+j*3);
					kpt.position.y = m.getArgAsFloat(3+i*52+1+j*3+1);
					kpt.score = m.getArgAsFloat(3+i*52+1+j*3+2);

					pose.keypoints.push_back(kpt);
				}

				poses.push_back(pose);
			}

		}else{
		  cout << "unrecognized OSC message received @ " <<m.getAddress()<< endl;
		}
	}

}


//--------------------------------------------------------------
void ofApp::draw(){
	ofSetLineWidth(2);
	ofSetColor(0);
	ofNoFill();
	ofDrawRectangle(0,0,videoWidth,videoHeight);
	for (int i = 0; i < poses.size(); i++){
		for (int j = 0; j < 16; j++){
			ofVec2f p0 = poses[i].keypoints[bones[j][0]].position;
			ofVec2f p1 = poses[i].keypoints[bones[j][1]].position;
			ofDrawLine(p0,p1);
		}
	}
	ofDrawBitmapStringHighlight("FPS:"+ofToString(fpsCounter.getFps()),10,50);
    fpsCounter.newFrame();
}

//--------------------------------------------------------------
void ofApp::keyPressed(int key){

}

//--------------------------------------------------------------
void ofApp::keyReleased(int key){

}

//--------------------------------------------------------------
void ofApp::mouseMoved(int x, int y ){

}

//--------------------------------------------------------------
void ofApp::mouseDragged(int x, int y, int button){

}

//--------------------------------------------------------------
void ofApp::mousePressed(int x, int y, int button){

}

//--------------------------------------------------------------
void ofApp::mouseReleased(int x, int y, int button){

}

//--------------------------------------------------------------
void ofApp::mouseEntered(int x, int y){

}

//--------------------------------------------------------------
void ofApp::mouseExited(int x, int y){

}

//--------------------------------------------------------------
void ofApp::windowResized(int w, int h){

}

//--------------------------------------------------------------
void ofApp::gotMessage(ofMessage msg){

}

//--------------------------------------------------------------
void ofApp::dragEvent(ofDragInfo dragInfo){ 

}
