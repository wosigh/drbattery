function InfoAssistant(argFromPusher) {
	/* this is the creator function for your scene assistant object. It will be passed all the 
	   additional parameters (after the scene name) that were passed to pushScene. The reference
	   to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */
		//var	this.PusherScene=null;
	   if (argFromPusher){
	   		this.PusherScene=argFromPusher;
	   	}
}

InfoAssistant.prototype.setup = function() {
	/* this function is for setup tasks that have to happen when the scene is first created */
	//$('info_title').innerHTML="Comming from " + this.PusherScene;	
	/* use Mojo.View.render to render view templates and add them to the scene, if needed */
	
	/* setup widgets here */
	
	/* add event handlers to listen to events from widgets */
	switch (this.PusherScene) {
		case "actual":
			$('message').innerHTML='<h2>Actual</h2>This screen is showing you the actual values of your battery. The data is updated each 30 seconds.<br>The value for the current is an average over 30s.<br>A negative current means the battery is discharging. <br>All values are read directly from the battery through the driver.';
		break;
		case "health":
			$('message').innerHTML='<h2>Health</h2><h3>Percentage</h3>Value computed by the chip inside your battery to reflect the capacity your battery can hold now. The battery is using a complex algorithm to estimate the capacity which will be reduced by the number of charge cycles. A new battery should have a capacity of 100%. Batteries are typically considered worn-out when the full capacity reaches 80% of the rated capacity.<br><b>Tap and hold on the value to change.</b><h3>Manufacturer Rating</h3>This is the initial value of the capacity read from the battery and set by the manufacturer. This should be identical (+-5%) to the rated capacity stamped on the battery. If this is not the case you probably got a fake or defective battery and should try to exchange it.<br><b>To change this value consult the support thread</b><h3>Calculated left</h3>The result of "percentage" times "Initial/manufacturer rating". This is the capacity your battery can hold now. Since the algorithm in the battery chip may produce false values over time you can correct this by recalibrating the battery in the next scene. Symptoms of such false values are:<br>1. Your battery suddenly drops from (e.g.) 20% to 0% and may even shutdown.<br>2. You get "hours" of runtime without dropping from 100% or at 0%.<br>You can find more info in the web links from the help screen.'; 
		break;
		case "calibrate":
			$('message').innerHTML='<h2>Calibrate</h2>Here you can recalibrate the chip inside the battery. This will calculate the actual capacity of your battery and set the percentage accordingly. The discharging and charging cycle may take some time, and you need to connect the charger at a certain time within 30-60 second time to begin the learning cycle. To reduce the temperature during charge its suggestive to slide open a pre.<br>While discharging/calibrating you can use the device running other apps. But it should not "fall to sleep". Running this scene in foreground prevents the device from sleeping<br><b>If the calibration fails you may try to set the health to 100% or change the voltage when calibrating starts from the appmenu. More info below.</b><br>Infos about the "Battery Status Register" can be found in the manual of the "Fuel Gauge IC" in the help scene.<h3>First step: Discharging</h3>Recalibration starts by discharging the battery until a very low state (default 3.413V changeable in the appmenu). So the first thing you have to do is disconnect the charger. Its best to start the recalibrating with a battery at a low charge level (e.g., 10-20%). Otherwise it will take a long time to discharge the battery. As soon the required voltage is reached the battery will switch into calibration (learning; LED: LEARNF will turn on) mode and you have to connect the charger immediately. The app will inform you with an alarm, dialog and text in the screen. Again: You have approximately 30-60 seconds to do so before the device will shutdown. Be patient: After connecting the charger it takes 10-15 seconds until the battery starts calibration.<h3>Second step: Calibrating</h3>Now the calibrating starts. Dont disconnect the charger now, not even for a second, as this will stop the calibration and you get an error from the app. When the calibration is finished, you will get a notification by alarm, banner and info text. After successfully calibrating, the percentage is corrected to reflect the real capacity of your battery. You can examine this in the "Health" scene.<h3>There are some situations where the recalibration fails.</h3><h4>1. Before you could connect the charger webOS shuts down.</h4>You can change the starting voltage to a higher number in the appmenu.<h4>2. Immediately when you connect the charger the calibration stops.</h4>The cause of this is still unknown. You can try to take the battery out of the device for a couple of seconds and retry the calibration.<h4>3. The device (webOS) stops the calibration.</h4>Even though the battery has a very sophisticated mechanism to prevent the battery from over charging, webOS has its own mechanism in case of a battery fault. This means that your battery knows that it can still charge but webOS stops it. <b>You can reset the health to 100% (like a new battery) in the appmenu. After resetting the health to 100% you should recalibrate the battery to recalculate the health to the actual value.<br>Switch the device into airplane mode and dont use any other app.</b>';
		break;
		case "changelog":
			$('message').innerHTML='<h2>Change Log</h2><h3>Version 0.1.3</h3><b>Actual Scene</b><ul><li>Temperature in Celsius and Fahrenheit</li></ul><b>Calibrate Scene</b><ul><li>Temperature in Celsius and Fahrenheit</li><li>Reduce drain while waiting for charger</ul><b>Service</b><ul><li>Fixed webOS 2.x bug</li></ul><h3>Version 0.1.2</h3><b>Health Scene</b><ul><li>Tap and hold to change the health value</li><li>Tap and hold to change the Manufacturer Rating (needs secret code to enable)</li></ul><b>Calibrate Scene</b><ul><li>Changing the calibration start voltage possible in appmenu</li><li>Fixed bug alert "connect charger now" doesnt disappear</ul><b>Service</b><ul><li>Rewritten in C and bundled with the app</li><li>All battery values read from the registers instead of driver files</li><li>Bug in SetManufacturer Rating fixed</li></ul><h3>Version 0.1.1</h3><ul><li>Initial public release</li></ul>';
		break;
		default: 
	}
	this.controller.setupWidget(Mojo.Menu.appMenu, {omitDefaultItems: true}, {visible: false});

};

InfoAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
};

InfoAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
};

InfoAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */
};
